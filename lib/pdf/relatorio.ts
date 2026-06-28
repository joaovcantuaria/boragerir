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

type RGB = [number, number, number]

// ─── Paleta de temas ──────────────────────────────────────────────────────────

const TEMAS: Record<TemaRelatorio, { primary: RGB; dark: RGB; mid: RGB; light: RGB; text: RGB }> = {
  laranja: { primary: [242,110,29],  dark: [20,20,20],   mid: [180,70,10],   light: [255,247,240], text: [255,255,255] },
  azul:    { primary: [37,99,235],   dark: [15,23,42],   mid: [29,78,216],   light: [239,246,255], text: [255,255,255] },
  verde:   { primary: [22,163,74],   dark: [10,30,15],   mid: [15,130,55],   light: [240,253,244], text: [255,255,255] },
  roxo:    { primary: [124,58,237],  dark: [30,20,50],   mid: [99,40,200],   light: [245,243,255], text: [255,255,255] },
  grafite: { primary: [55,65,81],    dark: [17,24,39],   mid: [40,50,65],    light: [249,250,251], text: [255,255,255] },
}

// ─── Utilitários ──────────────────────────────────────────────────────────────

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

// ─── GERADOR PRINCIPAL ────────────────────────────────────────────────────────

export async function gerarRelatorioPDF({
  empresa, tipo, label, dataInicio, dataFim,
  tema = "laranja", vendas, movimentacoes, funcionarios, debitos,
}: RelatorioParams): Promise<void> {

  const cor = TEMAS[tema]
  const doc = new jsPDF({ unit: "mm", format: "a4" })
  const W = 210
  const M = 14

  // ══════════════════════════════════════════════════════
  //  CABEÇALHO PREMIUM — novo design
  //
  //  Layout:
  //  ┌─────────────────────────────────────────────────┐
  //  │  [LOGO 18x18]  NOME DA EMPRESA         RELAT.  │  ← fundo escuro 32mm
  //  │                Endereço · doc           LABEL  │
  //  │                email · tel             período │
  //  └─────────────────────────────────────────────────┘
  //  Barra colorida fina (4mm) embaixo do header
  // ══════════════════════════════════════════════════════

  const HEADER_H = 30   // altura total do bloco escuro
  const BAR_H    = 4    // espessura da barra colorida

  // 1. Fundo escuro do header
  doc.setFillColor(...cor.dark)
  doc.rect(0, 0, W, HEADER_H, "F")

  // 2. Barra colorida no rodapé do header
  doc.setFillColor(...cor.primary)
  doc.rect(0, HEADER_H, W, BAR_H, "F")

  // 3. Detalhe: barra colorida MUITO fina no topo (2px visual)
  doc.setFillColor(...cor.primary)
  doc.rect(0, 0, W, 1, "F")

  // 4. Logo — quadrado arredondado com borda colorida, fundo levemente clareado
  const LOGO_X = M
  const LOGO_Y = 6
  const LOGO_S = 18  // tamanho do quadrado

  // Fundo do quadrado da logo
  doc.setFillColor(255, 255, 255)
  doc.setDrawColor(...cor.primary)
  doc.setLineWidth(0.7)
  doc.roundedRect(LOGO_X, LOGO_Y, LOGO_S, LOGO_S, 2.5, 2.5, "FD")

  // Imagem da logo dentro do quadrado
  let logoOk = false
  if (empresa.logo_url) {
    const imgData = await carregarImagem(empresa.logo_url)
    if (imgData) {
      const pad = 1.5
      doc.addImage(imgData, "PNG", LOGO_X + pad, LOGO_Y + pad, LOGO_S - pad * 2, LOGO_S - pad * 2)
      logoOk = true
    }
  }
  if (!logoOk) {
    // Fallback: inicial com cor do tema
    doc.setFontSize(11)
    doc.setFont("helvetica", "bold")
    doc.setTextColor(...cor.primary)
    doc.text(
      empresa.nome.charAt(0).toUpperCase(),
      LOGO_X + LOGO_S / 2,
      LOGO_Y + LOGO_S / 2 + 1,
      { align: "center", baseline: "middle" } as any
    )
  }

  // 5. Nome da empresa — grande, branco
  const TX = LOGO_X + LOGO_S + 5  // x do texto
  doc.setFontSize(13)
  doc.setFont("helvetica", "bold")
  doc.setTextColor(255, 255, 255)
  doc.text(empresa.nome, TX, 13)

  // 6. Dados da empresa — menores, cinza claro
  doc.setFontSize(7)
  doc.setFont("helvetica", "normal")
  doc.setTextColor(180, 185, 195)
  const docFormatado = empresa.tipo_documento === "cnpj"
    ? `CNPJ ${formatarCNPJ(empresa.documento)}`
    : `CPF ${formatarCPF(empresa.documento)}`
  doc.text(
    `${empresa.endereco_rua}, ${empresa.endereco_numero} — ${empresa.endereco_bairro}, ${empresa.endereco_cidade}/${empresa.endereco_estado}  ·  ${docFormatado}`,
    TX, 19.5
  )
  doc.text(`${empresa.email}  ·  Tel: ${empresa.telefone}`, TX, 25)

  // 7. Bloco RELATÓRIO — alinhado à direita
  //    "RELATÓRIO" em cor do tema + label + período

  // Pílula/tag de cor no canto direito
  const tagW = 50
  const tagX = W - M - tagW
  const tagY = 7

  // Fundo da tag levemente claro
  doc.setFillColor(...cor.primary)
  doc.setGState && doc.setGState(new (doc as any).GState({ opacity: 0.18 }))
  doc.roundedRect(tagX, tagY, tagW, HEADER_H - tagY - 2, 2, 2, "F")
  doc.setGState && doc.setGState(new (doc as any).GState({ opacity: 1 }))

  // Linha vertical colorida na borda esquerda da tag
  doc.setFillColor(...cor.primary)
  doc.roundedRect(tagX, tagY, 1.5, HEADER_H - tagY - 2, 0.5, 0.5, "F")

  // Texto "RELATÓRIO"
  doc.setFontSize(6.5)
  doc.setFont("helvetica", "bold")
  doc.setTextColor(...cor.primary)
  doc.text("RELATÓRIO", W - M, tagY + 5, { align: "right" })

  // Label do tipo
  doc.setFontSize(8.5)
  doc.setFont("helvetica", "bold")
  doc.setTextColor(255, 255, 255)
  // Quebrar se muito longo
  const labelLines = doc.splitTextToSize(label.toUpperCase(), tagW - 4)
  doc.text(labelLines, W - M, tagY + 11.5, { align: "right" })

  // Período
  doc.setFontSize(6.5)
  doc.setFont("helvetica", "normal")
  doc.setTextColor(180, 185, 195)
  doc.text(`${fmtData(dataInicio)} — ${fmtData(dataFim)}`, W - M, HEADER_H - 7, { align: "right" })
  doc.text(`Emitido ${format(new Date(), "dd/MM/yyyy HH:mm", { locale: ptBR })}`, W - M, HEADER_H - 2.5, { align: "right" })

  // Cursor inicial — logo abaixo da barra colorida
  let Y = HEADER_H + BAR_H + 8

  // ══════════════════════════════════════════════════════
  //  FUNÇÕES INTERNAS
  // ══════════════════════════════════════════════════════

  function secao(titulo: string, icone?: string) {
    if (Y > 262) { doc.addPage(); Y = 16 }
    // Linha divisória levíssima
    doc.setDrawColor(225, 225, 225)
    doc.setLineWidth(0.2)
    doc.line(M, Y - 2, W - M, Y - 2)
    // Barra colorida
    doc.setFillColor(...cor.primary)
    doc.rect(M, Y - 1, 2.5, 7, "F")
    // Texto
    doc.setFontSize(8.5)
    doc.setFont("helvetica", "bold")
    doc.setTextColor(30, 30, 30)
    doc.text(`${icone ? icone + "  " : ""}${titulo}`, M + 5, Y + 4.5)
    Y += 10
  }

  function addTable(config: Parameters<typeof autoTable>[1]) {
    autoTable(doc, { ...config, startY: Y })
    Y = (doc as jsPDF & { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 7
  }

  function checkPage(needed = 35) {
    if (Y > 277 - needed) { doc.addPage(); Y = 16 }
  }

  // ══════════════════════════════════════════════════════
  //  PROCESSAR DADOS
  // ══════════════════════════════════════════════════════

  const vendasP  = vendas.filter((v) => new Date(v.created_at) >= dataInicio && new Date(v.created_at) <= dataFim)
  const vendasOk = vendasP.filter((v) => v.status === "concluida")
  const movsP    = movimentacoes.filter((m) => new Date(m.created_at) >= dataInicio && new Date(m.created_at) <= dataFim)
  const recebido = movsP.filter((m) => m.tipo === "entrada" && m.categoria === "venda").reduce((s,m) => s+m.valor, 0)
  const desp     = movsP.filter((m) => m.tipo === "saida" && m.categoria === "despesa").reduce((s,m) => s+m.valor, 0)
  const lucro    = recebido - desp
  const ticket   = vendasOk.length > 0 ? recebido / vendasOk.length : 0

  const headStyle = { fillColor: cor.primary, textColor: [255,255,255] as RGB, fontStyle: "bold" as const, fontSize: 8 }
  const altRow    = { fillColor: cor.light }
  const bodyStyle = { fontSize: 7.5, textColor: [30,30,30] as RGB }

  // ══════════════════════════════════════════════════════
  //  SEÇÃO RESUMO
  // ══════════════════════════════════════════════════════

  if (["resumo-diario","resumo-semanal","resumo-mensal","completo"].includes(tipo)) {
    secao("RESUMO FINANCEIRO", "💰")

    const metricas = [
      { label: "Total Recebido", valor: formatarMoeda(recebido), cor: [22,163,74]  as RGB },
      { label: "Despesas",       valor: formatarMoeda(desp),     cor: [220,38,38]  as RGB },
      { label: "Lucro Líquido",  valor: formatarMoeda(lucro),    cor: lucro >= 0 ? [22,163,74] as RGB : [220,38,38] as RGB },
      { label: "Ticket Médio",   valor: formatarMoeda(ticket),   cor: [59,130,246] as RGB },
      { label: "Qtd. Vendas",    valor: String(vendasOk.length), cor: [30,30,30]   as RGB },
    ]

    const cW  = (W - M * 2 - 4 * 4) / 5
    const cH  = 18
    const cY  = Y

    metricas.forEach((m, i) => {
      const x = M + i * (cW + 4)
      // Sombra simulada
      doc.setFillColor(220, 220, 220)
      doc.roundedRect(x + 0.5, cY + 0.8, cW, cH, 2, 2, "F")
      // Card branco
      doc.setFillColor(255, 255, 255)
      doc.setDrawColor(235, 235, 235)
      doc.setLineWidth(0.3)
      doc.roundedRect(x, cY, cW, cH, 2, 2, "FD")
      // Indicador de cor no topo
      doc.setFillColor(...m.cor)
      doc.roundedRect(x + 3, cY + 2, 4, 2, 0.5, 0.5, "F")
      // Label
      doc.setFontSize(5.5)
      doc.setFont("helvetica", "normal")
      doc.setTextColor(140, 140, 140)
      doc.text(m.label, x + cW / 2, cY + 7, { align: "center" })
      // Valor
      doc.setFontSize(8)
      doc.setFont("helvetica", "bold")
      doc.setTextColor(...m.cor)
      doc.text(m.valor, x + cW / 2, cY + 14, { align: "center" })
    })
    Y = cY + cH + 8
  }

  // ══════════════════════════════════════════════════════
  //  VENDAS DETALHADAS
  // ══════════════════════════════════════════════════════

  if (["vendas-detalhado","completo"].includes(tipo)) {
    checkPage(40); secao("VENDAS DETALHADAS", "🛍️")
    if (!vendasOk.length) {
      doc.setFontSize(8); doc.setTextColor(150,150,150)
      doc.text("Nenhuma venda no período.", M, Y); Y += 10
    } else {
      addTable({
        head: [["Nº","Data/Hora","Cliente","Pagamento","Total"]],
        body: vendasOk.map((v) => [
          String(v.numero_venda).padStart(4,"0"),
          fmtHora(v.created_at),
          v.clientes?.nome_completo ?? "Consumidor final",
          labelsFormaPagamento[v.forma_pagamento] ?? v.forma_pagamento,
          formatarMoeda(v.total),
        ]),
        headStyles: headStyle, bodyStyles: bodyStyle,
        alternateRowStyles: altRow,
        columnStyles: {
          0: { cellWidth: 12, halign: "center" },
          1: { cellWidth: 36 },
          3: { cellWidth: 30 },
          4: { halign: "right", cellWidth: 28, fontStyle: "bold" },
        },
        margin: { left: M, right: M }, theme: "striped",
      })
    }
  }

  // ══════════════════════════════════════════════════════
  //  FORMAS DE PAGAMENTO
  // ══════════════════════════════════════════════════════

  if (["formas-pagamento","completo"].includes(tipo)) {
    checkPage(40); secao("POR FORMA DE PAGAMENTO", "💳")
    const pgto: Record<string,number> = {}
    vendasOk.forEach((v) => {
      const k = labelsFormaPagamento[v.forma_pagamento] ?? v.forma_pagamento
      pgto[k] = (pgto[k] ?? 0) + v.total
    })
    if (!Object.keys(pgto).length) {
      doc.setFontSize(8); doc.setTextColor(150,150,150)
      doc.text("Nenhum dado.", M, Y); Y += 10
    } else {
      addTable({
        head: [["Forma de Pagamento","Total (R$)","Participação"]],
        body: Object.entries(pgto).sort((a,b)=>b[1]-a[1]).map(([k,v]) => [
          k, formatarMoeda(v), recebido > 0 ? `${((v/recebido)*100).toFixed(1)}%` : "—",
        ]),
        headStyles: headStyle, bodyStyles: bodyStyle,
        alternateRowStyles: altRow,
        columnStyles: { 1: { halign: "right" }, 2: { halign: "right", fontStyle: "bold" } },
        margin: { left: M, right: M }, theme: "striped",
      })
    }
  }

  // ══════════════════════════════════════════════════════
  //  COLABORADORES
  // ══════════════════════════════════════════════════════

  if (["por-colaborador","completo"].includes(tipo)) {
    checkPage(40); secao("DESEMPENHO POR COLABORADOR", "👤")
    if (!funcionarios.length) {
      doc.setFontSize(8); doc.setTextColor(150,150,150)
      doc.text("Nenhum colaborador.", M, Y); Y += 10
    } else {
      addTable({
        head: [["Colaborador","Qtd. Vendas","Total Vendido"]],
        body: funcionarios.map((f) => {
          const vf = vendasOk.filter((v) => (v as any).itens_venda?.some((i: any) => i.funcionario_id === f.id))
          return [f.nome, String(vf.length), formatarMoeda(vf.reduce((s,v)=>s+v.total,0))]
        }),
        headStyles: headStyle, bodyStyles: bodyStyle,
        alternateRowStyles: altRow,
        columnStyles: { 1: { halign: "center" }, 2: { halign: "right", fontStyle: "bold" } },
        margin: { left: M, right: M }, theme: "striped",
      })
    }
  }

  // ══════════════════════════════════════════════════════
  //  DÉBITOS
  // ══════════════════════════════════════════════════════

  if (["debitos","completo"].includes(tipo)) {
    checkPage(40); secao("DÉBITOS EM ABERTO", "⏳")
    if (!debitos.length) {
      doc.setFontSize(8); doc.setTextColor(150,150,150)
      doc.text("Nenhum débito em aberto.", M, Y); Y += 10
    } else {
      addTable({
        head: [["Cliente","Descrição","Valor Pago","Em Aberto"]],
        body: debitos.map((d) => [
          d.clientes?.nome_completo ?? "—",
          d.descricao ?? "Venda",
          formatarMoeda(d.valor_pago),
          formatarMoeda(d.valor_aberto),
        ]),
        headStyles: { fillColor:[245,158,11], textColor:[255,255,255], fontStyle:"bold", fontSize:8 },
        bodyStyles: bodyStyle,
        alternateRowStyles: { fillColor:[255,251,235] },
        columnStyles: { 2: { halign:"right" }, 3: { halign:"right", fontStyle:"bold", textColor:[245,158,11] } },
        margin: { left: M, right: M }, theme: "striped",
      })
      const total = debitos.reduce((s,d)=>s+d.valor_aberto,0)
      doc.setFontSize(8); doc.setFont("helvetica","bold"); doc.setTextColor(245,158,11)
      doc.text(`Total em aberto: ${formatarMoeda(total)}`, W-M, Y, { align:"right" }); Y += 8
    }
  }

  // ══════════════════════════════════════════════════════
  //  DESPESAS
  // ══════════════════════════════════════════════════════

  if (["despesas","completo"].includes(tipo)) {
    checkPage(40); secao("DESPESAS E SAÍDAS DE CAIXA", "📉")
    const saidas = movsP.filter((m) => m.tipo === "saida")
    if (!saidas.length) {
      doc.setFontSize(8); doc.setTextColor(150,150,150)
      doc.text("Nenhuma saída.", M, Y); Y += 10
    } else {
      addTable({
        head: [["Data/Hora","Categoria","Descrição","Valor"]],
        body: saidas.map((m) => [fmtHora(m.created_at), m.categoria, m.descricao, formatarMoeda(m.valor)]),
        headStyles: { fillColor:[220,38,38], textColor:[255,255,255], fontStyle:"bold", fontSize:8 },
        bodyStyles: bodyStyle,
        alternateRowStyles: { fillColor:[255,245,245] },
        columnStyles: { 3: { halign:"right", fontStyle:"bold", textColor:[220,38,38] } },
        margin: { left: M, right: M }, theme: "striped",
      })
      const total = saidas.reduce((s,m)=>s+m.valor,0)
      doc.setFontSize(8); doc.setFont("helvetica","bold"); doc.setTextColor(220,38,38)
      doc.text(`Total saídas: ${formatarMoeda(total)}`, W-M, Y, { align:"right" }); Y += 8
    }
  }

  // ══════════════════════════════════════════════════════
  //  RODAPÉ EM TODAS AS PÁGINAS
  // ══════════════════════════════════════════════════════

  const nPages = doc.getNumberOfPages()
  for (let p = 1; p <= nPages; p++) {
    doc.setPage(p)

    // Barra de cor fina no rodapé
    doc.setFillColor(...cor.primary)
    doc.rect(0, 289, W, 2, "F")

    // Texto do rodapé
    doc.setFontSize(6.5)
    doc.setFont("helvetica", "normal")
    doc.setTextColor(160, 160, 160)
    doc.text("Bora Gerir — app.boragerir.com", M, 294)
    doc.text(`${empresa.nome}  ·  ${label}`, W/2, 294, { align: "center" })
    doc.text(`Pág. ${p} / ${nPages}`, W-M, 294, { align: "right" })
  }

  doc.save(`relatorio-${tipo}-${format(dataInicio,"yyyy-MM-dd")}-${format(dataFim,"yyyy-MM-dd")}.pdf`)
}
