"use client"

import { useState, useEffect, useCallback } from "react"
import { ArrowUpRight, ArrowDownRight, Calendar, Loader2, RefreshCw, Wallet } from "lucide-react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { formatarMoeda } from "@/lib/utils"

interface ExtratoEntrada {
  id: string
  data: string
  tipo: "entrada" | "saida"
  descricao: string
  valor: number
  saldoApos: number
}

interface ExtratoResponse {
  saldo: number
  entradas: ExtratoEntrada[]
  periodo: { inicio: string; fim: string }
}

interface CoraExtratoProps {
  empresaId: string
}

export function CoraExtrato({ empresaId }: CoraExtratoProps) {
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [extrato, setExtrato] = useState<ExtratoResponse | null>(null)

  // Default: últimos 30 dias
  const today = new Date()
  const thirtyDaysAgo = new Date(today)
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)

  const [startDate, setStartDate] = useState(thirtyDaysAgo.toISOString().split("T")[0])
  const [endDate, setEndDate] = useState(today.toISOString().split("T")[0])

  const fetchExtrato = useCallback(async (start: string, end: string) => {
    setLoading(true)
    setError(null)

    try {
      const params = new URLSearchParams({ startDate: start, endDate: end })
      const res = await fetch(`/api/cora/extrato?${params}`)

      if (!res.ok) {
        const body = await res.json().catch(() => ({}))
        throw new Error(body.error || "Erro ao consultar extrato")
      }

      const data: ExtratoResponse = await res.json()
      setExtrato(data)
    } catch (err: any) {
      setError(err.message || "Erro ao consultar extrato")
      toast.error(err.message || "Erro ao consultar extrato")
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchExtrato(startDate, endDate)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  function handleFiltrar() {
    if (!startDate || !endDate) {
      toast.error("Informe as datas de início e fim")
      return
    }
    if (new Date(startDate) > new Date(endDate)) {
      toast.error("A data inicial deve ser menor ou igual à data final")
      return
    }
    fetchExtrato(startDate, endDate)
  }

  function handleRetry() {
    fetchExtrato(startDate, endDate)
  }

  // Loading state
  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Wallet className="h-5 w-5 text-[#F26E1D]" />
            Extrato
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-6 w-6 animate-spin text-[#F26E1D]" />
            <span className="ml-2 text-sm text-muted-foreground">Carregando extrato...</span>
          </div>
        </CardContent>
      </Card>
    )
  }

  // Error state
  if (error) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Wallet className="h-5 w-5 text-[#F26E1D]" />
            Extrato
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-center gap-4 py-12 text-center">
            <p className="text-sm text-muted-foreground">{error}</p>
            <Button variant="outline" onClick={handleRetry}>
              <RefreshCw className="h-4 w-4" />
              Tentar novamente
            </Button>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-4">
      {/* Saldo Card */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center gap-3">
            <div className="rounded-full bg-orange-50 p-3 dark:bg-orange-950/20">
              <Wallet className="h-6 w-6 text-[#F26E1D]" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Saldo atual</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                {extrato ? formatarMoeda(extrato.saldo) : "—"}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Filtro por período */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Calendar className="h-4 w-4 text-[#F26E1D]" />
            Filtrar por período
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap items-end gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="extrato-start">Início</Label>
              <Input
                id="extrato-start"
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="w-[160px]"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="extrato-end">Fim</Label>
              <Input
                id="extrato-end"
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="w-[160px]"
              />
            </div>
            <Button onClick={handleFiltrar}>
              Filtrar
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Lista de transações */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            Transações
            {extrato && (
              <Badge variant="secondary" className="ml-auto font-normal">
                {extrato.entradas.length} registro{extrato.entradas.length !== 1 ? "s" : ""}
              </Badge>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {!extrato || extrato.entradas.length === 0 ? (
            <div className="flex flex-col items-center gap-2 py-12 text-center">
              <div className="rounded-full bg-gray-100 p-3 dark:bg-white/[0.06]">
                <Wallet className="h-6 w-6 text-gray-400" />
              </div>
              <p className="text-sm font-medium text-gray-900 dark:text-gray-100">
                Nenhuma transação encontrada
              </p>
              <p className="text-xs text-muted-foreground">
                Não há movimentações no período selecionado.
              </p>
            </div>
          ) : (
            <div className="space-y-1">
              {extrato.entradas.map((entrada, index) => (
                <div key={entrada.id}>
                  {index > 0 && <Separator className="my-1" />}
                  <div className="flex items-center gap-3 rounded-lg px-2 py-2.5 transition-colors hover:bg-muted/50">
                    {/* Ícone tipo */}
                    <div
                      className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full ${
                        entrada.tipo === "entrada"
                          ? "bg-emerald-100 dark:bg-emerald-950/30"
                          : "bg-red-100 dark:bg-red-950/30"
                      }`}
                    >
                      {entrada.tipo === "entrada" ? (
                        <ArrowUpRight className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
                      ) : (
                        <ArrowDownRight className="h-4 w-4 text-red-600 dark:text-red-400" />
                      )}
                    </div>

                    {/* Descrição e data */}
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium text-gray-900 dark:text-gray-100">
                        {entrada.descricao}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {new Date(entrada.data).toLocaleDateString("pt-BR")}
                      </p>
                    </div>

                    {/* Valor e saldo após */}
                    <div className="shrink-0 text-right">
                      <p
                        className={`text-sm font-semibold ${
                          entrada.tipo === "entrada"
                            ? "text-emerald-600 dark:text-emerald-400"
                            : "text-red-600 dark:text-red-400"
                        }`}
                      >
                        {entrada.tipo === "entrada" ? "+" : "-"} {formatarMoeda(entrada.valor)}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        Saldo: {formatarMoeda(entrada.saldoApos)}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
