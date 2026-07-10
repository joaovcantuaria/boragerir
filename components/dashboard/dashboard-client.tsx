"use client"

import { useState, useEffect, useCallback } from "react"
import { useRouter } from "next/navigation"
import { useTheme } from "next-themes"
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
} from "recharts"
import {
  Wallet, TrendingUp, Users, ShoppingCart, Calendar, CheckSquare,
  Package, AlertTriangle, ArrowRight, Clock, RefreshCw, Moon, Sun,
  ShoppingBag, FileText, BarChart3, Settings, CreditCard,
  HeadphonesIcon, ClipboardList, UserCheck, ArrowDownUp,
} from "lucide-react"
import { motion, AnimatePresence } from "framer-motion"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent } from "@/components/ui/card"
import { formatarMoeda, coresStatus, labelsStatus } from "@/lib/utils"
import { createClient } from "@/lib/supabase/client"
import type { Empresa } from "@/types"
import { format, subDays } from "date-fns"
import { ptBR } from "date-fns/locale"
import { PinProtected } from "@/components/ui/pin-protected"
import { PinModal } from "@/components/ui/pin-modal"

// ── Módulos do launcher ──────────────────────────────────────
const modulos = [
  { path: "/caixa",             icon: Wallet,       label: "Caixa",             color: "#10b981", shortcut: "C" },
  { path: "/venda",             icon: ShoppingCart, label: "Nova Venda",        color: "#F26E1D", shortcut: "N" },
  { path: "/agendamentos",      icon: Calendar,     label: "Agendamentos",      color: "#6366f1", shortcut: "A" },
  { path: "/clientes",          icon: Users,        label: "Clientes",          color: "#3b82f6", shortcut: "L" },
  { path: "/produtos-servicos", icon: ShoppingBag,  label: "Produtos/Serviços", color: "#f59e0b", shortcut: "P" },
  { path: "/orcamentos",        icon: FileText,     label: "Orçamentos",        color: "#8b5cf6" },
  { path: "/contratos",         icon: ClipboardList,label: "Contratos",         color: "#0ea5e9" },
  { path: "/tarefas",           icon: CheckSquare,  label: "Tarefas",           color: "#ec4899" },
  { path: "/funcionarios",      icon: UserCheck,    label: "Colaboradores",     color: "#14b8a6" },
  { path: "/financeiro",        icon: BarChart3,    label: "Financeiro",        color: "#84cc16", shortcut: "F" },
  { path: "/configuracoes",     icon: Settings,     label: "Configurações",     color: "#6b7280" },
  { path: "/suporte",           icon: HeadphonesIcon,label: "Suporte",          color: "#a855f7" },
]

interface DashboardClientProps {
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
  vendasHoje: { total: number; forma_pagamento: string }[]
  tarefasPendentes: {
    id: string; titulo: string; status: string; prioridade: string
    prazo: string | null; bloco_id: string | null
  }[]
  pinGerente?: string | null
  restricoesAcesso?: { areas_protegidas?: string[]; limite_desconto_sem_pin?: number } | null
}

export function DashboardClient({
  empresa,
  totalVendasHoje: initialVendas,
  qtdAtendimentos: initialQtd,
  ticketMedio: initialTicket,
  caixaAberto,
  agendamentosHoje,
  alertasEstoque,
  vendasSemana,
  vendasHoje,
  tarefasPendentes,
  pinGerente,
  restricoesAcesso,
}: DashboardClientProps) {
  const router = useRouter()
  const { theme, setTheme } = useTheme()
  const [mounted, setMounted] = useState(false)
  useEffect(() => setMounted(true), [])

  // ── PIN Protection ──
  const [pinModalOpen, setPinModalOpen] = useState(false)
  const [pinAcaoPendente, setPinAcaoPendente] = useState<(() => void) | null>(null)
  const areasProtegidas = restricoesAcesso?.areas_protegidas || []
  const pinConf = !!pinGerente

  function executarComPin(restricaoId: string, acao: () => void) {
    if (pinConf && areasProtegidas.includes(restricaoId)) {
      const chave = `pin_acao_${empresa.id}_${restricaoId}`
      if (sessionStorage.getItem(chave) === "true") { acao(); return }
      setPinAcaoPendente(() => () => { sessionStorage.setItem(chave, "true"); acao() })
      setPinModalOpen(true)
    } else { acao() }
  }

  // Realtime — atualiza KPIs sem reload
  const [totalVendas, setTotalVendas] = useState(initialVendas)
  const [qtdAtend,    setQtdAtend]    = useState(initialQtd)
  const [ticketM,     setTicketM]     = useState(initialTicket)
  const [pulsing,     setPulsing]     = useState(false)
  const [lastUpdate,  setLastUpdate]  = useState<Date | null>(null)

  const pulsar = useCallback(() => {
    setPulsing(true)
    setLastUpdate(new Date())
    setTimeout(() => setPulsing(false), 800)
  }, [])

  useEffect(() => {
    const supabase = createClient()
    const hoje = new Date()
    const inicioDia = new Date(hoje.getFullYear(), hoje.getMonth(), hoje.getDate()).toISOString()

    const canal = supabase
      .channel("dashboard-realtime")
      .on("postgres_changes", {
        event: "*",
        schema: "public",
        table: "vendas",
        filter: `empresa_id=eq.${empresa.id}`,
      }, async () => {
        // Rebuscar totais do dia
        const { data } = await supabase
          .from("vendas")
          .select("total")
          .eq("empresa_id", empresa.id)
          .eq("status", "concluida")
          .gte("created_at", inicioDia)

        if (data) {
          const total = data.reduce((s, v) => s + v.total, 0)
          setTotalVendas(total)
          setQtdAtend(data.length)
          setTicketM(data.length > 0 ? total / data.length : 0)
          pulsar()
        }
      })
      .subscribe()

    return () => { supabase.removeChannel(canal) }
  }, [empresa.id, pulsar])

  // Gráfico 7 dias
  const dadosSemana = Array.from({ length: 7 }, (_, i) => {
    const dia = subDays(new Date(), 6 - i)
    const diaStr = format(dia, "yyyy-MM-dd")
    const total = vendasSemana
      .filter((v) => v.created_at.startsWith(diaStr))
      .reduce((s, v) => s + v.total, 0)
    return { dia: format(dia, "EEE", { locale: ptBR }), total }
  })

  const kpis = [
    {
      label: "Vendas hoje",
      value: formatarMoeda(totalVendas),
      icon: TrendingUp,
      color: "#10b981",
      bg: "#10b98115",
      trend: qtdAtend > 0 ? `${qtdAtend} atendimento${qtdAtend > 1 ? "s" : ""}` : "Nenhuma venda",
    },
    {
      label: "Ticket médio",
      value: formatarMoeda(ticketM),
      icon: ShoppingCart,
      color: "#6366f1",
      bg: "#6366f115",
      trend: "do dia",
    },
    {
      label: "Agendamentos",
      value: agendamentosHoje.length.toString(),
      icon: Calendar,
      color: "#F26E1D",
      bg: "#F26E1D15",
      trend: "hoje",
    },
    {
      label: "Caixa",
      value: caixaAberto ? "Aberto" : "Fechado",
      icon: Wallet,
      color: caixaAberto ? "#10b981" : "#6b7280",
      bg: caixaAberto ? "#10b98115" : "#6b728015",
      trend: caixaAberto ? "Em operação" : "Clique para abrir",
      onClick: () => router.push("/caixa"),
    },
  ]

  // ── DASHBOARD PLANO GESTÃO — simplificada ──
  if (empresa.plano === "gestao") {
    return (
      <div className="space-y-5">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-lg font-semibold text-foreground">
              Olá, {empresa.nome.split(" ")[0]} 👋
            </h1>
            <p className="text-xs text-muted-foreground mt-0.5">
              {format(new Date(), "EEEE, d 'de' MMMM 'de' yyyy", { locale: ptBR })}
            </p>
          </div>
        </div>

        {/* KPIs Gestão */}
        <PinProtected empresaId={empresa.id} pinConfigurado={pinConf} areasProtegidas={areasProtegidas} restricaoId="dashboard_ver_faturamento" nomeRestricao="Faturamento do Dashboard">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[
            {
              label: "Resumo Geral",
              value: formatarMoeda(totalVendas),
              icon: TrendingUp,
              color: "#10b981",
              bg: "#10b98115",
              trend: "receitas do dia",
              onClick: () => router.push("/financeiro"),
            },
            {
              label: "Entradas e Saídas",
              value: `${qtdAtend} mov.`,
              icon: ArrowDownUp,
              color: "#6366f1",
              bg: "#6366f115",
              trend: "movimentações hoje",
              onClick: () => router.push("/caixa"),
            },
            {
              label: "Caixa",
              value: caixaAberto ? "Aberto" : "Fechado",
              icon: Wallet,
              color: caixaAberto ? "#10b981" : "#6b7280",
              bg: caixaAberto ? "#10b98115" : "#6b728015",
              trend: caixaAberto ? "Em operação" : "Clique para abrir",
              onClick: () => router.push("/caixa"),
            },
            {
              label: "Tarefas",
              value: `${tarefasPendentes?.length ?? 0}`,
              icon: CheckSquare,
              color: "#F26E1D",
              bg: "#F26E1D15",
              trend: "pendentes",
              onClick: () => router.push("/tarefas"),
            },
          ].map((kpi, i) => (
            <Card key={i} className={`cursor-pointer hover:border-primary/40 transition-all ${pulsing ? "ring-1 ring-primary/30" : ""}`}
              onClick={kpi.onClick}>
              <CardContent className="p-4 flex items-center gap-3">
                <div className="p-2.5 rounded-xl" style={{ background: kpi.bg }}>
                  <kpi.icon className="w-5 h-5" style={{ color: kpi.color }} />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">{kpi.label}</p>
                  <p className="text-xl font-bold" style={{ color: kpi.color }}>{kpi.value}</p>
                  <p className="text-[10px] text-muted-foreground">{kpi.trend}</p>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
        </PinProtected>

        {/* Acesso rápido */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          {[
            { label: "Caixa", icon: Wallet, href: "/caixa", color: "#10b981" },
            { label: "Financeiro", icon: BarChart3, href: "/financeiro", color: "#6366f1" },
            { label: "Colaboradores", icon: Users, href: "/funcionarios", color: "#14b8a6" },
            { label: "Tarefas", icon: CheckSquare, href: "/tarefas", color: "#F26E1D" },
          ].map((item) => (
            <Card key={item.href} className="cursor-pointer hover:border-primary/40 transition-all"
              onClick={() => router.push(item.href)}>
              <CardContent className="p-4 flex flex-col items-center gap-2 text-center">
                <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: item.color + "15" }}>
                  <item.icon className="w-5 h-5" style={{ color: item.color }} />
                </div>
                <span className="text-xs font-semibold">{item.label}</span>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Tarefas pendentes */}
        {tarefasPendentes && tarefasPendentes.length > 0 && (
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-semibold flex items-center gap-2">
                  <CheckSquare className="w-4 h-4 text-primary" /> Tarefas
                </h3>
                <button onClick={() => router.push("/tarefas")} className="text-xs text-primary font-semibold hover:underline">
                  Ver todas →
                </button>
              </div>
              <div className="space-y-2">
                {tarefasPendentes.slice(0, 5).map((t: any) => (
                  <div key={t.id} className="flex items-center justify-between p-2 rounded-lg bg-muted/50">
                    <span className="text-xs font-medium truncate">{t.titulo}</span>
                    {t.prazo && (
                      <span className="text-[10px] text-muted-foreground shrink-0">
                        {format(new Date(t.prazo), "dd/MM")}
                      </span>
                    )}
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        <PinModal aberto={pinModalOpen} onClose={() => { setPinModalOpen(false); setPinAcaoPendente(null) }} onSuccess={() => { setPinModalOpen(false); if (pinAcaoPendente) { pinAcaoPendente(); setPinAcaoPendente(null) } }} empresaId={empresa.id} titulo="Ação Restrita" descricao="Digite o PIN de gerente para executar esta ação" />
      </div>
    )
  }

  return (
    <div className="space-y-5">
      {/* Header da página */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-lg font-semibold text-foreground">
            Olá, {empresa.nome.split(" ")[0]} 👋
          </h1>
          <p className="text-xs text-muted-foreground mt-0.5">
            {format(new Date(), "EEEE, d 'de' MMMM 'de' yyyy", { locale: ptBR })}
            {lastUpdate && (
              <span className="ml-2 text-primary">
                · atualizado às {format(lastUpdate, "HH:mm:ss")}
              </span>
            )}
          </p>
        </div>

        <div className="flex items-center gap-1">
          {pulsing && (
            <motion.div
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0 }}
              className="flex items-center gap-1.5 text-xs text-emerald-600 font-medium bg-emerald-50 dark:bg-emerald-900/20 px-2.5 py-1 rounded-full mr-1"
            >
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
              <span className="hidden sm:inline">Atualizado</span>
            </motion.div>
          )}

          {/* Toggle tema — visível em todos os tamanhos */}
          {mounted && (
            <button
              onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
              className="w-8 h-8 flex items-center justify-center rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
              title={theme === "dark" ? "Modo claro" : "Modo escuro"}
            >
              {theme === "dark"
                ? <Sun className="w-4 h-4" />
                : <Moon className="w-4 h-4" />
              }
            </button>
          )}

          {/* Botão atualizar — recarrega dados do servidor */}
          <button
            onClick={() => {
              router.refresh()
            }}
            className="w-8 h-8 flex items-center justify-center rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
            title="Atualizar dados"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Alertas */}
      <AnimatePresence>
        {!caixaAberto && (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            className="flex items-center justify-between px-4 py-2.5 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-700/40 rounded-lg"
          >
            <div className="flex items-center gap-2.5">
              <Wallet className="w-4 h-4 text-amber-500 shrink-0" />
              <div>
                <p className="text-sm font-medium text-amber-800 dark:text-amber-300">Caixa fechado</p>
                <p className="text-xs text-amber-600 dark:text-amber-400">Abra o caixa para registrar vendas</p>
              </div>
            </div>
            <button
              onClick={() => router.push("/caixa")}
              className="text-xs font-semibold text-white bg-amber-500 hover:bg-amber-600 px-3 py-1.5 rounded-md transition-colors shrink-0"
            >
              Abrir caixa
            </button>
          </motion.div>
        )}

        {alertasEstoque.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex items-center justify-between px-4 py-2.5 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-700/40 rounded-lg"
          >
            <div className="flex items-center gap-2.5">
              <AlertTriangle className="w-4 h-4 text-red-500 shrink-0" />
              <div>
                <p className="text-sm font-medium text-red-800 dark:text-red-300">
                  {alertasEstoque.length} item{alertasEstoque.length > 1 ? "ns" : ""} com estoque baixo
                </p>
                <p className="text-xs text-red-600 dark:text-red-400 truncate max-w-xs">
                  {alertasEstoque.map((p) => p.nome).join(", ")}
                </p>
              </div>
            </div>
            <button
              onClick={() => router.push("/produtos-servicos")}
              className="text-xs font-semibold text-red-600 hover:text-red-700 px-2 py-1 rounded-md hover:bg-red-100 dark:hover:bg-red-900/30 transition-colors shrink-0"
            >
              Ver →
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* KPIs */}
      {/* KPIs */}
      <PinProtected empresaId={empresa.id} pinConfigurado={pinConf} areasProtegidas={areasProtegidas} restricaoId="dashboard_ver_faturamento" nomeRestricao="Faturamento do Dashboard">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {kpis.map((kpi, i) => {
          const Icon = kpi.icon
          return (
            <motion.div
              key={kpi.label}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.04, duration: 0.2 }}
              onClick={kpi.onClick}
              className={`kpi-card ${kpi.onClick ? "cursor-pointer" : ""} ${
                pulsing && (kpi.label === "Vendas hoje" || kpi.label === "Ticket médio")
                  ? "ring-2 ring-emerald-400/40"
                  : ""
              }`}
            >
              <div className="flex items-center justify-between mb-2">
                <span className="kpi-label">{kpi.label}</span>
                <div className="w-7 h-7 rounded-md flex items-center justify-center" style={{ background: kpi.bg }}>
                  <Icon className="w-3.5 h-3.5" style={{ color: kpi.color }} />
                </div>
              </div>
              <div className="kpi-value">{kpi.value}</div>
              <div className="kpi-sub">{kpi.trend}</div>
            </motion.div>
          )
        })}
      </div>
      </PinProtected>

      {/* Grid principal */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-5">

        {/* Launcher de módulos */}
        <div className="xl:col-span-2">
          <div className="card-v2">
            <div className="card-v2-header">
              <h3 className="text-sm font-semibold text-foreground">Módulos</h3>
              <span className="text-xs text-muted-foreground hidden sm:inline">Clique ou use atalho de teclado</span>
            </div>
            <div className="card-v2-body">
              {/* Mobile: grid 6 colunas só com ícones — compacto */}
              <div className="grid grid-cols-6 gap-2 sm:hidden">
                {modulos.map((mod, i) => {
                  const Icon = mod.icon
                  return (
                    <motion.button
                      key={mod.path}
                      initial={{ opacity: 0, scale: 0.9 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{ delay: i * 0.03, duration: 0.18 }}
                      onClick={() => router.push(mod.path)}
                      className="flex items-center justify-center rounded-xl active:scale-95 transition-transform"
                      style={{ background: mod.color + "18", padding: "10px", aspectRatio: "1" }}
                      title={mod.label}
                    >
                      <div
                        className="w-8 h-8 rounded-lg flex items-center justify-center shadow-sm"
                        style={{ background: mod.color }}
                      >
                        <Icon className="w-4 h-4 text-white" />
                      </div>
                    </motion.button>
                  )
                })}
              </div>

              {/* Desktop: grid 6 colunas com ícone + nome */}
              <div className="hidden sm:grid grid-cols-6 gap-2">
                {modulos.map((mod, i) => {
                  const Icon = mod.icon
                  return (
                    <motion.button
                      key={mod.path}
                      initial={{ opacity: 0, scale: 0.9 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{ delay: i * 0.03, duration: 0.18 }}
                      onClick={() => router.push(mod.path)}
                      className="launcher-btn relative group"
                      style={{ background: mod.color + "18" }}
                      title={`${mod.label}${mod.shortcut ? ` (${mod.shortcut})` : ""}`}
                    >
                      {mod.shortcut && (
                        <span className="absolute top-1.5 right-1.5 text-[9px] font-bold opacity-0 group-hover:opacity-60 transition-opacity"
                          style={{ color: mod.color }}>
                          {mod.shortcut}
                        </span>
                      )}
                      <div
                        className="w-9 h-9 rounded-lg flex items-center justify-center shadow-sm"
                        style={{ background: mod.color }}
                      >
                        <Icon className="w-4 h-4 text-white" />
                      </div>
                      <span className="text-[11px] font-medium text-foreground text-center leading-tight">
                        {mod.label}
                      </span>
                    </motion.button>
                  )
                })}
              </div>
            </div>
          </div>
        </div>

        {/* Tarefas pendentes */}
        <div className="card-v2 flex flex-col">
          <div className="card-v2-header">
            <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
              <CheckSquare className="w-4 h-4 text-primary" />
              Tarefas
              {tarefasPendentes.length > 0 && (
                <span className="text-[11px] font-semibold text-white bg-primary px-1.5 py-0.5 rounded-full">
                  {tarefasPendentes.length}
                </span>
              )}
            </h3>
            <button
              onClick={() => router.push("/tarefas")}
              className="text-xs text-primary hover:underline flex items-center gap-1"
            >
              Ver todas <ArrowRight className="w-3 h-3" />
            </button>
          </div>
          <div className="card-v2-body flex-1 overflow-y-auto max-h-[300px]">
            {tarefasPendentes.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-8 gap-2 text-muted-foreground">
                <CheckSquare className="w-8 h-8 opacity-30" />
                <p className="text-sm">Nenhuma tarefa pendente</p>
              </div>
            ) : (
              <div className="space-y-1">
                {tarefasPendentes.slice(0, 8).map((t) => {
                  const hoje = new Date()
                  const vencida = t.prazo && new Date(t.prazo) < hoje
                  const hojeM = t.prazo && new Date(t.prazo).toDateString() === hoje.toDateString()
                  const prioColor: Record<string, string> = {
                    baixa: "#9ca3af", media: "#3b82f6", alta: "#f97316", urgente: "#ef4444"
                  }
                  return (
                    <div
                      key={t.id}
                      className="hover-row flex items-center gap-2.5 py-1.5 px-2 rounded-md hover:bg-muted transition-colors group cursor-default"
                    >
                      <div
                        className="w-2 h-2 rounded-full shrink-0"
                        style={{ background: prioColor[t.prioridade] ?? "#9ca3af" }}
                      />
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-medium truncate text-foreground">{t.titulo}</p>
                      </div>
                      {t.status === "iniciado" && (
                        <span className="text-[10px] font-semibold text-blue-500 shrink-0">▶</span>
                      )}
                      {t.prazo && (
                        <span className={`text-[10px] font-medium shrink-0 ${
                          vencida ? "text-red-500" : hojeM ? "text-orange-500" : "text-muted-foreground"
                        }`}>
                          {vencida ? "Vencida" : hojeM ? "Hoje" : format(new Date(t.prazo.includes("T") ? t.prazo : t.prazo + "T12:00"), "dd/MM")}
                        </span>
                      )}
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Segunda linha: gráfico + agendamentos */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-5">

        {/* Gráfico 7 dias */}
        <PinProtected empresaId={empresa.id} pinConfigurado={pinConf} areasProtegidas={areasProtegidas} restricaoId="dashboard_ver_grafico" nomeRestricao="Gráfico de Faturamento">
        <div className="lg:col-span-3 card-v2">
          <div className="card-v2-header">
            <h3 className="text-sm font-semibold text-foreground">Faturamento — 7 dias</h3>
            <button
              onClick={() => router.push("/financeiro")}
              className="text-xs text-primary hover:underline flex items-center gap-1"
            >
              Detalhes <ArrowRight className="w-3 h-3" />
            </button>
          </div>
          <div className="card-v2-body">
            <ResponsiveContainer width="100%" height={160}>
              <BarChart data={dadosSemana} barSize={28}>
                <XAxis
                  dataKey="dia"
                  tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }}
                  axisLine={false}
                  tickLine={false}
                />
                <YAxis
                  tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }}
                  tickFormatter={(v) => v > 0 ? `R$${v}` : ""}
                  axisLine={false}
                  tickLine={false}
                  width={48}
                />
                <Tooltip
                  formatter={(v: number) => [formatarMoeda(v), "Faturamento"]}
                  contentStyle={{
                    background: "hsl(var(--card))",
                    border: "1px solid hsl(var(--border))",
                    borderRadius: "6px",
                    fontSize: "12px",
                    boxShadow: "0 4px 12px rgba(0,0,0,0.1)",
                  }}
                  cursor={{ fill: "hsl(var(--muted))" }}
                />
                <Bar dataKey="total" fill="#F26E1D" radius={[3, 3, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
        </PinProtected>

        {/* Agendamentos do dia */}
        <div className="lg:col-span-2 card-v2 flex flex-col">
          <div className="card-v2-header">
            <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
              <Calendar className="w-4 h-4 text-primary" />
              Agenda de hoje
            </h3>
            <button
              onClick={() => router.push("/agendamentos")}
              className="text-xs text-primary hover:underline flex items-center gap-1"
            >
              Ver <ArrowRight className="w-3 h-3" />
            </button>
          </div>
          <div className="flex-1 overflow-y-auto max-h-[200px]">
            {agendamentosHoje.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-8 gap-2 text-muted-foreground">
                <Calendar className="w-8 h-8 opacity-30" />
                <p className="text-xs">Nenhum agendamento hoje</p>
              </div>
            ) : (
              <div>
                {agendamentosHoje.map((ag, i) => (
                  <div
                    key={ag.id}
                    className={`hover-row flex items-center gap-2.5 px-4 py-2 hover:bg-muted transition-colors group ${
                      i < agendamentosHoje.length - 1 ? "border-b border-border" : ""
                    }`}
                  >
                    <div className="w-10 text-center shrink-0">
                      <span className="text-[11px] font-bold text-primary">
                        {format(new Date(ag.data_hora), "HH:mm")}
                      </span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-medium truncate text-foreground">
                        {ag.clientes?.nome_completo ?? ag.nome_cliente_avulso ?? "Avulso"}
                      </p>
                      <p className="text-[10px] text-muted-foreground truncate">
                        {ag.produtos_servicos?.nome ?? "Serviço"}
                        {ag.funcionarios?.nome && ` · ${ag.funcionarios.nome}`}
                      </p>
                    </div>
                    <Badge className={`text-[10px] shrink-0 ${coresStatus[ag.status as keyof typeof coresStatus] ?? ""}`}>
                      {labelsStatus[ag.status] ?? ag.status}
                    </Badge>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      <PinModal aberto={pinModalOpen} onClose={() => { setPinModalOpen(false); setPinAcaoPendente(null) }} onSuccess={() => { setPinModalOpen(false); if (pinAcaoPendente) { pinAcaoPendente(); setPinAcaoPendente(null) } }} empresaId={empresa.id} titulo="Ação Restrita" descricao="Digite o PIN de gerente para executar esta ação" />
    </div>
  )
}
