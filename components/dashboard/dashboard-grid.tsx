"use client"

import { useState, useEffect, useCallback } from "react"
import { Responsive, WidthProvider, Layout } from "react-grid-layout"
import "react-grid-layout/css/styles.css"
import "react-resizable/css/styles.css"
import { Edit2, Plus, X, Check, RotateCcw, Eye, EyeOff, Lock, Unlock } from "lucide-react"
import { toast } from "sonner"
import { format, subDays } from "date-fns"
import { ptBR } from "date-fns/locale"
import { motion, AnimatePresence } from "framer-motion"
import { cn } from "@/lib/utils"
import { formatarMoeda } from "@/lib/utils"
import { createClient } from "@/lib/supabase/client"
import { RenderWidget, WIDGET_CATALOG, type WidgetType } from "./widgets"
import type { Empresa } from "@/types"
import { PinProtected } from "@/components/ui/pin-protected"
import { PinModal } from "@/components/ui/pin-modal"

const ResponsiveGridLayout = WidthProvider(Responsive)

// Layout padrão (quando não tem nada salvo)
const DEFAULT_LAYOUT: Layout[] = [
  { i: "kpis", x: 0, y: 0, w: 12, h: 2, minW: 6, minH: 2 },
  { i: "modulos", x: 0, y: 2, w: 7, h: 4, minW: 4, minH: 3 },
  { i: "tarefas", x: 7, y: 2, w: 5, h: 4, minW: 3, minH: 3 },
  { i: "grafico_semana", x: 0, y: 6, w: 6, h: 4, minW: 4, minH: 3 },
  { i: "agenda_hoje", x: 6, y: 6, w: 6, h: 4, minW: 4, minH: 3 },
]

const DEFAULT_WIDGETS: WidgetType[] = ["kpis", "modulos", "tarefas", "grafico_semana", "agenda_hoje"]

interface Props {
  empresa: Empresa
  totalVendasHoje: number
  qtdAtendimentos: number
  ticketMedio: number
  caixaAberto: { id: string; valor_abertura: number } | null
  agendamentosHoje: {
    id: string; data_hora: string; status: string
    clientes?: { nome_completo: string } | null
    nome_cliente_avulso?: string | null
    produtos_servicos?: { nome: string } | null
    funcionarios?: { nome: string } | null
  }[]
  alertasEstoque: { id: string; nome: string; estoque_atual: number | null; estoque_minimo: number | null }[]
  vendasSemana: { total: number; created_at: string }[]
  tarefasPendentes: {
    id: string; titulo: string; status: string; prioridade: string
    prazo: string | null; bloco_id: string | null
  }[]
  pinGerente?: string | null
  restricoesAcesso?: { areas_protegidas?: string[]; limite_desconto_sem_pin?: number } | null
}

export function DashboardGrid({
  empresa, totalVendasHoje, qtdAtendimentos, ticketMedio,
  caixaAberto, agendamentosHoje, alertasEstoque, vendasSemana,
  tarefasPendentes, pinGerente, restricoesAcesso,
}: Props) {
  const [layouts, setLayouts] = useState<{ lg: Layout[] }>({ lg: DEFAULT_LAYOUT })
  const [widgets, setWidgets] = useState<WidgetType[]>(DEFAULT_WIDGETS)
  const [editMode, setEditMode] = useState(false)
  const [modalAdd, setModalAdd] = useState(false)
  const [valoresVisiveis, setValoresVisiveis] = useState(true)
  const [loaded, setLoaded] = useState(false)
  const supabase = createClient()

  // PIN
  const [pinModalOpen, setPinModalOpen] = useState(false)
  const [pinAcaoPendente, setPinAcaoPendente] = useState<(() => void) | null>(null)
  const areasProtegidas = restricoesAcesso?.areas_protegidas || []
  const pinConf = !!pinGerente

  // Realtime KPIs
  const [totalVendas, setTotalVendas] = useState(totalVendasHoje)
  const [qtdAtend, setQtdAtend] = useState(qtdAtendimentos)
  const [ticketM, setTicketM] = useState(ticketMedio)
  const [pulsing, setPulsing] = useState(false)

  const pulsar = useCallback(() => {
    setPulsing(true); setTimeout(() => setPulsing(false), 800)
  }, [])

  // Realtime
  useEffect(() => {
    const hoje = new Date()
    const inicioDia = new Date(hoje.getFullYear(), hoje.getMonth(), hoje.getDate()).toISOString()
    const canal = supabase
      .channel("dashboard-grid-realtime")
      .on("postgres_changes", { event: "*", schema: "public", table: "vendas", filter: `empresa_id=eq.${empresa.id}` }, async () => {
        const { data } = await supabase.from("vendas").select("total").eq("empresa_id", empresa.id).eq("status", "concluida").gte("created_at", inicioDia)
        if (data) {
          const total = data.reduce((s, v) => s + v.total, 0)
          setTotalVendas(total); setQtdAtend(data.length); setTicketM(data.length > 0 ? total / data.length : 0); pulsar()
        }
      }).subscribe()
    return () => { supabase.removeChannel(canal) }
  }, [empresa.id, pulsar, supabase])

  // Carregar layout salvo
  useEffect(() => {
    fetch(`/api/dashboard/layout?empresa_id=${empresa.id}`)
      .then((r) => r.json())
      .then((d) => {
        if (d.layout && d.layout.layouts && d.layout.widgets) {
          setLayouts(d.layout.layouts)
          setWidgets(d.layout.widgets)
        }
        setLoaded(true)
      })
      .catch(() => setLoaded(true))
  }, [empresa.id])

  // Gráfico 7 dias
  const dadosSemana = Array.from({ length: 7 }, (_, i) => {
    const dia = subDays(new Date(), 6 - i)
    const diaStr = format(dia, "yyyy-MM-dd")
    const total = vendasSemana.filter((v) => v.created_at.startsWith(diaStr)).reduce((s, v) => s + v.total, 0)
    return { dia: format(dia, "EEE", { locale: ptBR }), total }
  })

  // Data compartilhada para widgets
  const widgetData = {
    totalVendas, qtdAtend, ticketM,
    caixaAberto: !!caixaAberto,
    agendamentosHoje, alertasEstoque, dadosSemana,
    tarefasPendentes: tarefasPendentes.filter((t) => t.status !== "concluido"),
    valoresVisiveis,
  }

  // Salvar layout
  async function salvarLayout(newLayouts?: { lg: Layout[] }) {
    const layoutToSave = newLayouts || layouts
    await fetch("/api/dashboard/layout", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ empresa_id: empresa.id, layout: { layouts: layoutToSave, widgets } }),
    })
  }

  function handleLayoutChange(layout: Layout[], allLayouts: Record<string, Layout[]>) {
    const newLayouts = { lg: allLayouts.lg || layout }
    setLayouts(newLayouts)
    if (!editMode) return
    // Auto-save no edit mode
    salvarLayout(newLayouts)
  }

  function adicionarWidget(type: WidgetType) {
    if (widgets.includes(type)) { toast.error("Widget já adicionado"); return }
    const catalog = WIDGET_CATALOG.find((w) => w.type === type)!
    const maxY = layouts.lg.reduce((max, l) => Math.max(max, l.y + l.h), 0)
    const newLayout: Layout = { i: type, x: 0, y: maxY, w: catalog.defaultW, h: catalog.defaultH, minW: 3, minH: 2 }
    setLayouts((prev) => ({ lg: [...prev.lg, newLayout] }))
    setWidgets((prev) => [...prev, type])
    setModalAdd(false)
    toast.success(`"${catalog.label}" adicionado!`)
  }

  function removerWidget(type: WidgetType) {
    setWidgets((prev) => prev.filter((w) => w !== type))
    setLayouts((prev) => ({ lg: prev.lg.filter((l) => l.i !== type) }))
    toast.success("Widget removido")
  }

  function resetarLayout() {
    setLayouts({ lg: DEFAULT_LAYOUT })
    setWidgets(DEFAULT_WIDGETS)
    salvarLayout({ lg: DEFAULT_LAYOUT })
    toast.success("Layout resetado para o padrão")
  }

  async function finalizarEdicao() {
    setEditMode(false)
    await salvarLayout()
    toast.success("Layout salvo!")
  }

  if (!loaded) return <div className="flex items-center justify-center py-20 text-muted-foreground text-sm">Carregando...</div>

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-lg font-semibold text-foreground">
            Olá, {empresa.nome.split(" ")[0]} 👋
          </h1>
          <p className="text-xs text-muted-foreground mt-0.5">
            {format(new Date(), "EEEE, d 'de' MMMM 'de' yyyy", { locale: ptBR })}
          </p>
        </div>
        <div className="flex items-center gap-1.5">
          <button onClick={() => setValoresVisiveis(!valoresVisiveis)}
            className="w-8 h-8 flex items-center justify-center rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
            title={valoresVisiveis ? "Ocultar valores" : "Mostrar valores"}>
            {valoresVisiveis ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
          </button>
          {editMode ? (
            <>
              <button onClick={() => setModalAdd(true)}
                className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-semibold bg-primary text-white hover:opacity-90 transition-opacity">
                <Plus className="w-3 h-3" />Widget
              </button>
              <button onClick={resetarLayout}
                className="w-8 h-8 flex items-center justify-center rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-colors" title="Resetar layout">
                <RotateCcw className="w-4 h-4" />
              </button>
              <button onClick={finalizarEdicao}
                className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-semibold bg-emerald-500 text-white hover:opacity-90 transition-opacity">
                <Check className="w-3 h-3" />Salvar
              </button>
            </>
          ) : (
            <button onClick={() => setEditMode(true)}
              className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-semibold text-muted-foreground hover:text-foreground hover:bg-muted border border-border transition-colors">
              <Edit2 className="w-3 h-3" />Personalizar
            </button>
          )}
        </div>
      </div>

      {/* Grid */}
      <div className={cn("transition-all", editMode && "ring-2 ring-primary/20 ring-offset-4 rounded-xl p-1")}>
        {editMode && (
          <div className="mb-3 px-2 py-1.5 rounded-lg bg-primary/5 border border-primary/20 text-xs text-primary font-medium flex items-center gap-2">
            <Unlock className="w-3.5 h-3.5" />
            Modo edição ativo — arraste e redimensione os widgets. Clique no X para remover.
          </div>
        )}
        <ResponsiveGridLayout
          className="layout"
          layouts={layouts}
          breakpoints={{ lg: 1200, md: 768, sm: 480 }}
          cols={{ lg: 12, md: 8, sm: 4 }}
          rowHeight={60}
          isDraggable={editMode}
          isResizable={editMode}
          onLayoutChange={handleLayoutChange}
          draggableHandle=".widget-drag-handle"
          containerPadding={[0, 0]}
          margin={[12, 12]}
        >
          {widgets.map((type) => (
            <div key={type} className="relative">
              <div className={cn(
                "h-full rounded-xl border bg-card p-4 shadow-card overflow-hidden",
                editMode && "ring-1 ring-border cursor-move widget-drag-handle hover:ring-primary/40 transition-all"
              )}>
                <RenderWidget type={type} data={widgetData} editMode={editMode} />
              </div>
              {editMode && (
                <button onClick={() => removerWidget(type)}
                  className="absolute -top-2 -right-2 w-5 h-5 rounded-full bg-red-500 text-white flex items-center justify-center shadow-md hover:scale-110 transition-transform z-10">
                  <X className="w-3 h-3" />
                </button>
              )}
            </div>
          ))}
        </ResponsiveGridLayout>
      </div>

      {/* Modal adicionar widget */}
      <AnimatePresence>
        {modalAdd && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4"
            onClick={() => setModalAdd(false)}>
            <motion.div initial={{ scale: 0.95 }} animate={{ scale: 1 }} exit={{ scale: 0.95 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-white dark:bg-[#1c1c1e] border border-border rounded-2xl w-full max-w-md p-5 shadow-2xl space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="font-bold text-sm">Adicionar widget</h3>
                <button onClick={() => setModalAdd(false)} className="p-1 rounded-lg hover:bg-muted text-muted-foreground"><X className="w-4 h-4" /></button>
              </div>
              <div className="space-y-2">
                {WIDGET_CATALOG.map((w) => {
                  const Icon = w.icon
                  const jaAdicionado = widgets.includes(w.type)
                  return (
                    <button key={w.type} onClick={() => !jaAdicionado && adicionarWidget(w.type)} disabled={jaAdicionado}
                      className={cn(
                        "w-full flex items-center gap-3 p-3 rounded-xl border transition-all text-left",
                        jaAdicionado ? "opacity-40 cursor-not-allowed border-border" : "border-border hover:border-primary/40 hover:bg-primary/5"
                      )}>
                      <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                        <Icon className="w-4 h-4 text-primary" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold">{w.label}</p>
                        <p className="text-xs text-muted-foreground">{w.desc}</p>
                      </div>
                      {jaAdicionado && <span className="text-[10px] text-muted-foreground shrink-0">Já adicionado</span>}
                    </button>
                  )
                })}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <PinModal aberto={pinModalOpen} onClose={() => { setPinModalOpen(false); setPinAcaoPendente(null) }} onSuccess={() => { setPinModalOpen(false); if (pinAcaoPendente) { pinAcaoPendente(); setPinAcaoPendente(null) } }} empresaId={empresa.id} titulo="Ação Restrita" descricao="Digite o PIN de gerente para executar esta ação" />
    </div>
  )
}
