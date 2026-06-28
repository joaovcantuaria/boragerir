import jsPDF from "jspdf"
import autoTable from "jspdf-autotable"
import { format, parseISO } from "date-fns"
import { ptBR } from "date-fns/locale"
import { formatarMoeda, formatarCPF, formatarCNPJ, labelsFormaPagamento } from "@/lib/utils"

// ── Tipagem ──────────────────────────────────────────────────────────────────

interface EmpresaRelatorio {
  nome: string
  email: string
  telefone: string
  documento: string
  tipo_documento: "cpf" | "cnpj"
  endereco_rua: string
  endereco_numero: string
  endereco_bairro: string
  endereco_cidade: string
  endereco_estado: string
  logo_url?: string | null
}

interface Venda {
  id: string
  numero_venda: number
  total: number
  subtotal: number
  desconto: number
  forma_pagamento: string
  status: string
  created_at: string
  clientes?: { nome_completo: string } | null
}

interface Movimentacao {
  id: string
  tipo: string
  categoria: string
  descricao: string
  valor: number
  created_at: string
}

interface Funcionario {
  id: string
  nome: string
}

interface Debito {
  id: string
  valor_aberto: number
  valor_pago: number
  descricao: string | null
  created_at: string
  clientes?: { nome_completo: string } | null
}

export interface RelatorioParams {
  empresa: EmpresaRelatorio
  tipo: string
  label: string
  dataInicio: Date
  dataFim: Date
  vendas: Venda[]
  movimentacoes: Movimentacao[]
  funcionarios: Funcionario[]
  debitos: Debito[]
}

// ── Helpers ──────────────────────────────────────────────────────────────────

async function carregarImagem(url: string): Promise<string | null> {
  try {
    const res = await fetch(url)
    const blob = await res.blob()
    return new Promise((resolve) => {
      const reader = new FileReader()
      reader.onloadend = () => resolve(reader.result as string)
      reader.readAsDataURL(blob)
    })
  } catch { return null }
}

function fmtData(d: Date) { return format(d, "dd/MM/yyyy", { locale: ptBR }) }
function fmtHora(s: string) { return format(new Date(s), "dd/MM/yyyy HH:mm", { locale: ptBR }) }

const COR_PRIMARY: [number, number, number] = [242, 110, 29]   // #F26E1D
const COR_DARK: [number, number, number]    = [26,  26,  26]
const COR_GRAY: [number, number, number]    = [100, 100, 100]
const COR_LIGHT: [number, number, number]   = [245, 245, 245]

// ── Gerador principal ─────────────────────────────────────────────────────────

export async function gerarRelatorioPDF({
  empresa,
  tipo,
  label,
  dataInicio,
  dataFim,
  vendas,
  movimentacoes,
  funcionarios,
  debitos,
}: RelatorioParams): Promise<void> {
  const doc = new jsPDF({ unit: "mm", format: "a4" })
  const pageW = 210
  const margin = 14

  // ── HEADER com gradiente visual ──────────────────────────────────────────
  // Faixa laranja
  doc.setFillColor(...COR_PRIMARY)
  doc.rect(0, 0, pageW, 44, "F")

  // Faixa escura estreita no topo
  doc.setFillColor(20, 20, 20)
  doc.rect(0, 0, pageW, 6, "F")

  // Logo da empresa
  let xInicioTexto = margin
  if (empresa.logo_url) {
    const img = await carregarImagem(empresa.logo_url)
    if (img) {
      doc.addImage(img, "PNG", margin, 10, 24, 24)
      xInicioTexto = margin + 28
    }
  }

  // Nome da empresa
  doc.setFontSize(17)
  doc.setFont("helvetica", "bold")
  doc.setTextColor(255, 255, 255)
  doc.text(empresa.nome, xInicioTexto, 20)

  // Dados da empresa (endereço, contato, doc)
  doc.setFontSize(7.5)
  doc.setFont("helvetica", "normal")
  doc.setTextColor(255, 220, 190)

  const docFormatado = empresa.tipo_documento === "cnpj"
    ? `CNPJ: ${formatarCNPJ(empresa.documento)}`
    : `CPF: ${formatarCPF(empresa.documento)}`

  doc.text(`${empresa.endereco_rua}, ${empresa.endereco_numero} — ${empresa.endereco_bairro}`, xInicioTexto, 27)
  doc.text(`${empresa.endereco_cidade}/${empresa.endereco_estado}`, xInicioTexto, 32)
  doc.text(`${empresa.email}  |  Tel: ${empresa.telefone}  |  ${docFormatado}`, xInicioTexto, 37)

  // Tipo de relatório (canto direito)
  doc.setFontSize(13)
  doc.setFont("helvetica", "bold")
  doc.setTextColor(255, 255, 255)
  doc.text("RELATÓRIO", pageW - margin, 18, { align: "right" })

  doc.setFontSize(9)
  doc.setFont("helvetica", "normal")
  doc.setTextColor(255, 220, 190)
  doc.text(label.toUpperCase(), pageW - margin, 25, { align: "right" })
  doc.text(`${fmtData(dataInicio)} a ${fmtData(dataFim)}`, pageW - margin, 31, { align: "right" })
  doc.text(`Emitido em: ${format(new Date(), "dd/MM/yyyy HH:mm", { locale: ptBR })}`, pageW - margin, 37, { align: "right" })

  let cursorY = 52

  // ── Função auxiliar para seções ────────────────────────────────────────────
  function secao(titulo: string) {
    doc.setFontSize(10)
    doc.setFont("helvetica", "bold")
    doc.setTextColor(...COR_DARK)
    doc.setFillColor(...COR_LIGHT)
    doc.rect(margin, cursorY - 5, pageW - margin * 2, 8, "F")
    doc.setDrawColor(...COR_PRIMARY)
    doc.setLineWidth(0.5)
    doc.rect(margin, cursorY - 5, 2, 8, "F")
    doc.setTextColor(...COR_DARK)
    doc.text(titulo, margin + 4, cursorY)
    cursorY += 8
  }

  function addTableAndUpdateY(config: Parameters<typeof autoTable>[1]) {
    autoTable(doc, { ...config, startY: cursorY })
    cursorY = (doc as jsPDF & { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 8
  }

  function checkNewPage(needed = 30) {
    if (cursorY > 265 - needed) {
      doc.addPage()
      cursorY = 20
    }
  }

  // ── Filtrar dados pelo período ──────────────────────────────────────────────
  const vendasPeriodo = vendas.filter((v) => {
    const d = new Date(v.created_at)
    return d >= dataInicio && d <= dataFim
  })
  const vendasConcluidas = vendasPeriodo.filter((v) => v.status === "concluida")
  const movsPeriodo = movimentacoes.filter((m) => {
    const d = new Date(m.created_at)
    return d >= dataInicio && d <= dataFim
  })
  const totalRecebido = movsPeriodo.filter((m) => m.tipo === "entrada" && m.categoria === "venda").reduce((s, m) => s + m.valor, 0)
  const totalDespesas = movsPeriodo.filter((m) => m.tipo === "saida" && m.categoria === "despesa").reduce((s, m) => s + m.valor, 0)
  const lucro = totalRecebido - totalDespesas
  const ticketMedio = vendasConcluidas.length > 0 ? totalRecebido / vendasConcluidas.length : 0

  // ── RESUMO FINANCEIRO ────────────────────────────────────────────────────────
  const tiposComResumo = ["resumo-diario", "resumo-semanal", "resumo-mensal", "completo"]
  if (tiposComResumo.includes(tipo)) {
    secao("RESUMO FINANCEIRO")

    // Cards de métricas
    const metricas = [
      { label: "Total recebido", valor: formatarMoeda(totalRecebido), cor: [22, 163, 74] as [number,number,number] },
      { label: "Total despesas", valor: formatarMoeda(totalDespesas), cor: [220, 38, 38] as [number,number,number] },
      { label: "Lucro líquido", valor: formatarMoeda(lucro), cor: lucro >= 0 ? [22, 163, 74] as [number,number,number] : [220, 38, 38] as [number,number,number] },
      { label: "Ticket médio", valor: formatarMoeda(ticketMedio), cor: [59, 130, 246] as [number,number,number] },
      { label: "Qtd. vendas", valor: vendasConcluidas.length.toString(), cor: COR_DARK },
    ]

    const cardW = (pageW - margin * 2 - 4 * 3) / 5
    metricas.forEach((m, i) => {
      const x = margin + i * (cardW + 3)
      doc.setFillColor(250, 250, 250)
      doc.setDrawColor(230, 230, 230)
      doc.roundedRect(x, cursorY, cardW, 16, 1.5, 1.5, "FD")
      doc.setFontSize(7)
      doc.setTextColor(...COR_GRAY)
      doc.setFont("helvetica", "normal")
      doc.text(m.label, x + cardW / 2, cursorY + 5, { align: "center" })
      doc.setFontSize(9)
      doc.setFont("helvetica", "bold")
      doc.setTextColor(...m.cor)
      doc.text(m.valor, x + cardW / 2, cursorY + 12, { align: "center" })
    })
    cursorY += 22
  }

  // ── VENDAS DETALHADAS ────────────────────────────────────────────────────────
  const tiposComVendas = ["vendas-detalhado", "completo"]
  if (tiposComVendas.includes(tipo)) {
    checkNewPage(40)
    secao("VENDAS DETALHADAS")
    if (vendasConcluidas.length === 0) {
      doc.setFontSize(9); doc.setTextColor(...COR_GRAY)
      doc.text("Nenhuma venda no período.", margin, cursorY); cursorY += 10
    } else {
      addTableAndUpdateY({
        head: [["#", "Data/Hora", "Cliente", "Pagamento", "Total"]],
        body: vendasConcluidas.map((v) => [
          String(v.numero_venda).padStart(4, "0"),
          fmtHora(v.created_at),
          v.clientes?.nome_completo ?? "Consumidor final",
          labelsFormaPagamento[v.forma_pagamento] ?? v.forma_pagamento,
          formatarMoeda(v.total),
        ]),
        headStyles: { fillColor: COR_PRIMARY, textColor: [255,255,255], fontStyle: "bold", fontSize: 8 },
        bodyStyles: { fontSize: 8, textColor: COR_DARK },
        alternateRowStyles: { fillColor: [253, 248, 245] },
        columnStyles: {
          0: { cellWidth: 12, halign: "center" },
          1: { cellWidth: 36 },
          3: { cellWidth: 32 },
          4: { halign: "right", cellWidth: 28 },
        },
        margin: { left: margin, right: margin },
        theme: "grid",
      })
    }
  }

  // ── POR FORMA DE PAGAMENTO ────────────────────────────────────────────────────
  if (["formas-pagamento", "completo"].includes(tipo)) {
    checkNewPage(40)
    secao("POR FORMA DE PAGAMENTO")
    const porPgto: Record<string, number> = {}
    vendasConcluidas.forEach((v) => {
      const k = labelsFormaPagamento[v.forma_pagamento] ?? v.forma_pagamento
      porPgto[k] = (porPgto[k] ?? 0) + v.total
    })
    if (Object.keys(porPgto).length === 0) {
      doc.setFontSize(9); doc.setTextColor(...COR_GRAY)
      doc.text("Nenhum dado disponível.", margin, cursorY); cursorY += 10
    } else {
      addTableAndUpdateY({
        head: [["Forma de pagamento", "Total", "% do total"]],
        body: Object.entries(porPgto).sort((a, b) => b[1] - a[1]).map(([k, v]) => [
          k,
          formatarMoeda(v),
          totalRecebido > 0 ? `${((v / totalRecebido) * 100).toFixed(1)}%` : "—",
        ]),
        headStyles: { fillColor: COR_PRIMARY, textColor: [255,255,255], fontStyle: "bold", fontSize: 8 },
        bodyStyles: { fontSize: 8, textColor: COR_DARK },
        alternateRowStyles: { fillColor: [253, 248, 245] },
        columnStyles: { 1: { halign: "right" }, 2: { halign: "right" } },
        margin: { left: margin, right: margin },
        theme: "grid",
      })
    }
  }

  // ── POR COLABORADOR ────────────────────────────────────────────────────────
  if (["por-colaborador", "completo"].includes(tipo)) {
    checkNewPage(40)
    secao("DESEMPENHO POR COLABORADOR")
    if (funcionarios.length === 0) {
      doc.setFontSize(9); doc.setTextColor(...COR_GRAY)
      doc.text("Nenhum colaborador cadastrado.", margin, cursorY); cursorY += 10
    } else {
      addTableAndUpdateY({
        head: [["Colaborador", "Qtd. vendas", "Total vendido"]],
        body: funcionarios.map((f) => {
          const vf = vendasConcluidas.filter((v) => {
            const itens = (v as any).itens_venda ?? []
            return itens.some((i: any) => i.funcionario_id === f.id)
          })
          return [f.nome, vf.length.toString(), formatarMoeda(vf.reduce((s, v) => s + v.total, 0))]
        }),
        headStyles: { fillColor: COR_PRIMARY, textColor: [255,255,255], fontStyle: "bold", fontSize: 8 },
        bodyStyles: { fontSize: 8, textColor: COR_DARK },
        alternateRowStyles: { fillColor: [253, 248, 245] },
        columnStyles: { 1: { halign: "center" }, 2: { halign: "right" } },
        margin: { left: margin, right: margin },
        theme: "grid",
      })
    }
  }

  // ── DÉBITOS EM ABERTO ────────────────────────────────────────────────────────
  if (["debitos", "completo"].includes(tipo)) {
    checkNewPage(40)
    secao("DÉBITOS EM ABERTO")
    if (debitos.length === 0) {
      doc.setFontSize(9); doc.setTextColor(...COR_GRAY)
      doc.text("Nenhum débito em aberto.", margin, cursorY); cursorY += 10
    } else {
      addTableAndUpdateY({
        head: [["Cliente", "Descrição", "Valor pago", "Em aberto"]],
        body: debitos.map((d) => [
          d.clientes?.nome_completo ?? "—",
          d.descricao ?? "Venda",
          formatarMoeda(d.valor_pago),
          formatarMoeda(d.valor_aberto),
        ]),
        headStyles: { fillColor: [245, 158, 11], textColor: [255,255,255], fontStyle: "bold", fontSize: 8 },
        bodyStyles: { fontSize: 8, textColor: COR_DARK },
        alternateRowStyles: { fillColor: [255, 251, 235] },
        columnStyles: { 2: { halign: "right" }, 3: { halign: "right", textColor: [245, 158, 11] } },
        margin: { left: margin, right: margin },
        theme: "grid",
      })
      // Total
      const totalAberto = debitos.reduce((s, d) => s + d.valor_aberto, 0)
      doc.setFontSize(9); doc.setFont("helvetica", "bold"); doc.setTextColor(...COR_DARK)
      doc.text(`Total em aberto: ${formatarMoeda(totalAberto)}`, pageW - margin, cursorY, { align: "right" })
      cursorY += 8
    }
  }

  // ── DESPESAS E SAÍDAS ─────────────────────────────────────────────────────────
  if (["despesas", "completo"].includes(tipo)) {
    checkNewPage(40)
    secao("DESPESAS E SAÍDAS DE CAIXA")
    const saidas = movsPeriodo.filter((m) => m.tipo === "saida")
    if (saidas.length === 0) {
      doc.setFontSize(9); doc.setTextColor(...COR_GRAY)
      doc.text("Nenhuma saída no período.", margin, cursorY); cursorY += 10
    } else {
      addTableAndUpdateY({
        head: [["Data/Hora", "Categoria", "Descrição", "Valor"]],
        body: saidas.map((m) => [
          fmtHora(m.created_at),
          m.categoria,
          m.descricao,
          formatarMoeda(m.valor),
        ]),
        headStyles: { fillColor: [220, 38, 38], textColor: [255,255,255], fontStyle: "bold", fontSize: 8 },
        bodyStyles: { fontSize: 8, textColor: COR_DARK },
        alternateRowStyles: { fillColor: [255, 245, 245] },
        columnStyles: { 3: { halign: "right", textColor: [220, 38, 38] } },
        margin: { left: margin, right: margin },
        theme: "grid",
      })
      const totalSaidas = saidas.reduce((s, m) => s + m.valor, 0)
      doc.setFontSize(9); doc.setFont("helvetica", "bold"); doc.setTextColor([220, 38, 38][0], [220, 38, 38][1], [220, 38, 38][2])
      doc.text(`Total saídas: ${formatarMoeda(totalSaidas)}`, pageW - margin, cursorY, { align: "right" })
      cursorY += 8
    }
  }

  // ── RODAPÉ em todas as páginas ────────────────────────────────────────────────
  const totalPages = doc.getNumberOfPages()
  for (let p = 1; p <= totalPages; p++) {
    doc.setPage(p)

    // Linha divisória
    doc.setDrawColor(220, 220, 220)
    doc.setLineWidth(0.3)
    doc.line(margin, 285, pageW - margin, 285)

    // Texto rodapé esquerdo
    doc.setFontSize(7)
    doc.setFont("helvetica", "normal")
    doc.setTextColor(170, 170, 170)
    doc.text("Bora Gerir — app.boragerir.com", margin, 290)

    // Numeração direita
    doc.text(`Página ${p} de ${totalPages}`, pageW - margin, 290, { align: "right" })

    // Centro
    doc.text(`${empresa.nome} · Relatório ${label}`, pageW / 2, 290, { align: "center" })
  }

  const nomeArquivo = `relatorio-${tipo}-${format(dataInicio, "yyyy-MM-dd")}-${format(dataFim, "yyyy-MM-dd")}.pdf`
  doc.save(nomeArquivo)
}
