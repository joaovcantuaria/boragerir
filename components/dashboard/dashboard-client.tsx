"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend
} from "recharts"
import {
  Wallet, TrendingUp, Users, ArrowRight, AlertTriangle,
  Calendar, ShoppingCart, CheckCircle2, Package
} from "lucide-react"
import { motion } from "framer-motion"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import { formatarMoeda, formatarDataHora, coresStatus, labelsStatus } from "@/lib/utils"
import type { Empresa } from "@/types"
import { format, subDays } from "date-fns"
import { ptBR } from "date-fns/locale"

const CORES_PIE = ["#10B981", "#3B82F6", "#F59E0B", "#8B5CF6", "#EF4444"]

interface DashboardClientProps {
  empresa: Empresa
  totalVendasHoje: number
  qtdAtendimentos: number
  ticketMedio: number
  caixaAberto: { id: string; valor_abertura: number } | null
  agendamentosHoje: {
    id: string
    data_hora: string
    status: string
    clientes?: { nome_completo: string } | null
    nome_cliente_avulso?: string | null
    produtos_servicos?: { nome: string } | null
    funcionarios?: { nome: string } | null
  }[]
  alertasEstoque: { id: string; nome: string; estoque_atual: number | null; estoque_minimo: number | null }[]
  vendasSemana: { total: number; created_at: string }[]
  vendasHoje: { total: number; forma_pagamento: string }[]
}

export function DashboardClient({
  empresa,
  totalVendasHoje,
  qtdAtendimentos,
  ticketMedio,
  caixaAberto,
  agendamentosHoje,
  alertasEstoque,
  vendasSemana,
  vendasHoje,
}: DashboardClientProps) {
  const router = useRouter()

  // Dados do gráfico de barras (7 dias)
  const dadosSemana = Array.from({ length: 7 }, (_, i) => {
    const dia = subDays(new Date(), 6 - i)
    const diaStr = format(dia, "yyyy-MM-dd")
    const total = vendasSemana
      .filter((v) => v.created_at.startsWith(diaStr))
      .reduce((s, v) => s + v.total, 0)
    return {
      dia: format(dia, "EEE", { locale: ptBR }),
      total,
    }
  })

  // Dados do gráfico de pizza (formas de pagamento)
  const pagamentosMap: Record<string, number> = {}
  vendasHoje.forEach((v) => {
    const label = v.forma_pagamento === "cartao_credito" ? "Crédito"
      : v.forma_pagamento === "cartao_debito" ? "Débito"
      : v.forma_pagamento === "dinheiro" ? "Dinheiro"
      : v.forma_pagamento === "pix" ? "Pix"
      : "Outro"
    pagamentosMap[label] = (pagamentosMap[label] ?? 0) + v.total
  })
  const dadosPagamento = Object.entries(pagamentosMap).map(([name, value]) => ({ name, value }))

  const cards = [
    {
      titulo: "Vendas hoje",
      valor: formatarMoeda(totalVendasHoje),
      icone: TrendingUp,
      cor: "text-emerald-500",
      bg: "bg-emerald-500/10",
    },
    {
      titulo: "Atendimentos",
      valor: qtdAtendimentos.toString(),
      icone: Users,
      cor: "text-blue-500",
      bg: "bg-blue-500/10",
    },
    {
      titulo: "Ticket médio",
      valor: formatarMoeda(ticketMedio),
      icone: ShoppingCart,
      cor: "text-purple-500",
      bg: "bg-purple-500/10",
    },
    {
      titulo: "Status do caixa",
      valor: caixaAberto ? "Aberto" : "Fechado",
      icone: Wallet,
      cor: caixaAberto ? "text-emerald-500" : "text-gray-500",
      bg: caixaAberto ? "bg-emerald-500/10" : "bg-gray-500/10",
    },
  ]

  return (
    <div className="space-y-6">
      {/* Boas-vindas */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Olá, {empresa.nome} 👋</h1>
          <p className="text-muted-foreground">
            {format(new Date(), "EEEE, d 'de' MMMM 'de' yyyy", { locale: ptBR })}
          </p>
        </div>
        <Button onClick={() => router.push("/venda")} className="hidden sm:flex gap-2">
          <ShoppingCart className="w-4 h-4" />
          Nova Venda
        </Button>
      </div>

      {/* Cards de resumo */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {cards.map((card, i) => {
          const Icon = card.icone
          return (
            <motion.div
              key={card.titulo}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.05 }}
            >
              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center gap-3">
                    <div className={`p-2 rounded-lg ${card.bg}`}>
                      <Icon className={`w-5 h-5 ${card.cor}`} />
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">{card.titulo}</p>
                      <p className="text-lg font-bold">{card.valor}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          )
        })}
      </div>

      {/* Status do caixa */}
      {!caixaAberto && (
        <Card className="border-yellow-500/30 bg-yellow-500/5">
          <CardContent className="p-4 flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <Wallet className="w-5 h-5 text-yellow-500" />
              <div>
                <p className="font-medium">Caixa fechado</p>
                <p className="text-sm text-muted-foreground">Abra o caixa para registrar vendas</p>
              </div>
            </div>
            <Button variant="outline" onClick={() => router.push("/caixa")} size="sm">
              Abrir caixa
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Alertas de estoque */}
      {alertasEstoque.length > 0 && (
        <Card className="border-red-500/30 bg-red-500/5">
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2 text-red-500">
              <AlertTriangle className="w-4 h-4" />
              Estoque baixo ({alertasEstoque.length} item{alertasEstoque.length > 1 ? "ns" : ""})
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="flex flex-wrap gap-2">
              {alertasEstoque.map((p) => (
                <Badge key={p.id} variant="destructive" className="text-xs">
                  <Package className="w-3 h-3 mr-1" />
                  {p.nome} ({p.estoque_atual ?? 0} un)
                </Badge>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Gráficos */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Faturamento — últimos 7 dias</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={dadosSemana}>
                <XAxis dataKey="dia" tick={{ fontSize: 12 }} />
                <YAxis tick={{ fontSize: 12 }} tickFormatter={(v) => `R$${v}`} />
                <Tooltip formatter={(v: number) => formatarMoeda(v)} />
                <Bar dataKey="total" fill="#10B981" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Pagamentos de hoje</CardTitle>
          </CardHeader>
          <CardContent>
            {dadosPagamento.length > 0 ? (
              <ResponsiveContainer width="100%" height={200}>
                <PieChart>
                  <Pie
                    data={dadosPagamento}
                    cx="50%"
                    cy="50%"
                    innerRadius={55}
                    outerRadius={80}
                    dataKey="value"
                    label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                    labelLine={false}
                  >
                    {dadosPagamento.map((_, i) => (
                      <Cell key={i} fill={CORES_PIE[i % CORES_PIE.length]} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(v: number) => formatarMoeda(v)} />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-[200px] flex items-center justify-center text-muted-foreground text-sm">
                Nenhuma venda hoje
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Agendamentos do dia */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <CardTitle className="text-base">Agendamentos de hoje</CardTitle>
          <Button variant="ghost" size="sm" onClick={() => router.push("/agendamentos")}>
            Ver todos <ArrowRight className="w-3 h-3 ml-1" />
          </Button>
        </CardHeader>
        <CardContent className="pt-0">
          {agendamentosHoje.length > 0 ? (
            <div className="space-y-2">
              {agendamentosHoje.map((ag) => (
                <div key={ag.id} className="flex items-center justify-between py-2 border-b border-border last:border-0">
                  <div className="flex items-center gap-3">
                    <Calendar className="w-4 h-4 text-muted-foreground" />
                    <div>
                      <p className="text-sm font-medium">
                        {ag.clientes?.nome_completo ?? ag.nome_cliente_avulso ?? "Cliente avulso"}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {format(new Date(ag.data_hora), "HH:mm")} • {ag.produtos_servicos?.nome ?? "Serviço"}
                        {ag.funcionarios?.nome && ` • ${ag.funcionarios.nome}`}
                      </p>
                    </div>
                  </div>
                  <Badge className={coresStatus[ag.status as keyof typeof coresStatus] ?? ""}>
                    {labelsStatus[ag.status] ?? ag.status}
                  </Badge>
                </div>
              ))}
            </div>
          ) : (
            <div className="py-8 text-center text-muted-foreground">
              <Calendar className="w-10 h-10 mx-auto mb-2 opacity-40" />
              <p className="text-sm">Nenhum agendamento para hoje</p>
              <Button variant="outline" size="sm" className="mt-3" onClick={() => router.push("/agendamentos")}>
                Novo agendamento
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
