import { NextRequest, NextResponse } from "next/server"
import { validateCoraAccess, isCoraAccessError } from "@/lib/cora/middleware"
import { CoraClient, CoraApiError } from "@/lib/cora/client"
import { logCoraAudit } from "@/lib/cora/audit"
import { createAdminClient } from "@/lib/supabase/admin"
import type { CoraInvoiceRequest } from "@/lib/cora/types"

interface PixRequestBody {
  pagador: {
    nome: string
    documento: string
    email?: string
    tipo: "PERSON" | "BUSINESS"
    endereco: {
      rua: string
      numero: string
      complemento?: string
      bairro: string
      cidade: string
      estado: string
      cep: string
    }
  }
  valor: number
  descricaoServico: string
  clienteId?: string
  vendaId?: string
}

export async function POST(request: NextRequest) {
  const access = await validateCoraAccess()
  if (isCoraAccessError(access)) {
    return access
  }

  const { empresaId, userId } = access

  try {
    const body: PixRequestBody = await request.json()

    // Validação de valor
    if (!body.valor || body.valor <= 0) {
      return NextResponse.json(
        { error: "Valor deve ser maior que zero" },
        { status: 400 }
      )
    }

    // Validação de campos obrigatórios do pagador
    const camposFaltantes: string[] = []
    if (!body.pagador) {
      return NextResponse.json(
        { error: "Dados do pagador são obrigatórios", camposFaltantes: ["pagador"] },
        { status: 400 }
      )
    }
    if (!body.pagador.nome) camposFaltantes.push("pagador.nome")
    if (!body.pagador.documento) camposFaltantes.push("pagador.documento")
    // email is optional — Cora accepts invoices without email
    if (!body.pagador.tipo) camposFaltantes.push("pagador.tipo")
    if (!body.pagador.endereco) {
      camposFaltantes.push("pagador.endereco")
    } else {
      if (!body.pagador.endereco.rua) camposFaltantes.push("pagador.endereco.rua")
      if (!body.pagador.endereco.numero) camposFaltantes.push("pagador.endereco.numero")
      if (!body.pagador.endereco.bairro) camposFaltantes.push("pagador.endereco.bairro")
      if (!body.pagador.endereco.cidade) camposFaltantes.push("pagador.endereco.cidade")
      if (!body.pagador.endereco.estado) camposFaltantes.push("pagador.endereco.estado")
      if (!body.pagador.endereco.cep) camposFaltantes.push("pagador.endereco.cep")
    }

    if (camposFaltantes.length > 0) {
      return NextResponse.json(
        { error: "Campos obrigatórios faltando", camposFaltantes },
        { status: 400 }
      )
    }

    // Converter valor para centavos
    const valorCentavos = Math.round(body.valor * 100)

    // Data de vencimento = amanhã (Cora rejeita datas no mesmo dia)
    const amanha = new Date()
    amanha.setDate(amanha.getDate() + 1)
    const dueDate = amanha.toISOString().split("T")[0]

    // Buscar cora_conta_id para a empresa
    const supabase = createAdminClient()
    const { data: conta, error: contaError } = await supabase
      .from("cora_contas")
      .select("id")
      .eq("empresa_id", empresaId)
      .eq("status", "ativo")
      .single()

    if (contaError || !conta) {
      return NextResponse.json(
        { error: "Conta Cora não encontrada ou inativa" },
        { status: 404 }
      )
    }

    // Montar CoraInvoiceRequest
    const invoiceRequest: CoraInvoiceRequest = {
      code: `PIX-${empresaId.slice(0, 8)}-${Date.now()}`,
      customer: {
        name: body.pagador.nome,
        document: body.pagador.documento,
        email: body.pagador.email || undefined,
        type: body.pagador.tipo,
        address: {
          street: body.pagador.endereco.rua,
          number: body.pagador.endereco.numero,
          complement: body.pagador.endereco.complemento,
          district: body.pagador.endereco.bairro,
          city: body.pagador.endereco.cidade,
          state: body.pagador.endereco.estado,
          zipCode: body.pagador.endereco.cep,
        },
      },
      services: [
        {
          name: body.descricaoServico || "Cobrança Pix",
          amount: valorCentavos,
        },
      ],
      paymentTerms: {
        dueDate: dueDate,
      },
    }

    console.log("[Cora Pix] Sending invoice request:", JSON.stringify(invoiceRequest, null, 2))

    // Chamar API da Cora
    const coraClient = new CoraClient(empresaId)
    const coraResponse = await coraClient.createInvoice(invoiceRequest)

    // Salvar em cora_boletos com tipo "pix"
    const { data: boleto, error: insertError } = await supabase
      .from("cora_boletos")
      .insert({
        empresa_id: empresaId,
        cora_conta_id: conta.id,
        cora_invoice_id: coraResponse.id,
        tipo: "pix",
        valor: body.valor,
        data_vencimento: dueDate,
        status: "aberto",
        qr_code_pix: coraResponse.pix?.qrCode ?? null,
        codigo_barras: coraResponse.bankslip?.barcode ?? null,
        linha_digitavel: coraResponse.bankslip?.digitableLine ?? null,
        url_pdf: coraResponse.documentUrl,
        cliente_id: body.clienteId ?? null,
        venda_id: body.vendaId ?? null,
        payload_cora: coraResponse,
      })
      .select("id")
      .single()

    if (insertError) {
      console.error("[Cora Pix] Erro ao salvar boleto:", insertError)
      return NextResponse.json(
        { error: "Erro ao salvar cobrança Pix" },
        { status: 500 }
      )
    }

    // Registrar auditoria
    await logCoraAudit(empresaId, userId, "geracao_pix", {
      valor: body.valor,
      cora_invoice_id: coraResponse.id,
    })

    // Retornar resposta com QR Code e copia-e-cola
    return NextResponse.json(
      {
        id: boleto!.id,
        qrCode: coraResponse.pix?.qrCode ?? null,
        copiaCola: coraResponse.pix?.copyAndPaste ?? null,
        valor: body.valor,
        coraInvoiceId: coraResponse.id,
      },
      { status: 201 }
    )
  } catch (error) {
    if (error instanceof CoraApiError) {
      console.error("[Cora Pix] API error:", error.statusCode, error.code, error.message)
      return NextResponse.json(
        { error: error.message || "Erro na comunicação com a Cora", code: error.code },
        { status: error.statusCode >= 500 ? 502 : 422 }
      )
    }

    console.error("[Cora Pix] Erro inesperado:", error)
    return NextResponse.json(
      { error: "Erro ao gerar cobrança Pix" },
      { status: 500 }
    )
  }
}
