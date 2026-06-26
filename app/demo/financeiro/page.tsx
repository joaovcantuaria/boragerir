"use client"

import { useState } from "react"
import { format, parseISO, subDays } from "date-fns"
import { ptBR } from "date-fns/locale"
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell
} from "recharts"
import { TrendingUp, TrendingDown, DollarSign, BarChart3, Search } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { formatarMoeda, labelsFormaPagamento } from "@/lib/utils"
import { vendasDemo, calcularResumoMes } from "@/lib/demo/dados-demo"

const CORES = ["#10B981", "#3B82F6", "#F59E0B", "#8B5CF6", "#EF4444"]
const hoje = new Date()

export default function DemoFinanceiro() {
  const [busca, setBusca] = useState("")
  const resumo = calcularResumoMes()

  // Faturamento por dia
  const faturamentoDia: Record<string, number> = {}
  const inicioMes = new Date(hoje.getFullYear(), hoje.getMonth(), 1)
  vendasDemo.filter((v) => new Date(v.created_at) >= inicioMes).forEach((v) => {
    const dia = v.created_at.substring(0, 10)
    faturamentoDia[dia] = (faturamentoDia[dia] ?? 0) + v.total
  })
  const dadosFaturamento = Object.entries(faturamentoDia).map(([d, v]) => ({
    dia: format(parseISO(d), "d/M"), total: v,
  }))

  // Por forma de pagamento
  const porPagamento: Record<string, number> = {}
  vendasDemo.filter((v) => new Date(v.created_at) >= inicioMes).forEach((v) => {
    const label = labelsFormaPagamento[v.forma_pagamento] ?? v.forma_pagamento
    porPagamento[label] = (porPagamento[label] ?? 0) + v.total
  })
  const dadosPagamento = Object.entries(porPagamento).map(([name, value]) => ({ name, value }))

  const vendasFiltradas = vendasDemo.filter((v) => {
    const t = busca.toLowerCase()
    return String(v.numero_venda).includes(t) || (labelsFormaPagamento[v.forma_pagamento] ?? "").toLowerCase().includes(t)
  }).slice(0, 30)

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Financeiro</h1>
        <p className="text-muted-foreground">Resumo de {format(hoje, "MMMM yyyy", { locale: ptBR })}</p>
      </div>

      {/* Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: "Total receitas", valor: resumo.totalReceitas, cor: "text-emerald-500", bg: "bg-emerald-500/10", Icon: TrendingUp },
          { label: "Total despesas", valor: resumo.totalDespesas, cor: "text-red-500", bg: "bg-red-500/10", Icon: TrendingDown },
          { label: "Lucro líquido", valor: resumo.lucroLiquido, cor: "text-primary", bg: "bg-primary/10", Icon: DollarSign },
          { label: "Ticket médio", valor: resumo.ticketMedio, cor: "text-blue-500", bg: "bg-blue-500/10", Icon: BarChart3 },
        ].map(({ label, valor, cor, bg, Icon }) => (
          <Card key={label}>
            <CardContent className="p-4 flex items-center gap-3">
              <div className={`p-2 rounded-lg ${bg}`}><Icon className={`w-5 h-5 ${cor}`} /></div>
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
          <TabsTrigger value="formas">Pagamentos</TabsTrigger>
        </TabsList>

        <TabsContent value="faturamento" className="mt-4">
          <Card>
            <CardHeader><CardTitle className="text-base">Faturamento diário — {format(hoje, "MMMM", { locale: ptBR })}</CardTitle></CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={250}>
                <BarChart data={dadosFaturamento}>
                  <XAxis dataKey="dia" tick={{ fontSize: 11 }} />
                  <YAxis tick={{ fontSize: 11 }} tickFormatter={(v) => `R$${v}`} />
                  <Tooltip formatter={(v: number) => formatarMoeda(v)} />
                  <Bar dataKey="total" fill="#10B981" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="vendas" className="mt-4 space-y-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input placeholder="Buscar..." className="pl-9" value={busca} onChange={(e) => setBusca(e.target.value)} />
          </div>
          <div className="border border-border rounded-xl overflow-hidden">
            <div className="grid grid-cols-4 gap-2 px-4 py-2 bg-muted text-xs font-medium text-muted-foreground">
              <span>#</span><span>Pagamento</span><span className="text-right">Total</span><span className="text-right">Data</span>
            </div>
            {vendasFiltradas.map((v) => (
              <div key={v.id} className="grid grid-cols-4 gap-2 px-4 py-2.5 border-t border-border text-sm items-center">
                <span className="text-muted-foreground">{String(v.numero_venda).padStart(4, "0")}</span>
                <span className="text-xs">{labelsFormaPagamento[v.forma_pagamento]}</span>
                <span className="text-right font-semibold text-primary">{formatarMoeda(v.total)}</span>
                <span className="text-right text-xs text-muted-foreground">{format(parseISO(v.created_at), "dd/MM HH:mm")}</span>
              </div>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="formas" className="mt-4">
          <Card>
            <CardContent className="p-6">
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
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
