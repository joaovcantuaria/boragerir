"use client"

import { useState, useRef } from "react"
import { useRouter } from "next/navigation"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { Loader2, Check, ChevronRight, Upload, Building2, User, Zap, Crown, Star, Calendar, LogOut, Trash2, AlertTriangle } from "lucide-react"
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
import { LogoFull, LogoIcon } from "@/components/ui/logo"

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
  const [loadingSair, setLoadingSair] = useState(false)
  const [confirmExcluir, setConfirmExcluir] = useState(false)
  const [loadingExcluir, setLoadingExcluir] = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)
  const router = useRouter()
  const supabase = createClient()

  async function sairDepois() {
    setLoadingSair(true)
    await supabase.auth.signOut()
    router.push("/login")
  }

  async function excluirConta() {
    setLoadingExcluir(true)
    try {
      // Deletar empresa se existir
      const { data: { user } } = await supabase.auth.getUser()
      if (user) {
        await supabase.from("empresas").delete().eq("user_id", user.id)
        // Fazer logout — a deleção completa da conta requer service role
        await supabase.auth.signOut()
      }
      toast.success("Dados removidos. Até logo!")
      router.push("/")
    } catch {
      toast.error("Erro ao excluir. Tente novamente.")
    }
    setLoadingExcluir(false)
  }

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
      // Empresa já criada — respeitar o plano que o usuário selecionou agora
      const planoFinalExistente = planoSelecionado ?? empresaExistente.plano
      const planoPagoExistente = planoFinalExistente !== "gratuito"

      if (planoPagoExistente) {
        // Se selecionou plano pago, atualizar o plano da empresa e ir para pagamento
        await supabase.from("empresas").update({
          plano: planoFinalExistente,
          plano_ativo: false,
        }).eq("id", empresaExistente.id)
        window.location.href = `/planos?plano=${planoFinalExistente}&novo=1`
      } else {
        // Selecionou gratuito — garantir que plano está como gratuito e ir para dashboard
        await supabase.from("empresas").update({
          plano: "gratuito",
          plano_ativo: true,
        }).eq("id", empresaExistente.id)
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
    // Garantia extra: nunca enviar gratuito como plano pago
    const planoFinal = planoSelecionado ?? "gratuito"
    const planoPago = planoFinal !== "gratuito"

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
      plano: planoFinal,
      // Plano pago: aguarda pagamento para ativar. Gratuito: ativo imediatamente
      plano_ativo: !planoPago,
      pontos_por_real: 1,
      pontos_para_desconto: 100,
    })
    if (error) {
      if (error.code === "23505") {
        // Empresa já existe, redirecionar
        if (planoPago) {
          window.location.href = `/planos?plano=${planoFinal}&novo=1`
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
      window.location.href = `/planos?plano=${planoFinal}&novo=1`
    } else {
      toast.success("Tudo pronto! Bem-vindo ao Bora Gerir 🚀")
      window.location.href = "/dashboard"
    }
  }

  const passos = [{ n: 1, label: "Seu negócio" }, { n: 2, label: "Plano" }]

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="w-full max-w-4xl">
        <div className="flex justify-center mb-10">
          <div className="flex flex-col items-center gap-3">
            <LogoIcon size={64} />
            <div className="flex items-baseline gap-1">
              <span className="font-black text-4xl text-foreground leading-none">Bora</span>
              <span className="font-black text-4xl text-primary leading-none">Gerir</span>
            </div>
          </div>
        </div>

        {/* Botões de saída — discretos no topo direito */}
        <div className="flex items-center justify-end gap-2 mb-4">
          <button onClick={sairDepois} disabled={loadingSair}
            className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors px-3 py-1.5 rounded-lg hover:bg-muted">
            {loadingSair ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <LogOut className="w-3.5 h-3.5" />}
            Continuar depois
          </button>
          <button onClick={() => setConfirmExcluir(true)}
            className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-red-500 transition-colors px-3 py-1.5 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20">
            <Trash2 className="w-3.5 h-3.5" />
            Excluir conta
          </button>
        </div>

        {/* Modal confirmação excluir */}
        {confirmExcluir && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
            <div className="bg-white dark:bg-[#1c1c1e] border border-border rounded-2xl p-6 w-full max-w-sm shadow-2xl space-y-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-red-100 dark:bg-red-900/30 flex items-center justify-center shrink-0">
                  <AlertTriangle className="w-5 h-5 text-red-500" />
                </div>
                <div>
                  <h3 className="font-black text-base">Excluir conta?</h3>
                  <p className="text-xs text-muted-foreground mt-0.5">Esta ação não pode ser desfeita.</p>
                </div>
              </div>
              <p className="text-sm text-muted-foreground">
                Todos os seus dados e informações cadastradas serão <strong className="text-foreground">permanentemente removidos</strong>. Você precisará criar uma nova conta para usar o Bora Gerir.
              </p>
              <div className="flex gap-2">
                <button onClick={() => setConfirmExcluir(false)}
                  className="flex-1 h-10 rounded-xl border border-border text-sm font-semibold text-muted-foreground hover:bg-muted transition-all">
                  Cancelar
                </button>
                <button onClick={excluirConta} disabled={loadingExcluir}
                  className="flex-1 h-10 rounded-xl bg-red-500 text-white text-sm font-bold hover:bg-red-600 transition-all disabled:opacity-50 flex items-center justify-center gap-2">
                  {loadingExcluir ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
                  Sim, excluir tudo
                </button>
              </div>
            </div>
          </div>
        )}

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
              <div className="text-center mb-8">
                <h2 className="text-2xl font-black mb-2">Escolha seu plano</h2>
                <p className="text-muted-foreground text-sm">Comece grátis. Faça upgrade quando precisar.</p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5 mb-6">

                {/* Agendamento Online */}
                <div onClick={() => setPlanoSelecionado("agenda")}
                  className={`rounded-2xl p-6 border flex flex-col relative cursor-pointer transition-all
                    bg-gradient-to-br from-violet-50 to-indigo-50 dark:from-violet-950/40 dark:to-indigo-950/40
                    ${planoSelecionado === "agenda" ? "border-violet-500 shadow-lg" : "border-violet-200 dark:border-violet-500/30 hover:border-violet-400"}`}>
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                    <span className="bg-violet-600 text-white text-[10px] font-black px-3 py-1 rounded-full whitespace-nowrap">SÓ AGENDA</span>
                  </div>
                  <div className="flex items-center gap-2 mb-4">
                    <div className="w-8 h-8 rounded-lg bg-violet-100 dark:bg-violet-500/20 flex items-center justify-center">
                      <Calendar className="w-4 h-4 text-violet-600 dark:text-violet-400" />
                    </div>
                    <div>
                      <p className="font-bold text-sm">Agendamento Online</p>
                      <span className="text-[10px] text-violet-500 font-medium">Para salões e estúdios</span>
                    </div>
                  </div>
                  <div className="mb-1">
                    <span className="text-3xl font-black text-violet-700 dark:text-violet-300">R$ 29</span>
                    <span className="text-sm text-violet-500">/mês</span>
                  </div>
                  <p className="text-xs mb-4 text-violet-400">ou R$ 290/ano</p>
                  <ul className="space-y-2 flex-1 mb-5">
                    {["Link de agendamento online", "Gestão de agenda completa", "Até 3 colaboradores", "QR Code para clientes", "Notificações automáticas"].map(r => (
                      <li key={r} className="flex items-center gap-2 text-sm text-violet-700 dark:text-violet-300">
                        <Check className="w-3.5 h-3.5 shrink-0 text-violet-500" />{r}
                      </li>
                    ))}
                  </ul>
                  <button onClick={() => setPlanoSelecionado("agenda")}
                    className={`w-full py-2.5 rounded-xl font-bold text-sm transition-all ${planoSelecionado === "agenda" ? "bg-violet-600 text-white" : "border border-violet-300 text-violet-600 hover:bg-violet-50"}`}>
                    {planoSelecionado === "agenda" ? "✓ Selecionado" : "Selecionar"}
                  </button>
                </div>

                {/* Gratuito */}
                <div onClick={() => setPlanoSelecionado("gratuito")}
                  className={`rounded-2xl p-6 border flex flex-col cursor-pointer transition-all bg-white dark:bg-white/[0.02]
                    ${planoSelecionado === "gratuito" ? "border-[#F26E1D] shadow-lg" : "border-gray-200 dark:border-white/10 hover:border-gray-300"}`}>
                  <div className="flex items-center gap-2 mb-4">
                    <div className="w-8 h-8 rounded-lg bg-gray-100 dark:bg-white/[0.06] flex items-center justify-center">
                      <Star className="w-4 h-4 text-gray-400" />
                    </div>
                    <p className="font-bold text-sm">Gratuito</p>
                  </div>
                  <div className="mb-5">
                    <span className="text-3xl font-black">R$ 0</span>
                    <span className="text-muted-foreground text-sm">/mês</span>
                  </div>
                  <ul className="space-y-2 flex-1 mb-5">
                    {["Até 15 clientes", "Até 10 produtos/serviços", "1 usuário", "PDFs com marca d'água", "Relatórios básicos"].map(r => (
                      <li key={r} className="flex items-center gap-2 text-sm text-muted-foreground">
                        <Check className="w-3.5 h-3.5 shrink-0 text-gray-300 dark:text-gray-600" />{r}
                      </li>
                    ))}
                  </ul>
                  <button onClick={() => setPlanoSelecionado("gratuito")}
                    className={`w-full py-2.5 rounded-xl font-bold text-sm transition-all ${planoSelecionado === "gratuito" ? "bg-[#F26E1D] text-white" : "border border-gray-200 dark:border-white/10 text-muted-foreground hover:border-gray-300"}`}>
                    {planoSelecionado === "gratuito" ? "✓ Selecionado" : "Selecionar"}
                  </button>
                </div>

                {/* Básico */}
                <div onClick={() => setPlanoSelecionado("basico")}
                  className={`rounded-2xl p-6 border flex flex-col cursor-pointer transition-all bg-white dark:bg-white/[0.02]
                    ${planoSelecionado === "basico" ? "border-[#F26E1D] shadow-lg" : "border-gray-200 dark:border-white/10 hover:border-gray-300"}`}>
                  <div className="flex items-center gap-2 mb-4">
                    <div className="w-8 h-8 rounded-lg bg-[#F26E1D]/10 flex items-center justify-center">
                      <Zap className="w-4 h-4 text-[#F26E1D]" />
                    </div>
                    <p className="font-bold text-sm">Básico</p>
                  </div>
                  <div className="mb-1">
                    <span className="text-3xl font-black">R$ 49</span>
                    <span className="text-muted-foreground text-sm">/mês</span>
                  </div>
                  <p className="text-xs text-muted-foreground mb-5">ou R$ 490/ano</p>
                  <ul className="space-y-2 flex-1 mb-5">
                    {["Até 200 clientes", "Produtos ilimitados", "Até 3 funcionários", "Gestão de agendamentos", "Relatórios completos"].map(r => (
                      <li key={r} className="flex items-center gap-2 text-sm text-muted-foreground">
                        <Check className="w-3.5 h-3.5 shrink-0 text-[#F26E1D]" />{r}
                      </li>
                    ))}
                  </ul>
                  <button onClick={() => setPlanoSelecionado("basico")}
                    className={`w-full py-2.5 rounded-xl font-bold text-sm transition-all ${planoSelecionado === "basico" ? "bg-[#F26E1D] text-white" : "border border-gray-200 dark:border-white/10 text-muted-foreground hover:border-gray-300"}`}>
                    {planoSelecionado === "basico" ? "✓ Selecionado" : "Selecionar"}
                  </button>
                </div>

                {/* Profissional */}
                <div onClick={() => setPlanoSelecionado("profissional")}
                  className={`rounded-2xl p-6 border flex flex-col relative cursor-pointer transition-all
                    ${planoSelecionado === "profissional"
                      ? "bg-[#F26E1D] border-[#F26E1D] text-white shadow-lg shadow-orange-200"
                      : "bg-white dark:bg-white/[0.02] border-gray-200 dark:border-white/10 hover:border-[#F26E1D]/50"}`}>
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                    <span className="bg-gray-900 dark:bg-white text-white dark:text-gray-900 text-[10px] font-black px-3 py-1 rounded-full">MAIS POPULAR</span>
                  </div>
                  <div className="flex items-center gap-2 mb-4">
                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${planoSelecionado === "profissional" ? "bg-white/20" : "bg-[#F26E1D]/10"}`}>
                      <Crown className={`w-4 h-4 ${planoSelecionado === "profissional" ? "text-white" : "text-[#F26E1D]"}`} />
                    </div>
                    <p className="font-bold text-sm">Profissional</p>
                  </div>
                  <div className="mb-1">
                    <span className="text-3xl font-black">R$ 99</span>
                    <span className={`text-sm ${planoSelecionado === "profissional" ? "text-white/70" : "text-muted-foreground"}`}>/mês</span>
                  </div>
                  <p className={`text-xs mb-5 ${planoSelecionado === "profissional" ? "text-white/60" : "text-muted-foreground"}`}>ou R$ 990/ano</p>
                  <ul className="space-y-2 flex-1 mb-5">
                    {["Clientes ilimitados", "Funcionários ilimitados", "Agendamento online público", "Link e QR Code de agenda", "Lembretes automáticos", "Programa de fidelidade", "Relatórios avançados", "Exportação Excel"].map(r => (
                      <li key={r} className={`flex items-center gap-2 text-sm ${planoSelecionado === "profissional" ? "text-white/90" : "text-muted-foreground"}`}>
                        <Check className={`w-3.5 h-3.5 shrink-0 ${planoSelecionado === "profissional" ? "text-white" : "text-[#F26E1D]"}`} />{r}
                      </li>
                    ))}
                  </ul>
                  <button onClick={() => setPlanoSelecionado("profissional")}
                    className={`w-full py-2.5 rounded-xl font-bold text-sm transition-all ${planoSelecionado === "profissional" ? "bg-white text-[#F26E1D]" : "bg-[#F26E1D] text-white hover:bg-[#e05e10]"}`}>
                    {planoSelecionado === "profissional" ? "✓ Selecionado" : "Selecionar"}
                  </button>
                </div>
              </div>

              {planoSelecionado !== "gratuito" && (
                <p className="text-center text-xs text-muted-foreground mb-4">
                  🔒 Pagamento seguro via Mercado Pago · Cancele quando quiser
                </p>
              )}

              <div className="flex gap-3">
                <Button variant="outline" onClick={() => setPasso(1)} className="flex-1">← Voltar</Button>
                <Button onClick={finalizarOnboarding} disabled={loading} className="flex-1 font-bold">
                  {loading
                    ? <><Loader2 className="w-4 h-4 animate-spin mr-2" />Salvando...</>
                    : planoSelecionado !== "gratuito" ? "Ir para pagamento →" : "Começar agora 🚀"
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
