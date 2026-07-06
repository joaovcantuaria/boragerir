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
type Formato = "pdf" | "txt"

export function RelatoriosGestaoTab({ empresaId }: { empresaId: string }) {
  const [tipo, setTipo] = useState<TipoRelatorio>("completo")
  const [formato, setFormato] = useState<Formato>("pdf")
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

  async function buscarDados() {
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
    return { caixas: caixas ?? [], movs: movimentacoes ?? [], cp: contasPagar ?? [], vr: valoresReceber ?? [] }
  }

  async function gerarPDF(dados: Awaited<ReturnType<typeof buscarDados>>) {
    const { default: jsPDF } = await import("jspdf")
    const { default: autoTable } = await import("jspdf-autotable")

    const { caixas, movs, cp, vr } = dados
    const doc = new jsPDF({ unit: "mm", format: "a4" })
    const W = 210, M = 14
    let Y = 20

    // Header
    doc.setFontSize(18)
    doc.setFont("helvetica", "bold")
    doc.setTextColor(242, 110, 29)
    doc.text(tipo === "completo" ? "Relatório Completo" : "Relatório de Movimentações", M, Y)
    Y += 7
    doc.setFontSize(10)
    doc.setTextColor(100)
    doc.setFont("helvetica", "normal")
    doc.text(`Período: ${format(new Date(dataInicio), "dd/MM/yyyy")} a ${format(new Date(dataFim), "dd/MM/yyyy")}`, M, Y)
    Y += 4
    doc.text(`Gerado em: ${format(new Date(), "dd/MM/yyyy 'às' HH:mm")}`, M, Y)
    Y += 10

    // Separar movimentações por tipo de conta
    const movsEspecie = movs.filter((m: any) => {
      const cx = caixas.find((c: any) => c.id === m.caixa_id)
      return !cx || (cx as any).tipo_conta !== "banco"
    })
    const movsBanco = movs.filter((m: any) => {
      const cx = caixas.find((c: any) => c.id === m.caixa_id)
      return cx && (cx as any).tipo_conta === "banco"
    })

    function addSection(title: string) {
      if (Y > 260) { doc.addPage(); Y = 20 }
      doc.setFontSize(12)
      doc.setFont("helvetica", "bold")
      doc.setTextColor(30)
      doc.text(title, M, Y)
      Y += 2
      doc.setDrawColor(242, 110, 29)
      doc.setLineWidth(0.5)
      doc.line(M, Y, W - M, Y)
      Y += 6
    }

    function addMovsTable(titulo: string, lista: any[]) {
      addSection(titulo)
      const entradas = lista.filter((m: any) => m.tipo === "entrada")
      const saidas = lista.filter((m: any) => m.tipo === "saida")
      doc.setFontSize(9)
      doc.setFont("helvetica", "normal")
      doc.setTextColor(60)
      doc.text(`Entradas: ${entradas.length} (${formatarMoeda(entradas.reduce((s: number, m: any) => s + m.valor, 0))})  |  Saídas: ${saidas.length} (${formatarMoeda(saidas.reduce((s: number, m: any) => s + m.valor, 0))})`, M, Y)
      Y += 5

      if (lista.length > 0) {
        autoTable(doc, {
          startY: Y,
          margin: { left: M, right: M },
          head: [["Data/Hora", "Tipo", "Categoria", "Descrição", "Valor"]],
          body: lista.map((m: any) => [
            format(new Date(m.created_at), "dd/MM HH:mm"),
            m.tipo === "entrada" ? "Entrada" : "Saída",
            m.categoria,
            m.descricao,
            (m.tipo === "entrada" ? "+" : "-") + formatarMoeda(m.valor),
          ]),
          styles: { fontSize: 8, cellPadding: 2 },
          headStyles: { fillColor: [242, 110, 29], textColor: 255, fontStyle: "bold" },
        })
        Y = (doc as any).lastAutoTable.finalY + 8
      } else {
        doc.text("Nenhuma movimentação no período.", M, Y)
        Y += 8
      }
    }

    // Movimentações
    addMovsTable("💵 Caixa Dinheiro (Espécie)", movsEspecie)
    addMovsTable("🏦 Caixa Banco", movsBanco)

    // Resumo geral
    const totalEntradas = movs.filter((m: any) => m.tipo === "entrada").reduce((s: number, m: any) => s + m.valor, 0)
    const totalSaidas = movs.filter((m: any) => m.tipo === "saida").reduce((s: number, m: any) => s + m.valor, 0)
    addSection("📊 Resumo Geral de Movimentações")
    doc.setFontSize(10)
    doc.setFont("helvetica", "normal")
    doc.text(`Total movimentações: ${movs.length}`, M, Y); Y += 5
    doc.text(`Total entradas: ${formatarMoeda(totalEntradas)}`, M, Y); Y += 5
    doc.text(`Total saídas: ${formatarMoeda(totalSaidas)}`, M, Y); Y += 5
    doc.setFont("helvetica", "bold")
    doc.text(`Saldo líquido: ${formatarMoeda(totalEntradas - totalSaidas)}`, M, Y); Y += 10

    if (tipo === "completo") {
      // Contas a Pagar
      addSection("📋 Contas a Pagar")
      if (cp.length > 0) {
        autoTable(doc, {
          startY: Y,
          margin: { left: M, right: M },
          head: [["Vencimento", "Descrição", "Valor", "Status", "Baixa"]],
          body: cp.map((c: any) => [
            format(new Date(c.data_vencimento), "dd/MM/yyyy"),
            `${c.descricao}${c.observacoes ? " (" + c.observacoes + ")" : ""}`,
            formatarMoeda(c.valor),
            c.status === "pago" ? "PAGO" : c.status === "atrasado" ? "ATRASADO" : "PENDENTE",
            c.data_pagamento ? format(new Date(c.data_pagamento), "dd/MM/yyyy HH:mm") : "—",
          ]),
          styles: { fontSize: 8, cellPadding: 2 },
          headStyles: { fillColor: [239, 68, 68], textColor: 255, fontStyle: "bold" },
        })
        Y = (doc as any).lastAutoTable.finalY + 8
      } else {
        doc.setFontSize(9); doc.text("Nenhuma conta a pagar no período.", M, Y); Y += 8
      }

      // Valores a Receber
      addSection("💰 Valores a Receber")
      if (vr.length > 0) {
        autoTable(doc, {
          startY: Y,
          margin: { left: M, right: M },
          head: [["Vencimento", "Devedor", "Valor", "Status", "Observações"]],
          body: vr.map((v: any) => [
            format(new Date(v.data_vencimento), "dd/MM/yyyy"),
            v.devedor,
            formatarMoeda(v.valor),
            v.status === "recebido" ? "RECEBIDO" : "PENDENTE",
            v.observacoes ?? "—",
          ]),
          styles: { fontSize: 8, cellPadding: 2 },
          headStyles: { fillColor: [16, 185, 129], textColor: 255, fontStyle: "bold" },
        })
        Y = (doc as any).lastAutoTable.finalY + 8
      } else {
        doc.setFontSize(9); doc.text("Nenhum valor a receber no período.", M, Y); Y += 8
      }

      // Balanço
      if (Y > 240) { doc.addPage(); Y = 20 }
      addSection("📈 Balanço do Período")
      const totalCP = cp.reduce((s: number, c: any) => s + c.valor, 0)
      const totalCPPago = cp.filter((c: any) => c.status === "pago").reduce((s: number, c: any) => s + c.valor, 0)
      const totalVR = vr.reduce((s: number, v: any) => s + v.valor, 0)
      const totalVRRecebido = vr.filter((v: any) => v.status === "recebido").reduce((s: number, v: any) => s + v.valor, 0)

      doc.setFontSize(9)
      doc.setFont("helvetica", "normal")
      const balanco = [
        [`Entradas (caixa)`, formatarMoeda(totalEntradas)],
        [`Saídas (caixa)`, formatarMoeda(totalSaidas)],
        [`Resultado caixa`, formatarMoeda(totalEntradas - totalSaidas)],
        [``, ``],
        [`Contas a pagar (total)`, formatarMoeda(totalCP)],
        [`Contas pagas`, formatarMoeda(totalCPPago)],
        [`Contas pendentes`, formatarMoeda(totalCP - totalCPPago)],
        [``, ``],
        [`Valores a receber (total)`, formatarMoeda(totalVR)],
        [`Já recebidos`, formatarMoeda(totalVRRecebido)],
        [`Pendentes`, formatarMoeda(totalVR - totalVRRecebido)],
      ]
      autoTable(doc, {
        startY: Y,
        margin: { left: M, right: M },
        body: balanco,
        styles: { fontSize: 9, cellPadding: 3 },
        columnStyles: { 0: { fontStyle: "bold" }, 1: { halign: "right" } },
        theme: "plain",
      })
    }

    // Footer
    const pageCount = doc.getNumberOfPages()
    for (let i = 1; i <= pageCount; i++) {
      doc.setPage(i)
      doc.setFontSize(8)
      doc.setTextColor(150)
      doc.text("Gerado por Bora Gerir — app.boragerir.com", 105, 290, { align: "center" })
      doc.text(`Página ${i}/${pageCount}`, W - M, 290, { align: "right" })
    }

    doc.save(`relatorio-${tipo}-${dataInicio}-a-${dataFim}.pdf`)
  }

  function gerarTXT(dados: Awaited<ReturnType<typeof buscarDados>>) {
    const { caixas, movs, cp, vr } = dados
    let conteudo = ""
    const linha = "═".repeat(60)
    const separador = "─".repeat(60)

    conteudo += `${linha}\n`
    conteudo += `  RELATÓRIO ${tipo === "completo" ? "COMPLETO" : "DE MOVIMENTAÇÕES"}\n`
    conteudo += `  Período: ${format(new Date(dataInicio), "dd/MM/yyyy")} a ${format(new Date(dataFim), "dd/MM/yyyy")}\n`
    conteudo += `  Gerado em: ${format(new Date(), "dd/MM/yyyy 'às' HH:mm")}\n`
    conteudo += `${linha}\n\n`

    const movsEspecie = movs.filter((m: any) => {
      const cx = caixas.find((c: any) => c.id === m.caixa_id)
      return !cx || (cx as any).tipo_conta !== "banco"
    })
    const movsBanco = movs.filter((m: any) => {
      const cx = caixas.find((c: any) => c.id === m.caixa_id)
      return cx && (cx as any).tipo_conta === "banco"
    })

    function addMovsSection(titulo: string, lista: any[]) {
      conteudo += `${titulo}\n${separador}\n`
      if (lista.length === 0) { conteudo += `  Nenhuma movimentação.\n\n`; return }
      const ent = lista.filter((m: any) => m.tipo === "entrada")
      const sai = lista.filter((m: any) => m.tipo === "saida")
      conteudo += `  Entradas: ${ent.length} | ${formatarMoeda(ent.reduce((s: number, m: any) => s + m.valor, 0))}\n`
      conteudo += `  Saídas:   ${sai.length} | ${formatarMoeda(sai.reduce((s: number, m: any) => s + m.valor, 0))}\n\n`
      lista.forEach((m: any) => {
        conteudo += `  ${format(new Date(m.created_at), "dd/MM HH:mm")} | ${m.tipo === "entrada" ? "+" : "-"}${formatarMoeda(m.valor)} | ${m.categoria} | ${m.descricao}\n`
      })
      conteudo += `\n`
    }

    addMovsSection("💵 CAIXA DINHEIRO (ESPÉCIE)", movsEspecie)
    addMovsSection("🏦 CAIXA BANCO", movsBanco)

    const totalEntradas = movs.filter((m: any) => m.tipo === "entrada").reduce((s: number, m: any) => s + m.valor, 0)
    const totalSaidas = movs.filter((m: any) => m.tipo === "saida").reduce((s: number, m: any) => s + m.valor, 0)
    conteudo += `📊 RESUMO GERAL\n${separador}\n`
    conteudo += `  Total: ${movs.length} mov. | Entradas: ${formatarMoeda(totalEntradas)} | Saídas: ${formatarMoeda(totalSaidas)} | Saldo: ${formatarMoeda(totalEntradas - totalSaidas)}\n\n`

    if (tipo === "completo") {
      conteudo += `📋 CONTAS A PAGAR\n${separador}\n`
      cp.forEach((c: any) => {
        conteudo += `  ${format(new Date(c.data_vencimento), "dd/MM/yyyy")} | ${formatarMoeda(c.valor)} | ${c.descricao} | ${c.status === "pago" ? "✓ PAGO" : "○ PENDENTE"}\n`
        if (c.data_pagamento) conteudo += `    Baixa: ${format(new Date(c.data_pagamento), "dd/MM/yyyy HH:mm")}\n`
        if (c.observacoes) conteudo += `    Obs: ${c.observacoes}\n`
      })
      conteudo += `\n💰 VALORES A RECEBER\n${separador}\n`
      vr.forEach((v: any) => {
        conteudo += `  ${format(new Date(v.data_vencimento), "dd/MM/yyyy")} | ${formatarMoeda(v.valor)} | ${v.devedor} | ${v.status === "recebido" ? "✓ RECEBIDO" : "○ PENDENTE"}\n`
        if (v.observacoes) conteudo += `    Obs: ${v.observacoes}\n`
      })
      conteudo += `\n${linha}\n  BALANÇO\n${linha}\n`
      conteudo += `  Resultado caixa: ${formatarMoeda(totalEntradas - totalSaidas)}\n`
      conteudo += `  Contas a pagar: ${formatarMoeda(cp.reduce((s: number, c: any) => s + c.valor, 0))}\n`
      conteudo += `  Valores a receber: ${formatarMoeda(vr.reduce((s: number, v: any) => s + v.valor, 0))}\n`
    }

    const blob = new Blob([conteudo], { type: "text/plain;charset=utf-8" })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = `relatorio-${tipo}-${dataInicio}-a-${dataFim}.txt`
    a.click()
    URL.revokeObjectURL(url)
  }

  async function gerarRelatorio() {
    setLoading(true)
    try {
      const dados = await buscarDados()
      if (formato === "pdf") {
        await gerarPDF(dados)
      } else {
        gerarTXT(dados)
      }
      toast.success("Relatório gerado!")
    } catch {
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
          { id: "movimentacoes", label: "Movimentações", desc: "Entradas e saídas separadas por caixa (Dinheiro e Banco)" },
          { id: "completo", label: "Relatório Completo", desc: "Movimentações + Contas a Pagar + A Receber + Balanço" },
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

      {/* Formato */}
      <div className="space-y-2">
        <h3 className="text-sm font-bold">Formato</h3>
        <div className="flex gap-2">
          {(["pdf", "txt"] as const).map((f) => (
            <button
              key={f}
              onClick={() => setFormato(f)}
              className={`px-4 py-2 rounded-lg text-xs font-semibold uppercase transition-all border-2 ${
                formato === f
                  ? "border-[#F26E1D] bg-[#F26E1D]/10 text-[#F26E1D]"
                  : "border-transparent bg-muted text-muted-foreground hover:text-foreground"
              }`}
            >
              {f}
            </button>
          ))}
        </div>
      </div>

      {/* Gerar */}
      <Button onClick={gerarRelatorio} disabled={loading} className="gap-2 w-full sm:w-auto">
        {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
        Gerar e baixar relatório ({formato.toUpperCase()})
      </Button>
    </div>
  )
}
