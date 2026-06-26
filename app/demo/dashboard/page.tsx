"use client"

import { useRouter } from "next/navigation"
import { format, subDays } from "date-fns"
import { ptBR } from "date-fns/locale"
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell
} from "recharts"
import {
  TrendingUp, Users, ShoppingCart, Wallet, AlertTriangle,
  Calendar, ArrowRight, Package
} from "lucide-react"
import { motion } from "framer-motion"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { formatarMoeda, coresStatus, labelsStatus } from "@/lib/utils"
import {
  empresaDemo, vendasHoje, agendamentosDemo, caixaAbertoDemo,
  produtosServicosDemo, calcularResumoMes, vendasDemo, pagamentosHoje
} from "@/lib/demo/dados-demo"
import { format as dateFnsFormat } from "date-fns"

const CORES = ["#10B981", "#3B82F6", "#F59E0B", "#8B5CF6", "#EF4444"]

export default function DemoDashboard() {
  const router = useRouter()
  const hoje = new Date()

  const totalVendasHoje = vendasHoje.reduce((s, v) => s + v.total, 0)
  const qtdAtendimentos = vendasHoje.length
  const ticketMedio = qtdAtendimentos > 0 ? totalVendasHoje / qtdAtendimentos : 0

  // Gráfico 7 dias
  const dadosSemana = Array.from({ length: 7 }, (_, i) => {
    const dia = subDays(hoje, 6 - i)
    const diaStr = dateFnsFormat(dia, "yyyy-MM-dd")
    const total = vendasDemo
      .filter((v) => v.created_at.startsWith(diaStr))
      .reduce((s, v) => s + v.total, 0)
    return { dia: dateFnsFormat(dia, "EEE", { locale: ptBR }), total }
  })

  const dadosPagamento = pagamentosHoje()

  const estoqueBaixo = produtosServicosDemo.filter(
    (p) => p.tipo === "produto" && p.estoque_minimo !== null && (p.estoque_atual ?? 0) <= p.estoque_minimo
  )

  const agendamentosHoje = agendamentosDemo.filter((a) => {
    const diaAg = dateFnsFormat(new Date(a.data_hora), "yyyy-MM-dd")
    const diaHoje = dateFnsFormat(hoje, "yyyy-MM-dd")
    return diaAg === diaHoje
  })

  const cards = [
    { titulo: "Vendas hoje", valor: formatarMoeda(totalVendasHoje), icone: TrendingUp, cor: "text-emerald-500", bg: "bg-emerald-500/10" },
    { titulo: "Atendimentos", valor: qtdAtendimentos.toString(), icone: Users, cor: "text-blue-500", bg: "bg-blue-500/10" },
    { titulo: "Ticket médio", valor: formatarMoeda(ticketMedio), icone: ShoppingCart, cor: "text-purple-500", bg: "bg-purple-500/10" },
    { titulo: "Status do caixa", valor: "Aberto", icone: Wallet, cor: "text-emerald-500", bg: "bg-emerald-500/10" },
  ]

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Olá, {empresaDemo.nome} 👋</h1>
          <p className="text-muted-foreground">
            {format(hoje, "EEEE, d 'de' MMMM 'de' yyyy", { locale: ptBR })}
          </p>
        </div>
        <Button onClick={() => router.push("/demo/venda")} className="hidden sm:flex gap-2">
          <ShoppingCart className="w-4 h-4" />
          Nova Venda
        </Button>
      </div>

      {/* Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {cards.map((card, i) => {
          const Icon = card.icone
          return (
            <motion.div key={card.titulo} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.07 }}>
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

      {/* Alerta estoque */}
      {estoqueBaixo.length > 0 && (
        <Card className="border-red-500/30 bg-red-500/5">
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2 text-red-500">
              <AlertTriangle className="w-4 h-4" />
              Estoque baixo ({estoqueBaixo.length} itens)
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-0 flex flex-wrap gap-2">
            {estoqueBaixo.map((p) => (
              <Badge key={p.id} variant="destructive" className="text-xs gap-1">
                <Package className="w-3 h-3" />
                {p.nome} ({p.estoque_atual} un)
              </Badge>
            ))}
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
                  <Pie data={dadosPagamento} cx="50%" cy="50%" innerRadius={55} outerRadius={80}
                    dataKey="value" label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`} labelLine={false}>
                    {dadosPagamento.map((_, i) => <Cell key={i} fill={CORES[i % CORES.length]} />)}
                  </Pie>
                  <Tooltip formatter={(v: number) => formatarMoeda(v)} />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-[200px] flex items-center justify-center text-muted-foreground text-sm">
                Nenhuma venda hoje ainda
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Agendamentos do dia */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <CardTitle className="text-base">Agendamentos de hoje</CardTitle>
          <Button variant="ghost" size="sm" onClick={() => router.push("/demo/agendamentos")}>
            Ver todos <ArrowRight className="w-3 h-3 ml-1" />
          </Button>
        </CardHeader>
        <CardContent className="pt-0">
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
                      {dateFnsFormat(new Date(ag.data_hora), "HH:mm")}
                      {ag.produtos_servicos?.nome && ` • ${ag.produtos_servicos.nome}`}
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
        </CardContent>
      </Card>
    </div>
  )
}
