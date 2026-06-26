"use client"

import { useState } from "react"
import { format } from "date-fns"
import { Wallet, TrendingUp, TrendingDown, ArrowUpCircle, ArrowDownCircle, Minus, X } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { toast } from "sonner"
import { formatarMoeda } from "@/lib/utils"
import { caixaAbertoDemo, movimentacoesDemo } from "@/lib/demo/dados-demo"

export default function DemoCaixa() {
  const [movs, setMovs] = useState(movimentacoesDemo)

  const totalEntradas = movs.filter((m) => m.tipo === "entrada").reduce((s, m) => s + m.valor, 0)
  const totalSaidas = movs.filter((m) => m.tipo === "saida").reduce((s, m) => s + m.valor, 0)
  const saldo = caixaAbertoDemo.valor_abertura + totalEntradas - totalSaidas

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Caixa</h1>
        <p className="text-muted-foreground">Aberto às {format(new Date(caixaAbertoDemo.data_abertura), "HH:mm")}</p>
      </div>

      {/* Resumo */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: "Valor de abertura", valor: caixaAbertoDemo.valor_abertura, cor: "text-foreground" },
          { label: "Total entradas", valor: totalEntradas, cor: "text-emerald-500" },
          { label: "Total saídas", valor: totalSaidas, cor: "text-red-500" },
          { label: "Saldo atual", valor: saldo, cor: "text-primary" },
        ].map((item) => (
          <Card key={item.label}>
            <CardContent className="p-4">
              <p className="text-xs text-muted-foreground">{item.label}</p>
              <p className={`text-xl font-bold ${item.cor}`}>{formatarMoeda(item.valor)}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Ações */}
      <div className="flex flex-wrap gap-2">
        <Button variant="outline" className="gap-2" onClick={() => toast.info("Modo demo — ação não salva")}>
          <ArrowDownCircle className="w-4 h-4 text-emerald-500" />Suprimento
        </Button>
        <Button variant="outline" className="gap-2" onClick={() => toast.info("Modo demo — ação não salva")}>
          <ArrowUpCircle className="w-4 h-4 text-orange-500" />Sangria
        </Button>
        <Button variant="outline" className="gap-2" onClick={() => toast.info("Modo demo — ação não salva")}>
          <Minus className="w-4 h-4 text-red-500" />Despesa
        </Button>
        <Button variant="destructive" className="ml-auto gap-2" onClick={() => toast.info("Modo demo — ação não salva")}>
          <X className="w-4 h-4" />Fechar Caixa
        </Button>
      </div>

      {/* Movimentações */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Movimentações do dia</CardTitle>
        </CardHeader>
        <CardContent className="pt-0">
          <div className="space-y-1">
            {movs.map((mov) => (
              <div key={mov.id} className="flex items-center justify-between py-3 border-b border-border last:border-0">
                <div className="flex items-center gap-3">
                  {mov.tipo === "entrada"
                    ? <TrendingUp className="w-4 h-4 text-emerald-500" />
                    : <TrendingDown className="w-4 h-4 text-red-500" />}
                  <div>
                    <p className="text-sm font-medium">{mov.descricao}</p>
                    <p className="text-xs text-muted-foreground">
                      {format(new Date(mov.created_at), "HH:mm")} • {mov.categoria}
                    </p>
                  </div>
                </div>
                <span className={`font-semibold ${mov.tipo === "entrada" ? "text-emerald-500" : "text-red-500"}`}>
                  {mov.tipo === "entrada" ? "+" : "-"}{formatarMoeda(mov.valor)}
                </span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
