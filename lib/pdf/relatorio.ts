import jsPDF from "jspdf"
import autoTable from "jspdf-autotable"
import { format } from "date-fns"
import { ptBR } from "date-fns/locale"
import { formatarMoeda, formatarCPF, formatarCNPJ, labelsFormaPagamento } from "@/lib/utils"

// ─── Tipos ────────────────────────────────────────────────────────────────────

export interface EmpresaRelatorio {
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

export type TemaRelatorio = "laranja" | "azul" | "verde" | "roxo" | "grafite"

export interface RelatorioParams {
  empresa: EmpresaRelatorio
  tipo: string
  label: string
  dataInicio: Date
  dataFim: Date
  tema?: TemaRelatorio
  vendas: Venda[]
  movimentacoes: Movimentacao[]
  funcionarios: Funcionario[]
  debitos: Debito[]
}

interface Venda {
  id: string; numero_venda: number; total: number; subtotal: number; desconto: number
  forma_pagamento: string; status: string; created_at: string
  clientes?: { nome_completo: string } | null
}
interface Movimentacao {
  id: string; tipo: string; categoria: string; descricao: string; valor: number; created_at: string
}
interface Funcionario { id: string; nome: string }
interface Debito {
  id: string; valor_aberto: number; valor_pago: number; descricao: string | null; created_at: string
  clientes?: { nome_completo: string } | null
}

// ─── Paleta de temas ──────────────────────────────────────────────────────────

type RGB = [number, number, number]

const TEMAS: Record<TemaRelatorio, { primary: RGB; dark: RGB; light: RGB; accent: RGB }> = {
  laranja: { primary: [242, 110, 29],  dark: [26, 26, 26],    light: [255, 248, 242], accent: [255, 220, 190] },
  azul:    { primary: [37, 99, 235],   dark: [15, 23, 42],    light: [239, 246, 255], accent: [191, 219, 254] },
  verde:   { primary: [22, 163, 74],   dark: [10, 30, 15],    light: [240, 253, 244], accent: [187, 247, 208] },
  roxo:    { primary: [124, 58, 237],  dark: [30, 20, 50],    light: [245, 243, 255], accent: [221, 214, 254] },
  grafite: { primary: [55, 65, 81],    dark: [17, 24, 39],    light: [249, 250, 251], accent: [209, 213, 219] },
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

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

// Desenha um círculo preenchido
function drawCircle(doc: jsPDF, cx: number, cy: number, r: number, fillColor: RGB) {
  doc.setFillColor(...fillColor)
  doc.circle(cx, cy, r, "F")
}

// ─── Gerador principal ────────────────────────────────────────────────────────

export async function gerarRelatorioPDF({
  empresa, tipo, label, dataInicio, dataFim,
  tema = "laranja", vendas, movimentacoes, funcionarios, debitos,
}: RelatorioParams): Promise<void> {

  const cor = TEMAS[tema]
  const doc = new jsPDF({ unit: "mm", format: "a4" })
  const W = 210
  const M = 14  // margem

  // ══════════════════════════════════════════════════════
  // CABEÇALHO PREMIUM
  // ══════════════════════════════════════════════════════

  // Bloco de fundo principal — cor do tema
  doc.setFillColor(...cor.primary)
  doc.rect(0, 0, W, 52, "F")

  // Detalhe decorativo: retângulo escuro no topo (barra fina)
  doc.setFillColor(...cor.dark)
  doc.rect(0, 0, W, 5, "F")

  // Detalhe decorativo: círculo grande transparente no canto direito (watermark elegante)
  doc.setFillColor(255, 255, 255)
  doc.setGState(new (doc as any).GState({ opacity: 0.06 }))
  doc.circle(W + 8, 26, 48, "F")
  doc.circle(W - 10, -10, 32, "F")
  doc.setGState(new (doc as any).GState({ opacity: 1 }))

  // ── LOGO dentro de círculo branco ──────────────────────
  const logoX = M + 15   // centro X do círculo
  const logoY = 28        // centro Y do círculo
  const logoR = 14        // raio do círculo branco

  // Sombra suave do círculo
  doc.setFillColor(0, 0, 0)
  doc.setGState(new (doc as any).GState({ opacity: 0.15 }))
  doc.circle(logoX + 0.5, logoY + 0.8, logoR + 0.5, "F")
  doc.setGState(new (doc as any).GState({ opacity: 1 }))

  // Círculo branco
  drawCircle(doc, logoX, logoY, logoR, [255, 255, 255])

  // Imagem da logo dentro do círculo (se houver)
  let logoCarregada = false
  if (empresa.logo_url) {
    const imgData = await carregarImagem(empresa.logo_url)
    if (imgData) {
      // Clip circular usando o quadrado interno
      const imgSize = logoR * 1.5
      const imgXY = logoR * 0.75
      doc.addImage(imgData, "PNG", logoX - imgXY, logoY - imgXY, imgSize, imgSize)
      logoCarregada = true
    }
  }

  // Fallback: inicial do nome da empresa no círculo
  if (!logoCarregada) {
    doc.setFontSize(16)
    doc.setFont("helvetica", "bold")
    doc.setTextColor(...cor.primary)
    const inicial = empresa.nome.charAt(0).toUpperCase()
    doc.text(inicial, logoX, logoY + 1.5, { align: "center", baseline: "middle" } as any)
  }

  // ── Dados da empresa (ao lado da logo) ────────────────
  const xTexto = M + 33
  doc.setFontSize(15)
  doc.setFont("helvetica", "bold")
  doc.setTextColor(255, 255, 255)
  doc.text(empresa.nome, xTexto, 17)

  doc.setFontSize(7.5)
  doc.setFont("helvetica", "normal")
  doc.setTextColor(...cor.accent)
  const docFormatado = empresa.tipo_documento === "cnpj"
    ? `CNPJ: ${formatarCNPJ(empresa.documento)}`
    : `CPF: ${formatarCPF(empresa.documento)}`
  doc.text(`${empresa.endereco_rua}, ${empresa.endereco_numero} — ${empresa.endereco_bairro}, ${empresa.endereco_cidade}/${empresa.endereco_estado}`, xTexto, 24)
  doc.text(`${empresa.email}  ·  Tel: ${empresa.telefone}  ·  ${docFormatado}`, xTexto, 30)

  // ── Bloco do tipo de relatório (canto direito) ─────────
  // Pílula branca com transparência
  const pX = W - M - 48
  doc.setFillColor(255, 255, 255)
  doc.setGState(new (doc as any).GState({ opacity: 0.15 }))
  doc.roundedRect(pX, 10, 48, 32, 3, 3, "F")
  doc.setGState(new (doc as any).GState({ opacity: 1 }))

  doc.setFontSize(7)
  doc.setFont("helvetica", "bold")
  doc.setTextColor(255, 255, 255)
  doc.setGState(new (doc as any).GState({ opacity: 0.7 }))
  doc.text("RELATÓRIO", W - M - 2, 17, { align: "right" })
  doc.setGState(new (doc as any).GState({ opacity: 1 }))

  doc.setFontSize(9.5)
  doc.setFont("helvetica", "bold")
  doc.setTextColor(255, 255, 255)
  doc.text(label.toUpperCase(), W - M - 2, 24, { align: "right" })

  doc.setFontSize(7)
  doc.setFont("helvetica", "normal")
  doc.setTextColor(...cor.accent)
  doc.text(`${fmtData(dataInicio)} a ${fmtData(dataFim)}`, W - M - 2, 30, { align: "right" })
  doc.text(`Emitido: ${format(new Date(), "dd/MM/yy HH:mm", { locale: ptBR })}`, W - M - 2, 36, { align: "right" })

  // Linha divisória abaixo do header
  doc.setDrawColor(...cor.primary)
  doc.setLineWidth(0.8)
  doc.line(0, 52, W, 52)

  let Y = 62

  // ══════════════════════════════════════════════════════
  // FUNÇÕES AUXILIARES
  // ══════════════════════════════════════════════════════

  function secao(titulo: string, icone?: string) {
    if (Y > 262) { doc.addPage(); Y = 20 }
    // Fundo da seção
    doc.setFillColor(...cor.light)
    doc.roundedRect(M, Y - 5.5, W - M * 2, 9, 1.5, 1.5, "F")
    // Barra colorida esquerda
    doc.setFillColor(...cor.primary)
    doc.roundedRect(M, Y - 5.5, 3, 9, 1, 1, "F")
    // Texto
    doc.setFontSize(9)
    doc.setFont("helvetica", "bold")
    doc.setTextColor(...cor.dark)
    doc.text((icone ? `${icone}  ` : "") + titulo, M + 6, Y)
    Y += 9
  }

  function addTable(config: Parameters<typeof autoTable>[1]) {
    autoTable(doc, { ...config, startY: Y })
    Y = (doc as jsPDF & { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 6
  }

  function checkPage(needed = 35) {
    if (Y > 277 - needed) { doc.addPage(); Y = 20 }
  }

  // ══════════════════════════════════════════════════════
  // PROCESSAR DADOS
  // ══════════════════════════════════════════════════════

  const vendasPeriodo = vendas.filter((v) => new Date(v.created_at) >= dataInicio && new Date(v.created_at) <= dataFim)
  const vendasOk = vendasPeriodo.filter((v) => v.status === "concluida")
  const movsP = movimentacoes.filter((m) => new Date(m.created_at) >= dataInicio && new Date(m.created_at) <= dataFim)
  const recebido = movsP.filter((m) => m.tipo === "entrada" && m.categoria === "venda").reduce((s, m) => s + m.valor, 0)
  const despesas = movsP.filter((m) => m.tipo === "saida" && m.categoria === "despesa").reduce((s, m) => s + m.valor, 0)
  const lucro = recebido - despesas
  const ticket = vendasOk.length > 0 ? recebido / vendasOk.length : 0

  const headStyle = { fillColor: cor.primary, textColor: [255, 255, 255] as RGB, fontStyle: "bold" as const, fontSize: 8 }
  const rowAlt = { fillColor: cor.light }

  // ══════════════════════════════════════════════════════
  // SEÇÃO 1 — RESUMO
  // ══════════════════════════════════════════════════════

  if (["resumo-diario","resumo-semanal","resumo-mensal","completo"].includes(tipo)) {
    secao("RESUMO FINANCEIRO", "💰")

    const metricas = [
      { label: "Total Recebido", valor: formatarMoeda(recebido), cor: [22,163,74] as RGB },
      { label: "Despesas", valor: formatarMoeda(despesas), cor: [220,38,38] as RGB },
      { label: "Lucro Líquido", valor: formatarMoeda(lucro), cor: lucro >= 0 ? [22,163,74] as RGB : [220,38,38] as RGB },
      { label: "Ticket Médio", valor: formatarMoeda(ticket), cor: [59,130,246] as RGB },
      { label: "Qtd. Vendas", valor: String(vendasOk.length), cor: cor.dark },
    ]

    const cW = (W - M * 2 - 8) / 5
    metricas.forEach((m, i) => {
      const x = M + i * (cW + 2)
      // Card com borda sutil
      doc.setFillColor(255, 255, 255)
      doc.setDrawColor(...cor.primary)
      doc.setLineWidth(0.3)
      doc.roundedRect(x, Y, cW, 20, 2, 2, "FD")
      // Barra de cor no topo do card
      doc.setFillColor(...m.cor)
      doc.roundedRect(x, Y, cW, 3, 2, 2, "F")
      doc.rect(x, Y + 1.5, cW, 1.5, "F")
      // Label
      doc.setFontSize(6)
      doc.setFont("helvetica", "normal")
      doc.setTextColor(130, 130, 130)
      doc.text(m.label, x + cW / 2, Y + 8, { align: "center" })
      // Valor
      doc.setFontSize(8.5)
      doc.setFont("helvetica", "bold")
      doc.setTextColor(...m.cor)
      doc.text(m.valor, x + cW / 2, Y + 15, { align: "center" })
    })
    Y += 26
  }

  // ══════════════════════════════════════════════════════
  // SEÇÃO 2 — VENDAS
  // ══════════════════════════════════════════════════════

  if (["vendas-detalhado","completo"].includes(tipo)) {
    checkPage(40)
    secao("VENDAS DETALHADAS", "🛍️")
    if (vendasOk.length === 0) {
      doc.setFontSize(8); doc.setTextColor(150, 150, 150)
      doc.text("Nenhuma venda no período.", M, Y); Y += 10
    } else {
      addTable({
        head: [["Nº", "Data/Hora", "Cliente", "Pagamento", "Total"]],
        body: vendasOk.map((v) => [
          String(v.numero_venda).padStart(4, "0"),
          fmtHora(v.created_at),
          v.clientes?.nome_completo ?? "Consumidor final",
          labelsFormaPagamento[v.forma_pagamento] ?? v.forma_pagamento,
          formatarMoeda(v.total),
        ]),
        headStyles: headStyle,
        bodyStyles: { fontSize: 7.5, textColor: cor.dark },
        alternateRowStyles: rowAlt,
        columnStyles: { 0: { cellWidth: 12, halign: "center" }, 1: { cellWidth: 35 }, 3: { cellWidth: 30 }, 4: { halign: "right", cellWidth: 26 } },
        margin: { left: M, right: M }, theme: "striped",
      })
    }
  }

  // ══════════════════════════════════════════════════════
  // SEÇÃO 3 — FORMAS DE PAGAMENTO
  // ══════════════════════════════════════════════════════

  if (["formas-pagamento","completo"].includes(tipo)) {
    checkPage(40)
    secao("POR FORMA DE PAGAMENTO", "💳")
    const porPgto: Record<string, number> = {}
    vendasOk.forEach((v) => {
      const k = labelsFormaPagamento[v.forma_pagamento] ?? v.forma_pagamento
      porPgto[k] = (porPgto[k] ?? 0) + v.total
    })
    if (!Object.keys(porPgto).length) {
      doc.setFontSize(8); doc.setTextColor(150,150,150)
      doc.text("Nenhum dado.", M, Y); Y += 10
    } else {
      addTable({
        head: [["Forma de Pagamento", "Total (R$)", "Participação"]],
        body: Object.entries(porPgto).sort((a,b)=>b[1]-a[1]).map(([k,v]) => [
          k, formatarMoeda(v),
          recebido > 0 ? `${((v/recebido)*100).toFixed(1)}%` : "—",
        ]),
        headStyles: headStyle,
        bodyStyles: { fontSize: 8, textColor: cor.dark },
        alternateRowStyles: rowAlt,
        columnStyles: { 1: { halign: "right" }, 2: { halign: "right" } },
        margin: { left: M, right: M }, theme: "striped",
      })
    }
  }

  // ══════════════════════════════════════════════════════
  // SEÇÃO 4 — COLABORADORES
  // ══════════════════════════════════════════════════════

  if (["por-colaborador","completo"].includes(tipo)) {
    checkPage(40)
    secao("DESEMPENHO POR COLABORADOR", "👤")
    if (!funcionarios.length) {
      doc.setFontSize(8); doc.setTextColor(150,150,150)
      doc.text("Nenhum colaborador.", M, Y); Y += 10
    } else {
      addTable({
        head: [["Colaborador", "Qtd. Vendas", "Total Vendido"]],
        body: funcionarios.map((f) => {
          const vf = vendasOk.filter((v) => (v as any).itens_venda?.some((i: any) => i.funcionario_id === f.id))
          return [f.nome, String(vf.length), formatarMoeda(vf.reduce((s,v)=>s+v.total,0))]
        }),
        headStyles: headStyle,
        bodyStyles: { fontSize: 8, textColor: cor.dark },
        alternateRowStyles: rowAlt,
        columnStyles: { 1: { halign: "center" }, 2: { halign: "right" } },
        margin: { left: M, right: M }, theme: "striped",
      })
    }
  }

  // ══════════════════════════════════════════════════════
  // SEÇÃO 5 — DÉBITOS
  // ══════════════════════════════════════════════════════

  if (["debitos","completo"].includes(tipo)) {
    checkPage(40)
    secao("DÉBITOS EM ABERTO", "⏳")
    if (!debitos.length) {
      doc.setFontSize(8); doc.setTextColor(150,150,150)
      doc.text("Nenhum débito em aberto.", M, Y); Y += 10
    } else {
      addTable({
        head: [["Cliente", "Descrição", "Valor Pago", "Em Aberto"]],
        body: debitos.map((d) => [
          d.clientes?.nome_completo ?? "—",
          d.descricao ?? "Venda",
          formatarMoeda(d.valor_pago),
          formatarMoeda(d.valor_aberto),
        ]),
        headStyles: { fillColor: [245,158,11], textColor: [255,255,255], fontStyle: "bold", fontSize: 8 },
        bodyStyles: { fontSize: 7.5, textColor: cor.dark },
        alternateRowStyles: { fillColor: [255,251,235] },
        columnStyles: { 2: { halign: "right" }, 3: { halign: "right", textColor: [245,158,11] } },
        margin: { left: M, right: M }, theme: "striped",
      })
      const totalAberto = debitos.reduce((s,d)=>s+d.valor_aberto, 0)
      doc.setFontSize(8); doc.setFont("helvetica","bold"); doc.setTextColor(245,158,11)
      doc.text(`Total em aberto: ${formatarMoeda(totalAberto)}`, W - M, Y, { align: "right" })
      Y += 8
    }
  }

  // ══════════════════════════════════════════════════════
  // SEÇÃO 6 — DESPESAS
  // ══════════════════════════════════════════════════════

  if (["despesas","completo"].includes(tipo)) {
    checkPage(40)
    secao("DESPESAS E SAÍDAS DE CAIXA", "📉")
    const saidas = movsP.filter((m) => m.tipo === "saida")
    if (!saidas.length) {
      doc.setFontSize(8); doc.setTextColor(150,150,150)
      doc.text("Nenhuma saída.", M, Y); Y += 10
    } else {
      addTable({
        head: [["Data/Hora", "Categoria", "Descrição", "Valor"]],
        body: saidas.map((m) => [fmtHora(m.created_at), m.categoria, m.descricao, formatarMoeda(m.valor)]),
        headStyles: { fillColor: [220,38,38], textColor: [255,255,255], fontStyle: "bold", fontSize: 8 },
        bodyStyles: { fontSize: 7.5, textColor: cor.dark },
        alternateRowStyles: { fillColor: [255,245,245] },
        columnStyles: { 3: { halign: "right", textColor: [220,38,38] } },
        margin: { left: M, right: M }, theme: "striped",
      })
      const totalS = saidas.reduce((s,m)=>s+m.valor,0)
      doc.setFontSize(8); doc.setFont("helvetica","bold"); doc.setTextColor(220,38,38)
      doc.text(`Total saídas: ${formatarMoeda(totalS)}`, W - M, Y, { align: "right" })
      Y += 8
    }
  }

  // ══════════════════════════════════════════════════════
  // RODAPÉ EM TODAS AS PÁGINAS
  // ══════════════════════════════════════════════════════

  const totalPages = doc.getNumberOfPages()
  for (let p = 1; p <= totalPages; p++) {
    doc.setPage(p)

    // Faixa de rodapé
    doc.setFillColor(...cor.light)
    doc.rect(0, 284, W, 13, "F")
    doc.setDrawColor(...cor.primary)
    doc.setLineWidth(0.4)
    doc.line(0, 284, W, 284)

    doc.setFontSize(6.5)
    doc.setFont("helvetica", "normal")
    doc.setTextColor(140, 140, 140)
    doc.text("Bora Gerir — app.boragerir.com", M, 290)
    doc.text(`${empresa.nome}  ·  Relatório: ${label}`, W / 2, 290, { align: "center" })
    doc.text(`Pág. ${p} / ${totalPages}`, W - M, 290, { align: "right" })
  }

  doc.save(`relatorio-${tipo}-${format(dataInicio,"yyyy-MM-dd")}-${format(dataFim,"yyyy-MM-dd")}.pdf`)
}
