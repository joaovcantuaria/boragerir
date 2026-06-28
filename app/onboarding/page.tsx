"use client"

import { useState, useRef } from "react"
import { useRouter } from "next/navigation"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { Loader2, Check, ChevronRight, Upload, Building2, User } from "lucide-react"
import { toast } from "sonner"
import { motion, AnimatePresence } from "framer-motion"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { createClient } from "@/lib/supabase/client"
import {
  areasAtuacao, formatarTelefone, formatarCEP,
  formatarCPF, formatarCNPJ, validarCPF, validarCNPJ
} from "@/lib/utils"
import { AreaAtuacaoSelect } from "@/components/ui/area-atuacao-select"
import { planosInfo, type Plano } from "@/types"
import { LogoFull } from "@/components/ui/logo"

export const dynamic = "force-dynamic"

const schemaNegocio = z.object({
  nome: z.string().min(2, "Nome obrigatório"),
  tipo_documento: z.enum(["cpf", "cnpj"]),
  documento: z.string().min(11, "Documento inválido"),
  area_atuacao: z.string().min(1, "Selecione a área"),
  telefone: z.string().min(10, "Telefone inválido"),
  endereco_rua: z.string().min(2, "Rua obrigatória"),
  endereco_numero: z.string().min(1, "Número obrigatório"),
  endereco_bairro: z.string().min(2, "Bairro obrigatório"),
  endereco_cidade: z.string().min(2, "Cidade obrigatória"),
  endereco_estado: z.string().length(2, "Use a sigla (ex: SP)"),
  endereco_cep: z.string().min(8, "CEP inválido"),
})
type FormNegocio = z.infer<typeof schemaNegocio>

export default function OnboardingPage() {
  const [passo, setPasso] = useState(1)
  const [tipoDoc, setTipoDoc] = useState<"cpf" | "cnpj">("cnpj")
  const [planoSelecionado, setPlanoSelecionado] = useState<Plano>("gratuito")
  const [logoFile, setLogoFile] = useState<File | null>(null)
  const [logoPreview, setLogoPreview] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)
  const router = useRouter()
  const supabase = createClient()

  const { register, handleSubmit, setValue, watch, trigger, formState: { errors } } = useForm<FormNegocio>({
    resolver: zodResolver(schemaNegocio),
    defaultValues: { tipo_documento: "cnpj" },
  })

  function handleLogoChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    if (file.size > 2 * 1024 * 1024) { toast.error("Logo deve ter no máximo 2MB"); return }
    setLogoFile(file)
    setLogoPreview(URL.createObjectURL(file))
  }

  async function avancarPasso1(data: FormNegocio) {
    // Validar documento
    if (data.tipo_documento === "cpf" && !validarCPF(data.documento)) {
      toast.error("CPF inválido"); return
    }
    if (data.tipo_documento === "cnpj" && !validarCNPJ(data.documento)) {
      toast.error("CNPJ inválido"); return
    }
    setPasso(2)
  }

  async function finalizarOnboarding() {
    setLoading(true)
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { router.push("/login"); return }

    // VERIFICAR SE JÁ TEM EMPRESA — evitar duplicatas no loop
    const { data: empresaExistente } = await supabase
      .from("empresas")
      .select("id, plano")
      .eq("user_id", user.id)
      .single()

    if (empresaExistente) {
      // Empresa já criada
      if (planoSelecionado !== "gratuito") {
        // Redirecionar para pagamento se plano pago
        window.location.href = `/planos?plano=${planoSelecionado}&novo=1`
      } else {
        toast.success("Bem-vindo ao Bora Gerir! 🚀")
        window.location.href = "/dashboard"
      }
      return
    }

    const dados = watch()
    let logoUrl: string | null = null

    // Upload da logo se houver
    if (logoFile) {
      const ext = logoFile.name.split(".").pop()
      const path = `${user.id}/logo.${ext}`
      const { error: uploadError } = await supabase.storage
        .from("logos")
        .upload(path, logoFile, { upsert: true })
      if (!uploadError) {
        const { data: urlData } = supabase.storage.from("logos").getPublicUrl(path)
        logoUrl = urlData.publicUrl
      }
    }

    // Se plano pago: criar empresa com plano_ativo: false (aguarda pagamento)
    const planoPago = planoSelecionado !== "gratuito"

    const { error } = await supabase.from("empresas").insert({
      user_id: user.id,
      nome: dados.nome,
      tipo_documento: dados.tipo_documento,
      documento: dados.documento.replace(/\D/g, ""),
      area_atuacao: dados.area_atuacao,
      telefone: dados.telefone,
      email: user.email!,
      logo_url: logoUrl,
      endereco_rua: dados.endereco_rua,
      endereco_numero: dados.endereco_numero,
      endereco_bairro: dados.endereco_bairro,
      endereco_cidade: dados.endereco_cidade,
      endereco_estado: dados.endereco_estado.toUpperCase(),
      endereco_cep: dados.endereco_cep,
      plano: planoSelecionado,
      // Plano pago: aguarda pagamento para ativar. Gratuito: ativo imediatamente
      plano_ativo: !planoPago,
      pontos_por_real: 1,
      pontos_para_desconto: 100,
    })
    if (error) {
      if (error.code === "23505") {
        // Empresa já existe, redirecionar
        if (planoPago) {
          window.location.href = `/planos?plano=${planoSelecionado}&novo=1`
        } else {
          toast.success("Cadastro já concluído! Redirecionando...")
          window.location.href = "/dashboard"
        }
        return
      }
      toast.error("Erro ao salvar dados. Tente novamente.")
      setLoading(false)
      return
    }

    if (planoPago) {
      toast.success("Dados salvos! Agora finalize seu plano.")
      // Redirecionar para tela de planos/pagamento com o plano pré-selecionado
      window.location.href = `/planos?plano=${planoSelecionado}&novo=1`
    } else {
      toast.success("Tudo pronto! Bem-vindo ao Bora Gerir 🚀")
      window.location.href = "/dashboard"
    }
  }

  const passos = [{ n: 1, label: "Seu negócio" }, { n: 2, label: "Plano" }]

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="w-full max-w-2xl">
        <div className="flex justify-center mb-8">
          <LogoFull height={52} />
        </div>

        {/* Progresso */}
        <div className="flex items-center justify-center gap-6 mb-8">
          {passos.map((p, i) => (
            <div key={p.n} className="flex items-center gap-2">
              <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-black transition-all ${
                passo > p.n ? "bg-primary text-white" : passo === p.n ? "bg-primary text-white shadow-orange" : "bg-muted text-muted-foreground"
              }`}>
                {passo > p.n ? <Check className="w-4 h-4" /> : p.n}
              </div>
              <span className={`text-sm font-semibold ${passo === p.n ? "text-foreground" : "text-muted-foreground"}`}>{p.label}</span>
              {i < passos.length - 1 && <ChevronRight className="w-4 h-4 text-muted-foreground" />}
            </div>
          ))}
        </div>

        <AnimatePresence mode="wait">
          {passo === 1 && (
            <motion.div key="p1" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}
              className="bg-card border border-border rounded-2xl p-6 shadow-sm">
              <h2 className="text-xl font-black mb-1">Dados do seu negócio</h2>
              <p className="text-muted-foreground text-sm mb-6">Estas informações aparecerão nos seus recibos</p>

              <form onSubmit={handleSubmit(avancarPasso1)} className="space-y-4">
                {/* Upload de logo */}
                <div className="flex items-center gap-4">
                  <div
                    onClick={() => fileRef.current?.click()}
                    className="w-20 h-20 rounded-2xl border-2 border-dashed border-border hover:border-primary cursor-pointer flex items-center justify-center overflow-hidden transition-colors shrink-0"
                  >
                    {logoPreview ? (
                      <img src={logoPreview} alt="Logo" className="w-full h-full object-cover" />
                    ) : (
                      <div className="flex flex-col items-center gap-1 text-muted-foreground">
                        <Upload className="w-6 h-6" />
                        <span className="text-[10px]">Logo</span>
                      </div>
                    )}
                  </div>
                  <div>
                    <p className="text-sm font-semibold">Logo do estabelecimento</p>
                    <p className="text-xs text-muted-foreground">Aparece nos recibos e no sistema. PNG ou JPG, máx 2MB.</p>
                    <button type="button" onClick={() => fileRef.current?.click()}
                      className="text-xs text-primary font-semibold mt-1 hover:underline">
                      {logoPreview ? "Trocar logo" : "Enviar logo"}
                    </button>
                  </div>
                  <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleLogoChange} />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="sm:col-span-2 space-y-1.5">
                    <Label>Nome do estabelecimento *</Label>
                    <Input placeholder="Ex: Salão da Ana" {...register("nome")} />
                    {errors.nome && <p className="text-destructive text-xs">{errors.nome.message}</p>}
                  </div>

                  {/* Tipo de documento */}
                  <div className="sm:col-span-2 space-y-1.5">
                    <Label>Cadastrar como *</Label>
                    <div className="flex gap-3">
                      {(["cnpj", "cpf"] as const).map((tipo) => (
                        <button key={tipo} type="button"
                          onClick={() => { setTipoDoc(tipo); setValue("tipo_documento", tipo); setValue("documento", "") }}
                          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl border text-sm font-semibold transition-all ${
                            tipoDoc === tipo ? "border-primary bg-primary/5 text-primary" : "border-border text-muted-foreground hover:border-primary/50"
                          }`}>
                          {tipo === "cnpj" ? <Building2 className="w-4 h-4" /> : <User className="w-4 h-4" />}
                          {tipo === "cnpj" ? "CNPJ (Empresa)" : "CPF (Pessoa física)"}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <Label>{tipoDoc === "cnpj" ? "CNPJ *" : "CPF *"}</Label>
                    <Input
                      placeholder={tipoDoc === "cnpj" ? "00.000.000/0001-00" : "000.000.000-00"}
                      maxLength={tipoDoc === "cnpj" ? 18 : 14}
                      {...register("documento")}
                      onChange={(e) => {
                        const f = tipoDoc === "cnpj" ? formatarCNPJ(e.target.value) : formatarCPF(e.target.value)
                        e.target.value = f; setValue("documento", f)
                      }}
                    />
                    {errors.documento && <p className="text-destructive text-xs">{errors.documento.message}</p>}
                  </div>

                  <div className="space-y-1.5">
                    <Label>Telefone *</Label>
                    <Input placeholder="(11) 99999-9999" {...register("telefone")}
                      onChange={(e) => { const f = formatarTelefone(e.target.value); e.target.value = f; setValue("telefone", f) }} />
                    {errors.telefone && <p className="text-destructive text-xs">{errors.telefone.message}</p>}
                  </div>

                  <div className="sm:col-span-2 space-y-1.5">
                    <Label>Área de atuação *</Label>
                    <AreaAtuacaoSelect
                      value={watch("area_atuacao")}
                      onChange={(v) => setValue("area_atuacao", v)}
                      placeholder="Selecione ou busque sua área..."
                    />
                    {errors.area_atuacao && <p className="text-destructive text-xs">{errors.area_atuacao.message}</p>}
                  </div>

                  <div className="space-y-1.5">
                    <Label>CEP *</Label>
                    <Input placeholder="00000-000" {...register("endereco_cep")}
                      onChange={(e) => { const f = formatarCEP(e.target.value); e.target.value = f; setValue("endereco_cep", f) }} />
                    {errors.endereco_cep && <p className="text-destructive text-xs">{errors.endereco_cep.message}</p>}
                  </div>

                  <div className="space-y-1.5">
                    <Label>Número *</Label>
                    <Input placeholder="123" {...register("endereco_numero")} />
                    {errors.endereco_numero && <p className="text-destructive text-xs">{errors.endereco_numero.message}</p>}
                  </div>

                  <div className="sm:col-span-2 space-y-1.5">
                    <Label>Rua *</Label>
                    <Input placeholder="Nome da rua" {...register("endereco_rua")} />
                    {errors.endereco_rua && <p className="text-destructive text-xs">{errors.endereco_rua.message}</p>}
                  </div>

                  <div className="space-y-1.5">
                    <Label>Bairro *</Label>
                    <Input placeholder="Bairro" {...register("endereco_bairro")} />
                    {errors.endereco_bairro && <p className="text-destructive text-xs">{errors.endereco_bairro.message}</p>}
                  </div>

                  <div className="space-y-1.5">
                    <Label>Cidade *</Label>
                    <Input placeholder="Cidade" {...register("endereco_cidade")} />
                    {errors.endereco_cidade && <p className="text-destructive text-xs">{errors.endereco_cidade.message}</p>}
                  </div>

                  <div className="space-y-1.5">
                    <Label>Estado *</Label>
                    <Input placeholder="SP" maxLength={2} className="uppercase" {...register("endereco_estado")} />
                    {errors.endereco_estado && <p className="text-destructive text-xs">{errors.endereco_estado.message}</p>}
                  </div>
                </div>

                <Button type="submit" className="w-full font-bold mt-2">
                  Próximo <ChevronRight className="w-4 h-4 ml-1" />
                </Button>
              </form>
            </motion.div>
          )}

          {passo === 2 && (
            <motion.div key="p2" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}>
              <h2 className="text-xl font-black text-center mb-1">Escolha seu plano</h2>
              <p className="text-muted-foreground text-sm text-center mb-6">Comece grátis, faça upgrade quando precisar</p>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
                {(Object.entries(planosInfo) as [Plano, typeof planosInfo.gratuito][]).map(([plano, info]) => (
                  <div key={plano} onClick={() => setPlanoSelecionado(plano)}
                    className={`border-2 rounded-2xl p-5 cursor-pointer transition-all ${
                      planoSelecionado === plano
                        ? "border-primary bg-primary/5 shadow-orange"
                        : "border-border hover:border-primary/40"
                    }`}>
                    <div className="flex items-center justify-between mb-3">
                      <h3 className="font-black">{info.nome}</h3>
                      {planoSelecionado === plano && (
                        <div className="w-5 h-5 rounded-full bg-primary flex items-center justify-center">
                          <Check className="w-3 h-3 text-white" />
                        </div>
                      )}
                    </div>
                    <div className="mb-4">
                      {info.preco === 0
                        ? <span className="text-2xl font-black text-foreground">Grátis</span>
                        : <span className="text-2xl font-black text-foreground">R$ {info.preco}<span className="text-sm font-normal text-muted-foreground">/mês</span></span>}
                    </div>
                    <ul className="space-y-1.5 text-xs text-muted-foreground">
                      <li>✓ {info.limiteClientes ? `Até ${info.limiteClientes} clientes` : "Clientes ilimitados"}</li>
                      <li>✓ {info.limiteProdutos ? `Até ${info.limiteProdutos} itens` : "Produtos ilimitados"}</li>
                      <li>✓ {info.limiteFuncionarios === 0 ? "Sem funcionários" : info.limiteFuncionarios ? `Até ${info.limiteFuncionarios} funcionários` : "Equipe ilimitada"}</li>
                      {info.agendamentoOnline && <li>✓ Agendamentos</li>}
                      {info.fidelidade && <li>✓ Programa fidelidade</li>}
                    </ul>
                  </div>
                ))}
              </div>

              {planoSelecionado !== "gratuito" && (
                <p className="text-center text-xs text-muted-foreground mb-4">
                  💳 Você será direcionado para o pagamento seguro.
                </p>
              )}

              <div className="flex gap-3">
                <Button variant="outline" onClick={() => setPasso(1)} className="flex-1">← Voltar</Button>
                <Button onClick={finalizarOnboarding} disabled={loading} className="flex-1 font-bold">
                  {loading
                    ? <><Loader2 className="w-4 h-4 animate-spin mr-2" />Salvando...</>
                    : planoSelecionado !== "gratuito"
                      ? "Ir para pagamento →"
                      : "Começar agora 🚀"
                  }
                </Button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  )
}
