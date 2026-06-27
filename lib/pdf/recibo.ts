import jsPDF from "jspdf"
import autoTable from "jspdf-autotable"
import { formatarMoeda, formatarCPF, formatarCNPJ, formatarDataHora, labelsFormaPagamento, APP_CONFIG } from "@/lib/utils"
import type { Empresa } from "@/types/index"

function hexToRgb(hex: string): [number, number, number] {
  const r = parseInt(hex.slice(1, 3), 16)
  const g = parseInt(hex.slice(3, 5), 16)
  const b = parseInt(hex.slice(5, 7), 16)
  return [isNaN(r) ? 242 : r, isNaN(g) ? 110 : g, isNaN(b) ? 29 : b]
}

interface GerarReciboParams {
  empresa: Empresa & {
    doc_cor_primaria?: string | null
    doc_mensagem_recibo?: string | null
    doc_mostrar_cnpj?: boolean | null
    doc_mostrar_endereco?: boolean | null
    doc_mostrar_telefone?: boolean | null
  }
  venda: {
    numero: number
    total: number
    subtotal: number
    desconto: number
    forma_pagamento: string
    parcelas: number
    created_at: string
  }
  cliente: { nome_completo: string; cpf: string; telefone: string } | null
  itens: { nome_item: string; quantidade: number; preco_unitario: number; subtotal: number }[]
}

// Carregar imagem como base64 para o jsPDF
async function carregarImagemBase64(url: string): Promise<string | null> {
  try {
    const res = await fetch(url)
    const blob = await res.blob()
    return await new Promise((resolve) => {
      const reader = new FileReader()
      reader.onloadend = () => resolve(reader.result as string)
      reader.readAsDataURL(blob)
    })
  } catch {
    return null
  }
}

export async function gerarReciboPDF({ empresa, venda, cliente, itens }: GerarReciboParams) {
  const doc = new jsPDF({ unit: "mm", format: "a4" })
  const isGratuito = empresa.plano === "gratuito"

  // Configurações personalizadas
  const corHex = empresa.doc_cor_primaria ?? "#F26E1D"
  const corRGB = hexToRgb(corHex)
  const msgRodape = empresa.doc_mensagem_recibo ?? "Obrigado pela preferência!"
  const mostrarCnpj = empresa.doc_mostrar_cnpj ?? true
  const mostrarEndereco = empresa.doc_mostrar_endereco ?? true
  const mostrarTelefone = empresa.doc_mostrar_telefone ?? true

  // Marca d'água plano gratuito
  if (isGratuito) {
    doc.setFontSize(36)
    doc.setTextColor(230, 230, 230)
    doc.setFont("helvetica", "bold")
    doc.text(`${APP_CONFIG.nome} - Plano Gratuito`, 105, 148, { align: "center", angle: 45 })
    doc.setTextColor(0, 0, 0)
  }

  // Fundo da cor personalizada no header
  doc.setFillColor(...corRGB)
  doc.rect(0, 0, 210, 42, "F")

  // Logo da empresa (se houver)
  let xTextoInicio = 15
  if (empresa.logo_url) {
    const imgData = await carregarImagemBase64(empresa.logo_url)
    if (imgData) {
      doc.addImage(imgData, "PNG", 12, 8, 26, 26)
      xTextoInicio = 44
    }
  }

  // Nome da empresa
  doc.setFontSize(18)
  doc.setFont("helvetica", "bold")
  doc.setTextColor(255, 255, 255)
  doc.text(empresa.nome, xTextoInicio, 18)

  doc.setFontSize(8.5)
  doc.setFont("helvetica", "normal")
  doc.setTextColor(255, 220, 190)
  doc.text(`${empresa.endereco_rua}, ${empresa.endereco_numero} — ${empresa.endereco_bairro}`, xTextoInicio, 25)
  doc.text(`${empresa.endereco_cidade}/${empresa.endereco_estado}  |  Tel: ${empresa.telefone}`, xTextoInicio, 31)

  // Documento da empresa
  const docEmpresa = empresa.tipo_documento === "cnpj"
    ? `CNPJ: ${formatarCNPJ(empresa.documento ?? "")}`
    : `CPF: ${formatarCPF(empresa.documento ?? "")}`
  if (mostrarCnpj) doc.text(docEmpresa, xTextoInicio, 37)

  // Rótulo RECIBO (canto direito)
  doc.setFontSize(16)
  doc.setFont("helvetica", "bold")
  doc.setTextColor(255, 255, 255)
  doc.text("RECIBO", 195, 17, { align: "right" })
  doc.setFontSize(10)
  doc.setFont("helvetica", "normal")
  doc.setTextColor(255, 220, 190)
  doc.text(`#${String(venda.numero).padStart(4, "0")}`, 195, 24, { align: "right" })
  doc.text(formatarDataHora(venda.created_at), 195, 30, { align: "right" })

  // ── DADOS DO CLIENTE ──
  doc.setFontSize(9)
  doc.setFont("helvetica", "bold")
  doc.setTextColor(26, 26, 26)
  doc.text("CLIENTE", 15, 52)
  doc.setFont("helvetica", "normal")
  doc.setFontSize(10)
  if (cliente) {
    doc.text(cliente.nome_completo, 15, 59)
    doc.text(`CPF: ${formatarCPF(cliente.cpf)}  |  Tel: ${cliente.telefone}`, 15, 65)
  } else {
    doc.text("Consumidor final", 15, 59)
  }

  doc.setDrawColor(230, 230, 230)
  doc.line(15, 70, 195, 70)

  // ── ITENS ──
  autoTable(doc, {
    startY: 74,
    head: [["Descrição", "Qtd", "Valor Unit.", "Subtotal"]],
    body: itens.map((i) => [
      i.nome_item,
      i.quantidade.toString(),
      formatarMoeda(i.preco_unitario),
      formatarMoeda(i.subtotal),
    ]),
    headStyles: {
      fillColor: [242, 110, 29],
      textColor: [255, 255, 255],
      fontStyle: "bold",
      fontSize: 9,
    },
    bodyStyles: { fontSize: 9, textColor: [26, 26, 26] },
    alternateRowStyles: { fillColor: [253, 248, 245] },
    columnStyles: {
      0: { cellWidth: "auto" },
      1: { halign: "center", cellWidth: 15 },
      2: { halign: "right", cellWidth: 32 },
      3: { halign: "right", cellWidth: 32 },
    },
    margin: { left: 15, right: 15 },
    theme: "grid",
  })

  const finalY = (doc as jsPDF & { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 8

  // ── TOTAIS ──
  const col1 = 130
  const col2 = 195

  doc.setFontSize(9)
  doc.setTextColor(100, 100, 100)
  doc.text("Subtotal:", col1, finalY, { align: "right" })
  doc.text(formatarMoeda(venda.subtotal), col2, finalY, { align: "right" })

  if (venda.desconto > 0) {
    doc.setTextColor(220, 50, 50)
    doc.text("Desconto:", col1, finalY + 6, { align: "right" })
    doc.text(`- ${formatarMoeda(venda.desconto)}`, col2, finalY + 6, { align: "right" })
  }

  doc.setDrawColor(230, 230, 230)
  doc.line(col1 - 10, finalY + 10, col2, finalY + 10)

  doc.setFontSize(13)
  doc.setFont("helvetica", "bold")
  doc.setTextColor(26, 26, 26)
  doc.text("TOTAL:", col1, finalY + 18, { align: "right" })
  doc.setTextColor(...corRGB)
  doc.text(formatarMoeda(venda.total), col2, finalY + 18, { align: "right" })

  // Forma de pagamento
  doc.setFontSize(9)
  doc.setFont("helvetica", "normal")
  doc.setTextColor(100, 100, 100)
  const formaPag = labelsFormaPagamento[venda.forma_pagamento] ?? venda.forma_pagamento
  const parcText = venda.forma_pagamento === "cartao_credito" && venda.parcelas > 1
    ? ` (${venda.parcelas}x de ${formatarMoeda(venda.total / venda.parcelas)})` : ""
  doc.text(`Forma de pagamento: ${formaPag}${parcText}`, 15, finalY + 18)

  // ── RODAPÉ ──
  doc.setFontSize(8)
  doc.setTextColor(180, 180, 180)
  doc.text(msgRodape, 105, 276, { align: "center" })
  doc.setFontSize(7)
  doc.setTextColor(200, 200, 200)
  doc.text(`Gerado por Bora Gerir — app.boragerir.com`, 105, 282, { align: "center" })

  doc.save(`recibo-${String(venda.numero).padStart(4, "0")}.pdf`)
}
