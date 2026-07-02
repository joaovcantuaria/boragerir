"use client"

import { useState, useRef, useEffect } from "react"
import { useForm } from "react-hook-form"
import { z } from "zod"
import { zodResolver } from "@hookform/resolvers/zod"
import {
  Loader2, Store, CreditCard, Tag, Star, Lock,
  Plus, Trash2, Check, Upload, Camera, FileText, Database
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
import { AreaAtuacaoSelect } from "@/components/ui/area-atuacao-select"
import { planosInfo } from "@/types"
import type { Empresa, Categoria } from "@/types"
import { BackupClient } from "@/components/configuracoes/backup-client"

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
  const [docCorPrimaria, setDocCorPrimaria] = useState((empresa as any).doc_cor_primaria ?? "#F26E1D")
  const [docMsgRecibo, setDocMsgRecibo] = useState((empresa as any).doc_mensagem_recibo ?? "Obrigado pela preferência!")
  const [docMsgOrcamento, setDocMsgOrcamento] = useState((empresa as any).doc_mensagem_orcamento ?? "Este orçamento não tem valor fiscal.")
  const [docMostrarCnpj, setDocMostrarCnpj] = useState((empresa as any).doc_mostrar_cnpj ?? true)
  const [docMostrarEndereco, setDocMostrarEndereco] = useState((empresa as any).doc_mostrar_endereco ?? true)
  const [docMostrarTelefone, setDocMostrarTelefone] = useState((empresa as any).doc_mostrar_telefone ?? true)
  const [loadingDoc, setLoadingDoc] = useState(false)
  const [nomeUsuario, setNomeUsuario] = useState("")
  const [telefoneUsuario, setTelefoneUsuario] = useState("")
  const [loadingPessoal, setLoadingPessoal] = useState(false)
  const [novoCnpj, setNovoCnpj] = useState("")
  const [loadingCnpj, setLoadingCnpj] = useState(false)
  const [loadingContaDados, setLoadingContaDados] = useState(true)
  const logoRef = useRef<HTMLInputElement>(null)
  const supabase = createClient()

  // Carregar dados do usuário ao montar
  useEffect(() => {
    async function carregarDadosUsuario() {
      const { data: { user } } = await supabase.auth.getUser()
      if (user?.user_metadata) {
        setNomeUsuario(user.user_metadata.nome_completo ?? user.user_metadata.full_name ?? "")
        setTelefoneUsuario(user.user_metadata.telefone ?? "")
      }
      setLoadingContaDados(false)
    }
    carregarDadosUsuario()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const { register, handleSubmit, setValue, watch } = useForm({
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

  async function salvarDocumentos() {
    setLoadingDoc(true)
    const { error } = await supabase.from("empresas").update({
      doc_cor_primaria: docCorPrimaria,
      doc_mensagem_recibo: docMsgRecibo,
      doc_mensagem_orcamento: docMsgOrcamento,
      doc_mostrar_cnpj: docMostrarCnpj,
      doc_mostrar_endereco: docMostrarEndereco,
      doc_mostrar_telefone: docMostrarTelefone,
    } as any).eq("id", empresa.id)
    if (error) { toast.error("Erro ao salvar."); setLoadingDoc(false); return }
    toast.success("Configurações dos documentos salvas!")
    setLoadingDoc(false)
  }

  async function salvarDadosPessoais() {
    setLoadingPessoal(true)
    const { error } = await supabase.auth.updateUser({
      data: { nome_completo: nomeUsuario, telefone: telefoneUsuario },
    })
    if (error) { toast.error("Erro ao salvar."); setLoadingPessoal(false); return }
    toast.success("Dados pessoais salvos!")
    setLoadingPessoal(false)
  }

  async function adicionarCnpj() {
    const cnpjLimpo = novoCnpj.replace(/\D/g, "")
    if (!validarCNPJ(novoCnpj)) { toast.error("CNPJ inválido."); return }
    setLoadingCnpj(true)
    const { error } = await supabase.from("empresas").update({
      cnpj_adicional: cnpjLimpo,
      tipo_documento_principal: "cnpj",
    } as any).eq("id", empresa.id)
    if (error) { toast.error("Erro ao salvar CNPJ."); setLoadingCnpj(false); return }
    setEmpresa((prev) => ({ ...prev, documento: cnpjLimpo, tipo_documento: "cnpj" } as any))
    toast.success("CNPJ adicionado! Documentos passarão a usar o CNPJ.")
    setLoadingCnpj(false)
  }

  async function alterarSenha() {
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
        <TabsList className="grid grid-cols-6 w-full">
          <TabsTrigger value="negocio" className="gap-1.5 text-xs font-semibold">
            <Store className="w-3.5 h-3.5" /><span className="hidden sm:inline">Negócio</span>
          </TabsTrigger>
          <TabsTrigger value="plano" className="gap-1.5 text-xs font-semibold">
            <CreditCard className="w-3.5 h-3.5" /><span className="hidden sm:inline">Plano</span>
          </TabsTrigger>
          <TabsTrigger value="categorias" className="gap-1.5 text-xs font-semibold">
            <Tag className="w-3.5 h-3.5" /><span className="hidden sm:inline">Categorias</span>
          </TabsTrigger>
          <TabsTrigger value="documentos" className="gap-1.5 text-xs font-semibold">
            <FileText className="w-3.5 h-3.5" /><span className="hidden sm:inline">Documentos</span>
          </TabsTrigger>
          <TabsTrigger value="conta" className="gap-1.5 text-xs font-semibold">
            <Lock className="w-3.5 h-3.5" /><span className="hidden sm:inline">Conta</span>
          </TabsTrigger>
          <TabsTrigger value="backup" className="gap-1.5 text-xs font-semibold">
            <Database className="w-3.5 h-3.5" /><span className="hidden sm:inline">Backup</span>
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

                {/* Adicionar CNPJ — só para quem tem CPF */}
                {empresa.tipo_documento === "cpf" && (
                  <div className="rounded-xl border border-border p-4 space-y-3">
                    <div>
                      <p className="text-sm font-semibold">Adicionar CNPJ</p>
                      <p className="text-xs text-muted-foreground mt-0.5">Após adicionar, todos os documentos passarão a usar o CNPJ automaticamente.</p>
                    </div>
                    <div className="flex gap-2">
                      <Input
                        placeholder="00.000.000/0001-00"
                        maxLength={18}
                        value={novoCnpj}
                        onChange={(e) => { const f = formatarCNPJ(e.target.value); e.target.value = f; setNovoCnpj(f) }}
                        className="flex-1"
                      />
                      <Button onClick={adicionarCnpj} disabled={loadingCnpj || novoCnpj.length < 14} variant="outline"
                        className="font-bold border-primary text-primary hover:bg-primary hover:text-white shrink-0">
                        {loadingCnpj ? <Loader2 className="w-4 h-4 animate-spin" /> : "Adicionar"}
                      </Button>
                    </div>
                  </div>
                )}

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="sm:col-span-2 space-y-1.5">
                    <Label>Nome do estabelecimento</Label>
                    <Input {...register("nome")} />
                  </div>

                  <div className="sm:col-span-2 space-y-1.5">
                    <Label>Área de atuação</Label>
                    <AreaAtuacaoSelect
                      value={watch("area_atuacao")}
                      onChange={(v) => setValue("area_atuacao", v)}
                      placeholder="Selecione ou busque sua área..."
                    />
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
                <p className="text-xs text-muted-foreground -mt-2">
                  Configure como seus clientes acumulam e utilizam pontos de fidelidade.
                </p>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <Label>Pontos ganhos por R$ 1 gasto</Label>
                    <Input type="number" step="0.1" min="0" {...register("pontos_por_real")} />
                    <p className="text-[10px] text-muted-foreground">Ex: 1 = cliente ganha 1 ponto por real gasto</p>
                  </div>
                  <div className="space-y-1.5">
                    <Label>Pontos necessários para R$ 1 de desconto</Label>
                    <Input type="number" step="1" min="1" {...register("pontos_para_desconto")} />
                    <p className="text-[10px] text-muted-foreground">Ex: 100 = a cada 100 pontos, R$ 1 de desconto</p>
                  </div>
                </div>
                <div className="rounded-lg bg-muted/60 border border-border p-4 space-y-2">
                  <p className="text-xs font-semibold text-foreground">Como funciona na prática:</p>
                  <div className="text-xs text-muted-foreground space-y-1">
                    <p>• Cliente compra R$ 100 → ganha <strong className="text-foreground">{watch("pontos_por_real") ? Math.floor(100 * parseFloat(watch("pontos_por_real") || "1")) : 100} pontos</strong></p>
                    <p>• Ao usar {watch("pontos_para_desconto") || 100} pontos → ganha <strong className="text-foreground">R$ 1,00 de desconto</strong></p>
                    <p>• Desconto é aplicado automaticamente na tela de Nova Venda quando o cliente é selecionado</p>
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
        <TabsContent value="plano" className="mt-4 space-y-5">
          {/* Plano atual — card premium */}
          <div className="relative rounded-2xl overflow-hidden border border-[#F26E1D]/40">
            {/* Gradiente de fundo sutil */}
            <div className="absolute inset-0 bg-gradient-to-br from-[#F26E1D]/8 via-transparent to-transparent pointer-events-none" />
            <div className="relative px-6 pt-6 pb-5">
              <div className="flex items-start justify-between gap-4">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <div className="w-1.5 h-1.5 rounded-full bg-[#F26E1D] animate-pulse" />
                    <span className="text-xs font-semibold text-[#F26E1D] uppercase tracking-widest">Plano ativo</span>
                  </div>
                  <h2 className="text-3xl font-black tracking-tight">{planoAtual.nome}</h2>
                  <p className="text-muted-foreground text-sm">
                    {planoAtual.preco === 0 ? "Gratuito para sempre" : `R$ ${planoAtual.preco} / mês`}
                  </p>
                </div>
                <div
                  className="w-14 h-14 rounded-2xl flex items-center justify-center text-2xl shrink-0"
                  style={{ background: "linear-gradient(135deg, #F26E1D22, #F26E1D44)", border: "1px solid #F26E1D33" }}
                >
                  {planoAtual.preco === 0 ? "🆓" : planoAtual.preco === 29 ? "📅" : planoAtual.preco === 49 ? "⚡" : "👑"}
                </div>
              </div>

              {/* Divisor */}
              <div className="my-4 border-t border-border/60" />

              {/* Features em grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {[
                  planoAtual.limiteClientes ? `Até ${planoAtual.limiteClientes} clientes` : "Clientes ilimitados",
                  planoAtual.limiteProdutos ? `Até ${planoAtual.limiteProdutos} itens` : "Produtos ilimitados",
                  planoAtual.agendamentoOnline ? "Agendamento online" : null,
                  planoAtual.fidelidade ? "Programa de fidelidade" : null,
                  planoAtual.lembretesAutomaticos ? "Lembretes automáticos" : null,
                  planoAtual.relatoriosAvancados ? "Relatórios avançados" : null,
                  planoAtual.exportacaoExcel ? "Exportação Excel" : null,
                ].filter(Boolean).map((item) => (
                  <div key={item} className="flex items-center gap-2.5 text-sm">
                    <div
                      className="w-5 h-5 rounded-full flex items-center justify-center shrink-0"
                      style={{ background: "linear-gradient(135deg, #F26E1D, #e05e10)" }}
                    >
                      <Check className="w-3 h-3 text-white" strokeWidth={2.5} />
                    </div>
                    <span className="text-foreground/80">{item}</span>
                  </div>
                ))}
                {planoAtual.marcaDagua && (
                  <div className="flex items-center gap-2.5 text-sm">
                    <div className="w-5 h-5 rounded-full bg-amber-500/15 flex items-center justify-center shrink-0">
                      <span className="text-[9px]">⚠</span>
                    </div>
                    <span className="text-amber-600 dark:text-amber-400">PDFs com marca d&apos;água</span>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Upgrade */}
          {empresa.plano !== "profissional" && (
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <div className="h-px flex-1 bg-border" />
                <span className="text-xs font-semibold text-muted-foreground uppercase tracking-widest px-2">Fazer upgrade</span>
                <div className="h-px flex-1 bg-border" />
              </div>

              {(["agenda", "basico", "profissional"] as const).filter((p) => p !== empresa.plano).map((p) => (
                <div
                  key={p}
                  className={`group relative rounded-2xl border transition-all duration-200 p-5 cursor-pointer overflow-hidden ${
                    p === "agenda"
                      ? "border-violet-200 dark:border-violet-500/30 hover:border-violet-400 dark:hover:border-violet-400"
                      : "border-border hover:border-[#F26E1D]/50"
                  }`}
                  onClick={() => window.location.href = "/planos"}
                >
                  <div className={`absolute inset-0 transition-all duration-300 pointer-events-none ${
                    p === "agenda"
                      ? "group-hover:bg-violet-500/5"
                      : "bg-gradient-to-r from-[#F26E1D]/0 to-[#F26E1D]/0 group-hover:from-[#F26E1D]/4"
                  }`} />
                  <div className="relative flex items-center justify-between gap-4">
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-lg">
                          {p === "agenda" ? "📅" : p === "basico" ? "⚡" : "👑"}
                        </span>
                        <span className="font-bold text-base">{planosInfo[p].nome}</span>
                        {p === "profissional" && (
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full text-white" style={{ background: "#F26E1D" }}>
                            RECOMENDADO
                          </span>
                        )}
                        {p === "agenda" && (
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full text-white bg-violet-600">
                            SÓ AGENDA
                          </span>
                        )}
                      </div>
                      <div className="flex items-baseline gap-1">
                        <span className="text-2xl font-black">R$ {planosInfo[p].preco}</span>
                        <span className="text-sm text-muted-foreground font-normal">/mês</span>
                      </div>
                    </div>
                    <Button
                      className={`shrink-0 font-bold text-white border-0 hover:opacity-90 transition-opacity ${
                        p === "agenda" ? "bg-violet-600 hover:bg-violet-700" : ""
                      }`}
                      style={p !== "agenda" ? { background: "linear-gradient(135deg, #F26E1D, #e05e10)" } : {}}
                    >
                      Assinar
                    </Button>
                  </div>
                </div>
              ))}

              <p className="text-xs text-muted-foreground text-center pt-1">
                💳 Pagamentos seguros pelo <strong>Mercado Pago</strong> · Cancele quando quiser
              </p>
            </div>
          )}

          {empresa.plano === "profissional" && (
            <div className="rounded-2xl border border-emerald-500/20 bg-emerald-500/5 px-5 py-4 flex items-center gap-3">
              <div className="w-8 h-8 rounded-full bg-emerald-500/15 flex items-center justify-center shrink-0">
                <Check className="w-4 h-4 text-emerald-500" />
              </div>
              <div>
                <p className="text-sm font-semibold text-emerald-600 dark:text-emerald-400">Você está no plano máximo</p>
                <p className="text-xs text-muted-foreground mt-0.5">Aproveite todos os recursos sem limitações.</p>
              </div>
            </div>
          )}
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

        {/* ── ABA DOCUMENTOS ── */}
        <TabsContent value="documentos" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle>Layout de Recibos e Orçamentos</CardTitle>
              <CardDescription>Personalize a aparência dos seus documentos PDF</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">

              {/* Cor primária */}
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <div className="w-1 h-5 rounded-full bg-primary" />
                  <h3 className="font-bold text-sm">Cor dos documentos</h3>
                </div>
                <div className="flex items-center gap-4">
                  <div className="flex items-center gap-2">
                    <input type="color" value={docCorPrimaria}
                      onChange={(e) => setDocCorPrimaria(e.target.value)}
                      className="w-12 h-12 rounded-xl border border-border cursor-pointer p-1" />
                    <div>
                      <p className="text-sm font-semibold">{docCorPrimaria}</p>
                      <p className="text-xs text-muted-foreground">Cor do cabeçalho e destaques</p>
                    </div>
                  </div>
                  <div className="flex gap-2 flex-wrap">
                    {["#F26E1D", "#1a1a2e", "#22c55e", "#3b82f6", "#8b5cf6", "#ef4444"].map((cor) => (
                      <button key={cor} type="button"
                        onClick={() => setDocCorPrimaria(cor)}
                        className={`w-8 h-8 rounded-lg border-2 transition-all hover:scale-110 ${docCorPrimaria === cor ? "border-foreground scale-110" : "border-transparent"}`}
                        style={{ backgroundColor: cor }} />
                    ))}
                  </div>
                </div>
              </div>

              <Separator />

              {/* Informações exibidas */}
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <div className="w-1 h-5 rounded-full bg-primary" />
                  <h3 className="font-bold text-sm">Informações exibidas no documento</h3>
                </div>
                <div className="space-y-2">
                  {[
                    { label: "Mostrar CNPJ/CPF da empresa", value: docMostrarCnpj, set: setDocMostrarCnpj },
                    { label: "Mostrar endereço completo", value: docMostrarEndereco, set: setDocMostrarEndereco },
                    { label: "Mostrar telefone", value: docMostrarTelefone, set: setDocMostrarTelefone },
                  ].map(({ label, value, set }) => (
                    <label key={label} className="flex items-center justify-between py-3 px-4 rounded-xl border border-border hover:bg-muted/50 transition-colors cursor-pointer">
                      <div>
                        <span className="text-sm font-medium">{label}</span>
                        <p className="text-xs text-muted-foreground mt-0.5">{value ? "Visível no documento" : "Oculto no documento"}</p>
                      </div>
                      <button type="button" onClick={() => set(!value)}
                        style={{ backgroundColor: value ? "#F26E1D" : undefined }}
                        className={`relative w-12 h-6 rounded-full transition-all flex-shrink-0 ${!value ? "bg-gray-200 dark:bg-gray-700" : ""}`}>
                        <div className={`absolute top-0.5 w-5 h-5 rounded-full bg-white shadow-sm transition-transform duration-200 ${value ? "translate-x-6" : "translate-x-0.5"}`} />
                      </button>
                    </label>
                  ))}
                </div>
              </div>

              <Separator />

              {/* Mensagens personalizadas */}
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <div className="w-1 h-5 rounded-full bg-primary" />
                  <h3 className="font-bold text-sm">Mensagens personalizadas</h3>
                </div>
                <div className="space-y-3">
                  <div className="space-y-1.5">
                    <Label>Rodapé do Recibo</Label>
                    <Input value={docMsgRecibo} onChange={(e) => setDocMsgRecibo(e.target.value)}
                      placeholder="Ex: Obrigado pela preferência!" maxLength={100} />
                    <p className="text-xs text-muted-foreground">Aparece no final de cada recibo de venda</p>
                  </div>
                  <div className="space-y-1.5">
                    <Label>Rodapé do Orçamento</Label>
                    <Input value={docMsgOrcamento} onChange={(e) => setDocMsgOrcamento(e.target.value)}
                      placeholder="Ex: Este orçamento não tem valor fiscal." maxLength={100} />
                    <p className="text-xs text-muted-foreground">Aparece no final de cada orçamento</p>
                  </div>
                </div>
              </div>

              <Button onClick={salvarDocumentos} disabled={loadingDoc} className="font-bold">
                {loadingDoc ? <><Loader2 className="w-4 h-4 animate-spin mr-2" />Salvando...</> : "Salvar configurações"}
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ── ABA CONTA ── */}
        <TabsContent value="conta" className="mt-4 space-y-4">
          {/* Dados de cadastro */}
          <Card>
            <CardHeader>
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                  <Lock className="w-4 h-4 text-primary" />
                </div>
                <div>
                  <CardTitle className="text-base">Dados de cadastro</CardTitle>
                  <CardDescription>Informações da sua conta de acesso ao sistema</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-5">
              {loadingContaDados ? (
                <div className="flex items-center gap-2 py-4 text-muted-foreground text-sm">
                  <Loader2 className="w-4 h-4 animate-spin" /> Carregando dados...
                </div>
              ) : (
                <>
                  {/* E-mail — readonly */}
                  <div className="space-y-1.5">
                    <Label>E-mail de acesso</Label>
                    <div className="relative">
                      <Input
                        value={userEmail}
                        disabled
                        className="opacity-60 cursor-not-allowed pr-32"
                      />
                      <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground font-medium bg-muted px-2 py-0.5 rounded-md">
                        não editável
                      </span>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Para alterar o e-mail, entre em contato com o suporte.
                    </p>
                  </div>

                  <Separator />

                  {/* Nome e telefone */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <Label>Nome completo</Label>
                      <Input
                        placeholder="Seu nome completo"
                        value={nomeUsuario}
                        onChange={(e) => setNomeUsuario(e.target.value)}
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label>Telefone pessoal</Label>
                      <Input
                        placeholder="(11) 99999-9999"
                        value={telefoneUsuario}
                        onChange={(e) => {
                          const f = formatarTelefone(e.target.value)
                          e.target.value = f
                          setTelefoneUsuario(f)
                        }}
                        maxLength={15}
                      />
                    </div>
                  </div>

                  <Button
                    onClick={salvarDadosPessoais}
                    disabled={loadingPessoal}
                    className="font-bold text-white border-0 hover:opacity-90"
                    style={{ background: "linear-gradient(135deg, #F26E1D, #e05e10)" }}
                  >
                    {loadingPessoal
                      ? <><Loader2 className="w-4 h-4 animate-spin mr-2" />Salvando...</>
                      : "Salvar dados pessoais"}
                  </Button>
                </>
              )}
            </CardContent>
          </Card>

          {/* Segurança / senha */}
          <Card>
            <CardHeader>
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-red-500/10 flex items-center justify-center shrink-0">
                  <Lock className="w-4 h-4 text-red-500" />
                </div>
                <div>
                  <CardTitle className="text-base">Segurança</CardTitle>
                  <CardDescription>Mantenha sua conta protegida com uma senha forte</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-1.5">
                <Label>Nova senha</Label>
                <Input
                  type="password"
                  placeholder="Mínimo 6 caracteres"
                  value={novaSenha}
                  onChange={(e) => setNovaSenha(e.target.value)}
                />
                <p className="text-xs text-muted-foreground">
                  Escolha uma senha com pelo menos 6 caracteres, combinando letras e números.
                </p>
              </div>
              <Button
                onClick={alterarSenha}
                disabled={novaSenha.length < 6}
                variant="outline"
                className="font-bold border-border hover:border-red-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-500/10 transition-colors"
              >
                Alterar senha
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ── ABA BACKUP ── */}
        <TabsContent value="backup" className="mt-4">
          <BackupClient empresaNome={empresa.nome} />
        </TabsContent>
      </Tabs>
    </div>
  )
}
