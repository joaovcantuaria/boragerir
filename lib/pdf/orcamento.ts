import jsPDF from "jspdf"
import autoTable from "jspdf-autotable"
import { formatarMoeda, formatarData, formatarCNPJ, formatarCPF, APP_CONFIG } from "@/lib/utils"
import { addDays } from "date-fns"
import type { Empresa } from "@/types/index"

async function carregarImagemBase64(url: string): Promise<string | null> {
  try {
    const res = await fetch(url)
    const blob = await res.blob()
    return await new Promise((resolve) => {
      const reader = new FileReader()
      reader.onloadend = () => resolve(reader.result as string)
      reader.readAsDataURL(blob)
    })
  } catch { return null }
}

interface Params {
  empresa: Empresa
  orcamento: { numero_orcamento: number; titulo: string; total: number; subtotal: number; desconto: number; validade_dias: number; created_at: string; observacoes?: string | null }
  cliente: { nome_completo: string; telefone: string } | null
  itens: { nome_item: string; quantidade: number; preco_unitario: number; subtotal: number }[]
}

export async function gerarOrcamentoPDF({ empresa, orcamento, cliente, itens }: Params) {
  const doc = new jsPDF({ unit: "mm", format: "a4" })
  const isGratuito = empresa.plano === "gratuito"

  if (isGratuito) {
    doc.setFontSize(36)
    doc.setTextColor(230, 230, 230)
    doc.setFont("helvetica", "bold")
    doc.text(`${APP_CONFIG.nome} - Plano Gratuito`, 105, 148, { align: "center", angle: 45 })
    doc.setTextColor(0, 0, 0)
  }

  // Header laranja
  doc.setFillColor(242, 110, 29)
  doc.rect(0, 0, 210, 42, "F")

  let xTexto = 15
  if (empresa.logo_url) {
    const img = await carregarImagemBase64(empresa.logo_url)
    if (img) { doc.addImage(img, "PNG", 12, 8, 26, 26); xTexto = 44 }
  }

  doc.setFontSize(18); doc.setFont("helvetica", "bold"); doc.setTextColor(255, 255, 255)
  doc.text(empresa.nome, xTexto, 18)
  doc.setFontSize(8.5); doc.setFont("helvetica", "normal"); doc.setTextColor(255, 220, 190)
  doc.text(`${empresa.endereco_rua}, ${empresa.endereco_numero} — ${empresa.endereco_cidade}/${empresa.endereco_estado}`, xTexto, 25)
  doc.text(`Tel: ${empresa.telefone}  |  ${empresa.email}`, xTexto, 31)

  const docEmpresa = empresa.tipo_documento === "cnpj"
    ? `CNPJ: ${formatarCNPJ(empresa.documento ?? "")}`
    : `CPF: ${formatarCPF(empresa.documento ?? "")}`
  doc.text(docEmpresa, xTexto, 37)

  doc.setFontSize(16); doc.setFont("helvetica", "bold"); doc.setTextColor(255, 255, 255)
  doc.text("ORÇAMENTO", 195, 17, { align: "right" })
  doc.setFontSize(10); doc.setFont("helvetica", "normal"); doc.setTextColor(255, 220, 190)
  doc.text(`#${String(orcamento.numero_orcamento).padStart(4, "0")}`, 195, 24, { align: "right" })

  // Título e infos
  doc.setFontSize(11); doc.setFont("helvetica", "bold"); doc.setTextColor(26, 26, 26)
  doc.text(orcamento.titulo, 15, 52)
  doc.setFontSize(8.5); doc.setFont("helvetica", "normal"); doc.setTextColor(100, 100, 100)
  doc.text(`Emissão: ${formatarData(orcamento.created_at)}`, 15, 59)
  doc.text(`Validade: ${formatarData(addDays(new Date(orcamento.created_at), orcamento.validade_dias))}`, 80, 59)
  if (cliente) doc.text(`Cliente: ${cliente.nome_completo}  |  Tel: ${cliente.telefone}`, 15, 65)

  doc.setDrawColor(230, 230, 230)
  doc.line(15, 70, 195, 70)

  autoTable(doc, {
    startY: 74,
    head: [["Descrição", "Qtd", "Valor Unit.", "Total"]],
    body: itens.map((i) => [i.nome_item, i.quantidade.toString(), formatarMoeda(i.preco_unitario), formatarMoeda(i.subtotal)]),
    headStyles: { fillColor: [242, 110, 29], textColor: [255, 255, 255], fontStyle: "bold", fontSize: 9 },
    bodyStyles: { fontSize: 9, textColor: [26, 26, 26] },
    alternateRowStyles: { fillColor: [253, 248, 245] },
    columnStyles: { 1: { halign: "center", cellWidth: 15 }, 2: { halign: "right", cellWidth: 32 }, 3: { halign: "right", cellWidth: 32 } },
    margin: { left: 15, right: 15 }, theme: "grid",
  })

  const y = (doc as jsPDF & { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 8

  if (orcamento.desconto > 0) {
    doc.setFontSize(9); doc.setTextColor(220, 50, 50)
    doc.text("Desconto:", 140, y, { align: "right" })
    doc.text(`- ${formatarMoeda(orcamento.desconto)}`, 195, y, { align: "right" })
  }

  doc.setFontSize(13); doc.setFont("helvetica", "bold"); doc.setTextColor(26, 26, 26)
  doc.text("TOTAL:", 140, y + 8, { align: "right" })
  doc.setTextColor(242, 110, 29)
  doc.text(formatarMoeda(orcamento.total), 195, y + 8, { align: "right" })

  if (orcamento.observacoes) {
    doc.setFontSize(9); doc.setFont("helvetica", "normal"); doc.setTextColor(100, 100, 100)
    doc.text("Observações:", 15, y + 20)
    doc.text(orcamento.observacoes, 15, y + 26)
  }

  doc.setFontSize(8); doc.setTextColor(180, 180, 180)
  doc.text("Este orçamento não tem valor fiscal.", 105, 273, { align: "center" })
  doc.setFontSize(7); doc.setTextColor(200, 200, 200)
  doc.text(`Gerado por Bora Gerir — app.boragerir.com`, 105, 279, { align: "center" })

  doc.save(`orcamento-${String(orcamento.numero_orcamento).padStart(4, "0")}.pdf`)
}
