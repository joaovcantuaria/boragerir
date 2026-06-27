"use client"

import { useState } from "react"
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell
} from "recharts"
import { TrendingUp, TrendingDown, DollarSign, BarChart3, Search, Edit, XCircle, Loader2 } from "lucide-react"
import { format, parseISO } from "date-fns"
import { ptBR } from "date-fns/locale"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Button } from "@/components/ui/button"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { toast } from "sonner"
import { createClient } from "@/lib/supabase/client"
import { formatarMoeda, labelsFormaPagamento, coresStatus, labelsStatus } from "@/lib/utils"

const CORES = ["#10B981", "#3B82F6", "#F59E0B", "#8B5CF6", "#EF4444"]

type Venda = {
  id: string
  numero_venda: number
  total: number
  subtotal: number
  desconto: number
  forma_pagamento: string
  status: string
  created_at: string
  observacoes?: string | null
  clientes?: { nome_completo: string } | null
}

export function FinanceiroClient({ empresaId, plano, vendas: vendasIniciais, movimentacoes, funcionarios }: {
  empresaId: string; plano: string
  vendas: Venda[]
  movimentacoes: { id: string; tipo: string; categoria: string; descricao: string; valor: number; created_at: string }[]
  funcionarios: { id: string; nome: string }[]
}) {
  const [vendas, setVendas] = useState(vendasIniciais)
  const [busca, setBusca] = useState("")
  const [modalEditar, setModalEditar] = useState<Venda | null>(null)
  const [editFormaPagamento, setEditFormaPagamento] = useState("")
  const [editDesconto, setEditDesconto] = useState("")
  const [editObservacoes, setEditObservacoes] = useState("")
  const [loadingEdit, setLoadingEdit] = useState(false)
  const [loadingCancel, setLoadingCancel] = useState<string | null>(null)
  const supabase = createClient()

  async function cancelarVenda(venda: Venda) {
    if (!confirm(`Cancelar a venda #${String(venda.numero_venda).padStart(4,"0")} de ${formatarMoeda(venda.total)}?`)) return
    setLoadingCancel(venda.id)
    const { error } = await supabase.from("vendas").update({ status: "cancelada" }).eq("id", venda.id)
    if (error) { toast.error("Erro ao cancelar venda."); setLoadingCancel(null); return }
    // Reverter movimentação de caixa
    await supabase.from("movimentacoes_caixa").delete().eq("venda_id", venda.id)
    setVendas((prev) => prev.map((v) => v.id === venda.id ? { ...v, status: "cancelada" } : v))
    toast.success(`Venda #${String(venda.numero_venda).padStart(4,"0")} cancelada.`)
    setLoadingCancel(null)
  }

  function abrirEditar(venda: Venda) {
    setModalEditar(venda)
    setEditFormaPagamento(venda.forma_pagamento)
    setEditDesconto(String(venda.desconto))
    setEditObservacoes(venda.observacoes ?? "")
  }

  async function salvarEdicao() {
    if (!modalEditar) return
    setLoadingEdit(true)
    const desconto = parseFloat(editDesconto) || 0
    const total = Math.max(0, modalEditar.subtotal - desconto)
    const { error } = await supabase.from("vendas").update({
      forma_pagamento: editFormaPagamento,
      desconto,
      total,
      observacoes: editObservacoes || null,
    }).eq("id", modalEditar.id)
    if (error) { toast.error("Erro ao salvar alterações."); setLoadingEdit(false); return }
    setVendas((prev) => prev.map((v) => v.id === modalEditar.id
      ? { ...v, forma_pagamento: editFormaPagamento, desconto, total, observacoes: editObservacoes || null }
      : v
    ))
    toast.success("Venda atualizada!")
    setModalEditar(null)
    setLoadingEdit(false)
  }

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

  const vendasFiltradas = vendas.filter((v) => {
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
              <div className="grid grid-cols-6 gap-2 px-4 py-2 bg-muted text-xs font-medium text-muted-foreground">
                <span>#</span><span>Cliente</span><span>Pagamento</span><span>Status</span><span className="text-right">Total</span><span className="text-right">Ações</span>
              </div>
              {vendasFiltradas.map((v) => (
                <div key={v.id} className={`grid grid-cols-6 gap-2 px-4 py-3 border-t border-border text-sm items-center ${v.status === "cancelada" ? "opacity-50" : ""}`}>
                  <span className="text-muted-foreground">{String(v.numero_venda).padStart(4, "0")}</span>
                  <span className="truncate">{v.clientes?.nome_completo ?? "—"}</span>
                  <span className="truncate text-xs">{labelsFormaPagamento[v.forma_pagamento] ?? v.forma_pagamento}</span>
                  <span>
                    <Badge className={`text-xs ${v.status === "cancelada" ? "bg-red-500/10 text-red-500 border-red-500/20" : "bg-emerald-500/10 text-emerald-600 border-emerald-500/20"}`}>
                      {v.status === "cancelada" ? "Cancelada" : "Concluída"}
                    </Badge>
                  </span>
                  <span className={`text-right font-semibold ${v.status === "cancelada" ? "line-through text-muted-foreground" : "text-primary"}`}>{formatarMoeda(v.total)}</span>
                  <div className="flex gap-1 justify-end">
                    {v.status === "concluida" && (
                      <>
                        <Button variant="ghost" size="xs" onClick={() => abrirEditar(v)} title="Editar">
                          <Edit className="w-3.5 h-3.5" />
                        </Button>
                        <Button variant="ghost" size="xs" className="text-red-500 hover:text-red-600"
                          onClick={() => cancelarVenda(v)} disabled={loadingCancel === v.id} title="Cancelar">
                          {loadingCancel === v.id
                            ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
                            : <XCircle className="w-3.5 h-3.5" />
                          }
                        </Button>
                      </>
                    )}
                  </div>
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

      {/* Modal de edição */}
      <Dialog open={!!modalEditar} onOpenChange={(open) => { if (!open) setModalEditar(null) }}>
        <DialogContent onInteractOutside={(e) => e.preventDefault()}>
          <DialogHeader>
            <DialogTitle>Editar Venda #{String(modalEditar?.numero_venda ?? 0).padStart(4, "0")}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Forma de pagamento</Label>
              <div className="grid grid-cols-2 gap-2">
                {(["dinheiro", "pix", "cartao_debito", "cartao_credito", "outro"] as const).map((fp) => (
                  <button key={fp} type="button"
                    onClick={() => setEditFormaPagamento(fp)}
                    className={`py-2 px-3 rounded-lg border text-xs font-medium transition-colors ${
                      editFormaPagamento === fp
                        ? "border-primary bg-primary/10 text-primary"
                        : "border-border hover:border-primary/50"
                    }`}>
                    {labelsFormaPagamento[fp]}
                  </button>
                ))}
              </div>
            </div>
            <div className="space-y-2">
              <Label>Desconto (R$)</Label>
              <Input type="number" step="0.01" min="0" value={editDesconto}
                onChange={(e) => setEditDesconto(e.target.value)} placeholder="0,00" />
              {modalEditar && (
                <p className="text-xs text-muted-foreground">
                  Subtotal: {formatarMoeda(modalEditar.subtotal)} →
                  Novo total: <strong>{formatarMoeda(Math.max(0, modalEditar.subtotal - (parseFloat(editDesconto) || 0)))}</strong>
                </p>
              )}
            </div>
            <div className="space-y-2">
              <Label>Observações</Label>
              <Textarea value={editObservacoes} onChange={(e) => setEditObservacoes(e.target.value)}
                placeholder="Observações sobre a venda..." rows={2} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setModalEditar(null)}>Cancelar</Button>
            <Button onClick={salvarEdicao} disabled={loadingEdit}>
              {loadingEdit ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
              Salvar alterações
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
