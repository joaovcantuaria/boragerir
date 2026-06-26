"use client"

import { useState } from "react"
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  LineChart, Line, PieChart, Pie, Cell
} from "recharts"
import { TrendingUp, TrendingDown, DollarSign, Users, BarChart3, Search } from "lucide-react"
import { format, parseISO } from "date-fns"
import { ptBR } from "date-fns/locale"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { formatarMoeda, labelsFormaPagamento, coresStatus, labelsStatus } from "@/lib/utils"

const CORES = ["#10B981", "#3B82F6", "#F59E0B", "#8B5CF6", "#EF4444"]

export function FinanceiroClient({ empresaId, plano, vendas, movimentacoes, funcionarios }: {
  empresaId: string; plano: string
  vendas: { id: string; numero_venda: number; total: number; subtotal: number; desconto: number; forma_pagamento: string; status: string; created_at: string; clientes?: { nome_completo: string } | null }[]
  movimentacoes: { id: string; tipo: string; categoria: string; descricao: string; valor: number; created_at: string }[]
  funcionarios: { id: string; nome: string }[]
}) {
  const [busca, setBusca] = useState("")

  const vendasConcluidas = vendas.filter((v) => v.status === "concluida")
  const totalReceitas = vendasConcluidas.reduce((s, v) => s + v.total, 0)
  const totalDespesas = movimentacoes.filter((m) => m.tipo === "saida" && m.categoria === "despesa").reduce((s, m) => s + m.valor, 0)
  const lucroLiquido = totalReceitas - totalDespesas
  const ticketMedio = vendasConcluidas.length > 0 ? totalReceitas / vendasConcluidas.length : 0

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

  const vendasFiltradas = vendasConcluidas.filter((v) => {
    const t = busca.toLowerCase()
    return (
      String(v.numero_venda).includes(t) ||
      (v.clientes?.nome_completo ?? "").toLowerCase().includes(t) ||
      (labelsFormaPagamento[v.forma_pagamento] ?? "").toLowerCase().includes(t)
    )
  })

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Financeiro</h1>
        <p className="text-muted-foreground">Resumo do mês de {format(new Date(), "MMMM yyyy", { locale: ptBR })}</p>
      </div>

      {/* Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: "Total receitas", valor: totalReceitas, cor: "text-emerald-500", bg: "bg-emerald-500/10", Icon: TrendingUp },
          { label: "Total despesas", valor: totalDespesas, cor: "text-red-500", bg: "bg-red-500/10", Icon: TrendingDown },
          { label: "Lucro líquido", valor: lucroLiquido, cor: lucroLiquido >= 0 ? "text-primary" : "text-red-500", bg: "bg-primary/10", Icon: DollarSign },
          { label: "Ticket médio", valor: ticketMedio, cor: "text-blue-500", bg: "bg-blue-500/10", Icon: BarChart3 },
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

      <Tabs defaultValue="faturamento">
        <TabsList>
          <TabsTrigger value="faturamento">Faturamento</TabsTrigger>
          <TabsTrigger value="vendas">Vendas</TabsTrigger>
          <TabsTrigger value="formas">Formas de pagamento</TabsTrigger>
        </TabsList>

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
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input placeholder="Buscar por nº, cliente ou pagamento..." className="pl-9" value={busca} onChange={(e) => setBusca(e.target.value)} />
          </div>
          {vendasFiltradas.length > 0 ? (
            <div className="border border-border rounded-xl overflow-hidden">
              <div className="grid grid-cols-5 gap-2 px-4 py-2 bg-muted text-xs font-medium text-muted-foreground">
                <span>#</span><span>Cliente</span><span>Pagamento</span><span className="text-right">Total</span><span className="text-right">Data</span>
              </div>
              {vendasFiltradas.map((v) => (
                <div key={v.id} className="grid grid-cols-5 gap-2 px-4 py-3 border-t border-border text-sm items-center">
                  <span className="text-muted-foreground">{String(v.numero_venda).padStart(4, "0")}</span>
                  <span className="truncate">{v.clientes?.nome_completo ?? "—"}</span>
                  <span className="truncate text-xs">{labelsFormaPagamento[v.forma_pagamento] ?? v.forma_pagamento}</span>
                  <span className="text-right font-semibold text-primary">{formatarMoeda(v.total)}</span>
                  <span className="text-right text-xs text-muted-foreground">{format(parseISO(v.created_at), "dd/MM HH:mm")}</span>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-center text-muted-foreground py-12 text-sm">Nenhuma venda encontrada</p>
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
      </Tabs>
    </div>
  )
}
