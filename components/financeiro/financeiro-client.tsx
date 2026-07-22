"use client"

import { useState, useRef, useEffect } from "react"
import { useRouter } from "next/navigation"
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell
} from "recharts"
import {
  TrendingUp, TrendingDown, DollarSign, BarChart3, Search, Edit, XCircle, Loader2, Clock,
  Wallet, Download, FileText, FileBarChart, Users, Calendar, ChevronDown,
  Plus, AlertTriangle, CheckCircle2, Trash2, Receipt, ArrowRightLeft
} from "lucide-react"
import { format, parseISO, startOfWeek, endOfWeek, startOfMonth, endOfMonth, subDays, subMonths, addDays, isBefore, isToday } from "date-fns"
import { ptBR } from "date-fns/locale"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Button } from "@/components/ui/button"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { toast } from "sonner"
import { createClient } from "@/lib/supabase/client"
import { formatarMoeda, labelsFormaPagamento, coresStatus, labelsStatus } from "@/lib/utils"
import { RelatoriosGestaoTab } from "@/components/financeiro/relatorios-gestao"
import { PinProtected } from "@/components/ui/pin-protected"
import { PinModal } from "@/components/ui/pin-modal"

const CORES = ["#10B981", "#3B82F6", "#F59E0B", "#8B5CF6", "#EF4444"]

type Venda = {
  id: string
  numero_venda: number
  total: number
  subtotal: number
  desconto: number
  forma_pagamento: string
  status: string
  created_at: string
  observacoes?: string | null
  clientes?: { nome_completo: string } | null
}

type ContaPagar = {
  id: string
  descricao: string
  valor: number
  data_vencimento: string
  categoria: string
  status: "pendente" | "pago" | "atrasado"
  recorrencia: "avulso" | "mensal" | "semanal"
  recorrencia_grupo: string | null
  data_pagamento: string | null
  observacoes: string | null
  created_at: string
}

const CATEGORIAS_CONTA = [
  { value: "aluguel", label: "Aluguel", emoji: "🏠" },
  { value: "energia", label: "Energia", emoji: "⚡" },
  { value: "agua", label: "Água", emoji: "💧" },
  { value: "fornecedor", label: "Fornecedor", emoji: "📦" },
  { value: "salario", label: "Salário", emoji: "👤" },
  { value: "marketing", label: "Marketing", emoji: "📣" },
  { value: "manutencao", label: "Manutenção", emoji: "🔧" },
  { value: "outros", label: "Outros", emoji: "📋" },
]

export function FinanceiroClient({ empresaId, plano, vendas: vendasIniciais, movimentacoes: movimentacoesIniciais, funcionarios, debitos, saldoCaixa = 0, caixaAberto = false, contasPagar: contasPagarIniciais = [], agendamentosFuturos = [], pinGerente, restricoesAcesso }: {
  empresaId: string; plano: string
  vendas: Venda[]
  movimentacoes: { id: string; tipo: string; categoria: string; descricao: string; valor: number; created_at: string }[]
  funcionarios: { id: string; nome: string }[]
  debitos: { id: string; cliente_id: string; valor_total: number; valor_pago: number; valor_aberto: number; status: string; created_at: string; descricao: string | null; clientes?: { nome_completo: string } | null }[]
  saldoCaixa?: number
  caixaAberto?: boolean
  contasPagar?: ContaPagar[]
  agendamentosFuturos?: { id: string; data_hora: string; status: string; produtos_servicos?: { preco: number; nome: string } | null }[]
  pinGerente?: string | null
  restricoesAcesso?: { areas_protegidas?: string[]; limite_desconto_sem_pin?: number } | null
}) {
  const [vendas, setVendas] = useState(vendasIniciais)
  const vendasOrigRef = useRef(vendasIniciais)
  const [movimentacoes, setMovimentacoes] = useState(movimentacoesIniciais)
  const [contasPagar, setContasPagar] = useState<ContaPagar[]>(contasPagarIniciais)
  const [busca, setBusca] = useState("")
  const [filtroVendas, setFiltroVendas] = useState<"todas" | "concluidas" | "canceladas" | "colaborador">("todas")
  const [modalEditar, setModalEditar] = useState<Venda | null>(null)
  const [editFormaPagamento, setEditFormaPagamento] = useState("")
  const [editDesconto, setEditDesconto] = useState("")
  const [editObservacoes, setEditObservacoes] = useState("")
  const [loadingEdit, setLoadingEdit] = useState(false)
  const [loadingCancel, setLoadingCancel] = useState<string | null>(null)
  const [mesSelecionado, setMesSelecionado] = useState(format(new Date(), "yyyy-MM"))
  // Valores a receber manual (plano gestão)
  const [valoresReceber, setValoresReceber] = useState<{ id: string; devedor: string; valor: number; data_vencimento: string; observacoes: string | null; status: string }[]>([])
  const [modalNovoReceber, setModalNovoReceber] = useState(false)
  const [editandoReceberId, setEditandoReceberId] = useState<string | null>(null)
  const [formReceber, setFormReceber] = useState({ devedor: "", valor: "", data_vencimento: "", observacoes: "" })
  const [buscaReceber, setBuscaReceber] = useState("")
  const [ordenacaoReceber, setOrdenacaoReceber] = useState<"vencimento" | "alfabetica">("vencimento")
  const [clientesLista, setClientesLista] = useState<{ id: string; nome_completo: string }[]>([])
  const [clienteSelecionado, setClienteSelecionado] = useState("")
  const [loadingReceber, setLoadingReceber] = useState(false)
  // Baixa modal — pergunta de qual caixa
  const [modalBaixa, setModalBaixa] = useState<{ tipo: "receber" | "pagar"; id: string; valor: number; descricao: string } | null>(null)
  const [baixaCaixaTipo, setBaixaCaixaTipo] = useState<"especie" | "banco">("especie")
  const [baixaFormaPag, setBaixaFormaPag] = useState<string>("")
  const supabase = createClient()
  const router = useRouter()
  const isGestao = plano === "gestao"

  // ── PIN Protection ──
  const [pinModalOpen, setPinModalOpen] = useState(false)
  const [pinAcaoPendente, setPinAcaoPendente] = useState<(() => void) | null>(null)
  const areasProtegidas = restricoesAcesso?.areas_protegidas || []
  const pinConf = !!pinGerente

  function executarComPin(restricaoId: string, acao: () => void) {
    if (pinConf && areasProtegidas.includes(restricaoId)) {
      const chave = `pin_acao_${empresaId}_${restricaoId}`
      if (sessionStorage.getItem(chave) === "true") { acao(); return }
      setPinAcaoPendente(() => () => { sessionStorage.setItem(chave, "true"); acao() })
      setPinModalOpen(true)
    } else { acao() }
  }

  // Carregar valores a receber na montagem
  useEffect(() => {
    supabase
      .from("valores_receber")
      .select("*")
      .eq("empresa_id", empresaId)
      .order("data_vencimento", { ascending: true })
      .then(({ data }) => setValoresReceber(data ?? []))
    // Carregar lista de clientes para o modal de A Receber
    supabase
      .from("clientes")
      .select("id, nome_completo")
      .eq("empresa_id", empresaId)
      .eq("ativo", true)
      .order("nome_completo")
      .then(({ data }) => setClientesLista(data ?? []))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  async function cancelarVenda(venda: Venda) {
    if (!confirm(`Cancelar a venda #${String(venda.numero_venda).padStart(4,"0")} de ${formatarMoeda(venda.total)}?`)) return
    setLoadingCancel(venda.id)

    // 1. Marcar venda como cancelada
    const { error } = await supabase.from("vendas").update({ status: "cancelada" }).eq("id", venda.id)
    if (error) { toast.error("Erro ao cancelar venda."); setLoadingCancel(null); return }

    // 2. Buscar a movimentação original para saber o caixa_id e valor
    const { data: movOriginal } = await supabase
      .from("movimentacoes_caixa")
      .select("id, caixa_id, valor, empresa_id")
      .eq("venda_id", venda.id)
      .maybeSingle()

    if (movOriginal) {
      // 3. Criar movimentação de ESTORNO (saída) — garante que o saldo atualiza em qualquer tela
      await supabase.from("movimentacoes_caixa").insert({
        empresa_id: movOriginal.empresa_id,
        caixa_id: movOriginal.caixa_id,
        tipo: "saida",
        categoria: "estorno",
        descricao: `Estorno — Venda #${String(venda.numero_venda).padStart(4, "0")} cancelada`,
        valor: movOriginal.valor,
        venda_id: venda.id,
      })

      // 4. Deletar a movimentação original de entrada (opcional — mantém auditoria limpa)
      await supabase.from("movimentacoes_caixa").delete().eq("id", movOriginal.id)
    }

    // 5. Atualizar estado local
    setVendas((prev) => prev.map((v) => v.id === venda.id ? { ...v, status: "cancelada" } : v))
    toast.success(`Venda #${String(venda.numero_venda).padStart(4,"0")} cancelada e estornada do caixa.`)
    setLoadingCancel(null)

    // 6. Forçar refresh para todas as páginas buscarem dados atualizados
    router.refresh()
  }

  // ── Valores a receber (manual — plano gestão) ──
  async function adicionarValorReceber() {
    const { devedor, valor, data_vencimento, observacoes } = formReceber
    if (!devedor.trim() || !valor || !data_vencimento) {
      toast.error("Preencha devedor, valor e data de vencimento.")
      return
    }
    setLoadingReceber(true)
    const { data, error } = await supabase.from("valores_receber").insert({
      empresa_id: empresaId,
      devedor: devedor.trim(),
      valor: parseFloat(valor),
      data_vencimento,
      observacoes: observacoes.trim() || null,
      status: "pendente",
    }).select().single()

    if (error) { toast.error("Erro ao adicionar."); setLoadingReceber(false); return }

    // Se vinculou a um cliente, criar débito
    if (clienteSelecionado) {
      await supabase.from("debitos_clientes").insert({
        empresa_id: empresaId,
        cliente_id: clienteSelecionado,
        valor_total: parseFloat(valor),
        valor_pago: 0,
        valor_aberto: parseFloat(valor),
        status: "aberto",
        descricao: observacoes.trim() || devedor.trim(),
      })
    }

    setValoresReceber((prev) => [...prev, data])
    setFormReceber({ devedor: "", valor: "", data_vencimento: "", observacoes: "" })
    setClienteSelecionado("")
    setModalNovoReceber(false)
    setLoadingReceber(false)
    toast.success("Valor a receber adicionado!")
  }

  async function marcarRecebido(id: string) {
    const item = valoresReceber.find((v) => v.id === id)
    if (!item) return
    if (isGestao) {
      // Abrir modal para selecionar caixa destino
      setModalBaixa({ tipo: "receber", id, valor: item.valor, descricao: `Recebimento: ${item.devedor}` })
    } else {
      // Planos não-gestão: registrar no caixa automaticamente (primeiro caixa aberto)
      const { data: caixaAberto } = await supabase
        .from("caixas")
        .select("id")
        .eq("empresa_id", empresaId)
        .eq("status", "aberto")
        .order("created_at", { ascending: true })
        .limit(1)
        .maybeSingle()

      await supabase.from("valores_receber").update({ status: "recebido" }).eq("id", id)

      if (caixaAberto) {
        await supabase.from("movimentacoes_caixa").insert({
          empresa_id: empresaId,
          caixa_id: caixaAberto.id,
          tipo: "entrada",
          categoria: "suprimento",
          descricao: `Recebimento: ${item.devedor}`,
          valor: item.valor,
        })
      }

      setValoresReceber((prev) => prev.map((v) => v.id === id ? { ...v, status: "recebido" } : v))
      toast.success(caixaAberto ? "Recebido e registrado no caixa!" : "Marcado como recebido! (Abra o caixa para registrar a movimentação)")
    }
    }
  }

  async function confirmarBaixa() {
    if (!modalBaixa) return
    setLoadingReceber(true)

    // Buscar caixa aberto do tipo selecionado
    const { data: caixaAlvo } = await supabase
      .from("caixas")
      .select("id")
      .eq("empresa_id", empresaId)
      .eq("status", "aberto")
      .order("created_at", { ascending: true })

    // Filtrar pelo tipo_conta
    let caixaId: string | null = null
    if (caixaAlvo && caixaAlvo.length > 0) {
      // Buscar o caixa certo por tipo_conta
      const { data: caixasComTipo } = await supabase
        .from("caixas")
        .select("id, tipo_conta")
        .eq("empresa_id", empresaId)
        .eq("status", "aberto")

      const caixaFiltrado = (caixasComTipo ?? []).find((c: any) => {
        if (baixaCaixaTipo === "banco") return c.tipo_conta === "banco"
        return c.tipo_conta !== "banco"
      })
      caixaId = caixaFiltrado?.id ?? caixaAlvo[0]?.id ?? null
    }

    if (!caixaId) {
      toast.error("Nenhum caixa aberto. Abra o caixa primeiro.")
      setLoadingReceber(false)
      return
    }

    const descComPag = baixaCaixaTipo === "banco" && baixaFormaPag
      ? `${modalBaixa.descricao} [${baixaFormaPag}]`
      : baixaCaixaTipo === "especie"
        ? `${modalBaixa.descricao} [dinheiro]`
        : modalBaixa.descricao

    if (modalBaixa.tipo === "receber") {
      // Marcar como recebido + registrar entrada no caixa
      await supabase.from("valores_receber").update({ status: "recebido" }).eq("id", modalBaixa.id)
      await supabase.from("movimentacoes_caixa").insert({
        empresa_id: empresaId,
        caixa_id: caixaId,
        tipo: "entrada",
        categoria: "suprimento",
        descricao: descComPag,
        valor: modalBaixa.valor,
      } as any)
      setValoresReceber((prev) => prev.map((v) => v.id === modalBaixa.id ? { ...v, status: "recebido" } : v))
      toast.success("Recebimento registrado no caixa!")
    } else {
      // Conta a pagar — registrar saída no caixa + marcar como paga
      await supabase.from("movimentacoes_caixa").insert({
        empresa_id: empresaId,
        caixa_id: caixaId,
        tipo: "saida",
        categoria: "despesa",
        descricao: descComPag,
        valor: modalBaixa.valor,
      } as any)
      // Marcar a conta como paga na API (skipMovimentacao pois já inseriu acima)
      await fetch("/api/financeiro/contas-pagar", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ _acao: "pagar", id: modalBaixa.id, skipMovimentacao: true }),
      })
      setContasPagar((prev) => prev.map((c) => c.id === modalBaixa.id ? { ...c, status: "pago", data_pagamento: new Date().toISOString() } : c))
      toast.success("Pagamento registrado no caixa!")
    }

    setModalBaixa(null)
    setBaixaFormaPag("")
    setLoadingReceber(false)
  }

  function editarValorReceber(v: { id: string; devedor: string; valor: number; data_vencimento: string; observacoes: string | null }) {
    setFormReceber({ devedor: v.devedor, valor: String(v.valor), data_vencimento: v.data_vencimento, observacoes: v.observacoes ?? "" })
    setEditandoReceberId(v.id)
    setModalNovoReceber(true)
  }

  async function salvarEdicaoReceber() {
    if (!editandoReceberId) return
    const { devedor, valor, data_vencimento, observacoes } = formReceber
    if (!devedor.trim() || !valor || !data_vencimento) {
      toast.error("Preencha devedor, valor e data.")
      return
    }
    setLoadingReceber(true)
    await supabase.from("valores_receber").update({
      devedor: devedor.trim(),
      valor: parseFloat(valor),
      data_vencimento,
      observacoes: observacoes.trim() || null,
    }).eq("id", editandoReceberId)
    setValoresReceber((prev) => prev.map((v) => v.id === editandoReceberId
      ? { ...v, devedor: devedor.trim(), valor: parseFloat(valor), data_vencimento, observacoes: observacoes.trim() || null }
      : v))
    setFormReceber({ devedor: "", valor: "", data_vencimento: "", observacoes: "" })
    setEditandoReceberId(null)
    setModalNovoReceber(false)
    setLoadingReceber(false)
    toast.success("Atualizado!")
  }

  async function excluirValorReceber(id: string) {
    if (!confirm("Excluir este valor a receber?")) return
    await supabase.from("valores_receber").delete().eq("id", id)
    setValoresReceber((prev) => prev.filter((v) => v.id !== id))
    toast.success("Removido!")
  }

  function abrirEditar(venda: Venda) {
    setModalEditar(venda)
    setEditFormaPagamento(venda.forma_pagamento)
    setEditDesconto(String(venda.desconto))
    setEditObservacoes(venda.observacoes ?? "")
  }

  async function salvarEdicao() {
    if (!modalEditar) return
    setLoadingEdit(true)
    const desconto = parseFloat(editDesconto) || 0
    const total = Math.max(0, modalEditar.subtotal - desconto)
    const { error } = await supabase.from("vendas").update({
      forma_pagamento: editFormaPagamento,
      desconto,
      total,
      observacoes: editObservacoes || null,
    }).eq("id", modalEditar.id)
    if (error) { toast.error("Erro ao salvar alterações."); setLoadingEdit(false); return }
    setVendas((prev) => prev.map((v) => v.id === modalEditar.id
      ? { ...v, forma_pagamento: editFormaPagamento, desconto, total, observacoes: editObservacoes || null }
      : v
    ))
    toast.success("Venda atualizada!")
    setModalEditar(null)
    setLoadingEdit(false)
  }

  const vendasConcluidas = vendas.filter((v) => v.status === "concluida")
  // Recalcular baseado nas vendas concluídas — quando uma venda é cancelada, sai do cálculo automaticamente
  const totalRecebido = vendasConcluidas.reduce((s, v) => s + v.total, 0)
  const totalAReceber = debitos.reduce((s, d) => s + d.valor_aberto, 0)

  // Para plano gestão: calcular com base nas movimentações e valores_receber
  const totalReceitasGestao = movimentacoes.filter((m) => m.tipo === "entrada").reduce((s, m) => s + m.valor, 0)
  const totalDespesasGestao = movimentacoes.filter((m) => m.tipo === "saida").reduce((s, m) => s + m.valor, 0)
  const totalAReceberGestao = valoresReceber.filter((v) => v.status === "pendente").reduce((s, v) => s + v.valor, 0)

  const totalReceitas = isGestao ? totalReceitasGestao : totalRecebido
  const totalDespesas = isGestao
    ? totalDespesasGestao
    : movimentacoes.filter((m) => m.tipo === "saida" && m.categoria === "despesa").reduce((s, m) => s + m.valor, 0)
  const lucroLiquido = totalReceitas - totalDespesas
  const ticketMedio = isGestao ? 0 : (vendasConcluidas.length > 0 ? totalRecebido / vendasConcluidas.length : 0)

  // Saldo em caixa atualizado
  const vendasCanceladasNovamente = vendas.filter((v) => v.status === "cancelada").reduce((s, v) => s + v.total, 0)
  const vendasJaCanceladasOriginal = vendasOrigRef.current.filter((v) => v.status === "cancelada").reduce((s, v) => s + v.total, 0)
  const saldoCaixaLocal = isGestao
    ? saldoCaixa
    : saldoCaixa - (vendasCanceladasNovamente - vendasJaCanceladasOriginal)

  // Faturamento por dia (mês atual)
  const faturamentoDia: Record<string, number> = {}
  vendasConcluidas.forEach((v) => {
    const dia = v.created_at.substring(0, 10)
    faturamentoDia[dia] = (faturamentoDia[dia] ?? 0) + v.total
  })
  const dadosFaturamento = Object.entries(faturamentoDia).map(([d, v]) => ({
    dia: format(parseISO(d), "d/M"),
    total: v,
  }))

  // Por forma de pagamento
  const porPagamento: Record<string, number> = {}
  vendasConcluidas.forEach((v) => {
    const label = labelsFormaPagamento[v.forma_pagamento] ?? v.forma_pagamento
    porPagamento[label] = (porPagamento[label] ?? 0) + v.total
  })
  const dadosPagamento = Object.entries(porPagamento).map(([name, value]) => ({ name, value }))

  const vendasFiltradas = vendas.filter((v) => {
    // Filtro de status
    if (filtroVendas === "concluidas" && v.status !== "concluida") return false
    if (filtroVendas === "canceladas" && v.status !== "cancelada") return false
    // Filtro de busca
    const t = busca.toLowerCase()
    return (
      String(v.numero_venda).includes(t) ||
      (v.clientes?.nome_completo ?? "").toLowerCase().includes(t) ||
      (labelsFormaPagamento[v.forma_pagamento] ?? "").toLowerCase().includes(t)
    )
  })

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold">Financeiro</h1>
          <p className="text-muted-foreground">Resumo do mês de {format(new Date(), "MMMM yyyy", { locale: ptBR })}</p>
        </div>
        {/* Seletor de mês */}
        <div className="flex items-center gap-2">
          <Label className="text-xs text-muted-foreground whitespace-nowrap">Mês:</Label>
          <Input
            type="month"
            value={mesSelecionado}
            onChange={(e) => setMesSelecionado(e.target.value)}
            className="h-9 w-40 text-sm"
          />
        </div>
      </div>

      {/* Cards */}
      <PinProtected empresaId={empresaId} pinConfigurado={pinConf} areasProtegidas={areasProtegidas} restricaoId="financeiro_ver_resumo" nomeRestricao="Resumo Financeiro">
      <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
        {[
          { label: isGestao ? "Entradas" : "Recebido", valor: totalReceitas, cor: "text-emerald-500", bg: "bg-emerald-500/10", Icon: TrendingUp },
          { label: "A receber", valor: isGestao ? totalAReceberGestao : totalAReceber, cor: "text-amber-500", bg: "bg-amber-500/10", Icon: Clock },
          { label: isGestao ? "Saídas" : "Despesas", valor: totalDespesas, cor: "text-red-500", bg: "bg-red-500/10", Icon: TrendingDown },
          { label: "Lucro líquido", valor: lucroLiquido, cor: lucroLiquido >= 0 ? "text-primary" : "text-red-500", bg: "bg-primary/10", Icon: DollarSign },
          ...(!isGestao ? [{ label: "Ticket médio", valor: ticketMedio, cor: "text-blue-500", bg: "bg-blue-500/10", Icon: BarChart3 }] : []),
          { label: "Saldo em caixa", valor: saldoCaixaLocal, cor: caixaAberto ? "text-violet-500" : "text-muted-foreground", bg: caixaAberto ? "bg-violet-500/10" : "bg-muted", Icon: Wallet },
        ].map(({ label, valor, cor, bg, Icon }) => (
          <Card key={label}>
            <CardContent className="p-4 flex items-center gap-3">
              <div className={`p-2 rounded-lg ${bg}`}>
                <Icon className={`w-5 h-5 ${cor}`} />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">{label}</p>
                <p className={`text-lg font-bold ${cor}`}>{formatarMoeda(valor)}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
      </PinProtected>

      <Tabs defaultValue={isGestao ? "areceber" : "faturamento"}>
        {/* Mobile: grid 2 colunas. Desktop: scroll horizontal */}
        <div className="block sm:hidden">
          <TabsList className="w-full grid grid-cols-2 h-auto gap-1 p-1">
            {!isGestao && <TabsTrigger value="faturamento" className="text-xs py-2">Faturamento</TabsTrigger>}
            {!isGestao && <TabsTrigger value="vendas" className="text-xs py-2">Vendas</TabsTrigger>}
            {plano !== "gratuito" && (
              <TabsTrigger value="areceber" className="text-xs py-2 gap-1">
                A Receber
                {totalAReceber > 0 && <span className="bg-amber-500 text-white text-[10px] font-black px-1 py-0.5 rounded-full">{debitos.length}</span>}
              </TabsTrigger>
            )}
            {!isGestao && <TabsTrigger value="formas" className="text-xs py-2">Pagamentos</TabsTrigger>}
            <TabsTrigger value="contaspagar" className="text-xs py-2 gap-1">
              Contas
              {contasPagar.filter((c) => c.status === "atrasado").length > 0 && (
                <span className="bg-red-500 text-white text-[10px] font-black px-1 py-0.5 rounded-full">
                  {contasPagar.filter((c) => c.status === "atrasado").length}
                </span>
              )}
            </TabsTrigger>
            <TabsTrigger value="fluxo" className="text-xs py-2">Fluxo</TabsTrigger>
            {plano !== "gratuito" && (
              <TabsTrigger value="relatorios" className="text-xs py-2">Relatórios</TabsTrigger>
            )}
          </TabsList>
        </div>

        {/* Desktop: scroll horizontal */}
        <div className="hidden sm:block overflow-x-auto">
          <TabsList className="inline-flex min-w-max">
            {!isGestao && <TabsTrigger value="faturamento">Faturamento</TabsTrigger>}
            {!isGestao && <TabsTrigger value="vendas">Vendas</TabsTrigger>}
            {plano !== "gratuito" && (
              <TabsTrigger value="areceber" className="gap-2">
                A Receber
                {totalAReceber > 0 && <span className="bg-amber-500 text-white text-xs font-black px-1.5 py-0.5 rounded-full">{debitos.length}</span>}
              </TabsTrigger>
            )}
            {!isGestao && <TabsTrigger value="formas">Formas de pagamento</TabsTrigger>}
            <TabsTrigger value="contaspagar" className="gap-2">
              Contas a Pagar
              {contasPagar.filter((c) => c.status === "atrasado").length > 0 && (
                <span className="bg-red-500 text-white text-xs font-black px-1.5 py-0.5 rounded-full">
                  {contasPagar.filter((c) => c.status === "atrasado").length}
                </span>
              )}
            </TabsTrigger>
            <TabsTrigger value="fluxo">Fluxo de Caixa</TabsTrigger>
            {plano !== "gratuito" && (
              <TabsTrigger value="relatorios">Relatórios</TabsTrigger>
            )}
          </TabsList>
        </div>

        <TabsContent value="faturamento" className="mt-4">
          <Card>
            <CardHeader><CardTitle className="text-base">Faturamento diário — {format(new Date(), "MMMM", { locale: ptBR })}</CardTitle></CardHeader>
            <CardContent>
              {dadosFaturamento.length > 0 ? (
                <ResponsiveContainer width="100%" height={250}>
                  <BarChart data={dadosFaturamento}>
                    <XAxis dataKey="dia" tick={{ fontSize: 11 }} />
                    <YAxis tick={{ fontSize: 11 }} tickFormatter={(v) => `R$${v}`} />
                    <Tooltip formatter={(v: number) => formatarMoeda(v)} />
                    <Bar dataKey="total" fill="#10B981" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <p className="text-center text-muted-foreground py-12 text-sm">Sem dados neste período</p>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="vendas" className="mt-4 space-y-4">
          {/* Sub-filtros */}
          <div className="flex flex-wrap gap-2">
            {([
              { id: "todas",        label: "Todas" },
              { id: "concluidas",   label: "Concluídas" },
              { id: "canceladas",   label: "Canceladas" },
              { id: "colaborador",  label: "Por Colaborador" },
            ] as const).map((f) => (
              <button
                key={f.id}
                onClick={() => setFiltroVendas(f.id)}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all border ${
                  filtroVendas === f.id
                    ? "bg-primary text-white border-primary"
                    : "bg-white border-gray-300 text-gray-700 hover:border-primary hover:text-primary"
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>

          {/* View por colaborador */}
          {filtroVendas === "colaborador" ? (
            <div className="space-y-3">
              {funcionarios.length === 0 ? (
                <p className="text-center text-muted-foreground py-12 text-sm">Nenhum colaborador cadastrado</p>
              ) : (
                <>
                  {/* Cards de comissão por colaborador */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                    {funcionarios.map((func) => {
                      const vendasFunc = vendasConcluidas.filter((v) =>
                        (v as any).itens_venda?.some((i: any) => i.funcionario_id === func.id)
                      )
                      const totalVendas = vendasFunc.reduce((s, v) => s + v.total, 0)
                      const totalComissao = vendasFunc.reduce((s, v) => {
                        const itensFunc = ((v as any).itens_venda ?? []).filter((i: any) => i.funcionario_id === func.id)
                        return s + itensFunc.reduce((si: number, i: any) => si + (i.comissao_valor ?? 0), 0)
                      }, 0)
                      const qtdVendas = vendasFunc.length

                      return (
                        <div key={func.id} className="border border-border rounded-xl p-4 bg-card space-y-3">
                          <div className="flex items-center gap-3">
                            <div className="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                              <span className="text-sm font-bold text-primary">{func.nome.charAt(0)}</span>
                            </div>
                            <div>
                              <p className="text-sm font-semibold text-foreground">{func.nome}</p>
                              <p className="text-xs text-muted-foreground">{qtdVendas} venda{qtdVendas !== 1 ? "s" : ""} no período</p>
                            </div>
                          </div>
                          <div className="grid grid-cols-2 gap-2 pt-1 border-t border-border">
                            <div>
                              <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">Vendas</p>
                              <p className="text-base font-bold text-foreground mt-0.5">{formatarMoeda(totalVendas)}</p>
                            </div>
                            <div>
                              <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">Comissão</p>
                              <p className="text-base font-bold text-emerald-600 mt-0.5">{formatarMoeda(totalComissao)}</p>
                            </div>
                          </div>
                        </div>
                      )
                    })}
                  </div>

                  {/* Tabela detalhada */}
                  <div className="border border-border rounded-xl overflow-hidden">
                    <div className="grid grid-cols-[auto_1fr_auto_auto_auto] gap-3 px-4 py-2 bg-muted text-xs font-medium text-muted-foreground">
                      <span>#</span><span>Cliente</span><span>Colaborador</span><span className="text-right">Total</span><span className="text-right">Comissão</span>
                    </div>
                    {vendasConcluidas.length === 0 ? (
                      <p className="text-center text-muted-foreground py-8 text-sm">Nenhuma venda concluída no período</p>
                    ) : (
                      vendasConcluidas.map((v) => {
                        const itensVenda = (v as any).itens_venda ?? []
                        const comissaoTotal = itensVenda.reduce((s: number, i: any) => s + (i.comissao_valor ?? 0), 0)
                        const funcNome = itensVenda.find((i: any) => i.funcionario_id)
                          ? funcionarios.find((f) => f.id === itensVenda.find((i: any) => i.funcionario_id)?.funcionario_id)?.nome
                          : null
                        return (
                          <div key={v.id} className="grid grid-cols-[auto_1fr_auto_auto_auto] gap-3 px-4 py-2.5 border-t border-border text-sm items-center">
                            <span className="text-muted-foreground text-xs">{String(v.numero_venda).padStart(4, "0")}</span>
                            <span className="truncate text-xs">{v.clientes?.nome_completo ?? "—"}</span>
                            <span className="text-xs text-muted-foreground truncate max-w-[100px]">{funcNome ?? "—"}</span>
                            <span className="text-right text-xs font-semibold text-primary">{formatarMoeda(v.total)}</span>
                            <span className="text-right text-xs font-bold text-emerald-600">{formatarMoeda(comissaoTotal)}</span>
                          </div>
                        )
                      })
                    )}
                  </div>
                </>
              )}
            </div>
          ) : (
            /* View padrão — lista de vendas com filtro */
            <div className="space-y-3">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input placeholder="Buscar por nº, cliente ou pagamento..." className="pl-9" value={busca} onChange={(e) => setBusca(e.target.value)} />
              </div>
              {vendasFiltradas.length > 0 ? (
                <div className="border border-border rounded-xl overflow-hidden">
                  <div className="grid grid-cols-6 gap-2 px-4 py-2 bg-muted text-xs font-medium text-muted-foreground">
                    <span>#</span><span>Cliente</span><span>Pagamento</span><span>Status</span><span className="text-right">Total</span><span className="text-right">Ações</span>
                  </div>
                  {vendasFiltradas.map((v) => (
                    <div key={v.id} className={`grid grid-cols-6 gap-2 px-4 py-3 border-t border-border text-sm items-center ${v.status === "cancelada" ? "opacity-50" : ""}`}>
                      <span className="text-muted-foreground">{String(v.numero_venda).padStart(4, "0")}</span>
                      <span className="truncate">{v.clientes?.nome_completo ?? "—"}</span>
                      <span className="truncate text-xs">{labelsFormaPagamento[v.forma_pagamento] ?? v.forma_pagamento}</span>
                      <span>
                        <Badge className={`text-xs ${v.status === "cancelada" ? "bg-red-500/10 text-red-500 border-red-500/20" : "bg-emerald-500/10 text-emerald-600 border-emerald-500/20"}`}>
                          {v.status === "cancelada" ? "Cancelada" : "Concluída"}
                        </Badge>
                      </span>
                      <div className="text-right">
                        <span className={`font-semibold ${v.status === "cancelada" ? "line-through text-muted-foreground" : "text-primary"}`}>{formatarMoeda(v.total)}</span>
                        {debitos.filter((d) => d.descricao?.includes(String(v.numero_venda).padStart(4,"0"))).map((d) => (
                          <div key={d.id} className="text-xs text-amber-500 font-bold">{formatarMoeda(d.valor_aberto)} em aberto</div>
                        ))}
                      </div>
                      <div className="flex gap-1 justify-end">
                        {v.status === "concluida" && (
                          <>
                            <Button variant="ghost" size="xs" onClick={() => abrirEditar(v)} title="Editar">
                              <Edit className="w-3.5 h-3.5" />
                            </Button>
                            <Button variant="ghost" size="xs" className="text-red-500 hover:text-red-600"
                              onClick={() => cancelarVenda(v)} disabled={loadingCancel === v.id} title="Cancelar">
                              {loadingCancel === v.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <XCircle className="w-3.5 h-3.5" />}
                            </Button>
                          </>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-center text-muted-foreground py-12 text-sm">Nenhuma venda encontrada</p>
              )}
            </div>
          )}
        </TabsContent>

        <TabsContent value="areceber" className="mt-4 space-y-3">
          {/* Botão adicionar — todos os planos */}
          <div className="flex items-center justify-between">
            <p className="text-sm font-semibold">Valores a receber</p>
            <Button size="sm" onClick={() => setModalNovoReceber(true)} className="gap-1.5">
              <Plus className="w-4 h-4" /> Adicionar
            </Button>
          </div>

          {/* Busca e ordenação */}
          {valoresReceber.filter((v) => v.status !== "recebido").length > 0 && (
            <div className="flex flex-wrap gap-2">
              <div className="relative flex-1 min-w-[180px] max-w-xs">
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  placeholder="Buscar devedor..."
                  value={buscaReceber}
                  onChange={(e) => setBuscaReceber(e.target.value)}
                  className="pl-9 h-8 text-xs"
                />
              </div>
              <button
                onClick={() => setOrdenacaoReceber((prev) => prev === "vencimento" ? "alfabetica" : "vencimento")}
                className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-muted text-muted-foreground hover:text-foreground transition-all"
                title={ordenacaoReceber === "vencimento" ? "Ordenar por nome (A-Z)" : "Ordenar por vencimento"}
              >
                {ordenacaoReceber === "vencimento" ? "📅 Vencimento" : "🔤 A-Z"}
              </button>
            </div>
          )}

          {/* Lista manual de valores a receber */}
          {valoresReceber.filter((v) => v.status !== "recebido").length > 0 && (
            <div className="border border-border rounded-xl overflow-hidden">
              <div className="grid grid-cols-5 gap-2 px-4 py-2 bg-muted text-xs font-medium text-muted-foreground">
                <span>Devedor</span><span>Valor</span><span>Vencimento</span><span>Obs</span><span className="text-right">Ações</span>
              </div>
              {valoresReceber
                .filter((v) => v.status !== "recebido")
                .filter((v) => !buscaReceber || v.devedor.toLowerCase().includes(buscaReceber.toLowerCase()))
                .sort((a, b) => {
                  if (ordenacaoReceber === "alfabetica") return a.devedor.localeCompare(b.devedor)
                  return a.data_vencimento.localeCompare(b.data_vencimento)
                })
                .map((v) => {
                const vencido = new Date(v.data_vencimento) < new Date() && v.status === "pendente"
                return (
                  <div key={v.id} className="grid grid-cols-5 gap-2 px-4 py-3 border-t border-border text-sm items-center">
                    <span className="truncate font-medium">{v.devedor}</span>
                    <span className="font-bold text-amber-500">{formatarMoeda(v.valor)}</span>
                    <span className={`text-xs ${vencido ? "text-red-500 font-bold" : "text-muted-foreground"}`}>
                      {format(parseISO(v.data_vencimento), "dd/MM/yyyy")}
                      {vencido && " ⚠️"}
                    </span>
                    <span className="text-xs text-muted-foreground truncate">{v.observacoes ?? "—"}</span>
                    <div className="flex items-center justify-end gap-1">
                      <button onClick={() => editarValorReceber(v)} className="p-1.5 rounded-md hover:bg-blue-50 text-blue-500" title="Editar">
                        <Edit className="w-4 h-4" />
                      </button>
                      <button onClick={() => marcarRecebido(v.id)} className="p-1.5 rounded-md hover:bg-emerald-50 text-emerald-500" title="Dar baixa">
                        <CheckCircle2 className="w-4 h-4" />
                      </button>
                      <button onClick={() => excluirValorReceber(v.id)} className="p-1.5 rounded-md hover:bg-red-50 text-red-400" title="Excluir">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                )
              })}
            </div>
          )}

          {/* Débitos de vendas (planos normais) */}
          {!isGestao && debitos.length > 0 && (
            <>
              <div className="flex items-center justify-between mb-2 mt-4">
                <p className="text-sm font-semibold">Débitos de vendas</p>
                <p className="font-black text-amber-500">{formatarMoeda(totalAReceber)}</p>
              </div>
              <div className="border border-border rounded-xl overflow-hidden">
                <div className="grid grid-cols-4 gap-2 px-4 py-2 bg-muted text-xs font-medium text-muted-foreground">
                  <span>Cliente</span><span>Descrição</span><span className="text-right">Pago</span><span className="text-right">Em aberto</span>
                </div>
                {debitos.map((d) => (
                  <div key={d.id} className="grid grid-cols-4 gap-2 px-4 py-3 border-t border-border text-sm items-center">
                    <span className="truncate font-medium">{d.clientes?.nome_completo ?? "—"}</span>
                    <span className="truncate text-xs text-muted-foreground">{d.descricao ?? "Venda"}</span>
                    <span className="text-right text-emerald-500">{formatarMoeda(d.valor_pago)}</span>
                    <span className="text-right font-bold text-amber-500">{formatarMoeda(d.valor_aberto)}</span>
                  </div>
                ))}
              </div>
            </>
          )}

          {/* Mensagem vazia */}
          {valoresReceber.filter((v) => v.status !== "recebido").length === 0 && (!isGestao ? debitos.length === 0 : true) && (
            <div className="py-12 text-center text-muted-foreground">
              <Clock className="w-10 h-10 mx-auto mb-2 opacity-30" />
              <p className="text-sm">Nenhum valor a receber</p>
              <p className="text-xs mt-1">Clique em "Adicionar" para registrar valores pendentes.</p>
            </div>
          )}
        </TabsContent>

        <TabsContent value="formas" className="mt-4">
          <Card>
            <CardContent className="p-6">
              {dadosPagamento.length > 0 ? (
                <div className="flex flex-col lg:flex-row items-center gap-6">
                  <ResponsiveContainer width="100%" height={250}>
                    <PieChart>
                      <Pie data={dadosPagamento} cx="50%" cy="50%" outerRadius={100} dataKey="value"
                        label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}>
                        {dadosPagamento.map((_, i) => <Cell key={i} fill={CORES[i % CORES.length]} />)}
                      </Pie>
                      <Tooltip formatter={(v: number) => formatarMoeda(v)} />
                    </PieChart>
                  </ResponsiveContainer>
                  <div className="space-y-2 min-w-40">
                    {dadosPagamento.map((item, i) => (
                      <div key={item.name} className="flex items-center justify-between gap-4 text-sm">
                        <div className="flex items-center gap-2">
                          <div className="w-3 h-3 rounded-full" style={{ background: CORES[i % CORES.length] }} />
                          <span>{item.name}</span>
                        </div>
                        <span className="font-semibold">{formatarMoeda(item.value)}</span>
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <p className="text-center text-muted-foreground py-12 text-sm">Sem dados</p>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* ── ABA CONTAS A PAGAR ── */}
        <TabsContent value="contaspagar" className="mt-4">
          <ContasPagarTab
            empresaId={empresaId}
            contas={contasPagar}
            setContas={setContasPagar}
            isGestao={isGestao}
            onBaixaGestao={(id, valor, descricao) => setModalBaixa({ tipo: "pagar", id, valor, descricao })}
          />
        </TabsContent>

        {/* ── ABA FLUXO DE CAIXA ── */}
        <TabsContent value="fluxo" className="mt-4">
          <FluxoCaixaTab
            vendas={vendas}
            contasPagar={contasPagar}
            agendamentosFuturos={agendamentosFuturos}
            valoresReceber={valoresReceber}
          />
        </TabsContent>

        {/* ── ABA RELATÓRIOS — disponível apenas nos planos pagos ── */}
        {plano !== "gratuito" && (
          <TabsContent value="relatorios" className="mt-4">
            <PinProtected empresaId={empresaId} pinConfigurado={pinConf} areasProtegidas={areasProtegidas} restricaoId="financeiro_relatorio_vendas" nomeRestricao="Relatórios Financeiros">
            {isGestao
              ? <RelatoriosGestaoTab empresaId={empresaId} />
              : <RelatoriosTab vendas={vendas} movimentacoes={movimentacoes} funcionarios={funcionarios} debitos={debitos} empresaId={empresaId} />
            }
            </PinProtected>
          </TabsContent>
        )}
      </Tabs>

      {/* Modal de edição */}
      <Dialog open={!!modalEditar} onOpenChange={(open) => { if (!open) setModalEditar(null) }}>
        <DialogContent onInteractOutside={(e) => e.preventDefault()}>
          <DialogHeader>
            <DialogTitle>Editar Venda #{String(modalEditar?.numero_venda ?? 0).padStart(4, "0")}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Forma de pagamento</Label>
              <div className="grid grid-cols-2 gap-2">
                {(["dinheiro", "pix", "cartao_debito", "cartao_credito", "outro"] as const).map((fp) => (
                  <button key={fp} type="button"
                    onClick={() => setEditFormaPagamento(fp)}
                    className={`py-2 px-3 rounded-lg border text-xs font-medium transition-colors ${
                      editFormaPagamento === fp
                        ? "border-primary bg-primary/10 text-primary"
                        : "border-border hover:border-primary/50"
                    }`}>
                    {labelsFormaPagamento[fp]}
                  </button>
                ))}
              </div>
            </div>
            <div className="space-y-2">
              <Label>Desconto (R$)</Label>
              <Input type="number" step="0.01" min="0" value={editDesconto}
                onChange={(e) => setEditDesconto(e.target.value)} placeholder="0,00" />
              {modalEditar && (
                <p className="text-xs text-muted-foreground">
                  Subtotal: {formatarMoeda(modalEditar.subtotal)} →
                  Novo total: <strong>{formatarMoeda(Math.max(0, modalEditar.subtotal - (parseFloat(editDesconto) || 0)))}</strong>
                </p>
              )}
            </div>
            <div className="space-y-2">
              <Label>Observações</Label>
              <Textarea value={editObservacoes} onChange={(e) => setEditObservacoes(e.target.value)}
                placeholder="Observações sobre a venda..." rows={2} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setModalEditar(null)}>Cancelar</Button>
            <Button onClick={salvarEdicao} disabled={loadingEdit}>
              {loadingEdit ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
              Salvar alterações
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Modal adicionar/editar valor a receber */}
      <Dialog open={modalNovoReceber} onOpenChange={(open) => { if (!open) { setModalNovoReceber(false); setEditandoReceberId(null); setFormReceber({ devedor: "", valor: "", data_vencimento: "", observacoes: "" }); setClienteSelecionado("") } }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editandoReceberId ? "Editar Valor a Receber" : "Adicionar Valor a Receber"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            {/* Seletor de cliente (opcional) */}
            {!editandoReceberId && clientesLista.length > 0 && (
              <div className="space-y-2">
                <Label>Vincular a cliente (opcional)</Label>
                <select
                  value={clienteSelecionado}
                  onChange={(e) => {
                    setClienteSelecionado(e.target.value)
                    if (e.target.value) {
                      const cl = clientesLista.find((c) => c.id === e.target.value)
                      if (cl) setFormReceber((f) => ({ ...f, devedor: cl.nome_completo }))
                    }
                  }}
                  className="w-full h-10 rounded-xl border border-border bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
                >
                  <option value="">Sem cliente (manual)</option>
                  {clientesLista.map((c) => (
                    <option key={c.id} value={c.id}>{c.nome_completo}</option>
                  ))}
                </select>
              </div>
            )}
            <div className="space-y-2">
              <Label>Nome do devedor *</Label>
              <Input
                placeholder="Ex: João da Silva"
                value={formReceber.devedor}
                onChange={(e) => setFormReceber((f) => ({ ...f, devedor: e.target.value }))}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Valor (R$) *</Label>
                <Input
                  type="number"
                  step="0.01"
                  min="0.01"
                  placeholder="0,00"
                  value={formReceber.valor}
                  onChange={(e) => setFormReceber((f) => ({ ...f, valor: e.target.value }))}
                />
              </div>
              <div className="space-y-2">
                <Label>Data de vencimento *</Label>
                <Input
                  type="date"
                  value={formReceber.data_vencimento}
                  onChange={(e) => setFormReceber((f) => ({ ...f, data_vencimento: e.target.value }))}
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Observação (opcional)</Label>
              <Textarea
                placeholder="Detalhes sobre o valor..."
                value={formReceber.observacoes}
                onChange={(e) => setFormReceber((f) => ({ ...f, observacoes: e.target.value }))}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setModalNovoReceber(false); setEditandoReceberId(null) }}>Cancelar</Button>
            <Button onClick={editandoReceberId ? salvarEdicaoReceber : adicionarValorReceber} disabled={loadingReceber} className="gap-2">
              {loadingReceber ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
              {editandoReceberId ? "Salvar" : "Adicionar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Modal de baixa — selecionar caixa destino/origem */}
      <Dialog open={!!modalBaixa} onOpenChange={(open) => { if (!open) setModalBaixa(null) }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {modalBaixa?.tipo === "receber" ? "Registrar Recebimento" : "Registrar Pagamento"}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="rounded-lg bg-muted/50 p-3">
              <p className="text-xs text-muted-foreground">{modalBaixa?.descricao}</p>
              <p className="text-lg font-bold text-primary mt-1">{formatarMoeda(modalBaixa?.valor ?? 0)}</p>
            </div>
            <div className="space-y-2">
              <Label className="text-sm font-semibold">
                {modalBaixa?.tipo === "receber"
                  ? "Como vai receber?"
                  : "De onde sai o pagamento?"
                }
              </Label>
              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => setBaixaCaixaTipo("especie")}
                  className={`p-4 rounded-xl border-2 text-center transition-all ${
                    baixaCaixaTipo === "especie"
                      ? "border-[#F26E1D] bg-[#F26E1D]/10"
                      : "border-border hover:border-primary/50"
                  }`}
                >
                  <span className="text-2xl block mb-1">💵</span>
                  <span className={`text-xs font-bold ${baixaCaixaTipo === "especie" ? "text-[#F26E1D]" : "text-muted-foreground"}`}>
                    Dinheiro
                  </span>
                  <p className="text-[10px] text-muted-foreground mt-0.5">Caixa espécie</p>
                </button>
                <button
                  type="button"
                  onClick={() => setBaixaCaixaTipo("banco")}
                  className={`p-4 rounded-xl border-2 text-center transition-all ${
                    baixaCaixaTipo === "banco"
                      ? "border-[#F26E1D] bg-[#F26E1D]/10"
                      : "border-border hover:border-primary/50"
                  }`}
                >
                  <span className="text-2xl block mb-1">🏦</span>
                  <span className={`text-xs font-bold ${baixaCaixaTipo === "banco" ? "text-[#F26E1D]" : "text-muted-foreground"}`}>
                    Banco / Pix
                  </span>
                  <p className="text-[10px] text-muted-foreground mt-0.5">Conta digital</p>
                </button>
              </div>
            </div>
            {/* Forma de pagamento — quando Banco selecionado */}
            {baixaCaixaTipo === "banco" && (
              <div className="space-y-2">
                <Label className="text-sm font-semibold">Meio de pagamento</Label>
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
                      onClick={() => setBaixaFormaPag(fp.id)}
                      className={`py-2 px-3 rounded-xl border text-xs font-bold transition-all ${
                        baixaFormaPag === fp.id
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
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setModalBaixa(null); setBaixaFormaPag("") }}>Cancelar</Button>
            <Button onClick={confirmarBaixa} disabled={loadingReceber || (baixaCaixaTipo === "banco" && !baixaFormaPag)} className="gap-2">
              {loadingReceber ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
              Confirmar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <PinModal aberto={pinModalOpen} onClose={() => { setPinModalOpen(false); setPinAcaoPendente(null) }} onSuccess={() => { setPinModalOpen(false); if (pinAcaoPendente) { pinAcaoPendente(); setPinAcaoPendente(null) } }} empresaId={empresaId} titulo="Ação Restrita" descricao="Digite o PIN de gerente para executar esta ação" />
    </div>
  )
}

type RelatoriosProps = {
  empresaId: string
  vendas: Venda[]
  movimentacoes: { id: string; tipo: string; categoria: string; descricao: string; valor: number; created_at: string }[]
  funcionarios: { id: string; nome: string }[]
  debitos: { id: string; cliente_id: string; valor_total: number; valor_pago: number; valor_aberto: number; status: string; created_at: string; descricao: string | null; clientes?: { nome_completo: string } | null }[]
}

type TipoRelatorio = "resumo-diario" | "resumo-semanal" | "resumo-mensal" | "vendas-detalhado" | "por-colaborador" | "formas-pagamento" | "debitos" | "despesas" | "completo"

const RELATORIOS: { id: TipoRelatorio; label: string; desc: string; icon: string; categoria: string }[] = [
  { id: "resumo-diario",     label: "Resumo Diário",         desc: "Faturamento, vendas e movimentações do dia atual",         icon: "📅", categoria: "Básicos" },
  { id: "resumo-semanal",    label: "Resumo Semanal",        desc: "Visão geral da semana atual com totais e comparativos",    icon: "📆", categoria: "Básicos" },
  { id: "resumo-mensal",     label: "Resumo Mensal",         desc: "Análise completa do mês com todos os indicadores",         icon: "🗓️", categoria: "Básicos" },
  { id: "vendas-detalhado",  label: "Vendas Detalhadas",     desc: "Lista completa de todas as vendas com cliente e valores",  icon: "🛍️", categoria: "Vendas" },
  { id: "formas-pagamento",  label: "Por Forma de Pagamento",desc: "Distribuição de receita por método de pagamento",          icon: "💳", categoria: "Vendas" },
  { id: "por-colaborador",   label: "Por Colaborador",       desc: "Desempenho e vendas de cada funcionário",                  icon: "👤", categoria: "Equipe" },
  { id: "debitos",           label: "Débitos em Aberto",     desc: "Clientes com valores pendentes a receber",                 icon: "⏳", categoria: "Financeiro" },
  { id: "despesas",          label: "Despesas e Saídas",     desc: "Todas as despesas, sangrias e saídas de caixa",            icon: "📉", categoria: "Financeiro" },
  { id: "completo",          label: "Relatório Completo",    desc: "Relatório abrangente com todos os dados do período",       icon: "📊", categoria: "Avançados" },
]

function gerarConteudoRelatorio(
  tipo: TipoRelatorio,
  vendas: Venda[],
  movimentacoes: RelatoriosProps["movimentacoes"],
  funcionarios: RelatoriosProps["funcionarios"],
  debitos: RelatoriosProps["debitos"],
  periodo: { inicio: Date; fim: Date }
): string {
  const fmtData = (d: Date) => format(d, "dd/MM/yyyy", { locale: ptBR })
  const fmtHora = (s: string) => format(new Date(s), "dd/MM/yyyy HH:mm", { locale: ptBR })
  const fmtMoeda = (v: number) => `R$ ${v.toFixed(2).replace(".", ",")}`

  const vendasPeriodo = vendas.filter((v) => {
    const d = new Date(v.created_at)
    return d >= periodo.inicio && d <= periodo.fim
  })
  const vendasConcluidas = vendasPeriodo.filter((v) => v.status === "concluida")
  const movsPeriodo = movimentacoes.filter((m) => {
    const d = new Date(m.created_at)
    return d >= periodo.inicio && d <= periodo.fim
  })

  const totalRecebido = movsPeriodo.filter((m) => m.tipo === "entrada" && m.categoria === "venda").reduce((s, m) => s + m.valor, 0)
  const totalDespesas = movsPeriodo.filter((m) => m.tipo === "saida" && m.categoria === "despesa").reduce((s, m) => s + m.valor, 0)
  const totalSangrias = movsPeriodo.filter((m) => m.categoria === "sangria").reduce((s, m) => s + m.valor, 0)
  const lucro = totalRecebido - totalDespesas
  const ticketMedio = vendasConcluidas.length > 0 ? totalRecebido / vendasConcluidas.length : 0

  const linhas: string[] = []
  const sep = "═".repeat(55)
  const sepFino = "─".repeat(55)

  linhas.push(sep)
  linhas.push(`  BEAUTYFLOW — ${RELATORIOS.find((r) => r.id === tipo)?.label.toUpperCase() ?? "RELATÓRIO"}`)
  linhas.push(`  Período: ${fmtData(periodo.inicio)} a ${fmtData(periodo.fim)}`)
  linhas.push(`  Gerado em: ${format(new Date(), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}`)
  linhas.push(sep)
  linhas.push("")

  if (["resumo-diario", "resumo-semanal", "resumo-mensal", "completo"].includes(tipo)) {
    linhas.push("  RESUMO FINANCEIRO")
    linhas.push(sepFino)
    linhas.push(`  Vendas concluídas:   ${vendasConcluidas.length}`)
    linhas.push(`  Total recebido:      ${fmtMoeda(totalRecebido)}`)
    linhas.push(`  Total despesas:      ${fmtMoeda(totalDespesas)}`)
    linhas.push(`  Sangrias:            ${fmtMoeda(totalSangrias)}`)
    linhas.push(`  Lucro líquido:       ${fmtMoeda(lucro)}`)
    linhas.push(`  Ticket médio:        ${fmtMoeda(ticketMedio)}`)
    linhas.push("")
  }

  if (["vendas-detalhado", "completo"].includes(tipo)) {
    linhas.push("  VENDAS DETALHADAS")
    linhas.push(sepFino)
    if (vendasConcluidas.length === 0) {
      linhas.push("  Nenhuma venda no período.")
    } else {
      linhas.push("  Nº    Data/Hora          Cliente              Pagamento       Total")
      linhas.push("  " + "─".repeat(53))
      vendasConcluidas.forEach((v) => {
        const num = String(v.numero_venda).padStart(4, "0")
        const data = fmtHora(v.created_at).padEnd(18)
        const cliente = ((v.clientes as any)?.nome_completo ?? "—").substring(0, 18).padEnd(20)
        const pgto = (labelsFormaPagamento[v.forma_pagamento] ?? v.forma_pagamento).substring(0, 14).padEnd(16)
        const total = fmtMoeda(v.total)
        linhas.push(`  ${num}  ${data} ${cliente} ${pgto} ${total}`)
      })
    }
    linhas.push("")
  }

  if (["formas-pagamento", "completo"].includes(tipo)) {
    linhas.push("  POR FORMA DE PAGAMENTO")
    linhas.push(sepFino)
    const porPgto: Record<string, number> = {}
    vendasConcluidas.forEach((v) => {
      const k = labelsFormaPagamento[v.forma_pagamento] ?? v.forma_pagamento
      porPgto[k] = (porPgto[k] ?? 0) + v.total
    })
    if (Object.keys(porPgto).length === 0) {
      linhas.push("  Nenhum dado disponível.")
    } else {
      Object.entries(porPgto).sort((a, b) => b[1] - a[1]).forEach(([k, v]) => {
        const perc = totalRecebido > 0 ? ((v / totalRecebido) * 100).toFixed(1) : "0.0"
        linhas.push(`  ${k.padEnd(24)} ${fmtMoeda(v).padEnd(15)} (${perc}%)`)
      })
    }
    linhas.push("")
  }

  if (["por-colaborador", "completo"].includes(tipo)) {
    linhas.push("  POR COLABORADOR")
    linhas.push(sepFino)
    if (funcionarios.length === 0) {
      linhas.push("  Nenhum colaborador cadastrado.")
    } else {
      funcionarios.forEach((f) => {
        const vendasFunc = vendasConcluidas.filter((v) => {
          const itens = (v as any).itens_venda ?? []
          return itens.some((i: any) => i.funcionario_id === f.id)
        })
        const totalFunc = vendasFunc.reduce((s, v) => s + v.total, 0)
        linhas.push(`  ${f.nome.padEnd(28)} ${vendasFunc.length} vendas   ${fmtMoeda(totalFunc)}`)
      })
    }
    linhas.push("")
  }

  if (["debitos", "completo"].includes(tipo)) {
    linhas.push("  DÉBITOS EM ABERTO")
    linhas.push(sepFino)
    if (debitos.length === 0) {
      linhas.push("  Nenhum débito em aberto.")
    } else {
      const total = debitos.reduce((s, d) => s + d.valor_aberto, 0)
      debitos.forEach((d) => {
        const cliente = ((d.clientes as any)?.nome_completo ?? "—").substring(0, 24).padEnd(26)
        const desc = (d.descricao ?? "Venda").substring(0, 16).padEnd(18)
        linhas.push(`  ${cliente} ${desc} Em aberto: ${fmtMoeda(d.valor_aberto)}`)
      })
      linhas.push(`  ${"─".repeat(40)}`)
      linhas.push(`  TOTAL EM ABERTO:             ${fmtMoeda(total)}`)
    }
    linhas.push("")
  }

  if (["despesas", "completo"].includes(tipo)) {
    linhas.push("  DESPESAS E SAÍDAS")
    linhas.push(sepFino)
    const saidas = movsPeriodo.filter((m) => m.tipo === "saida")
    if (saidas.length === 0) {
      linhas.push("  Nenhuma saída no período.")
    } else {
      saidas.forEach((m) => {
        const data = fmtHora(m.created_at).padEnd(18)
        const cat = m.categoria.padEnd(12)
        const desc = m.descricao.substring(0, 18).padEnd(20)
        linhas.push(`  ${data} ${cat} ${desc} ${fmtMoeda(m.valor)}`)
      })
      linhas.push(`  ${"─".repeat(40)}`)
      linhas.push(`  TOTAL SAÍDAS:  ${fmtMoeda(saidas.reduce((s, m) => s + m.valor, 0))}`)
    }
    linhas.push("")
  }

  linhas.push(sep)
  linhas.push("  Relatório gerado pelo Bora Gerir — app.boragerir.com")
  linhas.push(sep)

  return linhas.join("\n")
}

function RelatoriosTab({ vendas, movimentacoes, funcionarios, debitos, empresaId }: RelatoriosProps) {
  const [tipoSelecionado, setTipoSelecionado] = useState<TipoRelatorio>("resumo-mensal")
  const [tipoPeriodo, setTipoPeriodo] = useState<"hoje" | "semana" | "mes" | "personalizado">("mes")
  const [dataInicio, setDataInicio] = useState(format(startOfMonth(new Date()), "yyyy-MM-dd"))
  const [dataFim, setDataFim] = useState(format(endOfMonth(new Date()), "yyyy-MM-dd"))
  const [gerando, setGerando] = useState(false)
  const [temaRelatorio, setTemaRelatorio] = useState<"laranja" | "azul" | "verde" | "roxo" | "grafite">("laranja")
  const supabase = createClient()

  function aplicarPeriodoPre(tipo: "hoje" | "semana" | "mes" | "personalizado") {
    setTipoPeriodo(tipo)
    if (tipo === "hoje") {
      setDataInicio(format(new Date(), "yyyy-MM-dd"))
      setDataFim(format(new Date(), "yyyy-MM-dd"))
    } else if (tipo === "semana") {
      setDataInicio(format(startOfWeek(new Date(), { locale: ptBR }), "yyyy-MM-dd"))
      setDataFim(format(endOfWeek(new Date(), { locale: ptBR }), "yyyy-MM-dd"))
    } else if (tipo === "mes") {
      setDataInicio(format(startOfMonth(new Date()), "yyyy-MM-dd"))
      setDataFim(format(endOfMonth(new Date()), "yyyy-MM-dd"))
    }
  }

  async function baixarRelatorio() {
    setGerando(true)
    try {
      const { data: empresa } = await supabase.from("empresas").select("*").eq("id", empresaId).single()
      if (!empresa) { toast.error("Erro ao carregar dados da empresa."); setGerando(false); return }

      const { gerarRelatorioPDF } = await import("@/lib/pdf/relatorio")
      const inicio = new Date(dataInicio + "T00:00:00")
      const fim = new Date(dataFim + "T23:59:59")
      const relInfo = RELATORIOS.find((r) => r.id === tipoSelecionado)

      await gerarRelatorioPDF({
        empresa,
        tipo: tipoSelecionado,
        label: relInfo?.label ?? tipoSelecionado,
        dataInicio: inicio,
        dataFim: fim,
        tema: temaRelatorio,
        vendas,
        movimentacoes,
        funcionarios,
        debitos,
      })
      toast.success("Relatório PDF gerado com sucesso!")
    } catch (err) {
      console.error(err)
      toast.error("Erro ao gerar relatório.")
    }
    setGerando(false)
  }

  const categorias = [...new Set(RELATORIOS.map((r) => r.categoria))]

  return (
    <div className="space-y-6">
      {/* Seleção de relatório */}
      <div className="space-y-3">
        <div className="flex items-center gap-2">
          <div className="w-1 h-5 rounded-full bg-primary" />
          <h3 className="font-bold text-sm">Tipo de relatório</h3>
        </div>
        <div className="space-y-4">
          {categorias.map((cat) => (
            <div key={cat}>
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">{cat}</p>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
                {RELATORIOS.filter((r) => r.categoria === cat).map((rel) => (
                  <button
                    key={rel.id}
                    onClick={() => setTipoSelecionado(rel.id)}
                    className={`text-left p-3.5 rounded-xl border transition-all ${
                      tipoSelecionado === rel.id
                        ? "border-[#F26E1D] bg-[#F26E1D]/8"
                        : "border-border hover:border-[#F26E1D]/40 hover:bg-muted/50"
                    }`}
                  >
                    <div className="flex items-start gap-2.5">
                      <span className="text-lg mt-0.5">{rel.icon}</span>
                      <div>
                        <p className={`text-sm font-semibold ${tipoSelecionado === rel.id ? "text-[#F26E1D]" : ""}`}>{rel.label}</p>
                        <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">{rel.desc}</p>
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Período */}
      <div className="space-y-3">
        <div className="flex items-center gap-2">
          <div className="w-1 h-5 rounded-full bg-primary" />
          <h3 className="font-bold text-sm">Período</h3>
        </div>
        <div className="flex flex-wrap gap-2">
          {(["hoje", "semana", "mes", "personalizado"] as const).map((p) => (
            <button
              key={p}
              onClick={() => aplicarPeriodoPre(p)}
              className={`px-4 py-2 rounded-xl text-sm font-semibold border transition-all ${
                tipoPeriodo === p
                  ? "border-[#F26E1D] bg-[#F26E1D]/10 text-[#F26E1D]"
                  : "border-border hover:border-[#F26E1D]/40 text-muted-foreground"
              }`}
            >
              {p === "hoje" ? "Hoje" : p === "semana" ? "Esta semana" : p === "mes" ? "Este mês" : "Personalizado"}
            </button>
          ))}
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <Label>Data início</Label>
            <Input type="date" value={dataInicio} onChange={(e) => { setDataInicio(e.target.value); setTipoPeriodo("personalizado") }} />
          </div>
          <div className="space-y-1.5">
            <Label>Data fim</Label>
            <Input type="date" value={dataFim} onChange={(e) => { setDataFim(e.target.value); setTipoPeriodo("personalizado") }} />
          </div>
        </div>
      </div>

      {/* Tema do relatório */}
      <div className="space-y-3">
        <div className="flex items-center gap-2">
          <div className="w-1 h-5 rounded-full bg-primary" />
          <h3 className="font-bold text-sm">Tema do relatório</h3>
        </div>
        <div className="flex flex-wrap gap-2">
          {([
            { id: "laranja", label: "Laranja", cor: "#F26E1D" },
            { id: "azul",    label: "Azul",    cor: "#2563EB" },
            { id: "verde",   label: "Verde",   cor: "#16A34A" },
            { id: "roxo",    label: "Roxo",    cor: "#7C3AED" },
            { id: "grafite", label: "Grafite", cor: "#374151" },
          ] as const).map((t) => (
            <button
              key={t.id}
              onClick={() => setTemaRelatorio(t.id)}
              className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-sm font-semibold border transition-all ${
                temaRelatorio === t.id
                  ? "border-[#F26E1D] bg-[#F26E1D]/8 text-foreground"
                  : "border-border hover:border-border/80 text-muted-foreground"
              }`}
            >
              <span
                className="w-4 h-4 rounded-full shrink-0 ring-2 ring-white shadow-sm"
                style={{ backgroundColor: t.cor, outline: temaRelatorio === t.id ? `2px solid ${t.cor}` : "none", outlineOffset: "2px" }}
              />
              {t.label}
            </button>
          ))}
        </div>
      </div>

      {/* Preview e download */}
      <div className="rounded-xl border border-border p-5 bg-muted/30 space-y-4">
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="font-semibold text-sm">
              {RELATORIOS.find((r) => r.id === tipoSelecionado)?.icon}{" "}
              {RELATORIOS.find((r) => r.id === tipoSelecionado)?.label}
            </p>
            <p className="text-xs text-muted-foreground mt-0.5">
              {format(new Date(dataInicio + "T12:00:00"), "dd/MM/yyyy", { locale: ptBR })} até{" "}
              {format(new Date(dataFim + "T12:00:00"), "dd/MM/yyyy", { locale: ptBR })}
            </p>
          </div>
          <Button
            onClick={baixarRelatorio}
            disabled={gerando}
            className="gap-2 font-bold text-white border-0 hover:opacity-90 shrink-0"
            style={{ background: "linear-gradient(135deg, #F26E1D, #e05e10)" }}
          >
            {gerando
              ? <Loader2 className="w-4 h-4 animate-spin" />
              : <Download className="w-4 h-4" />
            }
            Gerar PDF
          </Button>
        </div>
        <p className="text-xs text-muted-foreground">
          O relatório será gerado em <strong>PDF</strong> com os dados da sua empresa.
        </p>
      </div>
    </div>
  )
}


// ─── Aba Contas a Pagar ────────────────────────────────────────────────────

function ContasPagarTab({
  empresaId,
  contas,
  setContas,
  isGestao = false,
  onBaixaGestao,
}: {
  empresaId: string
  contas: ContaPagar[]
  setContas: React.Dispatch<React.SetStateAction<ContaPagar[]>>
  isGestao?: boolean
  onBaixaGestao?: (id: string, valor: number, descricao: string) => void
}) {
  const hoje = new Date()
  hoje.setHours(0, 0, 0, 0)

  const [modalAberto, setModalAberto] = useState(false)
  const [loading, setLoading] = useState(false)
  const [filtroStatus, setFiltroStatus] = useState<"todos" | "pendente" | "atrasado" | "pago">("todos")
  const [filtroPeriodo, setFiltroPeriodo] = useState<"todos" | "hoje" | "semana" | "mes">("mes")
  const [busca, setBusca] = useState("")
  const [ordenacao, setOrdenacao] = useState<"vencimento" | "alfabetica">("vencimento")
  const [modalJuros, setModalJuros] = useState<{ id: string; valorOriginal: number; descricao: string } | null>(null)
  const [valorComJuros, setValorComJuros] = useState("")
  const [form, setForm] = useState({
    descricao: "", valor: "", data_vencimento: format(new Date(), "yyyy-MM-dd"),
    categoria: "outros", recorrencia: "avulso", observacoes: "", qtd_parcelas: "12",
  })

  // Calcular status real (atrasado se pendente e vencida)
  const contasComStatus = contas.map((c) => ({
    ...c,
    status: (c.status === "pendente" && isBefore(new Date(c.data_vencimento + "T23:59:59"), hoje))
      ? "atrasado" as const
      : c.status,
  }))

  const contasFiltradas = contasComStatus.filter((c) => {
    if (filtroStatus !== "todos" && c.status !== filtroStatus) return false
    if (busca && !c.descricao.toLowerCase().includes(busca.toLowerCase())) return false
    if (filtroPeriodo === "hoje") return c.data_vencimento === format(hoje, "yyyy-MM-dd")
    if (filtroPeriodo === "semana") {
      const ini = format(startOfWeek(hoje, { locale: ptBR }), "yyyy-MM-dd")
      const fim = format(endOfWeek(hoje, { locale: ptBR }), "yyyy-MM-dd")
      return c.data_vencimento >= ini && c.data_vencimento <= fim
    }
    if (filtroPeriodo === "mes") {
      const ini = format(startOfMonth(hoje), "yyyy-MM-dd")
      const fim = format(endOfMonth(hoje), "yyyy-MM-dd")
      return c.data_vencimento >= ini && c.data_vencimento <= fim
    }
    return true
  }).sort((a, b) => {
    if (ordenacao === "alfabetica") return a.descricao.localeCompare(b.descricao)
    return a.data_vencimento.localeCompare(b.data_vencimento)
  })

  const totalPendente = contasFiltradas.filter((c) => c.status === "pendente" || c.status === "atrasado").reduce((s, c) => s + c.valor, 0)
  const totalAtrasado = contasFiltradas.filter((c) => c.status === "atrasado").reduce((s, c) => s + c.valor, 0)

  async function salvar() {
    if (!form.descricao || !form.valor || !form.data_vencimento) {
      toast.error("Preencha descrição, valor e data de vencimento."); return
    }
    setLoading(true)
    const res = await fetch("/api/financeiro/contas-pagar", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    })
    const data = await res.json()
    if (!res.ok) { toast.error(data.erro ?? "Erro ao salvar conta."); setLoading(false); return }
    toast.success(form.recorrencia === "avulso" ? "Conta cadastrada!" : `Conta recorrente criada!`)
    setContas((prev) => [...(data.data ?? []), ...prev].sort((a, b) => a.data_vencimento.localeCompare(b.data_vencimento)))
    setModalAberto(false)
    setForm({ descricao: "", valor: "", data_vencimento: format(new Date(), "yyyy-MM-dd"), categoria: "outros", recorrencia: "avulso", observacoes: "", qtd_parcelas: "12" })
    setLoading(false)
  }

  async function pagar(id: string) {
    const conta = contas.find((c) => c.id === id)
    if (!conta) return

    // Verificar se está atrasada — perguntar sobre juros
    const vencimento = new Date(conta.data_vencimento + "T23:59:59")
    const atrasada = isBefore(vencimento, hoje)
    if (atrasada && !modalJuros) {
      setModalJuros({ id, valorOriginal: conta.valor, descricao: conta.descricao })
      setValorComJuros("")
      return
    }

    // Para plano gestão: abrir modal para selecionar caixa
    // A marcação como "pago" acontece apenas após confirmação no modal (confirmarBaixa)
    if (isGestao && onBaixaGestao) {
      onBaixaGestao(id, conta.valor, `Pagamento: ${conta.descricao}`)
      return
    }

    const res = await fetch("/api/financeiro/contas-pagar", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ _acao: "pagar", id }),
    })
    if (res.ok) {
      setContas((prev) => prev.map((c) => c.id === id ? { ...c, status: "pago", data_pagamento: new Date().toISOString() } : c))
      toast.success("Conta marcada como paga!")
    }
  }

  async function confirmarPagamentoComJuros() {
    if (!modalJuros) return
    const valorFinal = valorComJuros ? parseFloat(valorComJuros) : modalJuros.valorOriginal

    // Atualizar o valor da conta se houve juros
    if (valorComJuros && valorFinal !== modalJuros.valorOriginal) {
      const supabase = (await import("@/lib/supabase/client")).createClient()
      await supabase.from("contas_pagar").update({ valor: valorFinal }).eq("id", modalJuros.id)
      setContas((prev) => prev.map((c) => c.id === modalJuros.id ? { ...c, valor: valorFinal } : c))
    }

    // Para plano gestão: abrir modal para selecionar caixa
    if (isGestao && onBaixaGestao) {
      onBaixaGestao(modalJuros.id, valorFinal, `Pagamento: ${modalJuros.descricao}`)
      // Marcar como pago é feito pelo confirmarBaixa
      setModalJuros(null)
      setValorComJuros("")
      return
    }

    const res = await fetch("/api/financeiro/contas-pagar", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ _acao: "pagar", id: modalJuros.id }),
    })
    if (res.ok) {
      setContas((prev) => prev.map((c) => c.id === modalJuros.id ? { ...c, status: "pago", valor: valorFinal, data_pagamento: new Date().toISOString() } : c))
      toast.success("Conta marcada como paga!")
    }
    setModalJuros(null)
    setValorComJuros("")
  }

  async function excluir(conta: ContaPagar) {
    if (conta.recorrencia_grupo) {
      const opcao = confirm(`Esta é uma conta recorrente.\n\nOK = Excluir todas as futuras\nCancelar = Excluir só esta`)
      const tipo = opcao ? "todas_futuras" : "apenas_esta"
      await fetch("/api/financeiro/contas-pagar", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ _acao: "excluir", id: conta.id, tipo, grupo_id: conta.recorrencia_grupo, data_vencimento: conta.data_vencimento }),
      })
      if (opcao) {
        setContas((prev) => prev.filter((c) => !(c.recorrencia_grupo === conta.recorrencia_grupo && c.data_vencimento >= conta.data_vencimento)))
      } else {
        setContas((prev) => prev.filter((c) => c.id !== conta.id))
      }
    } else {
      if (!confirm("Excluir esta conta?")) return
      await fetch("/api/financeiro/contas-pagar", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ _acao: "excluir", id: conta.id, tipo: "apenas_esta" }),
      })
      setContas((prev) => prev.filter((c) => c.id !== conta.id))
    }
    toast.success("Conta excluída.")
  }

  const catInfo = (v: string) => CATEGORIAS_CONTA.find((c) => c.value === v)

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div className="space-y-1">
          <h2 className="text-base font-bold">Contas a Pagar</h2>
          <div className="flex items-center gap-3 flex-wrap">
            {totalAtrasado > 0 && (
              <span className="flex items-center gap-1.5 text-xs font-semibold text-red-500 bg-red-500/10 px-2.5 py-1 rounded-full">
                <AlertTriangle className="w-3.5 h-3.5" />
                {formatarMoeda(totalAtrasado)} em atraso
              </span>
            )}
            {totalPendente > 0 && (
              <span className="text-xs text-muted-foreground">
                {formatarMoeda(totalPendente)} a pagar no período
              </span>
            )}
          </div>
        </div>
        <Button onClick={() => setModalAberto(true)} size="sm" className="gap-2">
          <Plus className="w-4 h-4" />Nova conta
        </Button>
      </div>

      {/* Filtros */}
      <div className="flex flex-wrap gap-2">
        {/* Busca */}
        <div className="relative flex-1 min-w-[180px] max-w-xs">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Buscar conta..."
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
            className="pl-9 h-8 text-xs"
          />
        </div>
        {/* Ordenação */}
        <button
          onClick={() => setOrdenacao((prev) => prev === "vencimento" ? "alfabetica" : "vencimento")}
          className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-muted text-muted-foreground hover:text-foreground transition-all"
          title={ordenacao === "vencimento" ? "Ordenar por nome (A-Z)" : "Ordenar por vencimento"}
        >
          {ordenacao === "vencimento" ? "📅 Vencimento" : "🔤 A-Z"}
        </button>
      </div>
      <div className="flex flex-wrap gap-2">
        <div className="flex gap-1">
          {(["todos", "hoje", "semana", "mes"] as const).map((p) => (
            <button key={p} onClick={() => setFiltroPeriodo(p)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${filtroPeriodo === p ? "bg-primary text-white" : "bg-muted text-muted-foreground hover:text-foreground"}`}>
              {p === "todos" ? "Todos" : p === "hoje" ? "Hoje" : p === "semana" ? "Esta semana" : "Este mês"}
            </button>
          ))}
        </div>
        <div className="flex gap-1 ml-auto">
          {(["todos", "pendente", "atrasado", "pago"] as const).map((s) => (
            <button key={s} onClick={() => setFiltroStatus(s)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all capitalize ${filtroStatus === s ? "bg-primary text-white" : "bg-muted text-muted-foreground hover:text-foreground"}`}>
              {s === "todos" ? "Todos" : s}
            </button>
          ))}
        </div>
      </div>

      {/* Lista */}
      {contasFiltradas.length === 0 ? (
        <div className="py-14 text-center text-muted-foreground">
          <Receipt className="w-10 h-10 mx-auto mb-3 opacity-30" />
          <p className="text-sm font-medium">Nenhuma conta encontrada</p>
          <p className="text-xs mt-1">Clique em "Nova conta" para cadastrar uma despesa futura.</p>
        </div>
      ) : (
        <div className="border border-border rounded-xl overflow-hidden">
          {contasFiltradas.map((conta, idx) => {
            const cat = catInfo(conta.categoria)
            const statusCor = conta.status === "atrasado"
              ? "text-red-500 bg-red-500/10 border-red-500/20"
              : conta.status === "pago"
                ? "text-emerald-500 bg-emerald-500/10 border-emerald-500/20"
                : "text-amber-500 bg-amber-500/10 border-amber-500/20"
            return (
              <div key={conta.id} className={`flex items-center gap-3 px-4 py-3.5 ${idx > 0 ? "border-t border-border" : ""} hover:bg-muted/40 transition-colors`}>
                <div className="text-xl shrink-0">{cat?.emoji ?? "📋"}</div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold truncate">{conta.descricao}</p>
                  <div className="flex items-center gap-2 mt-0.5">
                    <span className="text-xs text-muted-foreground">
                      {format(parseISO(conta.data_vencimento), "dd/MM/yyyy", { locale: ptBR })}
                      {isToday(parseISO(conta.data_vencimento)) && <span className="ml-1 text-primary font-bold">· Hoje!</span>}
                    </span>
                    <span className="text-xs text-muted-foreground">{cat?.label}</span>
                    {conta.recorrencia !== "avulso" && (
                      <span className="text-[10px] px-1.5 py-0.5 bg-muted rounded font-medium capitalize">{conta.recorrencia}</span>
                    )}
                  </div>
                </div>
                <div className="text-right shrink-0 space-y-1">
                  <p className="text-sm font-black">{formatarMoeda(conta.valor)}</p>
                  <span className={`text-[10px] px-2 py-0.5 rounded-full border font-semibold ${statusCor}`}>
                    {conta.status === "atrasado" ? "Atrasado" : conta.status === "pago" ? "Pago" : "Pendente"}
                  </span>
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  {conta.status !== "pago" && (
                    <button onClick={() => pagar(conta.id)} title="Marcar como pago"
                      className="p-1.5 rounded-lg text-emerald-500 hover:bg-emerald-500/10 transition-colors">
                      <CheckCircle2 className="w-4 h-4" />
                    </button>
                  )}
                  <button onClick={() => excluir(conta)} title="Excluir"
                    className="p-1.5 rounded-lg text-muted-foreground hover:text-red-500 hover:bg-red-500/10 transition-colors">
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Modal nova conta */}
      <Dialog open={modalAberto} onOpenChange={(o) => { if (!o) setModalAberto(false) }}>
        <DialogContent onInteractOutside={(e) => e.preventDefault()}>
          <DialogHeader><DialogTitle>Nova Conta a Pagar</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label>Descrição *</Label>
              <Input placeholder="Ex: Aluguel do salão" value={form.descricao} onChange={(e) => setForm((p) => ({ ...p, descricao: e.target.value }))} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Valor (R$) *</Label>
                <Input type="number" step="0.01" min="0.01" placeholder="0,00" value={form.valor} onChange={(e) => setForm((p) => ({ ...p, valor: e.target.value }))} />
              </div>
              <div className="space-y-1.5">
                <Label>Vencimento *</Label>
                <Input type="date" value={form.data_vencimento} onChange={(e) => setForm((p) => ({ ...p, data_vencimento: e.target.value }))} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Categoria</Label>
                <Select value={form.categoria} onValueChange={(v) => setForm((p) => ({ ...p, categoria: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {CATEGORIAS_CONTA.map((c) => (
                      <SelectItem key={c.value} value={c.value}>{c.emoji} {c.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Recorrência</Label>
                <Select value={form.recorrencia} onValueChange={(v) => setForm((p) => ({ ...p, recorrencia: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="avulso">Avulso (uma vez)</SelectItem>
                    <SelectItem value="mensal">Mensal</SelectItem>
                    <SelectItem value="semanal">Semanal</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            {form.recorrencia !== "avulso" && (
              <div className="space-y-1.5">
                <Label>Quantidade de {form.recorrencia === "mensal" ? "meses" : "semanas"}</Label>
                <Input
                  type="number"
                  min="2"
                  max="120"
                  placeholder={form.recorrencia === "mensal" ? "Ex: 12" : "Ex: 4"}
                  value={form.qtd_parcelas}
                  onChange={(e) => setForm((p) => ({ ...p, qtd_parcelas: e.target.value }))}
                />
              </div>
            )}
            <div className="space-y-1.5">
              <Label>Observações</Label>
              <Textarea placeholder="Opcional..." rows={2} value={form.observacoes} onChange={(e) => setForm((p) => ({ ...p, observacoes: e.target.value }))} />
            </div>
            {form.recorrencia !== "avulso" && (
              <p className="text-xs text-muted-foreground bg-muted rounded-lg px-3 py-2">
                📅 Serão criadas {form.qtd_parcelas || "0"} parcelas {form.recorrencia === "mensal" ? "mensais" : "semanais"} a partir de {format(new Date(form.data_vencimento + "T12:00:00"), "dd/MM/yyyy", { locale: ptBR })}.
              </p>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setModalAberto(false)}>Cancelar</Button>
            <Button onClick={salvar} disabled={loading}>
              {loading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
              Cadastrar conta
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Modal de juros (contas atrasadas) */}
      <Dialog open={!!modalJuros} onOpenChange={(o) => { if (!o) { setModalJuros(null); setValorComJuros("") } }}>
        <DialogContent>
          <DialogHeader><DialogTitle>Pagamento com juros?</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              A conta <strong>{modalJuros?.descricao}</strong> está atrasada. O valor original é <strong>{formatarMoeda(modalJuros?.valorOriginal ?? 0)}</strong>.
            </p>
            <p className="text-sm">Houve juros/multa? Informe o valor total pago:</p>
            <div className="space-y-1.5">
              <Label>Valor pago (com juros)</Label>
              <Input
                type="number"
                step="0.01"
                min="0.01"
                placeholder={String(modalJuros?.valorOriginal ?? "")}
                value={valorComJuros}
                onChange={(e) => setValorComJuros(e.target.value)}
              />
              <p className="text-[11px] text-muted-foreground">Deixe vazio para usar o valor original (sem juros).</p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setModalJuros(null); setValorComJuros("") }}>Cancelar</Button>
            <Button onClick={confirmarPagamentoComJuros}>Confirmar pagamento</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

// ─── Aba Fluxo de Caixa ───────────────────────────────────────────────────

function FluxoCaixaTab({
  vendas,
  contasPagar,
  agendamentosFuturos,
  valoresReceber = [],
}: {
  vendas: Venda[]
  contasPagar: ContaPagar[]
  agendamentosFuturos: { id: string; data_hora: string; status: string; produtos_servicos?: { preco: number; nome: string } | null }[]
  valoresReceber?: { id: string; devedor: string; valor: number; data_vencimento: string; status: string }[]
}) {
  const [periodo, setPeriodo] = useState<"hoje" | "semana" | "mes" | "custom">("mes")
  const [dataCustom, setDataCustom] = useState("")
  const hoje = new Date()
  hoje.setHours(0, 0, 0, 0)

  const { inicio, fim } = (() => {
    if (periodo === "hoje") return { inicio: hoje, fim: new Date(hoje.getTime() + 86399999) }
    if (periodo === "semana") return { inicio: startOfWeek(hoje, { locale: ptBR }), fim: endOfWeek(hoje, { locale: ptBR }) }
    if (periodo === "custom" && dataCustom) return { inicio: hoje, fim: new Date(dataCustom + "T23:59:59") }
    return { inicio: startOfMonth(hoje), fim: endOfMonth(hoje) }
  })()

  const fmtDate = (d: Date) => d.toISOString().substring(0, 10)

  // Receitas confirmadas (vendas já concluídas no período)
  const receitasConfirmadas = vendas
    .filter((v) => v.status === "concluida" && new Date(v.created_at) >= inicio && new Date(v.created_at) <= fim)
    .reduce((s, v) => s + v.total, 0)

  // Receitas previstas (agendamentos futuros no período com preço + valores a receber pendentes)
  const receitasAgendamentos = agendamentosFuturos
    .filter((a) => {
      const d = new Date(a.data_hora)
      return d >= inicio && d <= fim && a.produtos_servicos?.preco
    })
    .reduce((s, a) => s + (a.produtos_servicos?.preco ?? 0), 0)

  const receitasValoresReceber = valoresReceber
    .filter((v) => {
      if (v.status !== "pendente") return false
      const dv = v.data_vencimento
      return dv >= fmtDate(inicio) && dv <= fmtDate(fim)
    })
    .reduce((s, v) => s + v.valor, 0)

  const receitasPrevistas = receitasAgendamentos + receitasValoresReceber
  const totalReceitas = receitasConfirmadas + receitasPrevistas

  // Despesas previstas (contas a pagar pendentes/atrasadas no período)
  const despesasPrevistas = contasPagar
    .filter((c) => {
      const dv = c.data_vencimento
      return (c.status === "pendente" || c.status === "atrasado") && dv >= fmtDate(inicio) && dv <= fmtDate(fim)
    })
    .reduce((s, c) => s + c.valor, 0)

  const saldoProjetado = totalReceitas - despesasPrevistas

  // Dados para gráfico (por dia na semana, por semana no mês)
  const dadosGrafico: { label: string; receita: number; despesa: number }[] = []

  if (periodo === "semana") {
    for (let i = 0; i < 7; i++) {
      const dia = addDays(inicio, i)
      const diaStr = fmtDate(dia)
      const rec = vendas.filter((v) => v.status === "concluida" && v.created_at.substring(0, 10) === diaStr).reduce((s, v) => s + v.total, 0)
        + agendamentosFuturos.filter((a) => a.data_hora.substring(0, 10) === diaStr && a.produtos_servicos?.preco).reduce((s, a) => s + (a.produtos_servicos?.preco ?? 0), 0)
      const desp = contasPagar.filter((c) => c.data_vencimento === diaStr && (c.status === "pendente" || c.status === "atrasado")).reduce((s, c) => s + c.valor, 0)
      dadosGrafico.push({ label: format(dia, "EEE", { locale: ptBR }), receita: rec, despesa: desp })
    }
  } else if (periodo === "mes" || periodo === "custom") {
    const totalDias = Math.ceil((fim.getTime() - inicio.getTime()) / (1000 * 60 * 60 * 24))
    const numSemanas = Math.min(Math.ceil(totalDias / 7), 6)
    for (let semana = 0; semana < numSemanas; semana++) {
      const iniSem = addDays(inicio, semana * 7)
      const fimSem = addDays(iniSem, 6)
      if (iniSem > fim) break
      const rec = vendas.filter((v) => {
        const d = new Date(v.created_at)
        return v.status === "concluida" && d >= iniSem && d <= fimSem
      }).reduce((s, v) => s + v.total, 0)
        + agendamentosFuturos.filter((a) => {
          const d = new Date(a.data_hora)
          return d >= iniSem && d <= fimSem && a.produtos_servicos?.preco
        }).reduce((s, a) => s + (a.produtos_servicos?.preco ?? 0), 0)
      const desp = contasPagar.filter((c) => {
        const dv = c.data_vencimento
        return (c.status === "pendente" || c.status === "atrasado") && dv >= fmtDate(iniSem) && dv <= fmtDate(fimSem)
      }).reduce((s, c) => s + c.valor, 0)
      dadosGrafico.push({ label: `Sem ${semana + 1}`, receita: rec, despesa: desp })
    }
  }

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <h2 className="text-base font-bold flex items-center gap-2">
          <ArrowRightLeft className="w-4 h-4 text-primary" />
          Fluxo de Caixa Projetado
        </h2>
        <div className="flex items-center gap-2 flex-wrap">
          {(["hoje", "semana", "mes"] as const).map((p) => (
            <button key={p} onClick={() => { setPeriodo(p); setDataCustom("") }}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all border-2 ${
                periodo === p
                  ? "border-[#F26E1D] bg-[#F26E1D]/10 text-[#F26E1D]"
                  : "border-transparent bg-muted text-muted-foreground hover:text-foreground"
              }`}>
              {p === "hoje" ? "Hoje" : p === "semana" ? "Esta semana" : "Este mês"}
            </button>
          ))}
          <div className="flex items-center gap-1.5">
            <input
              type="date"
              value={dataCustom}
              onChange={(e) => { setDataCustom(e.target.value); if (e.target.value) setPeriodo("custom") }}
              className={`h-8 px-2 rounded-lg text-xs border-2 bg-background transition-all ${
                periodo === "custom"
                  ? "border-[#F26E1D] text-[#F26E1D]"
                  : "border-transparent bg-muted text-muted-foreground"
              }`}
              title="Projeção até uma data específica"
              min={fmtDate(hoje)}
            />
          </div>
        </div>
      </div>

      {/* Cards de resumo */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {[
          { label: "Receitas confirmadas", valor: receitasConfirmadas, cor: "text-emerald-500", bg: "bg-emerald-500/10", desc: "Vendas já realizadas" },
          { label: "Receitas previstas", valor: receitasPrevistas, cor: "text-blue-500", bg: "bg-blue-500/10", desc: "Agendamentos + A receber" },
          { label: "Despesas previstas", valor: despesasPrevistas, cor: "text-red-500", bg: "bg-red-500/10", desc: "Contas a pagar" },
          { label: "Saldo projetado", valor: saldoProjetado, cor: saldoProjetado >= 0 ? "text-emerald-500" : "text-red-500", bg: saldoProjetado >= 0 ? "bg-emerald-500/10" : "bg-red-500/10", desc: saldoProjetado >= 0 ? "Resultado positivo" : "Atenção: déficit" },
        ].map(({ label, valor, cor, bg, desc }) => (
          <Card key={label}>
            <CardContent className="p-4">
              <div className={`w-8 h-8 rounded-lg ${bg} flex items-center justify-center mb-2`}>
                <DollarSign className={`w-4 h-4 ${cor}`} />
              </div>
              <p className="text-xs text-muted-foreground">{label}</p>
              <p className={`text-xl font-black ${cor}`}>{formatarMoeda(valor)}</p>
              <p className="text-[10px] text-muted-foreground mt-0.5">{desc}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Saldo visual */}
      <div className={`rounded-2xl p-5 border ${saldoProjetado >= 0 ? "border-emerald-500/20 bg-emerald-500/5" : "border-red-500/20 bg-red-500/5"}`}>
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-semibold text-muted-foreground">Saldo projetado para o período</p>
            <p className={`text-3xl font-black mt-1 ${saldoProjetado >= 0 ? "text-emerald-500" : "text-red-500"}`}>
              {saldoProjetado >= 0 ? "+" : ""}{formatarMoeda(saldoProjetado)}
            </p>
          </div>
          <div className={`text-4xl ${saldoProjetado >= 0 ? "" : "opacity-70"}`}>
            {saldoProjetado >= 0 ? "📈" : "📉"}
          </div>
        </div>
        {saldoProjetado < 0 && (
          <p className="text-xs text-red-500 mt-2 font-medium">
            ⚠ Suas despesas previstas superam as receitas. Considere rever os custos ou aumentar as vendas.
          </p>
        )}
      </div>

      {/* Gráfico */}
      {periodo !== "hoje" && dadosGrafico.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">
              Receitas vs Despesas — {periodo === "semana" ? "por dia" : "por semana"}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={dadosGrafico} barGap={2}>
                <XAxis dataKey="label" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} tickFormatter={(v) => `R$${v}`} />
                <Tooltip formatter={(v: number, name: string) => [formatarMoeda(v), name === "receita" ? "Receitas" : "Despesas"]} />
                <Bar dataKey="receita" name="receita" fill="#10B981" radius={[4, 4, 0, 0]} />
                <Bar dataKey="despesa" name="despesa" fill="#EF4444" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
            <div className="flex items-center gap-4 justify-center mt-2">
              <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                <div className="w-3 h-3 rounded bg-emerald-500" />Receitas
              </div>
              <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                <div className="w-3 h-3 rounded bg-red-500" />Despesas
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
