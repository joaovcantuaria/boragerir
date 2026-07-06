"use client"

import { useState } from "react"
import { format, startOfMonth, endOfMonth, startOfWeek, endOfWeek } from "date-fns"
import { ptBR } from "date-fns/locale"
import { FileText, Download, Loader2 } from "lucide-react"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { toast } from "sonner"
import { createClient } from "@/lib/supabase/client"
import { formatarMoeda } from "@/lib/utils"

type TipoRelatorio = "movimentacoes" | "completo"

export function RelatoriosGestaoTab({ empresaId }: { empresaId: string }) {
  const [tipo, setTipo] = useState<TipoRelatorio>("completo")
  const [periodo, setPeriodo] = useState<"semana" | "mes" | "custom">("mes")
  const [dataInicio, setDataInicio] = useState(format(startOfMonth(new Date()), "yyyy-MM-dd"))
  const [dataFim, setDataFim] = useState(format(endOfMonth(new Date()), "yyyy-MM-dd"))
  const [loading, setLoading] = useState(false)
  const supabase = createClient()

  function ajustarPeriodo(p: "semana" | "mes" | "custom") {
    setPeriodo(p)
    if (p === "semana") {
      setDataInicio(format(startOfWeek(new Date(), { locale: ptBR }), "yyyy-MM-dd"))
      setDataFim(format(endOfWeek(new Date(), { locale: ptBR }), "yyyy-MM-dd"))
    } else if (p === "mes") {
      setDataInicio(format(startOfMonth(new Date()), "yyyy-MM-dd"))
      setDataFim(format(endOfMonth(new Date()), "yyyy-MM-dd"))
    }
  }

  async function gerarRelatorio() {
    setLoading(true)
    try {
      // Buscar dados do período
      const [
        { data: caixas },
        { data: movimentacoes },
        { data: contasPagar },
        { data: valoresReceber },
      ] = await Promise.all([
        supabase.from("caixas").select("*").eq("empresa_id", empresaId)
          .gte("data_abertura", dataInicio + "T00:00:00")
          .lte("data_abertura", dataFim + "T23:59:59")
          .order("data_abertura"),
        supabase.from("movimentacoes_caixa").select("*").eq("empresa_id", empresaId)
          .gte("created_at", dataInicio + "T00:00:00")
          .lte("created_at", dataFim + "T23:59:59")
          .order("created_at"),
        supabase.from("contas_pagar").select("*").eq("empresa_id", empresaId)
          .gte("data_vencimento", dataInicio)
          .lte("data_vencimento", dataFim)
          .order("data_vencimento"),
        supabase.from("valores_receber").select("*").eq("empresa_id", empresaId)
          .gte("data_vencimento", dataInicio)
          .lte("data_vencimento", dataFim)
          .order("data_vencimento"),
      ])

      const movs = movimentacoes ?? []
      const cxs = caixas ?? []
      const cp = contasPagar ?? []
      const vr = valoresReceber ?? []

      let conteudo = ""
      const linha = "═".repeat(60)
      const separador = "─".repeat(60)

      // Header
      conteudo += `${linha}\n`
      conteudo += `  RELATÓRIO ${tipo === "completo" ? "COMPLETO" : "DE MOVIMENTAÇÕES"}\n`
      conteudo += `  Período: ${format(new Date(dataInicio), "dd/MM/yyyy")} a ${format(new Date(dataFim), "dd/MM/yyyy")}\n`
      conteudo += `  Gerado em: ${format(new Date(), "dd/MM/yyyy 'às' HH:mm")}\n`
      conteudo += `${linha}\n\n`

      if (tipo === "movimentacoes" || tipo === "completo") {
        // Separar por tipo de conta
        const caixaEspecie = cxs.filter((c: any) => c.tipo_conta !== "banco")
        const caixaBanco = cxs.filter((c: any) => c.tipo_conta === "banco")

        const movsEspecie = movs.filter((m: any) => {
          const cx = cxs.find((c: any) => c.id === m.caixa_id)
          return cx && (cx as any).tipo_conta !== "banco"
        })
        const movsBanco = movs.filter((m: any) => {
          const cx = cxs.find((c: any) => c.id === m.caixa_id)
          return cx && (cx as any).tipo_conta === "banco"
        })

        // Movimentações Dinheiro
        conteudo += `💵 CAIXA DINHEIRO (ESPÉCIE)\n${separador}\n`
        if (movsEspecie.length === 0) {
          conteudo += `  Nenhuma movimentação no período.\n\n`
        } else {
          const entradasEsp = movsEspecie.filter((m: any) => m.tipo === "entrada")
          const saidasEsp = movsEspecie.filter((m: any) => m.tipo === "saida")
          conteudo += `  Entradas: ${entradasEsp.length} | Total: ${formatarMoeda(entradasEsp.reduce((s: number, m: any) => s + m.valor, 0))}\n`
          conteudo += `  Saídas:   ${saidasEsp.length} | Total: ${formatarMoeda(saidasEsp.reduce((s: number, m: any) => s + m.valor, 0))}\n\n`
          movsEspecie.forEach((m: any) => {
            const sinal = m.tipo === "entrada" ? "+" : "-"
            conteudo += `  ${format(new Date(m.created_at), "dd/MM HH:mm")} | ${sinal}${formatarMoeda(m.valor)} | ${m.categoria} | ${m.descricao}\n`
          })
          conteudo += `\n`
        }

        // Movimentações Banco
        conteudo += `🏦 CAIXA BANCO\n${separador}\n`
        if (movsBanco.length === 0) {
          conteudo += `  Nenhuma movimentação no período.\n\n`
        } else {
          const entradasBanco = movsBanco.filter((m: any) => m.tipo === "entrada")
          const saidasBanco = movsBanco.filter((m: any) => m.tipo === "saida")
          conteudo += `  Entradas: ${entradasBanco.length} | Total: ${formatarMoeda(entradasBanco.reduce((s: number, m: any) => s + m.valor, 0))}\n`
          conteudo += `  Saídas:   ${saidasBanco.length} | Total: ${formatarMoeda(saidasBanco.reduce((s: number, m: any) => s + m.valor, 0))}\n\n`
          movsBanco.forEach((m: any) => {
            const sinal = m.tipo === "entrada" ? "+" : "-"
            conteudo += `  ${format(new Date(m.created_at), "dd/MM HH:mm")} | ${sinal}${formatarMoeda(m.valor)} | ${m.categoria} | ${m.descricao}\n`
          })
          conteudo += `\n`
        }

        // Resumo geral movimentações
        const totalEntradas = movs.filter((m: any) => m.tipo === "entrada").reduce((s: number, m: any) => s + m.valor, 0)
        const totalSaidas = movs.filter((m: any) => m.tipo === "saida").reduce((s: number, m: any) => s + m.valor, 0)
        conteudo += `📊 RESUMO GERAL DE MOVIMENTAÇÕES\n${separador}\n`
        conteudo += `  Total de movimentações: ${movs.length}\n`
        conteudo += `  Total entradas: ${formatarMoeda(totalEntradas)}\n`
        conteudo += `  Total saídas:   ${formatarMoeda(totalSaidas)}\n`
        conteudo += `  Saldo líquido:  ${formatarMoeda(totalEntradas - totalSaidas)}\n\n`
      }

      if (tipo === "completo") {
        // Contas a Pagar
        conteudo += `📋 CONTAS A PAGAR\n${separador}\n`
        if (cp.length === 0) {
          conteudo += `  Nenhuma conta a pagar no período.\n\n`
        } else {
          const totalCP = cp.reduce((s: number, c: any) => s + c.valor, 0)
          const pagas = cp.filter((c: any) => c.status === "pago")
          const pendentes = cp.filter((c: any) => c.status !== "pago")
          conteudo += `  Total de contas: ${cp.length} | Valor total: ${formatarMoeda(totalCP)}\n`
          conteudo += `  Pagas: ${pagas.length} | Pendentes: ${pendentes.length}\n\n`
          cp.forEach((c: any) => {
            const status = c.status === "pago" ? "✓ PAGO" : c.status === "atrasado" ? "⚠ ATRASADO" : "○ PENDENTE"
            conteudo += `  ${format(new Date(c.data_vencimento), "dd/MM/yyyy")} | ${formatarMoeda(c.valor)} | ${c.descricao} | ${status}\n`
            if (c.categoria) conteudo += `    Categoria: ${c.categoria}\n`
            if (c.observacoes) conteudo += `    Obs: ${c.observacoes}\n`
            if (c.data_pagamento) conteudo += `    Baixa em: ${format(new Date(c.data_pagamento), "dd/MM/yyyy 'às' HH:mm")}\n`
          })
          conteudo += `\n`
        }

        // Valores a Receber
        conteudo += `💰 VALORES A RECEBER\n${separador}\n`
        if (vr.length === 0) {
          conteudo += `  Nenhum valor a receber no período.\n\n`
        } else {
          const totalVR = vr.reduce((s: number, v: any) => s + v.valor, 0)
          const recebidos = vr.filter((v: any) => v.status === "recebido")
          const pendentesVR = vr.filter((v: any) => v.status !== "recebido")
          conteudo += `  Total de registros: ${vr.length} | Valor total: ${formatarMoeda(totalVR)}\n`
          conteudo += `  Recebidos: ${recebidos.length} | Pendentes: ${pendentesVR.length}\n\n`
          vr.forEach((v: any) => {
            const status = v.status === "recebido" ? "✓ RECEBIDO" : "○ PENDENTE"
            conteudo += `  ${format(new Date(v.data_vencimento), "dd/MM/yyyy")} | ${formatarMoeda(v.valor)} | ${v.devedor} | ${status}\n`
            if (v.observacoes) conteudo += `    Obs: ${v.observacoes}\n`
          })
          conteudo += `\n`
        }

        // Balanço final
        const totalEntradas = movs.filter((m: any) => m.tipo === "entrada").reduce((s: number, m: any) => s + m.valor, 0)
        const totalSaidas = movs.filter((m: any) => m.tipo === "saida").reduce((s: number, m: any) => s + m.valor, 0)
        const totalCPValor = cp.reduce((s: number, c: any) => s + c.valor, 0)
        const totalVRValor = vr.reduce((s: number, v: any) => s + v.valor, 0)
        const totalVRRecebido = vr.filter((v: any) => v.status === "recebido").reduce((s: number, v: any) => s + v.valor, 0)
        const totalCPPago = cp.filter((c: any) => c.status === "pago").reduce((s: number, c: any) => s + c.valor, 0)

        conteudo += `${linha}\n`
        conteudo += `  BALANÇO DO PERÍODO\n${linha}\n`
        conteudo += `  Entradas (caixa):          ${formatarMoeda(totalEntradas)}\n`
        conteudo += `  Saídas (caixa):            ${formatarMoeda(totalSaidas)}\n`
        conteudo += `  Resultado caixa:           ${formatarMoeda(totalEntradas - totalSaidas)}\n`
        conteudo += `  ${separador}\n`
        conteudo += `  Contas a pagar (total):    ${formatarMoeda(totalCPValor)}\n`
        conteudo += `  Contas pagas:              ${formatarMoeda(totalCPPago)}\n`
        conteudo += `  Contas pendentes:          ${formatarMoeda(totalCPValor - totalCPPago)}\n`
        conteudo += `  ${separador}\n`
        conteudo += `  Valores a receber (total): ${formatarMoeda(totalVRValor)}\n`
        conteudo += `  Já recebidos:              ${formatarMoeda(totalVRRecebido)}\n`
        conteudo += `  Pendentes de recebimento:  ${formatarMoeda(totalVRValor - totalVRRecebido)}\n`
        conteudo += `${linha}\n`
      }

      // Download do arquivo
      const blob = new Blob([conteudo], { type: "text/plain;charset=utf-8" })
      const url = URL.createObjectURL(blob)
      const a = document.createElement("a")
      a.href = url
      a.download = `relatorio-${tipo}-${dataInicio}-a-${dataFim}.txt`
      a.click()
      URL.revokeObjectURL(url)
      toast.success("Relatório gerado com sucesso!")
    } catch (err) {
      toast.error("Erro ao gerar relatório.")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-5">
      <h3 className="text-base font-bold">Tipo de relatório</h3>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {([
          { id: "movimentacoes", label: "Movimentações", desc: "Todas as entradas e saídas separadas por caixa (Dinheiro e Banco)" },
          { id: "completo", label: "Relatório Completo", desc: "Movimentações + Contas a Pagar + Valores a Receber + Balanço do período" },
        ] as const).map((r) => (
          <Card
            key={r.id}
            className={`cursor-pointer transition-all ${tipo === r.id ? "border-[#F26E1D] ring-1 ring-[#F26E1D]/30" : "hover:border-primary/40"}`}
            onClick={() => setTipo(r.id)}
          >
            <CardContent className="p-4">
              <div className="flex items-start gap-3">
                <FileText className={`w-5 h-5 shrink-0 mt-0.5 ${tipo === r.id ? "text-[#F26E1D]" : "text-muted-foreground"}`} />
                <div>
                  <p className={`text-sm font-bold ${tipo === r.id ? "text-[#F26E1D]" : ""}`}>{r.label}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">{r.desc}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Período */}
      <div className="space-y-3">
        <h3 className="text-sm font-bold">Período</h3>
        <div className="flex gap-2">
          {(["semana", "mes", "custom"] as const).map((p) => (
            <button
              key={p}
              onClick={() => ajustarPeriodo(p)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all border-2 ${
                periodo === p
                  ? "border-[#F26E1D] bg-[#F26E1D]/10 text-[#F26E1D]"
                  : "border-transparent bg-muted text-muted-foreground hover:text-foreground"
              }`}
            >
              {p === "semana" ? "Esta semana" : p === "mes" ? "Este mês" : "Personalizado"}
            </button>
          ))}
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1">
            <Label className="text-xs">Data início</Label>
            <Input type="date" value={dataInicio} onChange={(e) => { setDataInicio(e.target.value); setPeriodo("custom") }} className="h-9" />
          </div>
          <div className="space-y-1">
            <Label className="text-xs">Data fim</Label>
            <Input type="date" value={dataFim} onChange={(e) => { setDataFim(e.target.value); setPeriodo("custom") }} className="h-9" />
          </div>
        </div>
      </div>

      {/* Gerar */}
      <Button onClick={gerarRelatorio} disabled={loading} className="gap-2 w-full sm:w-auto">
        {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
        Gerar e baixar relatório
      </Button>
    </div>
  )
}
