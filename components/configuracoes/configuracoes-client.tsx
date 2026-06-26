"use client"

import { useState, useRef } from "react"
import { useForm } from "react-hook-form"
import { z } from "zod"
import { zodResolver } from "@hookform/resolvers/zod"
import {
  Loader2, Store, CreditCard, Tag, Star, Lock,
  Plus, Trash2, Check, Upload, Camera
} from "lucide-react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Separator } from "@/components/ui/separator"
import { createClient } from "@/lib/supabase/client"
import {
  formatarTelefone, formatarCEP, areasAtuacao,
  formatarCPF, formatarCNPJ, validarCPF, validarCNPJ
} from "@/lib/utils"
import { planosInfo } from "@/types"
import type { Empresa, Categoria } from "@/types"

const schemaNegocio = z.object({
  nome: z.string().min(2),
  area_atuacao: z.string().min(1),
  telefone: z.string().min(10),
  endereco_rua: z.string().min(2),
  endereco_numero: z.string().min(1),
  endereco_bairro: z.string().min(2),
  endereco_cidade: z.string().min(2),
  endereco_estado: z.string().length(2),
  endereco_cep: z.string().min(8),
  pontos_por_real: z.string(),
  pontos_para_desconto: z.string(),
})

export function ConfiguracoesClient({
  empresa: empInit, userEmail, categorias: catInit,
}: {
  empresa: Empresa; userEmail: string; categorias: Categoria[]
}) {
  const [empresa, setEmpresa] = useState(empInit)
  const [categorias, setCategorias] = useState(catInit)
  const [loading, setLoading] = useState(false)
  const [uploadingLogo, setUploadingLogo] = useState(false)
  const [novaCategoria, setNovaCategoria] = useState("")
  const [tipoCat, setTipoCat] = useState<"produto" | "servico">("servico")
  const [novaSenha, setNovaSenha] = useState("")
  const logoRef = useRef<HTMLInputElement>(null)
  const supabase = createClient()

  const { register, handleSubmit, setValue } = useForm({
    resolver: zodResolver(schemaNegocio),
    defaultValues: {
      nome: empresa.nome,
      area_atuacao: empresa.area_atuacao,
      telefone: empresa.telefone,
      endereco_rua: empresa.endereco_rua,
      endereco_numero: empresa.endereco_numero,
      endereco_bairro: empresa.endereco_bairro,
      endereco_cidade: empresa.endereco_cidade,
      endereco_estado: empresa.endereco_estado,
      endereco_cep: empresa.endereco_cep,
      pontos_por_real: empresa.pontos_por_real?.toString() ?? "1",
      pontos_para_desconto: empresa.pontos_para_desconto?.toString() ?? "100",
    },
  })

  async function handleLogoUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    if (file.size > 2 * 1024 * 1024) { toast.error("Logo deve ter no máximo 2MB"); return }

    setUploadingLogo(true)
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    const ext = file.name.split(".").pop()
    const path = `${user.id}/logo.${ext}`
    const { error: uploadError } = await supabase.storage
      .from("logos").upload(path, file, { upsert: true })

    if (uploadError) { toast.error("Erro ao enviar logo."); setUploadingLogo(false); return }

    const { data: urlData } = supabase.storage.from("logos").getPublicUrl(path)
    const logoUrl = `${urlData.publicUrl}?t=${Date.now()}`

    await supabase.from("empresas").update({ logo_url: logoUrl }).eq("id", empresa.id)
    setEmpresa((prev) => ({ ...prev, logo_url: logoUrl }))
    toast.success("Logo atualizada!")
    setUploadingLogo(false)
  }

  async function salvarNegocio(data: z.infer<typeof schemaNegocio>) {
    setLoading(true)
    const { error } = await supabase.from("empresas").update({
      nome: data.nome,
      area_atuacao: data.area_atuacao,
      telefone: data.telefone,
      endereco_rua: data.endereco_rua,
      endereco_numero: data.endereco_numero,
      endereco_bairro: data.endereco_bairro,
      endereco_cidade: data.endereco_cidade,
      endereco_estado: data.endereco_estado.toUpperCase(),
      endereco_cep: data.endereco_cep,
      pontos_por_real: parseFloat(data.pontos_por_real) || 1,
      pontos_para_desconto: parseFloat(data.pontos_para_desconto) || 100,
    }).eq("id", empresa.id)

    if (error) { toast.error("Erro ao salvar."); setLoading(false); return }
    setEmpresa((prev) => ({ ...prev, nome: data.nome }))
    toast.success("Dados salvos!")
    setLoading(false)
  }

  async function adicionarCategoria() {
    if (!novaCategoria.trim()) return
    const { data: cat, error } = await supabase.from("categorias")
      .insert({ empresa_id: empresa.id, nome: novaCategoria.trim(), tipo: tipoCat })
      .select().single()
    if (error) { toast.error("Erro ao criar."); return }
    setCategorias((prev) => [...prev, cat])
    setNovaCategoria("")
    toast.success("Categoria criada!")
  }

  async function removerCategoria(id: string) {
    const { error } = await supabase.from("categorias").delete().eq("id", id)
    if (error) { toast.error("Erro ao remover."); return }
    setCategorias((prev) => prev.filter((c) => c.id !== id))
    toast.success("Categoria removida.")
  }

  async function alterarSenha() {
    if (novaSenha.length < 6) { toast.error("Senha deve ter ao menos 6 caracteres."); return }
    const { error } = await supabase.auth.updateUser({ password: novaSenha })
    if (error) { toast.error("Erro ao alterar senha."); return }
    setNovaSenha("")
    toast.success("Senha alterada!")
  }

  const planoAtual = planosInfo[empresa.plano]

  return (
    <div className="space-y-6 max-w-3xl">
      <div>
        <h1 className="text-2xl font-black">Configurações</h1>
        <p className="text-muted-foreground text-sm">Gerencie todos os dados do seu estabelecimento</p>
      </div>

      <Tabs defaultValue="negocio">
        <TabsList className="grid grid-cols-4 w-full">
          <TabsTrigger value="negocio" className="gap-1.5 text-xs font-semibold">
            <Store className="w-3.5 h-3.5" /><span className="hidden sm:inline">Negócio</span>
          </TabsTrigger>
          <TabsTrigger value="plano" className="gap-1.5 text-xs font-semibold">
            <CreditCard className="w-3.5 h-3.5" /><span className="hidden sm:inline">Plano</span>
          </TabsTrigger>
          <TabsTrigger value="categorias" className="gap-1.5 text-xs font-semibold">
            <Tag className="w-3.5 h-3.5" /><span className="hidden sm:inline">Categorias</span>
          </TabsTrigger>
          <TabsTrigger value="conta" className="gap-1.5 text-xs font-semibold">
            <Lock className="w-3.5 h-3.5" /><span className="hidden sm:inline">Conta</span>
          </TabsTrigger>
        </TabsList>

        {/* ── ABA NEGÓCIO ── */}
        <TabsContent value="negocio" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle>Dados do estabelecimento</CardTitle>
              <CardDescription>Aparece nos seus recibos e orçamentos</CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit(salvarNegocio)} className="space-y-5">
                {/* Logo */}
                <div className="flex items-center gap-5">
                  <div className="relative">
                    <div
                      className="w-20 h-20 rounded-2xl border-2 border-border overflow-hidden bg-muted flex items-center justify-center cursor-pointer group"
                      onClick={() => logoRef.current?.click()}
                    >
                      {empresa.logo_url ? (
                        <>
                          <img src={empresa.logo_url} alt="Logo" className="w-full h-full object-cover" />
                          <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center rounded-2xl">
                            <Camera className="w-5 h-5 text-white" />
                          </div>
                        </>
                      ) : (
                        <div className="flex flex-col items-center gap-1 text-muted-foreground">
                          {uploadingLogo ? <Loader2 className="w-6 h-6 animate-spin" /> : <Upload className="w-6 h-6" />}
                          <span className="text-[10px]">Logo</span>
                        </div>
                      )}
                    </div>
                    <input ref={logoRef} type="file" accept="image/*" className="hidden" onChange={handleLogoUpload} />
                  </div>
                  <div>
                    <p className="font-semibold text-sm">Logo do estabelecimento</p>
                    <p className="text-xs text-muted-foreground mt-0.5">PNG ou JPG, máx 2MB. Aparece nos recibos.</p>
                    <button type="button" onClick={() => logoRef.current?.click()}
                      className="text-xs text-primary font-bold mt-1.5 hover:underline">
                      {empresa.logo_url ? "Trocar logo" : "Enviar logo"}
                    </button>
                  </div>
                </div>

                {/* Documento (somente leitura — não pode alterar) */}
                <div className="p-3 bg-muted rounded-xl text-sm">
                  <span className="text-muted-foreground">
                    {empresa.tipo_documento?.toUpperCase() ?? "Documento"}:{" "}
                  </span>
                  <span className="font-semibold">
                    {empresa.tipo_documento === "cnpj"
                      ? formatarCNPJ(empresa.documento ?? "")
                      : formatarCPF(empresa.documento ?? "")}
                  </span>
                  <span className="text-xs text-muted-foreground ml-2">(não pode ser alterado)</span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="sm:col-span-2 space-y-1.5">
                    <Label>Nome do estabelecimento</Label>
                    <Input {...register("nome")} />
                  </div>

                  <div className="sm:col-span-2 space-y-1.5">
                    <Label>Área de atuação</Label>
                    <Select defaultValue={empresa.area_atuacao} onValueChange={(v) => setValue("area_atuacao", v)}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {areasAtuacao.map((a) => <SelectItem key={a} value={a}>{a}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-1.5">
                    <Label>Telefone</Label>
                    <Input {...register("telefone")}
                      onChange={(e) => { const f = formatarTelefone(e.target.value); e.target.value = f; setValue("telefone", f) }} />
                  </div>

                  <div className="space-y-1.5">
                    <Label>CEP</Label>
                    <Input {...register("endereco_cep")}
                      onChange={(e) => { const f = formatarCEP(e.target.value); e.target.value = f; setValue("endereco_cep", f) }} />
                  </div>

                  <div className="space-y-1.5">
                    <Label>Rua</Label>
                    <Input {...register("endereco_rua")} />
                  </div>

                  <div className="space-y-1.5">
                    <Label>Número</Label>
                    <Input {...register("endereco_numero")} />
                  </div>

                  <div className="space-y-1.5">
                    <Label>Bairro</Label>
                    <Input {...register("endereco_bairro")} />
                  </div>

                  <div className="space-y-1.5">
                    <Label>Cidade</Label>
                    <Input {...register("endereco_cidade")} />
                  </div>

                  <div className="space-y-1.5">
                    <Label>Estado</Label>
                    <Input maxLength={2} className="uppercase" {...register("endereco_estado")} />
                  </div>
                </div>

                <Separator />
                <div className="flex items-center gap-2">
                  <Star className="w-4 h-4 text-primary" />
                  <span className="font-bold text-sm">Programa de Fidelidade</span>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <Label>Pontos por R$ 1 gasto</Label>
                    <Input type="number" step="0.1" min="0" {...register("pontos_por_real")} />
                  </div>
                  <div className="space-y-1.5">
                    <Label>Pontos para R$ 1 de desconto</Label>
                    <Input type="number" step="1" min="1" {...register("pontos_para_desconto")} />
                  </div>
                </div>

                <Button type="submit" disabled={loading} className="font-bold">
                  {loading ? <><Loader2 className="w-4 h-4 animate-spin mr-2" />Salvando...</> : "Salvar alterações"}
                </Button>
              </form>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ── ABA PLANO ── */}
        <TabsContent value="plano" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle>Meu Plano</CardTitle>
              <CardDescription>Plano atual: <strong>{planoAtual.nome}</strong></CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="p-4 border-2 border-primary bg-primary/5 rounded-2xl shadow-orange">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="font-black text-lg">{planoAtual.nome}</h3>
                    <p className="text-muted-foreground text-sm">
                      {planoAtual.preco === 0 ? "Gratuito" : `R$ ${planoAtual.preco}/mês`}
                    </p>
                  </div>
                  <Badge className="bg-primary text-white gap-1 font-bold">
                    <Check className="w-3 h-3" />Ativo
                  </Badge>
                </div>
                <ul className="mt-3 space-y-1.5 text-sm text-muted-foreground">
                  <li>✓ {planoAtual.limiteClientes ? `Até ${planoAtual.limiteClientes} clientes` : "Clientes ilimitados"}</li>
                  <li>✓ {planoAtual.limiteProdutos ? `Até ${planoAtual.limiteProdutos} itens` : "Produtos ilimitados"}</li>
                  {planoAtual.agendamentoOnline && <li>✓ Agendamentos online</li>}
                  {planoAtual.fidelidade && <li>✓ Programa de fidelidade</li>}
                  {planoAtual.lembretesAutomaticos && <li>✓ Lembretes automáticos</li>}
                  {planoAtual.marcaDagua && <li className="text-yellow-600">⚠ PDFs com marca d&apos;água</li>}
                </ul>
              </div>

              {empresa.plano !== "profissional" && (
                <div>
                  <h3 className="font-bold mb-3">Fazer upgrade</h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {(["basico", "profissional"] as const).filter((p) => p !== empresa.plano).map((p) => (
                      <div key={p} className="border border-border rounded-2xl p-4 hover:border-primary/40 transition-colors">
                        <h4 className="font-black">{planosInfo[p].nome}</h4>
                        <p className="text-2xl font-black my-1">
                          R$ {planosInfo[p].preco}
                          <span className="text-sm font-normal text-muted-foreground">/mês</span>
                        </p>
                        {/* Redireciona para a página de planos com checkout real */}
                        <Button
                          variant="outline"
                          className="w-full mt-2 font-bold border-primary text-primary hover:bg-primary hover:text-white"
                          onClick={() => window.location.href = "/planos"}
                        >
                          Assinar {planosInfo[p].nome}
                        </Button>
                      </div>
                    ))}
                  </div>
                  <p className="text-xs text-muted-foreground mt-2">💳 Pagamentos processados com segurança pelo <strong>Mercado Pago</strong>. Cancele quando quiser.</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* ── ABA CATEGORIAS ── */}
        <TabsContent value="categorias" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle>Categorias</CardTitle>
              <CardDescription>Organize produtos e serviços por categoria</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex gap-2">
                <Input placeholder="Nova categoria..." value={novaCategoria}
                  onChange={(e) => setNovaCategoria(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && adicionarCategoria()}
                  className="flex-1" />
                <Select value={tipoCat} onValueChange={(v: "produto" | "servico") => setTipoCat(v)}>
                  <SelectTrigger className="w-32"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="servico">Serviço</SelectItem>
                    <SelectItem value="produto">Produto</SelectItem>
                  </SelectContent>
                </Select>
                <Button onClick={adicionarCategoria} size="icon" className="font-bold shrink-0">
                  <Plus className="w-4 h-4" />
                </Button>
              </div>
              {categorias.length > 0 ? (
                <div className="space-y-1">
                  {categorias.map((cat) => (
                    <div key={cat.id} className="flex items-center justify-between py-2.5 px-3 rounded-xl hover:bg-muted transition-colors">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium">{cat.nome}</span>
                        <Badge variant="secondary" className="text-xs capitalize">{cat.tipo}</Badge>
                      </div>
                      <Button variant="ghost" size="xs" className="text-destructive hover:text-destructive"
                        onClick={() => removerCategoria(cat.id)}>
                        <Trash2 className="w-3.5 h-3.5" />
                      </Button>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground text-center py-4">Nenhuma categoria criada</p>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* ── ABA CONTA ── */}
        <TabsContent value="conta" className="mt-4">
          <Card>
            <CardHeader><CardTitle>Minha Conta</CardTitle></CardHeader>
            <CardContent className="space-y-5">
              <div className="space-y-1.5">
                <Label>E-mail</Label>
                <Input value={userEmail} disabled className="opacity-60 cursor-not-allowed" />
                <p className="text-xs text-muted-foreground">Entre em contato com o suporte para alterar o e-mail.</p>
              </div>
              <Separator />
              <div className="space-y-3">
                <h3 className="font-bold">Alterar senha</h3>
                <div className="space-y-1.5">
                  <Label>Nova senha</Label>
                  <Input type="password" placeholder="Mínimo 6 caracteres"
                    value={novaSenha} onChange={(e) => setNovaSenha(e.target.value)} />
                </div>
                <Button onClick={alterarSenha} variant="outline" className="font-bold border-primary text-primary hover:bg-primary hover:text-white">
                  Alterar senha
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
