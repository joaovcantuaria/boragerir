"use client"

import { useRouter } from "next/navigation"
import {
  TrendingUp, ShoppingCart, Calendar, Wallet, Users, CheckSquare,
  Package, FileText, BarChart3, Settings, HeadphonesIcon, ClipboardList,
  UserCheck, ShoppingBag, ArrowRight, AlertTriangle,
} from "lucide-react"
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
} from "recharts"
import { format } from "date-fns"
import { ptBR } from "date-fns/locale"
import { formatarMoeda } from "@/lib/utils"
import { cn } from "@/lib/utils"

// ── Tipos ──
export type WidgetType =
  | "kpis"
  | "modulos"
  | "tarefas"
  | "grafico_semana"
  | "agenda_hoje"
  | "alertas_estoque"

export interface WidgetConfig {
  id: string
  type: WidgetType
  title: string
}

export const WIDGET_CATALOG: { type: WidgetType; label: string; desc: string; icon: typeof TrendingUp; defaultW: number; defaultH: number }[] = [
  { type: "kpis", label: "KPIs do dia", desc: "Vendas, ticket médio, agendamentos e caixa", icon: TrendingUp, defaultW: 12, defaultH: 2 },
  { type: "modulos", label: "Módulos", desc: "Atalhos rápidos para todos os módulos", icon: Package, defaultW: 7, defaultH: 4 },
  { type: "tarefas", label: "Tarefas pendentes", desc: "Lista de tarefas com status", icon: CheckSquare, defaultW: 5, defaultH: 4 },
  { type: "grafico_semana", label: "Faturamento 7 dias", desc: "Gráfico de barras da semana", icon: BarChart3, defaultW: 6, defaultH: 4 },
  { type: "agenda_hoje", label: "Agenda de hoje", desc: "Agendamentos do dia", icon: Calendar, defaultW: 6, defaultH: 4 },
  { type: "alertas_estoque", label: "Alertas de estoque", desc: "Produtos com estoque baixo", icon: AlertTriangle, defaultW: 6, defaultH: 3 },
]

// ── Módulos do launcher ──
const modulos = [
  { path: "/caixa", icon: Wallet, label: "Caixa", color: "#10b981" },
  { path: "/venda", icon: ShoppingCart, label: "Nova Venda", color: "#F26E1D" },
  { path: "/agendamentos", icon: Calendar, label: "Agendamentos", color: "#6366f1" },
  { path: "/clientes", icon: Users, label: "Clientes", color: "#3b82f6" },
  { path: "/produtos-servicos", icon: ShoppingBag, label: "Produtos/Serviços", color: "#f59e0b" },
  { path: "/orcamentos", icon: FileText, label: "Orçamentos", color: "#8b5cf6" },
  { path: "/contratos", icon: ClipboardList, label: "Contratos", color: "#0ea5e9" },
  { path: "/tarefas", icon: CheckSquare, label: "Tarefas", color: "#ec4899" },
  { path: "/funcionarios", icon: UserCheck, label: "Colaboradores", color: "#14b8a6" },
  { path: "/financeiro", icon: BarChart3, label: "Financeiro", color: "#84cc16" },
  { path: "/configuracoes", icon: Settings, label: "Configurações", color: "#6b7280" },
  { path: "/suporte", icon: HeadphonesIcon, label: "Suporte", color: "#a855f7" },
]

// ── Props compartilhadas ──
interface WidgetProps {
  data: {
    totalVendas: number
    qtdAtend: number
    ticketM: number
    caixaAberto: boolean
    agendamentosHoje: { id: string; data_hora: string; status: string; clientes?: { nome_completo: string } | null; nome_cliente_avulso?: string | null; produtos_servicos?: { nome: string } | null }[]
    alertasEstoque: { id: string; nome: string; estoque_atual: number | null; estoque_minimo: number | null }[]
    dadosSemana: { dia: string; total: number }[]
    tarefasPendentes: { id: string; titulo: string; prioridade: string; prazo: string | null }[]
    valoresVisiveis: boolean
  }
  editMode?: boolean
}

// ════════════════════════════════════════════════════════════
// WIDGETS
// ════════════════════════════════════════════════════════════

export function WidgetKPIs({ data }: WidgetProps) {
  const router = useRouter()
  const { totalVendas, qtdAtend, ticketM, caixaAberto, agendamentosHoje, valoresVisiveis } = data
  const ocultarValor = (v: string) => valoresVisiveis ? v : "•••••"

  const kpis = [
    { label: "Vendas hoje", value: ocultarValor(formatarMoeda(totalVendas)), icon: TrendingUp, color: "#10b981", bg: "#10b98115", sub: valoresVisiveis ? `${qtdAtend} atendimento${qtdAtend !== 1 ? "s" : ""}` : "" },
    { label: "Ticket médio", value: ocultarValor(formatarMoeda(ticketM)), icon: ShoppingCart, color: "#6366f1", bg: "#6366f115", sub: valoresVisiveis ? "do dia" : "" },
    { label: "Agendamentos", value: valoresVisiveis ? agendamentosHoje.length.toString() : "•••", icon: Calendar, color: "#F26E1D", bg: "#F26E1D15", sub: valoresVisiveis ? "hoje" : "" },
    { label: "Caixa", value: caixaAberto ? "Aberto" : "Fechado", icon: Wallet, color: caixaAberto ? "#10b981" : "#6b7280", bg: caixaAberto ? "#10b98115" : "#6b728015", sub: caixaAberto ? "Em operação" : "", onClick: () => router.push("/caixa") },
  ]

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 h-full">
      {kpis.map((kpi) => {
        const Icon = kpi.icon
        return (
          <div key={kpi.label} onClick={kpi.onClick} className={cn("kpi-card", kpi.onClick && "cursor-pointer")}>
            <div className="flex items-center justify-between mb-2">
              <span className="kpi-label">{kpi.label}</span>
              <div className="w-7 h-7 rounded-md flex items-center justify-center" style={{ background: kpi.bg }}>
                <Icon className="w-3.5 h-3.5" style={{ color: kpi.color }} />
              </div>
            </div>
            <div className="kpi-value" style={{ color: kpi.color }}>{kpi.value}</div>
            <div className="kpi-sub">{kpi.sub}</div>
          </div>
        )
      })}
    </div>
  )
}

export function WidgetModulos({ editMode }: WidgetProps & { editMode?: boolean }) {
  const router = useRouter()
  return (
    <div className="h-full flex flex-col">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-semibold">Módulos</h3>
        <span className="text-[10px] text-muted-foreground">Clique ou use atalho de teclado</span>
      </div>
      <div className="grid grid-cols-3 sm:grid-cols-4 lg:grid-cols-6 gap-2 flex-1">
        {modulos.map((m) => {
          const Icon = m.icon
          return (
            <button key={m.path} onClick={() => !editMode && router.push(m.path)}
              className="launcher-btn" style={{ background: m.color + "12" }}>
              <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ background: m.color + "20" }}>
                <Icon className="w-4.5 h-4.5" style={{ color: m.color }} />
              </div>
              <span className="text-[10px] font-semibold text-center leading-tight">{m.label}</span>
            </button>
          )
        })}
      </div>
    </div>
  )
}

export function WidgetTarefas({ data, editMode }: WidgetProps) {
  const router = useRouter()
  const { tarefasPendentes } = data
  const prioCor: Record<string, string> = { urgente: "bg-red-500", alta: "bg-orange-400", media: "bg-blue-400", baixa: "bg-gray-300" }

  return (
    <div className="h-full flex flex-col">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-semibold flex items-center gap-2">
          <CheckSquare className="w-4 h-4 text-primary" /> Tarefas
          {tarefasPendentes.length > 0 && <span className="text-xs text-primary font-bold">{tarefasPendentes.length}</span>}
        </h3>
        <button onClick={() => !editMode && router.push("/tarefas")} className="text-xs text-primary font-semibold hover:underline">Ver todas →</button>
      </div>
      <div className="flex-1 overflow-y-auto space-y-1.5">
        {tarefasPendentes.length > 0 ? tarefasPendentes.slice(0, 8).map((t) => (
          <div key={t.id} className="flex items-center gap-2.5 p-2 rounded-lg hover:bg-muted/50 transition-colors">
            <div className={cn("w-2 h-2 rounded-full shrink-0", prioCor[t.prioridade] || "bg-gray-300")} />
            <span className="text-xs font-medium truncate flex-1">{t.titulo}</span>
            {t.prazo && (
              <span className={cn("text-[10px] shrink-0", new Date(t.prazo) < new Date() ? "text-red-500 font-bold" : "text-muted-foreground")}>
                {format(new Date(t.prazo), "dd/MM")}
              </span>
            )}
          </div>
        )) : (
          <div className="flex items-center justify-center h-full text-muted-foreground text-xs">
            Nenhuma tarefa pendente 🎉
          </div>
        )}
      </div>
    </div>
  )
}

export function WidgetGraficoSemana({ data }: WidgetProps) {
  const router = useRouter()
  const { dadosSemana, valoresVisiveis } = data

  return (
    <div className="h-full flex flex-col">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-semibold">Faturamento — 7 dias</h3>
        <button onClick={() => router.push("/financeiro")} className="text-xs text-primary font-semibold hover:underline">Detalhes →</button>
      </div>
      <div className="flex-1 min-h-0">
        {valoresVisiveis ? (
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={dadosSemana}>
              <XAxis dataKey="dia" tick={{ fontSize: 10 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 10 }} axisLine={false} tickLine={false} tickFormatter={(v) => `R$${v}`} />
              <Tooltip formatter={(v: number) => formatarMoeda(v)} />
              <Bar dataKey="total" fill="#F26E1D" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        ) : (
          <div className="flex items-center justify-center h-full text-muted-foreground text-sm">Valores ocultos</div>
        )}
      </div>
    </div>
  )
}

export function WidgetAgendaHoje({ data, editMode }: WidgetProps) {
  const router = useRouter()
  const { agendamentosHoje } = data

  return (
    <div className="h-full flex flex-col">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-semibold flex items-center gap-2">
          <Calendar className="w-4 h-4 text-muted-foreground" /> Agenda de hoje
        </h3>
        <button onClick={() => !editMode && router.push("/agendamentos")} className="text-xs text-primary font-semibold hover:underline">Ver →</button>
      </div>
      <div className="flex-1 overflow-y-auto space-y-1.5">
        {agendamentosHoje.length > 0 ? agendamentosHoje.slice(0, 6).map((ag) => (
          <div key={ag.id} className="flex items-center gap-2.5 p-2 rounded-lg hover:bg-muted/50 transition-colors">
            <span className="text-[10px] font-mono text-muted-foreground shrink-0 w-10">
              {format(new Date(ag.data_hora), "HH:mm")}
            </span>
            <span className="text-xs font-medium truncate flex-1">
              {ag.clientes?.nome_completo || ag.nome_cliente_avulso || "Cliente"}
            </span>
            <span className="text-[10px] text-muted-foreground truncate max-w-[80px]">
              {ag.produtos_servicos?.nome}
            </span>
          </div>
        )) : (
          <div className="flex flex-col items-center justify-center h-full text-muted-foreground">
            <Calendar className="w-8 h-8 opacity-30 mb-2" />
            <span className="text-xs">Nenhum agendamento hoje</span>
          </div>
        )}
      </div>
    </div>
  )
}

export function WidgetAlertasEstoque({ data, editMode }: WidgetProps) {
  const router = useRouter()
  const { alertasEstoque } = data

  return (
    <div className="h-full flex flex-col">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-semibold flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 text-amber-500" /> Estoque baixo
          {alertasEstoque.length > 0 && <span className="text-xs bg-amber-100 text-amber-700 px-1.5 py-0.5 rounded-full font-bold">{alertasEstoque.length}</span>}
        </h3>
        <button onClick={() => !editMode && router.push("/produtos-servicos")} className="text-xs text-primary font-semibold hover:underline">Ver →</button>
      </div>
      <div className="flex-1 overflow-y-auto space-y-1.5">
        {alertasEstoque.length > 0 ? alertasEstoque.slice(0, 6).map((p) => (
          <div key={p.id} className="flex items-center justify-between p-2 rounded-lg hover:bg-muted/50 transition-colors">
            <span className="text-xs font-medium truncate">{p.nome}</span>
            <span className="text-xs text-red-500 font-bold shrink-0">{p.estoque_atual ?? 0} un</span>
          </div>
        )) : (
          <div className="flex items-center justify-center h-full text-muted-foreground text-xs">
            Estoque OK 👍
          </div>
        )}
      </div>
    </div>
  )
}

// ── Renderizador de widget ──
export function RenderWidget({ type, data, editMode }: { type: WidgetType; data: WidgetProps["data"]; editMode?: boolean }) {
  const props = { data, editMode }
  switch (type) {
    case "kpis": return <WidgetKPIs {...props} />
    case "modulos": return <WidgetModulos {...props} />
    case "tarefas": return <WidgetTarefas {...props} />
    case "grafico_semana": return <WidgetGraficoSemana {...props} />
    case "agenda_hoje": return <WidgetAgendaHoje {...props} />
    case "alertas_estoque": return <WidgetAlertasEstoque {...props} />
    default: return <div className="text-xs text-muted-foreground">Widget desconhecido</div>
  }
}
