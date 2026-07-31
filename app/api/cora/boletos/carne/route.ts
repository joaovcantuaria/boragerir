import { NextRequest, NextResponse } from "next/server"
import { validateCoraAccess, isCoraAccessError } from "@/lib/cora/middleware"
import { CoraClient, CoraApiError } from "@/lib/cora/client"
import { logCoraAudit } from "@/lib/cora/audit"
import { createAdminClient } from "@/lib/supabase/admin"
import type { CoraInvoiceRequest, CoraInvoiceResponse } from "@/lib/cora/types"

interface CarneRequestBody {
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
  valorTotal: number
  numeroParcelas: number
  dataVencimentoPrimeira: string
  descricaoServico: string
  clienteId?: string
  contratoId?: string
}

/**
 * Calcula a data de vencimento para uma parcela, adicionando `monthsToAdd` meses à data base.
 * Usa o construtor Date(year, month + i, day) para lidar com overflow de meses corretamente.
 */
function calcularDataVencimento(dataBase: string, monthsToAdd: number): string {
  const [year, month, day] = dataBase.split("-").map(Number)
  const date = new Date(year, month - 1 + monthsToAdd, day)
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, "0")
  const d = String(date.getDate()).padStart(2, "0")
  return `${y}-${m}-${d}`
}

/**
 * Valida os campos obrigatórios do request body e retorna lista de erros.
 */
function validarRequest(body: CarneRequestBody): string[] {
  const erros: string[] = []

  if (!body.pagador) {
    erros.push("pagador é obrigatório")
    return erros
  }

  if (!body.pagador.nome || body.pagador.nome.trim() === "") {
    erros.push("pagador.nome é obrigatório")
  }
  if (!body.pagador.documento || body.pagador.documento.trim() === "") {
    erros.push("pagador.documento é obrigatório")
  }
  // email is optional — Cora accepts invoices without email
  if (!body.pagador.tipo || !["PERSON", "BUSINESS"].includes(body.pagador.tipo)) {
    erros.push("pagador.tipo deve ser PERSON ou BUSINESS")
  }

  if (!body.pagador.endereco) {
    erros.push("pagador.endereco é obrigatório")
  } else {
    if (!body.pagador.endereco.rua) erros.push("pagador.endereco.rua é obrigatório")
    if (!body.pagador.endereco.numero) erros.push("pagador.endereco.numero é obrigatório")
    if (!body.pagador.endereco.bairro) erros.push("pagador.endereco.bairro é obrigatório")
    if (!body.pagador.endereco.cidade) erros.push("pagador.endereco.cidade é obrigatório")
    if (!body.pagador.endereco.estado) erros.push("pagador.endereco.estado é obrigatório")
    if (!body.pagador.endereco.cep) erros.push("pagador.endereco.cep é obrigatório")
  }

  if (!body.valorTotal || body.valorTotal <= 0) {
    erros.push("valorTotal deve ser maior que zero")
  }

  if (!body.numeroParcelas || body.numeroParcelas < 2 || body.numeroParcelas > 48) {
    erros.push("numeroParcelas deve estar entre 2 e 48")
  }

  if (!body.dataVencimentoPrimeira) {
    erros.push("dataVencimentoPrimeira é obrigatório")
  } else {
    const dataVencimento = new Date(body.dataVencimentoPrimeira + "T00:00:00")
    const hoje = new Date()
    hoje.setHours(0, 0, 0, 0)
    if (dataVencimento < hoje) {
      erros.push("dataVencimentoPrimeira deve ser uma data futura")
    }
  }

  if (!body.descricaoServico || body.descricaoServico.trim() === "") {
    erros.push("descricaoServico é obrigatório")
  }

  return erros
}

export async function POST(request: NextRequest) {
  const access = await validateCoraAccess()
  if (isCoraAccessError(access)) {
    return access
  }

  const { empresaId, userId } = access

  let body: CarneRequestBody
  try {
    body = await request.json()
  } catch {
    return NextResponse.json(
      { error: "Body inválido" },
      { status: 400 }
    )
  }

  // Validação
  const erros = validarRequest(body)
  if (erros.length > 0) {
    return NextResponse.json(
      { error: "Dados inválidos", campos: erros },
      { status: 400 }
    )
  }

  // Cálculo de valores por parcela (centavos)
  const valorTotalCentavos = Math.round(body.valorTotal * 100)
  const valorParcelaCentavos = Math.floor(valorTotalCentavos / body.numeroParcelas)
  const restoCentavos = valorTotalCentavos - (valorParcelaCentavos * body.numeroParcelas)

  // Gerar carne_id
  const carneId = crypto.randomUUID()

  // Buscar cora_conta_id
  const supabase = createAdminClient()
  const { data: coraConta, error: contaError } = await supabase
    .from("cora_contas")
    .select("id")
    .eq("empresa_id", empresaId)
    .eq("status", "ativo")
    .single()

  if (contaError || !coraConta) {
    return NextResponse.json(
      { error: "Conta Cora não encontrada ou inativa. Conecte sua conta nas Configurações." },
      { status: 400 }
    )
  }

  const coraClient = new CoraClient(empresaId)
  const boletosEmitidos: CoraInvoiceResponse[] = []

  try {
    // Emitir cada boleto individualmente
    for (let i = 0; i < body.numeroParcelas; i++) {
      const numeroParcela = i + 1
      const valorParcela = i === 0
        ? valorParcelaCentavos + restoCentavos
        : valorParcelaCentavos

      const dataVencimento = calcularDataVencimento(body.dataVencimentoPrimeira, i)

      const invoiceRequest: CoraInvoiceRequest = {
        code: `${carneId}-${numeroParcela}`,
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
            name: `${body.descricaoServico} - Parcela ${numeroParcela}/${body.numeroParcelas}`,
            amount: valorParcela,
          },
        ],
        paymentTerms: {
          dueDate: dataVencimento,
        },
        ...(body.pagador.email ? { notification: { emails: [body.pagador.email] } } : {}),
      }

      const response = await coraClient.createInvoice(invoiceRequest)
      boletosEmitidos.push(response)
    }
  } catch (error) {
    // Rollback: cancelar todos os boletos já emitidos
    const cancelErrors: string[] = []
    for (const boleto of boletosEmitidos) {
      try {
        await coraClient.cancelInvoice(boleto.id)
      } catch (cancelError) {
        cancelErrors.push(boleto.id)
      }
    }

    const errorMessage = error instanceof CoraApiError
      ? `Erro da Cora: ${error.message}`
      : "Erro ao emitir parcela do carnê"

    console.error("[Cora Carnê] Erro na emissão, rollback executado:", {
      emitidos: boletosEmitidos.length,
      cancelErrors,
      error,
    })

    return NextResponse.json(
      {
        error: errorMessage,
        detalhes: {
          parcelasEmitidas: boletosEmitidos.length,
          parcelaComErro: boletosEmitidos.length + 1,
          rollbackFalhas: cancelErrors.length > 0 ? cancelErrors : undefined,
        },
      },
      { status: 500 }
    )
  }

  // Salvar todos os boletos no banco
  const registros = boletosEmitidos.map((boleto, i) => {
    const numeroParcela = i + 1
    const valorParcela = i === 0
      ? valorParcelaCentavos + restoCentavos
      : valorParcelaCentavos

    return {
      empresa_id: empresaId,
      cora_conta_id: coraConta.id,
      cliente_id: body.clienteId || null,
      contrato_id: body.contratoId || null,
      cora_invoice_id: boleto.id,
      tipo: "carne",
      carne_id: carneId,
      numero_parcela: numeroParcela,
      valor: valorParcela / 100, // centavos → reais para armazenamento
      data_vencimento: calcularDataVencimento(body.dataVencimentoPrimeira, i),
      status: "aberto",
      codigo_barras: boleto.bankslip?.barcode || null,
      linha_digitavel: boleto.bankslip?.digitableLine || null,
      qr_code_pix: boleto.pix?.copyAndPaste || null,
      url_pdf: boleto.documentUrl || null,
      payload_cora: boleto,
    }
  })

  const { data: boletosSalvos, error: insertError } = await supabase
    .from("cora_boletos")
    .insert(registros)
    .select()

  if (insertError) {
    console.error("[Cora Carnê] Erro ao salvar boletos no banco:", insertError)
    return NextResponse.json(
      { error: "Boletos emitidos na Cora mas houve erro ao salvar localmente. Entre em contato com o suporte." },
      { status: 500 }
    )
  }

  // Registrar auditoria
  await logCoraAudit(empresaId, userId, "emissao_carne", {
    carneId,
    numeroParcelas: body.numeroParcelas,
    valorTotal: body.valorTotal,
    clienteId: body.clienteId || null,
    contratoId: body.contratoId || null,
  })

  return NextResponse.json(
    {
      carneId,
      parcelas: boletosSalvos,
    },
    { status: 201 }
  )
}
