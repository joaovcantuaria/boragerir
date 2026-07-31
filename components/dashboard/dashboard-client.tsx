"use client"

import { useState, useEffect, useCallback } from "react"
import { useRouter } from "next/navigation"
import { useTheme } from "next-themes"
import { DashboardGrid } from "./dashboard-grid"
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
} from "recharts"
import {
  Wallet, TrendingUp, Users, ShoppingCart, Calendar, CheckSquare,
  Package, AlertTriangle, ArrowRight, Clock, RefreshCw, Moon, Sun,
  ShoppingBag, FileText, BarChart3, Settings, CreditCard,
  HeadphonesIcon, ClipboardList, UserCheck, ArrowDownUp, Eye, EyeOff,
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

// â”€â”€ MÃ³dulos do launcher â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
const modulos = [
  { path: "/caixa",             icon: Wallet,       label: "Caixa",             color: "#10b981", shortcut: "C" },
  { path: "/venda",             icon: ShoppingCart, label: "Nova Venda",        color: "#F26E1D", shortcut: "N" },
  { path: "/agendamentos",      icon: Calendar,     label: "Agendamentos",      color: "#6366f1", shortcut: "A" },
  { path: "/clientes",          icon: Users,        label: "Clientes",          color: "#3b82f6", shortcut: "L" },
  { path: "/produtos-servicos", icon: ShoppingBag,  label: "Produtos/ServiÃ§os", color: "#f59e0b", shortcut: "P" },
  { path: "/orcamentos",        icon: FileText,     label: "OrÃ§amentos",        color: "#8b5cf6" },
  { path: "/contratos",         icon: ClipboardList,label: "Contratos",         color: "#0ea5e9" },
  { path: "/tarefas",           icon: CheckSquare,  label: "Tarefas",           color: "#ec4899" },
  { path: "/funcionarios",      icon: UserCheck,    label: "Colaboradores",     color: "#14b8a6" },
  { path: "/financeiro",        icon: BarChart3,    label: "Financeiro",        color: "#84cc16", shortcut: "F" },
  { path: "/configuracoes",     icon: Settings,     label: "ConfiguraÃ§Ãµes",     color: "#6b7280" },
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

  // â”€â”€ PIN Protection â”€â”€
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

  // Realtime â€” atualiza KPIs sem reload
  const [totalVendas, setTotalVendas] = useState(initialVendas)
  const [qtdAtend,    setQtdAtend]    = useState(initialQtd)
  const [ticketM,     setTicketM]     = useState(initialTicket)
  const [pulsing,     setPulsing]     = useState(false)
  const [lastUpdate,  setLastUpdate]  = useState<Date | null>(null)
  const [valoresVisiveis, setValoresVisiveis] = useState(true)

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

  // GrÃ¡fico 7 dias
  const dadosSemana = Array.from({ length: 7 }, (_, i) => {
    const dia = subDays(new Date(), 6 - i)
    const diaStr = format(dia, "yyyy-MM-dd")
    const total = vendasSemana
      .filter((v) => v.created_at.startsWith(diaStr))
      .reduce((s, v) => s + v.total, 0)
    return { dia: format(dia, "EEE", { locale: ptBR }), total }
  })

  const ocultarValor = (v: string) => valoresVisiveis ? v : "â€¢â€¢â€¢â€¢â€¢"

  const kpis = [
    {
      label: "Vendas hoje",
      value: ocultarValor(formatarMoeda(totalVendas)),
      icon: TrendingUp,
      color: "#10b981",
      bg: "#10b98115",
      trend: valoresVisiveis ? (qtdAtend > 0 ? `${qtdAtend} atendimento${qtdAtend > 1 ? "s" : ""}` : "Nenhuma venda") : "",
    },
    {
      label: "Ticket mÃ©dio",
      value: ocultarValor(formatarMoeda(ticketM)),
      icon: ShoppingCart,
      color: "#6366f1",
      bg: "#6366f115",
      trend: valoresVisiveis ? "do dia" : "",
    },
    {
      label: "Agendamentos",
      value: valoresVisiveis ? agendamentosHoje.length.toString() : "â€¢â€¢â€¢",
      icon: Calendar,
      color: "#F26E1D",
      bg: "#F26E1D15",
      trend: valoresVisiveis ? "hoje" : "",
    },
    {
      label: "Caixa",
      value: caixaAberto ? "Aberto" : "Fechado",
      icon: Wallet,
      color: caixaAberto ? "#10b981" : "#6b7280",
      bg: caixaAberto ? "#10b98115" : "#6b728015",
      trend: caixaAberto ? "Em operaÃ§Ã£o" : "Clique para abrir",
      onClick: () => router.push("/caixa"),
    },
  ]

  // â”€â”€ DASHBOARD PLANO GESTÃƒO â€” simplificada â”€â”€
  if (empresa.plano === "gestao") {
    return (
      <div className="space-y-5">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-lg font-semibold text-foreground">
              {"Ol\u00e1, "}{empresa.nome.split(" ")[0]}
            </h1>
            <p className="text-xs text-muted-foreground mt-0.5">
              {format(new Date(), "EEEE, d 'de' MMMM 'de' yyyy", { locale: ptBR })}
            </p>
          </div>
          <button
            onClick={() => setValoresVisiveis(!valoresVisiveis)}
            className="p-2 rounded-lg hover:bg-muted transition-colors text-muted-foreground hover:text-foreground"
            title={valoresVisiveis ? "Ocultar valores" : "Mostrar valores"}
          >
            {valoresVisiveis ? <Eye className="w-5 h-5" /> : <EyeOff className="w-5 h-5" />}
          </button>
        </div>

        {/* KPIs GestÃ£o */}
        <PinProtected empresaId={empresa.id} pinConfigurado={pinConf} areasProtegidas={areasProtegidas} restricaoId="dashboard_ver_faturamento" nomeRestricao="Faturamento do Dashboard">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[
            {
              label: "Resumo Geral",
              value: ocultarValor(formatarMoeda(totalVendas)),
              icon: TrendingUp,
              color: "#10b981",
              bg: "#10b98115",
              trend: valoresVisiveis ? "receitas do dia" : "",
              onClick: () => router.push("/financeiro"),
            },
            {
              label: "Entradas e SaÃ­das",
              value: valoresVisiveis ? `${qtdAtend} mov.` : "â€¢â€¢â€¢â€¢â€¢",
              icon: ArrowDownUp,
              color: "#6366f1",
              bg: "#6366f115",
              trend: valoresVisiveis ? "movimentaÃ§Ãµes hoje" : "",
              onClick: () => router.push("/caixa"),
            },
            {
              label: "Caixa",
              value: caixaAberto ? "Aberto" : "Fechado",
              icon: Wallet,
              color: caixaAberto ? "#10b981" : "#6b7280",
              bg: caixaAberto ? "#10b98115" : "#6b728015",
              trend: caixaAberto ? "Em operaÃ§Ã£o" : "Clique para abrir",
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

        {/* Acesso rÃ¡pido */}
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
                  Ver todas â†’
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

        <PinModal aberto={pinModalOpen} onClose={() => { setPinModalOpen(false); setPinAcaoPendente(null) }} onSuccess={() => { setPinModalOpen(false); if (pinAcaoPendente) { pinAcaoPendente(); setPinAcaoPendente(null) } }} empresaId={empresa.id} titulo="AÃ§Ã£o Restrita" descricao="Digite o PIN de gerente para executar esta aÃ§Ã£o" />
      </div>
    )
  }

  // â”€â”€ DASHBOARD PERSONALIZÃVEL (planos normais) â”€â”€
  return (
    <DashboardGrid
      empresa={empresa}
      totalVendasHoje={totalVendas}
      qtdAtendimentos={qtdAtend}
      ticketMedio={ticketM}
      caixaAberto={caixaAberto}
      agendamentosHoje={agendamentosHoje}
      alertasEstoque={alertasEstoque}
      vendasSemana={vendasSemana}
      tarefasPendentes={tarefasPendentes}
      pinGerente={pinGerente}
      restricoesAcesso={restricoesAcesso}
    />
  )
}
