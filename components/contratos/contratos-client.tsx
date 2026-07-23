"use client"

import { useState } from "react"
import { Plus, CheckCircle2, Clock, AlertCircle, XCircle, ChevronDown, ChevronUp, Trash2, X, Calendar, DollarSign, User, Loader2, FileText, TrendingUp, Banknote } from "lucide-react"
import { toast } from "sonner"
import { createClient } from "@/lib/supabase/client"
import { format, addMonths, parseISO, isBefore, isToday } from "date-fns"
import { ptBR } from "date-fns/locale"
import { motion, AnimatePresence } from "framer-motion"
import { cn } from "@/lib/utils"
import { formatarMoeda } from "@/lib/utils"

type StatusContrato = "ativo" | "pausado" | "cancelado" | "concluido"
type StatusParcela = "previsto" | "pago" | "atrasado" | "cancelado"

interface Contrato {
  id: string; empresa_id: string; cliente_id: string | null; servico_id: string | null
  funcionario_id: string | null; titulo: string; descricao: string | null
  valor_mensal: number; duracao_meses: number; dia_vencimento: number
  data_inicio: string; data_fim: string; status: StatusContrato
  observacoes: string | null; created_at: string
}

interface Parcela {
  id: string; empresa_id: string; contrato_id: string; numero_parcela: number
  data_vencimento: string; valor: number; status: StatusParcela
  data_pagamento: string | null; venda_id: string | null; observacoes: string | null
}

interface Props {
  empresaId: string
  contratosInit: Contrato[]
  parcelasInit: Parcela[]
  clientes: { id: string; nome_completo: string; telefone: string }[]
  servicos: { id: string; nome: string; preco: number }[]
  funcionarios: { id: string; nome: string }[]
}

const STATUS_CONTRATO: Record<StatusContrato, { label: string; cor: string; bg: string; Icon: typeof Clock }> = {
  ativo:     { label: "Ativo",     cor: "text-emerald-600", bg: "bg-emerald-50 dark:bg-emerald-900/30",  Icon: CheckCircle2 },
  pausado:   { label: "Pausado",   cor: "text-amber-600",   bg: "bg-amber-50 dark:bg-amber-900/30",      Icon: Clock },
  cancelado: { label: "Cancelado", cor: "text-red-600",     bg: "bg-red-50 dark:bg-red-900/30",          Icon: XCircle },
  concluido: { label: "Concluído", cor: "text-blue-600",    bg: "bg-blue-50 dark:bg-blue-900/30",        Icon: CheckCircle2 },
}

const STATUS_PARCELA: Record<StatusParcela, { label: string; cor: string; bg: string }> = {
  previsto:  { label: "Previsto",  cor: "text-gray-500",    bg: "bg-gray-100 dark:bg-gray-800" },
  pago:      { label: "Pago",      cor: "text-emerald-600", bg: "bg-emerald-50 dark:bg-emerald-900/30" },
  atrasado:  { label: "Atrasado",  cor: "text-red-600",     bg: "bg-red-50 dark:bg-red-900/30" },
  cancelado: { label: "Cancelado", cor: "text-gray-400",    bg: "bg-gray-100 dark:bg-gray-800" },
}

const DURACOES = [1, 2, 3, 6, 12, 18, 24]

export function ContratosClient({ empresaId, contratosInit, parcelasInit, clientes, servicos, funcionarios }: Props) {
  const [contratos, setContratos] = useState(contratosInit)
  const [parcelas, setParcelas] = useState(parcelasInit)
  const [modalNovo, setModalNovo] = useState(false)
  const [expandido, setExpandido] = useState<string | null>(null)
  const [filtro, setFiltro] = useState<StatusContrato | "todos">("todos")
  const supabase = createClient()

  // Form
  const [titulo, setTitulo] = useState("")
  const [clienteId, setClienteId] = useState("")
  const [servicoId, setServicoId] = useState("")
  const [funcionarioId, setFuncionarioId] = useState("")
  const [valorMensal, setValorMensal] = useState("")
  const [duracaoMeses, setDuracaoMeses] = useState(12)
  const [diaVencimento, setDiaVencimento] = useState(10)
  const [dataInicio, setDataInicio] = useState(new Date().toISOString().slice(0, 10))
  const [descricao, setDescricao] = useState("")
  const [observacoes, setObservacoes] = useState("")
  const [loading, setLoading] = useState(false)

  const parcelasDoContrato = (id: string) => parcelas.filter((p) => p.contrato_id === id)
  const contratosFiltrados = contratos.filter((c) => filtro === "todos" || c.status === filtro)

  // Métricas
  const totalMensalRecorrente = contratos.filter((c) => c.status === "ativo").reduce((s, c) => s + c.valor_mensal, 0)
  const parcelasAtrasadas = parcelas.filter((p) => p.status === "atrasado").length
  const parcelasProximasMes = parcelas.filter((p) => {
    if (p.status !== "previsto") return false
    const venc = new Date(p.data_vencimento + "T12:00:00")
    const agora = new Date()
    const em30dias = addMonths(agora, 1)
    return venc >= agora && venc <= em30dias
  }).length
  const receitaTotal = contratos.filter((c) => c.status === "ativo").reduce((s, c) => s + c.valor_mensal * c.duracao_meses, 0)

  // Ao selecionar serviço, preenche o valor
  function aoSelecionarServico(id: string) {
    setServicoId(id)
    const serv = servicos.find((s) => s.id === id)
    if (serv && !valorMensal) setValorMensal(serv.preco.toString())
  }

  function gerarParcelas(contratoId: string, inicio: string, meses: number, valor: number, diaVenc: number): Omit<Parcela, "id" | "created_at">[] {
    const parcs = []
    const dataBase = new Date(inicio + "T12:00:00")
    for (let i = 0; i < meses; i++) {
      const data = addMonths(dataBase, i)
      data.setDate(Math.min(diaVenc, new Date(data.getFullYear(), data.getMonth() + 1, 0).getDate()))
      const hoje = new Date()
      hoje.setHours(0, 0, 0, 0)
      const vencimento = new Date(data)
      vencimento.setHours(0, 0, 0, 0)
      const status: StatusParcela = vencimento < hoje ? "atrasado" : "previsto"
      parcs.push({
        empresa_id: empresaId,
        contrato_id: contratoId,
        numero_parcela: i + 1,
        data_vencimento: data.toISOString().slice(0, 10),
        valor,
        status,
        data_pagamento: null,
        venda_id: null,
        observacoes: null,
      })
    }
    return parcs
  }

  async function criarContrato() {
    if (!titulo.trim() || !valorMensal || !dataInicio) { toast.error("Preencha título, valor e data de início."); return }
    setLoading(true)
    try {
      const valor = parseFloat(valorMensal)
      const dataFim = addMonths(new Date(dataInicio + "T12:00:00"), duracaoMeses)

      const { data: contrato, error } = await supabase.from("contratos").insert({
        empresa_id: empresaId,
        cliente_id: clienteId || null,
        servico_id: servicoId || null,
        funcionario_id: funcionarioId || null,
        titulo,
        descricao: descricao || null,
        valor_mensal: valor,
        duracao_meses: duracaoMeses,
        dia_vencimento: diaVencimento,
        data_inicio: dataInicio,
        data_fim: dataFim.toISOString().slice(0, 10),
        status: "ativo",
        observacoes: observacoes || null,
      }).select().single()

      if (error || !contrato) { toast.error("Erro ao criar contrato."); return }

      const parcsData = gerarParcelas(contrato.id, dataInicio, duracaoMeses, valor, diaVencimento)
      const { data: parcsInseridas } = await supabase.from("contratos_parcelas").insert(parcsData).select()

      // Criar valores_receber para cada parcela (integração com financeiro)
      if (parcsInseridas && parcsInseridas.length > 0) {
        const clienteNome = clientes.find((c) => c.id === clienteId)?.nome_completo ?? titulo
        const valoresReceber = parcsInseridas.map((p: any) => ({
          empresa_id: empresaId,
          devedor: clienteNome,
          valor: p.valor,
          data_vencimento: p.data_vencimento,
          observacoes: `Contrato: ${titulo} — Parcela ${p.numero_parcela}/${duracaoMeses}`,
          status: "pendente",
        }))
        await supabase.from("valores_receber").insert(valoresReceber)
      }

      setContratos((p) => [contrato, ...p])
      if (parcsInseridas) setParcelas((p) => [...p, ...parcsInseridas])
      setExpandido(contrato.id)
      setModalNovo(false)
      resetForm()
      toast.success(`Contrato criado com ${duracaoMeses} parcelas!`)
    } catch { toast.error("Erro inesperado.") }
    setLoading(false)
  }

  function resetForm() {
    setTitulo(""); setClienteId(""); setServicoId(""); setFuncionarioId("")
    setValorMensal(""); setDuracaoMeses(12); setDiaVencimento(10)
    setDataInicio(new Date().toISOString().slice(0, 10))
    setDescricao(""); setObservacoes("")
  }

  async function marcarParcela(parcela: Parcela, novoStatus: StatusParcela) {
    const update: Partial<Parcela> = {
      status: novoStatus,
      data_pagamento: novoStatus === "pago" ? new Date().toISOString().slice(0, 10) : null,
    }
    const { error } = await supabase.from("contratos_parcelas").update(update).eq("id", parcela.id)
    if (error) { toast.error("Erro ao atualizar parcela."); return }
    setParcelas((p) => p.map((par) => par.id === parcela.id ? { ...par, ...update } : par))

    if (novoStatus === "pago") {
      // Registrar entrada no caixa
      const { data: caixaAberto } = await supabase
        .from("caixas")
        .select("id")
        .eq("empresa_id", empresaId)
        .eq("status", "aberto")
        .order("created_at", { ascending: true })
        .limit(1)
        .maybeSingle()

      if (caixaAberto) {
        const contrato = contratos.find((c) => c.id === parcela.contrato_id)
        await supabase.from("movimentacoes_caixa").insert({
          empresa_id: empresaId,
          caixa_id: caixaAberto.id,
          tipo: "entrada",
          categoria: "suprimento",
          descricao: `Contrato: ${contrato?.titulo ?? "Parcela"} — Parcela ${parcela.numero_parcela}`,
          valor: parcela.valor,
        })
      }

      // Marcar valor_receber correspondente como recebido (se existir)
      const contrato = contratos.find((c) => c.id === parcela.contrato_id)
      if (contrato) {
        const obsMatch = `Contrato: ${contrato.titulo} — Parcela ${parcela.numero_parcela}/`
        const { data: vrMatch } = await supabase
          .from("valores_receber")
          .select("id")
          .eq("empresa_id", empresaId)
          .eq("status", "pendente")
          .eq("valor", parcela.valor)
          .ilike("observacoes", `${obsMatch}%`)
          .limit(1)
          .maybeSingle()
        if (vrMatch) {
          await supabase.from("valores_receber").update({ status: "recebido" }).eq("id", vrMatch.id)
        }
      }

      toast.success("Parcela paga e registrada no caixa!")
    }
  }

  async function excluirContrato(id: string) {
    if (!confirm("Excluir este contrato e todas as suas parcelas?")) return
    await supabase.from("contratos_parcelas").delete().eq("contrato_id", id)
    await supabase.from("contratos").delete().eq("id", id)
    setContratos((p) => p.filter((c) => c.id !== id))
    setParcelas((p) => p.filter((par) => par.contrato_id !== id))
    toast.success("Contrato excluído.")
  }

  async function alterarStatusContrato(id: string, status: StatusContrato) {
    await supabase.from("contratos").update({ status }).eq("id", id)
    setContratos((p) => p.map((c) => c.id === id ? { ...c, status } : c))
    toast.success(`Contrato ${STATUS_CONTRATO[status].label.toLowerCase()}.`)
  }

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      {/* Header */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-lg font-semibold text-foreground">Contratos</h1>
          <p className="text-xs text-muted-foreground mt-0.5">Gerencie contratos recorrentes e previsão de receita</p>
        </div>
        <button onClick={() => setModalNovo(true)} style={{ backgroundColor: "#F26E1D" }}
          className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-white text-sm font-bold hover:opacity-90 transition-opacity shadow-sm">
          <Plus className="w-4 h-4" />Novo Contrato
        </button>
      </div>

      {/* KPIs — estilo dashboard */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: "Receita mensal", valor: formatarMoeda(totalMensalRecorrente), color: "#10b981", bg: "#10b98115" },
          { label: "Contratos ativos", valor: contratos.filter((c) => c.status === "ativo").length.toString(), color: "#6366f1", bg: "#6366f115" },
          { label: "Parcelas atrasadas", valor: parcelasAtrasadas.toString(), color: parcelasAtrasadas > 0 ? "#ef4444" : "#6b7280", bg: parcelasAtrasadas > 0 ? "#ef444415" : "#6b728015" },
          { label: "Vencendo em 30d", valor: parcelasProximasMes.toString(), color: "#f59e0b", bg: "#f59e0b15" },
        ].map((kpi) => (
          <div key={kpi.label} className="kpi-card">
            <div className="flex items-center justify-between mb-2">
              <span className="kpi-label">{kpi.label}</span>
            </div>
            <div className="kpi-value" style={{ color: kpi.color }}>{kpi.valor}</div>
          </div>
        ))}
      </div>

      {/* Filtros */}
      <div className="flex gap-1 p-1 bg-muted/60 rounded-xl border border-border w-fit">
        {(["todos","ativo","pausado","cancelado","concluido"] as const).map((s) => (
          <button key={s} onClick={() => setFiltro(s)}
            className={cn("px-3 py-1.5 rounded-lg text-xs font-semibold transition-all capitalize",
              filtro === s ? "bg-white dark:bg-white/10 text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground")}>
            {s === "todos" ? "Todos" : STATUS_CONTRATO[s as StatusContrato]?.label}
          </button>
        ))}
      </div>

      {/* Lista de contratos */}
      <div className="space-y-3">
        {contratosFiltrados.length === 0 && (
          <div className="text-center py-20 space-y-4">
            <div className="w-16 h-16 rounded-2xl bg-muted flex items-center justify-center mx-auto">
              <FileText className="w-7 h-7 text-muted-foreground" />
            </div>
            <div>
              <h3 className="text-lg font-black">Nenhum contrato ainda</h3>
              <p className="text-muted-foreground text-sm mt-1 max-w-xs mx-auto">Crie contratos recorrentes para controlar mensalidades e previsão de receita.</p>
            </div>
            <button onClick={() => setModalNovo(true)} style={{ backgroundColor: "#F26E1D" }}
              className="px-4 py-2.5 rounded-xl text-white text-sm font-bold hover:opacity-90 transition-opacity inline-flex items-center gap-2">
              <Plus className="w-4 h-4" />Criar primeiro contrato
            </button>
          </div>
        )}

        {contratosFiltrados.map((contrato) => {
          const parcs = parcelasDoContrato(contrato.id)
          const pagas = parcs.filter((p) => p.status === "pago").length
          const atrasadas = parcs.filter((p) => p.status === "atrasado").length
          const sc = STATUS_CONTRATO[contrato.status]
          const ScIcon = sc.Icon
          const aberto = expandido === contrato.id
          const cliente = clientes.find((c) => c.id === contrato.cliente_id)
          const servico = servicos.find((s) => s.id === contrato.servico_id)

          return (
            <div key={contrato.id} className="rounded-2xl border border-border overflow-hidden bg-card">
              {/* Header do contrato */}
              <div className="flex items-center gap-3 px-4 py-3.5">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h3 className="font-bold text-sm">{contrato.titulo}</h3>
                    <span className={cn("text-[10px] font-bold px-2 py-0.5 rounded-full", sc.bg, sc.cor)}>
                      {sc.label}
                    </span>
                    {atrasadas > 0 && (
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-red-50 text-red-600 dark:bg-red-900/30">
                        ⚠️ {atrasadas} atrasada{atrasadas > 1 ? "s" : ""}
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-3 mt-1 flex-wrap">
                    {cliente && <span className="text-xs text-muted-foreground flex items-center gap-1"><User className="w-3 h-3" />{cliente.nome_completo}</span>}
                    {servico && <span className="text-xs text-muted-foreground flex items-center gap-1"><FileText className="w-3 h-3" />{servico.nome}</span>}
                    <span className="text-xs text-muted-foreground flex items-center gap-1"><DollarSign className="w-3 h-3" />{formatarMoeda(contrato.valor_mensal)}/mês</span>
                    <span className="text-xs text-muted-foreground flex items-center gap-1"><Calendar className="w-3 h-3" />{contrato.duracao_meses} meses</span>
                  </div>
                  {/* Barra de progresso */}
                  <div className="mt-2 flex items-center gap-2">
                    <div className="flex-1 h-1.5 bg-border rounded-full overflow-hidden">
                      <div className="h-full bg-emerald-500 rounded-full transition-all" style={{ width: `${(pagas / contrato.duracao_meses) * 100}%` }} />
                    </div>
                    <span className="text-[10px] text-muted-foreground shrink-0">{pagas}/{contrato.duracao_meses} pagas</span>
                  </div>
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  <button onClick={() => excluirContrato(contrato.id)} className="p-1.5 rounded-lg hover:bg-muted text-muted-foreground hover:text-red-500 transition-colors">
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                  <button onClick={() => setExpandido(aberto ? null : contrato.id)} className="p-1.5 rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground transition-colors">
                    {aberto ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {/* Parcelas */}
              <AnimatePresence>
                {aberto && (
                  <motion.div initial={{ height: 0 }} animate={{ height: "auto" }} exit={{ height: 0 }} className="overflow-hidden">
                    <div className="border-t border-border">
                      {/* Status do contrato */}
                      <div className="flex gap-2 px-4 pt-3 pb-1 flex-wrap">
                        {(["ativo","pausado","cancelado","concluido"] as const).map((s) => (
                          <button key={s} onClick={() => alterarStatusContrato(contrato.id, s)}
                            className={cn("text-[10px] font-bold px-2.5 py-1 rounded-lg border transition-all capitalize",
                              contrato.status === s
                                ? `${STATUS_CONTRATO[s].bg} ${STATUS_CONTRATO[s].cor} border-current`
                                : "border-border text-muted-foreground hover:border-border/80"
                            )}>
                            {STATUS_CONTRATO[s].label}
                          </button>
                        ))}
                      </div>

                      {/* Tabela de parcelas */}
                      <div className="px-4 pb-4">
                        <div className="mt-3 rounded-xl border border-border overflow-hidden">
                          <div className="grid grid-cols-[auto_1fr_auto_auto] gap-3 px-3 py-2 bg-muted/30 text-[10px] font-bold text-muted-foreground uppercase tracking-wide">
                            <span>#</span><span>Vencimento</span><span>Valor</span><span>Status</span>
                          </div>
                          {parcs.map((parcela) => {
                            const sp = STATUS_PARCELA[parcela.status]
                            const vencida = parcela.status === "previsto" && isBefore(new Date(parcela.data_vencimento + "T12:00:00"), new Date())
                            return (
                              <div key={parcela.id} className={cn("grid grid-cols-[auto_1fr_auto_auto] gap-3 px-3 py-2.5 border-t border-border items-center hover:bg-muted/30 transition-colors", parcela.status === "pago" && "opacity-60")}>
                                <span className="text-xs text-muted-foreground w-5 text-center">{parcela.numero_parcela}</span>
                                <div>
                                  <p className="text-xs font-medium">
                                    {format(new Date(parcela.data_vencimento + "T12:00:00"), "dd/MM/yyyy")}
                                  </p>
                                  {parcela.data_pagamento && (
                                    <p className="text-[10px] text-emerald-600">Pago em {format(new Date(parcela.data_pagamento + "T12:00:00"), "dd/MM/yy")}</p>
                                  )}
                                </div>
                                <span className="text-xs font-bold">{formatarMoeda(parcela.valor)}</span>
                                <div className="flex items-center gap-1.5">
                                  <span className={cn("text-[10px] font-semibold px-2 py-0.5 rounded-full", sp.bg, vencida && parcela.status === "previsto" ? "bg-red-50 text-red-600 dark:bg-red-900/30" : sp.cor)}>
                                    {vencida && parcela.status === "previsto" ? "Atrasado" : sp.label}
                                  </span>
                                  {parcela.status !== "pago" && parcela.status !== "cancelado" && (
                                    <button onClick={() => marcarParcela(parcela, "pago")}
                                      className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-600 hover:bg-emerald-100 dark:bg-emerald-900/30 dark:hover:bg-emerald-900/50 transition-colors">
                                      Marcar pago
                                    </button>
                                  )}
                                  {parcela.status === "pago" && (
                                    <button onClick={() => marcarParcela(parcela, "previsto")}
                                      className="text-[10px] text-muted-foreground hover:text-foreground transition-colors">
                                      Desfazer
                                    </button>
                                  )}
                                </div>
                              </div>
                            )
                          })}
                        </div>
                        {/* Resumo financeiro */}
                        <div className="flex gap-4 mt-3 flex-wrap">
                          <div className="text-xs text-muted-foreground">Total contrato: <strong className="text-foreground">{formatarMoeda(contrato.valor_mensal * contrato.duracao_meses)}</strong></div>
                          <div className="text-xs text-muted-foreground">Recebido: <strong className="text-emerald-600">{formatarMoeda(pagas * contrato.valor_mensal)}</strong></div>
                          <div className="text-xs text-muted-foreground">A receber: <strong className="text-foreground">{formatarMoeda((contrato.duracao_meses - pagas) * contrato.valor_mensal)}</strong></div>
                        </div>
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          )
        })}
      </div>

      {/* Modal Novo Contrato */}
      <AnimatePresence>
        {modalNovo && (
          <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/40 backdrop-blur-sm">
            <motion.div initial={{ y: 30, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 30, opacity: 0 }}
              className="w-full sm:max-w-lg rounded-t-2xl sm:rounded-2xl shadow-2xl overflow-hidden"
              style={{ backgroundColor: "#ffffff" }}>
              <div className="p-5 space-y-4 max-h-[90vh] overflow-y-auto" style={{ backgroundColor: "#ffffff" }}>
                <div className="flex items-center justify-between">
                  <h3 className="font-black text-base text-gray-900">Novo Contrato</h3>
                  <button onClick={() => { setModalNovo(false); resetForm() }} className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400"><X className="w-4 h-4" /></button>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-gray-500">Título do contrato *</label>
                  <input value={titulo} onChange={(e) => setTitulo(e.target.value)} placeholder="Ex: Consultoria Mensal, Plano Anual..."
                    className="w-full h-10 rounded-xl border border-gray-200 bg-gray-50 px-3 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-orange-200 focus:border-orange-400" />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-gray-500">Cliente</label>
                    <select value={clienteId} onChange={(e) => setClienteId(e.target.value)}
                      className="w-full h-10 rounded-xl border border-gray-200 bg-gray-50 px-3 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-orange-200 focus:border-orange-400 cursor-pointer">
                      <option value="">Sem cliente</option>
                      {clientes.map((c) => <option key={c.id} value={c.id}>{c.nome_completo}</option>)}
                    </select>
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-gray-500">Serviço</label>
                    <select value={servicoId} onChange={(e) => aoSelecionarServico(e.target.value)}
                      className="w-full h-10 rounded-xl border border-gray-200 bg-gray-50 px-3 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-orange-200 focus:border-orange-400 cursor-pointer">
                      <option value="">Sem serviço</option>
                      {servicos.map((s) => <option key={s.id} value={s.id}>{s.nome}</option>)}
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-3">
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-gray-500">Valor mensal *</label>
                    <input type="number" step="0.01" min="0" value={valorMensal} onChange={(e) => setValorMensal(e.target.value)} placeholder="0,00"
                      className="w-full h-10 rounded-xl border border-gray-200 bg-gray-50 px-3 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-orange-200 focus:border-orange-400" />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-gray-500">Duração</label>
                    <select value={duracaoMeses} onChange={(e) => setDuracaoMeses(parseInt(e.target.value))}
                      className="w-full h-10 rounded-xl border border-gray-200 bg-gray-50 px-3 text-sm text-gray-900 focus:outline-none cursor-pointer">
                      {DURACOES.map((d) => <option key={d} value={d}>{d === 1 ? "1 mês" : `${d} meses`}</option>)}
                    </select>
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-gray-500">Dia vencimento</label>
                    <input type="number" min="1" max="28" value={diaVencimento} onChange={(e) => setDiaVencimento(parseInt(e.target.value))}
                      className="w-full h-10 rounded-xl border border-gray-200 bg-gray-50 px-3 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-orange-200 focus:border-orange-400" />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-gray-500">Data de início</label>
                  <input type="date" value={dataInicio} onChange={(e) => setDataInicio(e.target.value)}
                    className="w-full h-10 rounded-xl border border-gray-200 bg-gray-50 px-3 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-orange-200 focus:border-orange-400" />
                </div>

                {/* Preview */}
                {valorMensal && duracaoMeses && (
                  <div className="rounded-xl bg-orange-50 border border-orange-100 p-3 space-y-1">
                    <p className="text-xs font-bold text-orange-700">Resumo do contrato</p>
                    <div className="flex justify-between text-xs text-orange-600">
                      <span>{duracaoMeses} parcelas de {formatarMoeda(parseFloat(valorMensal) || 0)}</span>
                      <span className="font-bold">Total: {formatarMoeda((parseFloat(valorMensal) || 0) * duracaoMeses)}</span>
                    </div>
                    <p className="text-[10px] text-orange-500">Vence todo dia {diaVencimento} de cada mês</p>
                  </div>
                )}

                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-gray-500">Observações</label>
                  <textarea value={observacoes} onChange={(e) => setObservacoes(e.target.value)} rows={2} placeholder="Detalhes do contrato..."
                    className="w-full rounded-xl border border-gray-200 bg-gray-50 px-3 py-2.5 text-sm text-gray-900 resize-none focus:outline-none focus:ring-2 focus:ring-orange-200 focus:border-orange-400" />
                </div>

                <div className="flex gap-2 pt-1">
                  <button onClick={() => { setModalNovo(false); resetForm() }} className="flex-1 h-11 rounded-xl border border-gray-200 text-sm font-semibold text-gray-600 hover:bg-gray-50 bg-white">Cancelar</button>
                  <button onClick={criarContrato} disabled={loading || !titulo.trim() || !valorMensal}
                    className="flex-1 h-11 rounded-xl text-white text-sm font-bold disabled:opacity-40 flex items-center justify-center gap-2"
                    style={{ backgroundColor: "#F26E1D" }}>
                    {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
                    {loading ? "Criando..." : `Criar ${duracaoMeses} parcelas`}
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  )
}
