"use client"

import { useRouter } from "next/navigation"
import { format, parseISO } from "date-fns"
import { ptBR } from "date-fns/locale"
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, BarChart, Bar, XAxis, YAxis } from "recharts"
import {
  Building2, CreditCard, TrendingUp, AlertCircle,
  ArrowRight, CheckCircle, Clock, XCircle
} from "lucide-react"
import { formatarMoeda } from "@/lib/utils"

const CORES = ["#6b7280", "#3b82f6", "#F26E1D"]

interface Props {
  totalEmpresas: number
  totalAssinaturasAtivas: number
  receitaMensal: number
  receitaTotal: number
  empresasRecentes: { id: string; nome: string; area_atuacao: string; plano: string; created_at: string; logo_url: string | null }[]
  assinaturas: { id: string; plano: string; periodicidade: string; status: string; valor_total: number; forma_pagamento: string | null; created_at: string }[]
  ticketsAbertos: { id: string; assunto: string; status: string; prioridade: string; created_at: string; empresa_id: string | null }[]
  contagemPlanos: Record<string, number>
}

const badgePlano: Record<string, string> = {
  gratuito: "bg-gray-500/10 text-gray-400 border-gray-500/20",
  basico: "bg-blue-500/10 text-blue-400 border-blue-500/20",
  profissional: "bg-primary/10 text-primary border-primary/20",
}

const badgeStatus: Record<string, { cor: string; icon: typeof CheckCircle }> = {
  ativa: { cor: "text-emerald-400", icon: CheckCircle },
  pendente: { cor: "text-yellow-400", icon: Clock },
  cancelada: { cor: "text-red-400", icon: XCircle },
}

export function AdminDashboard({
  totalEmpresas, totalAssinaturasAtivas, receitaMensal, receitaTotal,
  empresasRecentes, assinaturas, ticketsAbertos, contagemPlanos
}: Props) {
  const router = useRouter()

  const dadosPizza = [
    { name: "Gratuito", value: contagemPlanos["gratuito"] ?? 0 },
    { name: "Básico", value: contagemPlanos["basico"] ?? 0 },
    { name: "Profissional", value: contagemPlanos["profissional"] ?? 0 },
  ].filter((d) => d.value > 0)

  const cards = [
    { label: "Total de empresas", valor: totalEmpresas.toString(), icon: Building2, cor: "text-blue-400", bg: "bg-blue-500/10" },
    { label: "Assinaturas ativas", valor: totalAssinaturasAtivas.toString(), icon: CreditCard, cor: "text-primary", bg: "bg-primary/10" },
    { label: "Receita mensal", valor: formatarMoeda(receitaMensal), icon: TrendingUp, cor: "text-emerald-400", bg: "bg-emerald-500/10" },
    { label: "Tickets abertos", valor: ticketsAbertos.length.toString(), icon: AlertCircle, cor: ticketsAbertos.length > 0 ? "text-yellow-400" : "text-gray-400", bg: ticketsAbertos.length > 0 ? "bg-yellow-500/10" : "bg-gray-500/10" },
  ]

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-black text-gray-900 dark:text-white">Dashboard</h1>
        <p className="text-gray-400 dark:text-white/40 text-sm mt-1">
          {format(new Date(), "EEEE, d 'de' MMMM 'de' yyyy", { locale: ptBR })}
        </p>
      </div>

      {/* Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {cards.map((c) => {
          const Icon = c.icon
          return (
            <div key={c.label} className="bg-white dark:bg-[#1a1a1a] border border-gray-100 dark:border-white/10 rounded-2xl p-4">
              <div className="flex items-center gap-3">
                <div className={`p-2 rounded-xl ${c.bg}`}>
                  <Icon className={`w-5 h-5 ${c.cor}`} />
                </div>
                <div>
                  <p className="text-xs text-gray-400 dark:text-white/40">{c.label}</p>
                  <p className="text-xl font-black text-gray-900 dark:text-white">{c.valor}</p>
                </div>
              </div>
            </div>
          )
        })}
      </div>

      {/* Gráficos */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white dark:bg-[#1a1a1a] border border-gray-100 dark:border-white/10 rounded-2xl p-5">
          <h3 className="text-sm font-bold text-gray-900 dark:text-white mb-4">Distribuição por plano</h3>
          {dadosPizza.length > 0 ? (
            <div className="flex items-center gap-6">
              <ResponsiveContainer width={160} height={160}>
                <PieChart>
                  <Pie data={dadosPizza} cx="50%" cy="50%" innerRadius={45} outerRadius={70} dataKey="value">
                    {dadosPizza.map((_, i) => <Cell key={i} fill={CORES[i]} />)}
                  </Pie>
                  <Tooltip formatter={(v: number) => [`${v} empresas`]} contentStyle={{ background: "#1a1a1a", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 8, color: "white" }} />
                </PieChart>
              </ResponsiveContainer>
              <div className="space-y-2">
                {dadosPizza.map((d, i) => (
                  <div key={d.name} className="flex items-center gap-2 text-sm">
                    <div className="w-3 h-3 rounded-full" style={{ background: CORES[i] }} />
                    <span className="text-gray-700 dark:text-white/70">{d.name}</span>
                    <span className="text-gray-900 dark:text-white font-bold ml-auto">{d.value}</span>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <p className="text-gray-300 dark:text-white/30 text-sm py-8 text-center">Nenhum dado ainda</p>
          )}
        </div>

        <div className="bg-white dark:bg-[#1a1a1a] border border-gray-100 dark:border-white/10 rounded-2xl p-5">
          <h3 className="text-sm font-bold text-gray-900 dark:text-white mb-4">Receita por tipo</h3>
          <div className="space-y-4 pt-2">
            {[
              { label: "Receita mensal estimada", valor: receitaMensal, cor: "bg-primary" },
              { label: "Receita total (assinaturas ativas)", valor: receitaTotal, cor: "bg-emerald-500" },
            ].map((item) => (
              <div key={item.label}>
                <div className="flex justify-between text-sm mb-1">
                  <span className="text-gray-500 dark:text-white/50">{item.label}</span>
                  <span className="text-gray-900 dark:text-white font-bold">{formatarMoeda(item.valor)}</span>
                </div>
                <div className="h-2 bg-white/10 rounded-full">
                  <div className={`h-full rounded-full ${item.cor}`}
                    style={{ width: item.valor > 0 ? "100%" : "0%" }} />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Empresas recentes + Assinaturas + Tickets */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Empresas recentes */}
        <div className="bg-white dark:bg-[#1a1a1a] border border-gray-100 dark:border-white/10 rounded-2xl p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-bold text-gray-900 dark:text-white">Empresas recentes</h3>
            <button onClick={() => router.push("/admin/empresas")}
              className="text-xs text-primary hover:underline flex items-center gap-1">
              Ver todas <ArrowRight className="w-3 h-3" />
            </button>
          </div>
          <div className="space-y-2">
            {empresasRecentes.length > 0 ? empresasRecentes.map((e) => (
              <div key={e.id} className="flex items-center gap-3 py-2 border-b border-gray-50 dark:border-white/5 last:border-0 cursor-pointer hover:bg-gray-50 dark:hover:bg-white/5 rounded-lg px-2 transition-colors"
                onClick={() => router.push(`/admin/empresas/${e.id}`)}>
                <div className="w-8 h-8 rounded-lg bg-primary/20 flex items-center justify-center shrink-0 overflow-hidden">
                  {e.logo_url
                    ? <img src={e.logo_url} alt="" className="w-full h-full object-cover" />
                    : <span className="text-xs font-black text-primary">{e.nome.charAt(0)}</span>
                  }
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-gray-900 dark:text-white truncate">{e.nome}</p>
                  <p className="text-xs text-gray-400 dark:text-white/40">{e.area_atuacao}</p>
                </div>
                <span className={`text-xs px-2 py-0.5 rounded-full border ${badgePlano[e.plano] ?? ""}`}>
                  {e.plano}
                </span>
              </div>
            )) : (
              <p className="text-gray-300 dark:text-white/30 text-sm py-4 text-center">Nenhuma empresa ainda</p>
            )}
          </div>
        </div>

        {/* Assinaturas recentes */}
        <div className="bg-white dark:bg-[#1a1a1a] border border-gray-100 dark:border-white/10 rounded-2xl p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-bold text-gray-900 dark:text-white">Assinaturas recentes</h3>
            <button onClick={() => router.push("/admin/assinaturas")}
              className="text-xs text-primary hover:underline flex items-center gap-1">
              Ver todas <ArrowRight className="w-3 h-3" />
            </button>
          </div>
          <div className="space-y-2">
            {assinaturas.length > 0 ? assinaturas.map((a) => {
              const badge = badgeStatus[a.status] ?? badgeStatus.pendente
              const Icon = badge.icon
              return (
                <div key={a.id} className="flex items-center gap-3 py-2 border-b border-gray-50 dark:border-white/5 last:border-0">
                  <Icon className={`w-4 h-4 ${badge.cor} shrink-0`} />
                  <div className="flex-1">
                    <p className="text-sm font-semibold text-gray-900 dark:text-white capitalize">{a.plano} — {a.periodicidade}</p>
                    <p className="text-xs text-gray-400 dark:text-white/40">
                      {a.forma_pagamento ?? "—"} · {format(parseISO(a.created_at), "dd/MM/yyyy")}
                    </p>
                  </div>
                  <span className="text-sm font-bold text-emerald-400">{formatarMoeda(a.valor_total)}</span>
                </div>
              )
            }) : (
              <p className="text-gray-300 dark:text-white/30 text-sm py-4 text-center">Nenhuma assinatura ainda</p>
            )}
          </div>
        </div>
      </div>

      {/* Tickets abertos */}
      {ticketsAbertos.length > 0 && (
        <div className="bg-yellow-500/5 border border-yellow-500/20 rounded-2xl p-5">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-yellow-400" />
              <h3 className="text-sm font-bold text-gray-900 dark:text-white">Tickets abertos ({ticketsAbertos.length})</h3>
            </div>
            <button onClick={() => router.push("/admin/suporte")}
              className="text-xs text-primary hover:underline flex items-center gap-1">
              Ver todos <ArrowRight className="w-3 h-3" />
            </button>
          </div>
          <div className="space-y-2">
            {ticketsAbertos.map((t) => (
              <div key={t.id} className="flex items-center justify-between py-2 border-b border-gray-50 dark:border-white/5 last:border-0 cursor-pointer"
                onClick={() => router.push("/admin/suporte")}>
                <div>
                  <p className="text-sm font-semibold text-gray-900 dark:text-white">{t.assunto}</p>
                  <p className="text-xs text-gray-400 dark:text-white/40">{format(parseISO(t.created_at), "dd/MM HH:mm")}</p>
                </div>
                <span className={`text-xs px-2 py-0.5 rounded-full border ${
                  t.prioridade === "urgente" ? "bg-red-500/10 text-red-400 border-red-500/20" :
                  t.prioridade === "alta" ? "bg-orange-500/10 text-orange-400 border-orange-500/20" :
                  "bg-yellow-500/10 text-yellow-400 border-yellow-500/20"
                }`}>
                  {t.prioridade}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
