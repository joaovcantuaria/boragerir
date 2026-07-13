"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import {
  Wallet, Plus, Minus, ArrowDownCircle, ArrowUpCircle,
  DollarSign, Loader2, X, TrendingUp, TrendingDown,
  History, Search, ChevronDown, ChevronUp, RefreshCw, Clock, Edit2, Trash2
} from "lucide-react"
import { toast } from "sonner"
import { format } from "date-fns"
import { ptBR } from "date-fns/locale"
import { PinProtected } from "@/components/ui/pin-protected"
import { PinModal } from "@/components/ui/pin-modal"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { createClient } from "@/lib/supabase/client"
import { formatarMoeda, formatarDataHora } from "@/lib/utils"
import { useColaborador } from "@/contexts/colaborador-context"

type CaixaAnterior = {
  id: string
  valor_abertura: number
  valor_fechamento: number | null
  valor_esperado: number | null
  diferenca: number | null
  data_abertura: string
  data_fechamento: string | null
  status: string
  observacoes_abertura?: string | null
}

type Movimentacao = {
  id: string; tipo: string; categoria: string; descricao: string; valor: number; created_at: string
}

interface CaixaClientProps {
  empresaId: string
  userId: string
  plano?: string
  caixaAberto: {
    id: string; valor_abertura: number; data_abertura: string; observacoes_abertura?: string | null; tipo_conta?: string; nome_caixa?: string
  } | null
  caixasAbertos?: {
    id: string; valor_abertura: number; data_abertura: string; observacoes_abertura?: string | null; tipo_conta?: string; nome_caixa?: string
  }[]
  movimentacoes: Movimentacao[]
  caixasAnteriores: CaixaAnterior[]
  pinGerente?: string | null
  restricoesAcesso?: { areas_protegidas?: string[]; limite_desconto_sem_pin?: number } | null
}

export function CaixaClient({ empresaId, userId, plano = "gratuito", caixaAberto: caixaInicial, caixasAbertos: caixasAbertosInit = [], movimentacoes: movsIniciais, caixasAnteriores: caixasAntInit, pinGerente, restricoesAcesso }: CaixaClientProps) {
  const [caixa, setCaixa] = useState(caixaInicial)
  const [caixasAbertos, setCaixasAbertos] = useState(caixasAbertosInit)
  const [movimentacoes, setMovimentacoes] = useState(movsIniciais)
  const [caixasAnteriores, setCaixasAnteriores] = useState<CaixaAnterior[]>(caixasAntInit)
  const [caixaDetalhe, setCaixaDetalhe] = useState<{ caixa: CaixaAnterior; movs: Movimentacao[] } | null>(null)
  const [loadingDetalhe, setLoadingDetalhe] = useState(false)
  const [buscaAnt, setBuscaAnt] = useState("")
  const [modalAbrirCaixa, setModalAbrirCaixa] = useState(false)
  const [modalFecharCaixa, setModalFecharCaixa] = useState(false)
  const [modalMovimentacao, setModalMovimentacao] = useState<"sangria" | "suprimento" | "despesa" | null>(null)
  const [caixaIdMovimentacao, setCaixaIdMovimentacao] = useState<string>("")
  const [formaPagMovimentacao, setFormaPagMovimentacao] = useState<string>("")
  const [editandoMov, setEditandoMov] = useState<Movimentacao | null>(null)
  const [loading, setLoading] = useState(false)
  const [valorFechamento, setValorFechamento] = useState("")
  const [pinModalCaixa, setPinModalCaixa] = useState(false)
  const [pinAcaoPendente, setPinAcaoPendente] = useState<(() => void) | null>(null)
  const { colaborador } = useColaborador()
  const router = useRouter()
  const supabase = createClient()

  const areasProtegidas = restricoesAcesso?.areas_protegidas || []
  const pinConf = !!pinGerente

  // Verificar se ação precisa de PIN antes de executar
  function executarComPin(restricaoId: string, acao: () => void) {
    if (pinConf && areasProtegidas.includes(restricaoId)) {
      // Verificar se já desbloqueou na sessão
      const chave = `pin_acao_${empresaId}_${restricaoId}`
      if (sessionStorage.getItem(chave) === "true") {
        acao()
        return
      }
      setPinAcaoPendente(() => () => {
        sessionStorage.setItem(chave, "true")
        acao()
      })
      setPinModalCaixa(true)
    } else {
      acao()
    }
  }

  // Calcular totais
  const totalEntradas = movimentacoes.filter((m) => m.tipo === "entrada").reduce((s, m) => s + m.valor, 0)
  const totalSaidas = movimentacoes.filter((m) => m.tipo === "saida").reduce((s, m) => s + m.valor, 0)
  const saldoAtual = (caixa?.valor_abertura ?? 0) + totalEntradas - totalSaidas
  const valorEsperado = saldoAtual

  // Formulário abrir caixa
  const isGestaoPlano = plano === "gestao"
  const mesAtual = new Date().toLocaleString("pt-BR", { month: "long", year: "numeric" }).replace(/^\w/, (c) => c.toUpperCase())
  const formAbrirCaixa = useForm({
    defaultValues: {
      valor_abertura: "0",
      observacoes: "",
      tipo_caixa: isGestaoPlano ? "mensal" : "diario",
      nome_caixa: isGestaoPlano ? mesAtual : "",
      tipo_conta: "especie",
    },
  })

  // Formulário movimentação
  const formMovimentacao = useForm({
    defaultValues: { valor: "", descricao: "" },
  })

  async function abrirCaixa(data: { valor_abertura: string; observacoes: string; tipo_caixa: string; nome_caixa: string; tipo_conta: string }) {
    setLoading(true)
    const { data: novoCaixa, error } = await supabase
      .from("caixas")
      .insert({
        empresa_id: empresaId,
        valor_abertura: parseFloat(data.valor_abertura) || 0,
        status: "aberto",
        aberto_por: userId,
        colaborador_id: colaborador?.id !== "owner" ? colaborador?.id : null,
        observacoes_abertura: data.observacoes || null,
        data_abertura: new Date().toISOString(),
      } as any)
      .select()
      .single()

    if (error) { toast.error("Erro ao abrir caixa."); setLoading(false); return }

    // Atualizar tipo, nome e tipo_conta separadamente (campos novos)
    await supabase
      .from("caixas")
      .update({
        tipo_caixa: data.tipo_caixa || "diario",
        nome_caixa: data.nome_caixa.trim() || null,
        tipo_conta: data.tipo_conta || "especie",
      } as any)
      .eq("id", novoCaixa.id)

    if (error) { toast.error("Erro ao abrir caixa."); setLoading(false); return }

    setCaixa(novoCaixa)
    setMovimentacoes([])
    setModalAbrirCaixa(false)
    toast.success("Caixa aberto com sucesso!")
    router.refresh()
    setLoading(false)
  }

  async function verDetalheCaixa(cx: CaixaAnterior) {
    setLoadingDetalhe(true)
    const { data: movs } = await supabase
      .from("movimentacoes_caixa")
      .select("*")
      .eq("caixa_id", cx.id)
      .order("created_at")
    setCaixaDetalhe({ caixa: cx, movs: movs ?? [] })
    setLoadingDetalhe(false)
  }

  async function reabrirCaixa(cx: CaixaAnterior) {
    if (!confirm("Reabrir este caixa para correção? O caixa voltará ao status aberto.")) return
    setLoadingDetalhe(true)
    const { error } = await supabase
      .from("caixas")
      .update({ status: "aberto", data_fechamento: null, valor_fechamento: null, valor_esperado: null, diferenca: null })
      .eq("id", cx.id)
    if (error) { toast.error("Erro ao reabrir caixa."); setLoadingDetalhe(false); return }
    toast.success("Caixa reaberto! Redirecionando...")
    setCaixaDetalhe(null)
    router.refresh()
    setLoadingDetalhe(false)
  }

  async function fecharCaixa() {
    if (!caixa) return
    setLoading(true)
    const valorReal = parseFloat(valorFechamento) || 0
    const diferenca = valorReal - valorEsperado

    const { error } = await supabase
      .from("caixas")
      .update({
        status: "fechado",
        data_fechamento: new Date().toISOString(),
        valor_fechamento: valorReal,
        valor_esperado: valorEsperado,
        diferenca,
        fechado_por: userId,
        colaborador_fechou_id: colaborador?.id !== "owner" ? colaborador?.id : null,
      })
      .eq("id", caixa.id)

    if (error) { toast.error("Erro ao fechar caixa."); setLoading(false); return }

    setCaixa(null)
    setMovimentacoes([])
    setModalFecharCaixa(false)
    toast.success("Caixa fechado com sucesso!")
    setLoading(false)
    window.location.reload()
  }

  async function registrarMovimentacao(data: { valor: string; descricao: string }) {
    if (!modalMovimentacao) return
    // Determinar qual caixa usar
    const isMultiCaixa = plano === "gestao" && caixasAbertos.length > 1
    if (isMultiCaixa && !caixaIdMovimentacao) {
      toast.error("Selecione em qual caixa registrar.")
      return
    }
    const caixaAlvo = isMultiCaixa
      ? caixasAbertos.find((c) => c.id === caixaIdMovimentacao) ?? caixa
      : caixa
    if (!caixaAlvo) { toast.error("Selecione um caixa."); return }
    setLoading(true)

    const tipoMap: Record<string, "entrada" | "saida"> = {
      sangria: "saida",
      suprimento: "entrada",
      despesa: "saida",
    }

    const { data: mov, error } = await supabase
      .from("movimentacoes_caixa")
      .insert({
        empresa_id: empresaId,
        caixa_id: caixaAlvo.id,
        tipo: tipoMap[modalMovimentacao],
        categoria: modalMovimentacao,
        descricao: (() => {
          if (formaPagMovimentacao) return `${data.descricao} [${formaPagMovimentacao}]`
          // Se é plano gestão e não selecionou forma, inferir pelo tipo de caixa
          if (plano === "gestao") {
            const cxAlvo = caixasAbertos.find((c) => c.id === caixaAlvo.id) ?? caixaAlvo
            return (cxAlvo as any)?.tipo_conta === "banco" ? `${data.descricao} [pix]` : `${data.descricao} [dinheiro]`
          }
          return data.descricao
        })(),
        valor: parseFloat(data.valor),
        colaborador_id: colaborador?.id !== "owner" ? colaborador?.id : null,
      })
      .select()
      .single()

    if (error) { toast.error("Erro ao registrar movimentação."); setLoading(false); return }

    setMovimentacoes((prev) => [...prev, mov])
    setModalMovimentacao(null)
    setCaixaIdMovimentacao("")
    setFormaPagMovimentacao("")
    formMovimentacao.reset()
    toast.success("Movimentação registrada!")
    setLoading(false)
  }

  async function excluirMovimentacao(id: string) {
    if (!confirm("Excluir esta movimentação?")) return
    await supabase.from("movimentacoes_caixa").delete().eq("id", id)
    setMovimentacoes((prev) => prev.filter((m) => m.id !== id))
    toast.success("Movimentação excluída!")
  }

  function iniciarEdicaoMov(mov: Movimentacao) {
    setEditandoMov(mov)
    formMovimentacao.setValue("valor", String(mov.valor))
    formMovimentacao.setValue("descricao", mov.descricao.replace(/\s*\[.*?\]\s*$/, ""))
    setModalMovimentacao(mov.categoria as any)
  }

  async function salvarEdicaoMov(data: { valor: string; descricao: string }) {
    if (!editandoMov) return
    setLoading(true)

    // Determinar descrição com forma de pagamento
    let descFinal = data.descricao
    if (formaPagMovimentacao) {
      descFinal = `${data.descricao} [${formaPagMovimentacao}]`
    } else if (plano === "gestao") {
      const cxAlvo = caixaIdMovimentacao ? caixasAbertos.find((c) => c.id === caixaIdMovimentacao) : null
      if (cxAlvo) {
        descFinal = (cxAlvo as any).tipo_conta === "banco" ? `${data.descricao} [pix]` : `${data.descricao} [dinheiro]`
      } else {
        descFinal = `${data.descricao} [dinheiro]`
      }
    }

    // Atualizar incluindo caixa_id se foi alterado
    const updateData: any = { descricao: descFinal, valor: parseFloat(data.valor) }
    if (caixaIdMovimentacao && caixaIdMovimentacao !== (editandoMov as any).caixa_id) {
      updateData.caixa_id = caixaIdMovimentacao
    }

    await supabase.from("movimentacoes_caixa").update(updateData).eq("id", editandoMov.id)
    setMovimentacoes((prev) => prev.map((m) => m.id === editandoMov.id
      ? { ...m, ...updateData }
      : m))
    setEditandoMov(null)
    setModalMovimentacao(null)
    setCaixaIdMovimentacao("")
    setFormaPagMovimentacao("")
    formMovimentacao.reset()
    toast.success("Movimentação atualizada!")
    setLoading(false)
    window.location.reload()
  }

  const temCaixasAnteriores = ["basico", "profissional", "gestao"].includes(plano)

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Caixa</h1>
        <p className="text-muted-foreground">Controle de abertura, fechamento e movimentações</p>
      </div>

      <Tabs defaultValue="atual">
        <TabsList>
          <TabsTrigger value="atual" className="gap-2">
            <Wallet className="w-4 h-4" />
            Caixa Atual
          </TabsTrigger>
          {temCaixasAnteriores && (
            <TabsTrigger value="anteriores" className="gap-2">
              <History className="w-4 h-4" />
              Caixas Anteriores
              {caixasAnteriores.length > 0 && (
                <span className="bg-muted text-muted-foreground text-xs font-bold px-1.5 py-0.5 rounded-full">
                  {caixasAnteriores.length}
                </span>
              )}
            </TabsTrigger>
          )}
        </TabsList>

        {/* ── ABA ATUAL ── */}
        <TabsContent value="atual" className="mt-4">
      {/* Plano gestão: sempre mostrar os 2 espaços */}
      {plano === "gestao" ? (
        <div className="space-y-4">
          {/* Nome/tipo */}
          {caixa && ((caixa as any).nome_caixa || (caixa as any).tipo_caixa) && (
            <div className="flex items-center gap-2">
              {(caixa as any).tipo_caixa && (
                <Badge variant="outline" className="text-xs capitalize">
                  {{ diario: "Diário", semanal: "Semanal", mensal: "Mensal" }[(caixa as any).tipo_caixa] ?? (caixa as any).tipo_caixa}
                </Badge>
              )}
              {(caixa as any).nome_caixa && (
                <span className="text-sm font-semibold text-muted-foreground">{(caixa as any).nome_caixa}</span>
              )}
            </div>
          )}

          {/* Sempre 2 slots: Banco e Dinheiro */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {["banco", "especie"].map((tipoConta) => {
              const cxAberto = caixasAbertos.find((c: any) => c.tipo_conta === tipoConta)
              const label = tipoConta === "banco" ? "Banco" : "Dinheiro"
              const emoji = tipoConta === "banco" ? "🏦" : "💵"
              const bgHeader = tipoConta === "banco" ? "bg-blue-50 dark:bg-blue-900/10" : "bg-emerald-50 dark:bg-emerald-900/10"

              if (cxAberto) {
                const movsDosCaixa = movimentacoes.filter((m: any) => m.caixa_id === cxAberto.id)
                const entradas = movsDosCaixa.filter((m) => m.tipo === "entrada").reduce((s, m) => s + m.valor, 0)
                const saidas = movsDosCaixa.filter((m) => m.tipo === "saida").reduce((s, m) => s + m.valor, 0)
                const saldo = cxAberto.valor_abertura + entradas - saidas
                return (
                  <Card key={tipoConta} className={`overflow-hidden ${saldo < 0 ? "border-red-200" : "border-border"}`}>
                    <div className={`px-4 py-2 flex items-center justify-between ${bgHeader}`}>
                      <div className="flex items-center gap-2">
                        <span className="text-lg">{emoji}</span>
                        <span className="text-sm font-bold">{label}</span>
                        {(cxAberto as any).nome_caixa && <span className="text-xs text-muted-foreground">· {(cxAberto as any).nome_caixa}</span>}
                      </div>
                      <Button variant="destructive" size="sm" className="text-xs h-7 px-3"
                        onClick={() => executarComPin("caixa_fechar", () => { setCaixa(cxAberto as any); setModalFecharCaixa(true) })}>
                        Fechar Caixa
                      </Button>
                    </div>
                    <CardContent className="p-4">
                      <p className={`text-2xl font-black ${saldo < 0 ? "text-red-500" : "text-foreground"}`}>{formatarMoeda(saldo)}</p>
                      <div className="flex gap-4 mt-2 text-xs">
                        <span className="text-emerald-500">↑ {formatarMoeda(entradas)}</span>
                        <span className="text-red-500">↓ {formatarMoeda(saidas)}</span>
                      </div>
                    </CardContent>
                  </Card>
                )
              } else {
                return (
                  <Card key={tipoConta} className="overflow-hidden border-dashed">
                    <div className={`px-4 py-2 flex items-center justify-between ${bgHeader} opacity-60`}>
                      <div className="flex items-center gap-2">
                        <span className="text-lg">{emoji}</span>
                        <span className="text-sm font-bold">{label}</span>
                      </div>
                      <Badge variant="secondary" className="text-[10px]">Fechado</Badge>
                    </div>
                    <CardContent className="p-4 flex flex-col items-center gap-3">
                      <p className="text-sm text-muted-foreground">Caixa fechado</p>
                      <Button size="sm" onClick={() => setModalAbrirCaixa(true)} className="gap-2">
                        <Plus className="w-4 h-4" />
                        Abrir {label}
                      </Button>
                    </CardContent>
                  </Card>
                )
              }
            })}
          </div>

          {/* Saldo Geral — só mostra quando tem pelo menos 1 aberto */}
          {caixasAbertos.length > 0 && (
            <Card className="border-primary/20 bg-primary/5">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs text-muted-foreground font-semibold">Saldo Geral</p>
                    <p className="text-2xl font-black text-primary">{formatarMoeda(saldoAtual)}</p>
                  </div>
                  <div className="text-right text-xs space-y-0.5">
                    <p className="text-emerald-500 font-semibold">Entradas: {formatarMoeda(totalEntradas)}</p>
                    <p className="text-red-500 font-semibold">Saídas: {formatarMoeda(totalSaidas)}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Ações rápidas */}
          {caixasAbertos.length > 0 && (
            <div className="flex flex-wrap gap-2">
              <Button variant="outline" onClick={() => executarComPin("caixa_suprimento", () => setModalMovimentacao("suprimento"))} className="gap-2">
                <ArrowDownCircle className="w-4 h-4 text-emerald-500" />
                Suprimento
              </Button>
              <Button variant="outline" onClick={() => executarComPin("caixa_sangria", () => setModalMovimentacao("sangria"))} className="gap-2">
                <ArrowUpCircle className="w-4 h-4 text-orange-500" />
                Sangria
              </Button>
              <Button variant="outline" onClick={() => executarComPin("caixa_despesa", () => setModalMovimentacao("despesa"))} className="gap-2">
                <Minus className="w-4 h-4 text-red-500" />
                Despesa
              </Button>
            </div>
          )}

          {/* Lista de movimentações */}
          {caixasAbertos.length > 0 && movimentacoes.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Movimentações do caixa</CardTitle>
              </CardHeader>
              <CardContent className="pt-0">
                <div className="space-y-1">
                  {movimentacoes.map((mov) => (
                    <div key={mov.id} className="flex items-center justify-between py-2.5 border-b border-border last:border-0">
                      <div className="flex items-center gap-3">
                        {mov.tipo === "entrada" ? (
                          <TrendingUp className="w-4 h-4 text-emerald-500" />
                        ) : (
                          <TrendingDown className="w-4 h-4 text-red-500" />
                        )}
                        <div>
                          <p className="text-sm font-medium">{mov.descricao.replace(/\s*\[.*?\]\s*$/, "")}</p>
                          <p className="text-xs text-muted-foreground">
                            {format(new Date(mov.created_at), "HH:mm")} • {mov.categoria}
                            {mov.descricao.match(/\[(.*?)\]/) && <span className="ml-1 text-primary">• {mov.descricao.match(/\[(.*?)\]/)?.[1]?.replace("_", " ")}</span>}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className={`font-semibold ${mov.tipo === "entrada" ? "text-emerald-500" : "text-red-500"}`}>
                          {mov.tipo === "entrada" ? "+" : "-"}{formatarMoeda(mov.valor)}
                        </span>
                        <div className="flex items-center gap-0.5 ml-2">
                          <button onClick={() => iniciarEdicaoMov(mov)} className="p-1 rounded hover:bg-muted" title="Editar">
                            <Edit2 className="w-3.5 h-3.5 text-muted-foreground" />
                          </button>
                          <button onClick={() => excluirMovimentacao(mov.id)} className="p-1 rounded hover:bg-red-50" title="Excluir">
                            <Trash2 className="w-3.5 h-3.5 text-red-400" />
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      ) : !caixa ? (
        // Caixa fechado (outros planos)
        <Card className="border-border">
          <CardContent className="py-16 flex flex-col items-center gap-6">
            <div className="w-20 h-20 rounded-full bg-muted flex items-center justify-center">
              <Wallet className="w-10 h-10 text-muted-foreground" />
            </div>
            <div className="text-center">
              <h2 className="text-xl font-bold">Caixa Fechado</h2>
              <p className="text-muted-foreground mt-1">Abra o caixa para iniciar o dia</p>
            </div>
            <Button size="lg" className="gap-2" onClick={() => setModalAbrirCaixa(true)}>
              <Plus className="w-5 h-5" />
              Abrir Caixa
            </Button>
          </CardContent>
        </Card>
      ) : (
        // Caixa aberto
        <div className="space-y-4">
          {/* Nome/tipo do caixa */}
          {((caixa as any).nome_caixa || (caixa as any).tipo_caixa) && (
            <div className="flex items-center gap-2">
              {(caixa as any).tipo_caixa && (
                <Badge variant="outline" className="text-xs capitalize">
                  {{ diario: "Diário", semanal: "Semanal", mensal: "Mensal" }[(caixa as any).tipo_caixa] ?? (caixa as any).tipo_caixa}
                </Badge>
              )}
              {(caixa as any).nome_caixa && (
                <span className="text-sm font-semibold text-muted-foreground">{(caixa as any).nome_caixa}</span>
              )}
            </div>
          )}

          {/* Multi-caixa gestão: mostrar caixas abertos lado a lado */}
          {plano === "gestao" && caixasAbertos.length > 1 && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {caixasAbertos.map((cx) => {
                const movsDosCaixa = movimentacoes.filter((m: any) => m.caixa_id === cx.id)
                const entradas = movsDosCaixa.filter((m) => m.tipo === "entrada").reduce((s, m) => s + m.valor, 0)
                const saidas = movsDosCaixa.filter((m) => m.tipo === "saida").reduce((s, m) => s + m.valor, 0)
                const saldo = cx.valor_abertura + entradas - saidas
                const tipoConta = (cx as any).tipo_conta
                return (
                  <Card key={cx.id} className={`overflow-hidden ${saldo < 0 ? "border-red-200" : "border-border"}`}>
                    <div className={`px-4 py-2 flex items-center justify-between ${tipoConta === "banco" ? "bg-blue-50 dark:bg-blue-900/10" : "bg-emerald-50 dark:bg-emerald-900/10"}`}>
                      <div className="flex items-center gap-2">
                        <span className="text-lg">{tipoConta === "banco" ? "🏦" : "💵"}</span>
                        <span className="text-sm font-bold">{tipoConta === "banco" ? "Banco" : "Dinheiro"}</span>
                        {(cx as any).nome_caixa && <span className="text-xs text-muted-foreground">· {(cx as any).nome_caixa}</span>}
                      </div>
                      <Button variant="destructive" size="sm" className="text-xs h-7 px-3"
                        onClick={() => { setCaixa(cx as any); setModalFecharCaixa(true) }}>
                        Fechar Caixa
                      </Button>
                    </div>
                    <CardContent className="p-4">
                      <p className={`text-2xl font-black ${saldo < 0 ? "text-red-500" : "text-foreground"}`}>{formatarMoeda(saldo)}</p>
                      <div className="flex gap-4 mt-2 text-xs">
                        <span className="text-emerald-500">↑ {formatarMoeda(entradas)}</span>
                        <span className="text-red-500">↓ {formatarMoeda(saidas)}</span>
                      </div>
                    </CardContent>
                  </Card>
                )
              })}
            </div>
          )}

          {/* Botão abrir segundo caixa — plano gestão */}
          {plano === "gestao" && caixasAbertos.length === 1 && (
            <Button onClick={() => setModalAbrirCaixa(true)} className="gap-2">
              <Plus className="w-4 h-4" />
              Abrir caixa {(caixa as any).tipo_conta === "banco" ? "Dinheiro" : "Banco"}
            </Button>
          )}

          {/* Resumo — gestão multi-caixa: só geral compacto */}
          {plano === "gestao" && caixasAbertos.length > 1 ? (
            <Card className="border-primary/20 bg-primary/5">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs text-muted-foreground font-semibold">📊 Saldo Geral</p>
                    <p className="text-2xl font-black text-primary">{formatarMoeda(saldoAtual)}</p>
                  </div>
                  <div className="text-right text-xs space-y-0.5">
                    <p className="text-emerald-500 font-semibold">Entradas: {formatarMoeda(totalEntradas)}</p>
                    <p className="text-red-500 font-semibold">Saídas: {formatarMoeda(totalSaidas)}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          ) : (
          /* Resumo padrão (caixa único) */
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {[
              { label: "Valor de abertura", valor: caixa.valor_abertura, cor: "text-foreground" },
              { label: "Total entradas", valor: totalEntradas, cor: "text-emerald-500" },
              { label: "Total saídas", valor: totalSaidas, cor: "text-red-500" },
              { label: "Saldo atual", valor: saldoAtual, cor: "text-primary" },
            ].map((item) => (
              <Card key={item.label}>
                <CardContent className="p-4">
                  <p className="text-xs text-muted-foreground">{item.label}</p>
                  <p className={`text-xl font-bold ${item.cor}`}>{formatarMoeda(item.valor)}</p>
                </CardContent>
              </Card>
            ))}
          </div>
          )}

          {/* Ações rápidas */}
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" onClick={() => executarComPin("caixa_suprimento", () => setModalMovimentacao("suprimento"))} className="gap-2">
              <ArrowDownCircle className="w-4 h-4 text-emerald-500" />
              Suprimento
            </Button>
            <Button variant="outline" onClick={() => executarComPin("caixa_sangria", () => setModalMovimentacao("sangria"))} className="gap-2">
              <ArrowUpCircle className="w-4 h-4 text-orange-500" />
              Sangria
            </Button>
            <Button variant="outline" onClick={() => executarComPin("caixa_despesa", () => setModalMovimentacao("despesa"))} className="gap-2">
              <Minus className="w-4 h-4 text-red-500" />
              Despesa
            </Button>
            {plano !== "gestao" && (
              <Button variant="destructive" onClick={() => executarComPin("caixa_fechar", () => setModalFecharCaixa(true))} className="ml-auto gap-2">
                <X className="w-4 h-4" />
                Fechar Caixa
              </Button>
            )}
          </div>

          {/* Lista de movimentações */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Movimentações do caixa</CardTitle>
            </CardHeader>
            <CardContent className="pt-0">
              {movimentacoes.length > 0 ? (
                <div className="space-y-1">
                  {movimentacoes.map((mov) => (
                    <div key={mov.id} className="flex items-center justify-between py-2.5 border-b border-border last:border-0">
                      <div className="flex items-center gap-3">
                        {mov.tipo === "entrada" ? (
                          <TrendingUp className="w-4 h-4 text-emerald-500" />
                        ) : (
                          <TrendingDown className="w-4 h-4 text-red-500" />
                        )}
                        <div>
                          <p className="text-sm font-medium">{mov.descricao.replace(/\s*\[.*?\]\s*$/, "")}</p>
                          <p className="text-xs text-muted-foreground">
                            {format(new Date(mov.created_at), "HH:mm")} • {mov.categoria}
                            {mov.descricao.match(/\[(.*?)\]/) && <span className="ml-1 text-primary">• {mov.descricao.match(/\[(.*?)\]/)?.[1]?.replace("_", " ")}</span>}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className={`font-semibold ${mov.tipo === "entrada" ? "text-emerald-500" : "text-red-500"}`}>
                          {mov.tipo === "entrada" ? "+" : "-"}{formatarMoeda(mov.valor)}
                        </span>
                        {plano === "gestao" && (
                          <div className="flex items-center gap-0.5 ml-2">
                            <button onClick={() => iniciarEdicaoMov(mov)} className="p-1 rounded hover:bg-muted" title="Editar">
                              <Edit2 className="w-3.5 h-3.5 text-muted-foreground" />
                            </button>
                            <button onClick={() => excluirMovimentacao(mov.id)} className="p-1 rounded hover:bg-red-50" title="Excluir">
                              <Trash2 className="w-3.5 h-3.5 text-red-400" />
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground py-6 text-center">
                  Nenhuma movimentação registrada ainda
                </p>
              )}
            </CardContent>
          </Card>
        </div>
      )}
        </TabsContent>

        {/* ── ABA CAIXAS ANTERIORES ── */}
        {temCaixasAnteriores && (
          <TabsContent value="anteriores" className="mt-4">
            <PinProtected
              empresaId={empresaId}
              pinConfigurado={!!pinGerente}
              areasProtegidas={restricoesAcesso?.areas_protegidas || []}
              restricaoId="caixa_ver_anteriores"
              nomeRestricao="Caixas Anteriores"
            >
              <CaixasAnterioresTab
                caixas={caixasAnteriores}
                busca={buscaAnt}
                setBusca={setBuscaAnt}
                onVerDetalhe={verDetalheCaixa}
                loadingDetalhe={loadingDetalhe}
              />
            </PinProtected>
          </TabsContent>
        )}
      </Tabs>

      {/* Modal detalhe caixa anterior */}
      <Dialog open={!!caixaDetalhe} onOpenChange={(open) => { if (!open) setCaixaDetalhe(null) }}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>
              Caixa de {caixaDetalhe ? format(new Date(caixaDetalhe.caixa.data_abertura), "dd/MM/yyyy", { locale: ptBR }) : ""}
            </DialogTitle>
          </DialogHeader>
          {caixaDetalhe && (
            <div className="space-y-4">
              {/* Resumo do caixa */}
              <div className="bg-muted rounded-xl p-4 space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Abertura</span>
                  <span>{format(new Date(caixaDetalhe.caixa.data_abertura), "dd/MM/yyyy HH:mm", { locale: ptBR })}</span>
                </div>
                {caixaDetalhe.caixa.data_fechamento && (
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Fechamento</span>
                    <span>{format(new Date(caixaDetalhe.caixa.data_fechamento), "dd/MM/yyyy HH:mm", { locale: ptBR })}</span>
                  </div>
                )}
                <Separator />
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Valor abertura</span>
                  <span>{formatarMoeda(caixaDetalhe.caixa.valor_abertura)}</span>
                </div>
                {caixaDetalhe.caixa.valor_esperado != null && (
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Valor esperado</span>
                    <span>{formatarMoeda(caixaDetalhe.caixa.valor_esperado)}</span>
                  </div>
                )}
                {caixaDetalhe.caixa.valor_fechamento != null && (
                  <div className="flex justify-between text-sm font-bold">
                    <span>Valor contado</span>
                    <span className="text-primary">{formatarMoeda(caixaDetalhe.caixa.valor_fechamento)}</span>
                  </div>
                )}
                {caixaDetalhe.caixa.diferenca != null && (
                  <div className={`flex justify-between text-sm font-bold ${
                    caixaDetalhe.caixa.diferenca >= 0 ? "text-emerald-500" : "text-red-500"
                  }`}>
                    <span>Diferença</span>
                    <span>{caixaDetalhe.caixa.diferenca >= 0 ? "+" : ""}{formatarMoeda(caixaDetalhe.caixa.diferenca)}</span>
                  </div>
                )}
              </div>

              {/* Movimentações */}
              {caixaDetalhe.movs.length > 0 && (
                <div>
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">
                    Movimentações ({caixaDetalhe.movs.length})
                  </p>
                  <div className="space-y-1 max-h-48 overflow-y-auto">
                    {caixaDetalhe.movs.map((mov) => (
                      <div key={mov.id} className="flex items-center justify-between py-2 border-b border-border last:border-0">
                        <div className="flex items-center gap-2">
                          {mov.tipo === "entrada"
                            ? <TrendingUp className="w-3.5 h-3.5 text-emerald-500" />
                            : <TrendingDown className="w-3.5 h-3.5 text-red-500" />
                          }
                          <div>
                            <p className="text-xs font-medium">{mov.descricao}</p>
                            <p className="text-[10px] text-muted-foreground">
                              {format(new Date(mov.created_at), "HH:mm")} · {mov.categoria}
                            </p>
                          </div>
                        </div>
                        <span className={`text-xs font-semibold ${mov.tipo === "entrada" ? "text-emerald-500" : "text-red-500"}`}>
                          {mov.tipo === "entrada" ? "+" : "-"}{formatarMoeda(mov.valor)}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setCaixaDetalhe(null)}>Fechar</Button>
            {caixaDetalhe && (
              <Button
                variant="outline"
                className="border-amber-500 text-amber-600 hover:bg-amber-50 dark:hover:bg-amber-500/10"
                onClick={() => reabrirCaixa(caixaDetalhe.caixa)}
                disabled={loadingDetalhe}
              >
                {loadingDetalhe ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <RefreshCw className="w-4 h-4 mr-2" />}
                Reabrir para correção
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Modal abrir caixa */}
      <Dialog open={modalAbrirCaixa} onOpenChange={setModalAbrirCaixa}>
        <DialogContent onInteractOutside={(e) => e.preventDefault()}>
          <DialogHeader>
            <DialogTitle>Abrir Caixa</DialogTitle>
          </DialogHeader>
          <form onSubmit={formAbrirCaixa.handleSubmit(abrirCaixa)} className="space-y-4">
            <div className="space-y-2">
              <Label>Tipo de caixa</Label>
              <div className="grid grid-cols-3 gap-2">
                {(["diario", "semanal", "mensal"] as const).map((tipo) => {
                  const labels = { diario: "Diário", semanal: "Semanal", mensal: "Mensal" }
                  const selected = formAbrirCaixa.watch("tipo_caixa") === tipo
                  return (
                    <button
                      key={tipo}
                      type="button"
                      onClick={() => formAbrirCaixa.setValue("tipo_caixa", tipo)}
                      className={`py-2.5 px-3 rounded-xl border text-xs font-bold transition-all ${
                        selected
                          ? "border-[#F26E1D] bg-[#F26E1D]/10 text-[#F26E1D]"
                          : "border-border text-muted-foreground hover:border-primary/50"
                      }`}
                    >
                      {labels[tipo]}
                    </button>
                  )
                })}
              </div>
            </div>
            <div className="space-y-2">
              <Label>Nome do caixa (opcional)</Label>
              <Input
                placeholder="Ex: Julho 2026, Semana 1..."
                {...formAbrirCaixa.register("nome_caixa")}
              />
              <p className="text-[10px] text-muted-foreground">Deixe em branco para usar o nome automático</p>
            </div>
            {plano === "gestao" && (
              <div className="space-y-2">
                <Label>Tipo de conta</Label>
                <div className="grid grid-cols-2 gap-2">
                  {(["especie", "banco"] as const).map((tc) => {
                    const labels = { especie: "💵 Dinheiro", banco: "🏦 Banco" }
                    const selected = formAbrirCaixa.watch("tipo_conta") === tc
                    return (
                      <button
                        key={tc}
                        type="button"
                        onClick={() => formAbrirCaixa.setValue("tipo_conta", tc)}
                        className={`py-2.5 px-3 rounded-xl border text-xs font-bold transition-all ${
                          selected
                            ? "border-[#F26E1D] bg-[#F26E1D]/10 text-[#F26E1D]"
                            : "border-border text-muted-foreground hover:border-primary/50"
                        }`}
                      >
                        {labels[tc]}
                      </button>
                    )
                  })}
                </div>
              </div>
            )}
            <div className="space-y-2">
              <Label>Valor de abertura (R$)</Label>
              <Input
                type="number"
                step="0.01"
                placeholder="0,00"
                {...formAbrirCaixa.register("valor_abertura")}
              />
              <p className="text-[10px] text-muted-foreground">Pode ser negativo para iniciar com saldo devedor</p>
            </div>
            <div className="space-y-2">
              <Label>Observações (opcional)</Label>
              <Textarea placeholder="..." {...formAbrirCaixa.register("observacoes")} />
            </div>
            <DialogFooter>
              <Button variant="outline" type="button" onClick={() => setModalAbrirCaixa(false)}>Cancelar</Button>
              <Button type="submit" disabled={loading}>
                {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : "Abrir Caixa"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Modal fechar caixa */}
      <Dialog open={modalFecharCaixa} onOpenChange={setModalFecharCaixa}>
        <DialogContent onInteractOutside={(e) => e.preventDefault()}>
          <DialogHeader>
            <DialogTitle>Fechar Caixa</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="bg-muted rounded-lg p-4 space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Valor de abertura</span>
                <span>{formatarMoeda(caixa?.valor_abertura ?? 0)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Total entradas</span>
                <span className="text-emerald-500">+{formatarMoeda(totalEntradas)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Total saídas</span>
                <span className="text-red-500">-{formatarMoeda(totalSaidas)}</span>
              </div>
              <Separator />
              <div className="flex justify-between font-bold">
                <span>Saldo esperado</span>
                <span className="text-primary">{formatarMoeda(valorEsperado)}</span>
              </div>
            </div>
            <div className="space-y-2">
              <Label>Valor real contado (R$)</Label>
              <Input
                type="number"
                step="0.01"
                min="0"
                placeholder="0,00"
                value={valorFechamento}
                onChange={(e) => setValorFechamento(e.target.value)}
              />
            </div>
            {valorFechamento && (
              <div className={`text-sm font-medium ${
                parseFloat(valorFechamento) >= valorEsperado ? "text-emerald-500" : "text-red-500"
              }`}>
                Diferença: {formatarMoeda(parseFloat(valorFechamento) - valorEsperado)}
              </div>
            )}
            <DialogFooter>
              <Button variant="outline" onClick={() => setModalFecharCaixa(false)}>Cancelar</Button>
              <Button variant="destructive" onClick={fecharCaixa} disabled={loading}>
                {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : "Fechar Caixa"}
              </Button>
            </DialogFooter>
          </div>
        </DialogContent>
      </Dialog>

      {/* Modal movimentação */}
      <Dialog open={!!modalMovimentacao} onOpenChange={() => setModalMovimentacao(null)}>
        <DialogContent onInteractOutside={(e) => e.preventDefault()}>
          <DialogHeader>
            <DialogTitle>
              {editandoMov ? "Editar Movimentação" :
                modalMovimentacao === "sangria" ? "Registrar Sangria"
                : modalMovimentacao === "suprimento" ? "Registrar Suprimento"
                : "Registrar Despesa"}
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={formMovimentacao.handleSubmit(editandoMov ? salvarEdicaoMov : registrarMovimentacao)} className="space-y-4">
            {/* Seletor de caixa — plano gestão com múltiplos caixas */}
            {plano === "gestao" && caixasAbertos.length > 1 && (
              <div className="space-y-2">
                <Label>Em qual caixa?</Label>
                <div className="grid grid-cols-2 gap-2">
                  {caixasAbertos.map((cx) => {
                    const label = (cx as any).tipo_conta === "banco" ? "🏦 Banco" : "💵 Dinheiro"
                    const nome = (cx as any).nome_caixa ? ` — ${(cx as any).nome_caixa}` : ""
                    const selected = caixaIdMovimentacao === cx.id
                    return (
                      <button
                        key={cx.id}
                        type="button"
                        onClick={() => setCaixaIdMovimentacao(cx.id)}
                        className={`py-2.5 px-3 rounded-xl border text-xs font-bold transition-all ${
                          selected
                            ? "border-[#F26E1D] bg-[#F26E1D]/10 text-[#F26E1D]"
                            : "border-border text-muted-foreground hover:border-primary/50"
                        }`}
                      >
                        {label}{nome}
                      </button>
                    )
                  })}
                </div>
              </div>
            )}
            {/* Forma de pagamento — quando Banco é selecionado */}
            {plano === "gestao" && (() => {
              // Determinar se o caixa alvo é banco
              if (caixasAbertos.length > 1 && caixaIdMovimentacao) {
                const caixaSel = caixasAbertos.find((c) => c.id === caixaIdMovimentacao)
                return (caixaSel as any)?.tipo_conta === "banco"
              }
              if (caixasAbertos.length === 1) {
                return (caixasAbertos[0] as any)?.tipo_conta === "banco"
              }
              return false
            })() && (
              <div className="space-y-2">
                <Label>Forma de pagamento</Label>
                <div className="grid grid-cols-2 gap-2">
                  {[
                    { id: "pix", label: "Pix" },
                    { id: "cartao_credito", label: "Cartão Crédito" },
                    { id: "cartao_debito", label: "Cartão Débito" },
                    { id: "transferencia", label: "Transferência" },
                  ].map((fp) => (
                    <button
                      key={fp.id}
                      type="button"
                      onClick={() => setFormaPagMovimentacao(fp.id)}
                      className={`py-2 px-3 rounded-xl border text-xs font-bold transition-all ${
                        formaPagMovimentacao === fp.id
                          ? "border-[#F26E1D] bg-[#F26E1D]/10 text-[#F26E1D]"
                          : "border-border text-muted-foreground hover:border-primary/50"
                      }`}
                    >
                      {fp.label}
                    </button>
                  ))}
                </div>
              </div>
            )}
            <div className="space-y-2">
              <Label>Valor (R$)</Label>
              <Input
                type="number"
                step="0.01"
                min="0.01"
                placeholder="0,00"
                required
                {...formMovimentacao.register("valor")}
              />
            </div>
            <div className="space-y-2">
              <Label>Descrição</Label>
              <Input placeholder="Ex: Pagamento fornecedor" required {...formMovimentacao.register("descricao")} />
            </div>
            <DialogFooter>
              <Button variant="outline" type="button" onClick={() => { setModalMovimentacao(null); setEditandoMov(null); setFormaPagMovimentacao("") }}>Cancelar</Button>
              <Button type="submit" disabled={loading}>
                {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : editandoMov ? "Salvar" : "Registrar"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* PIN Modal para ações protegidas do caixa */}
      <PinModal
        aberto={pinModalCaixa}
        onClose={() => { setPinModalCaixa(false); setPinAcaoPendente(null) }}
        onSuccess={() => {
          setPinModalCaixa(false)
          if (pinAcaoPendente) {
            pinAcaoPendente()
            setPinAcaoPendente(null)
          }
        }}
        empresaId={empresaId}
        titulo="Ação Restrita"
        descricao="Digite o PIN de gerente para executar esta ação"
      />
    </div>
  )
}

// ─── Caixas Anteriores Tab ──────────────────────────────────────────────────

function CaixasAnterioresTab({
  caixas,
  busca,
  setBusca,
  onVerDetalhe,
  loadingDetalhe,
}: {
  caixas: CaixaAnterior[]
  busca: string
  setBusca: (v: string) => void
  onVerDetalhe: (cx: CaixaAnterior) => void
  loadingDetalhe: boolean
}) {
  const filtrados = caixas.filter((cx) => {
    const t = busca.toLowerCase()
    if (!t) return true
    const dataAb = format(new Date(cx.data_abertura), "dd/MM/yyyy", { locale: ptBR })
    const dataFc = cx.data_fechamento
      ? format(new Date(cx.data_fechamento), "dd/MM/yyyy", { locale: ptBR })
      : ""
    const nome = ((cx as any).nome_caixa ?? "").toLowerCase()
    const tipo = ((cx as any).tipo_caixa ?? "").toLowerCase()
    const tipoConta = ((cx as any).tipo_conta ?? "").toLowerCase()
    return dataAb.includes(t) || dataFc.includes(t) || nome.includes(t) || tipo.includes(t) || tipoConta.includes(t)
  })

  if (caixas.length === 0) {
    return (
      <div className="py-16 flex flex-col items-center gap-3 text-muted-foreground">
        <History className="w-10 h-10 opacity-30" />
        <p className="text-sm">Nenhum caixa anterior encontrado</p>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input
          placeholder="Buscar por nome, data ou tipo..."
          className="pl-9"
          value={busca}
          onChange={(e) => setBusca(e.target.value)}
        />
      </div>

      {filtrados.length === 0 ? (
        <p className="text-center text-muted-foreground text-sm py-8">Nenhum resultado para a busca</p>
      ) : (
        <div className="space-y-2">
          {filtrados.map((cx) => {
            const diferenca = cx.diferenca ?? 0
            const nomeCaixa = (cx as any).nome_caixa
            const tipoConta = (cx as any).tipo_conta
            return (
              <Card key={cx.id} className="hover:border-primary/30 transition-colors">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-9 h-9 rounded-lg bg-muted flex items-center justify-center shrink-0">
                        <span className="text-sm">{tipoConta === "banco" ? "🏦" : "💵"}</span>
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-semibold truncate">
                          {nomeCaixa ?? format(new Date(cx.data_abertura), "dd/MM/yyyy")}
                        </p>
                        <div className="flex items-center gap-2 text-[10px] text-muted-foreground mt-0.5">
                          <span>{format(new Date(cx.data_abertura), "dd/MM HH:mm")}</span>
                          <span>→</span>
                          <span>{cx.data_fechamento ? format(new Date(cx.data_fechamento), "dd/MM HH:mm") : "—"}</span>
                          {tipoConta && <Badge variant="outline" className="text-[9px] px-1 py-0">{tipoConta === "banco" ? "Banco" : "Espécie"}</Badge>}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-3 shrink-0">
                      <div className="text-right">
                        <p className="text-sm font-bold">{cx.valor_fechamento != null ? formatarMoeda(cx.valor_fechamento) : "—"}</p>
                        {cx.diferenca != null && (
                          <p className={`text-[10px] font-bold ${diferenca >= 0 ? "text-emerald-500" : "text-red-500"}`}>
                            {diferenca >= 0 ? "+" : ""}{formatarMoeda(diferenca)}
                          </p>
                        )}
                      </div>
                      <Button variant="outline" size="sm" className="text-xs h-8" onClick={() => onVerDetalhe(cx)} disabled={loadingDetalhe}>
                        Ver detalhes
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )
          })}
        </div>
      )}
    </div>
  )
}
