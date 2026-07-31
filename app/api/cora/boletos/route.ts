import { NextRequest, NextResponse } from "next/server"
import { validateCoraAccess, isCoraAccessError } from "@/lib/cora/middleware"
import { CoraClient, CoraApiError } from "@/lib/cora/client"
import { createAdminClient } from "@/lib/supabase/admin"
import { logCoraAudit } from "@/lib/cora/audit"
import type { CoraInvoiceRequest } from "@/lib/cora/types"

// === POST: Emitir boleto ===

export async function POST(request: NextRequest) {
  const access = await validateCoraAccess()
  if (isCoraAccessError(access)) {
    return access
  }

  const { empresaId, userId } = access

  try {
    const body = await request.json()
    const { pagador, valor, dataVencimento, descricaoServico, clienteId } = body

    // Validação dos dados
    const erros: string[] = []

    if (!pagador) {
      erros.push("pagador é obrigatório")
    } else {
      if (!pagador.nome || pagador.nome.trim() === "") erros.push("pagador.nome é obrigatório")
      if (!pagador.documento || pagador.documento.trim() === "") erros.push("pagador.documento é obrigatório")
      // email is optional — Cora accepts invoices without email
      if (!pagador.tipo || !["PERSON", "BUSINESS"].includes(pagador.tipo)) erros.push("pagador.tipo deve ser PERSON ou BUSINESS")
      if (!pagador.endereco) {
        erros.push("pagador.endereco é obrigatório")
      } else {
        if (!pagador.endereco.rua || pagador.endereco.rua.trim() === "") erros.push("pagador.endereco.rua é obrigatório")
        if (!pagador.endereco.numero || pagador.endereco.numero.trim() === "") erros.push("pagador.endereco.numero é obrigatório")
        if (!pagador.endereco.bairro || pagador.endereco.bairro.trim() === "") erros.push("pagador.endereco.bairro é obrigatório")
        if (!pagador.endereco.cidade || pagador.endereco.cidade.trim() === "") erros.push("pagador.endereco.cidade é obrigatório")
        if (!pagador.endereco.estado || pagador.endereco.estado.trim() === "") erros.push("pagador.endereco.estado é obrigatório")
        if (!pagador.endereco.cep || pagador.endereco.cep.trim() === "") erros.push("pagador.endereco.cep é obrigatório")
      }
    }

    if (!valor || typeof valor !== "number" || valor <= 0) {
      erros.push("valor deve ser um número positivo")
    }

    if (!dataVencimento) {
      erros.push("dataVencimento é obrigatório")
    } else {
      const hoje = new Date()
      hoje.setHours(0, 0, 0, 0)
      const vencimento = new Date(dataVencimento + "T00:00:00")
      if (isNaN(vencimento.getTime())) {
        erros.push("dataVencimento deve ser uma data válida no formato YYYY-MM-DD")
      } else if (vencimento <= hoje) {
        erros.push("dataVencimento deve ser uma data futura")
      }
    }

    if (!descricaoServico || descricaoServico.trim() === "") {
      erros.push("descricaoServico é obrigatório")
    }

    if (erros.length > 0) {
      return NextResponse.json(
        { error: "Dados inválidos", campos: erros },
        { status: 400 }
      )
    }

    // Converter valor de reais para centavos
    const valorCentavos = Math.round(valor * 100)

    // Montar CoraInvoiceRequest
    const invoiceRequest: CoraInvoiceRequest = {
      code: crypto.randomUUID(),
      buyer: {
        name: pagador.nome.trim(),
        document: pagador.documento.trim(),
        email: pagador.email?.trim() || undefined,
        type: pagador.tipo,
        address: {
          street: pagador.endereco.rua.trim(),
          number: pagador.endereco.numero.trim(),
          complement: pagador.endereco.complemento?.trim() || undefined,
          district: pagador.endereco.bairro.trim(),
          city: pagador.endereco.cidade.trim(),
          state: pagador.endereco.estado.trim(),
          zipCode: pagador.endereco.cep.trim(),
        },
      },
      services: [
        {
          name: descricaoServico.trim(),
          amount: valorCentavos,
        },
      ],
      paymentTerms: {
        dueDate: dataVencimento,
      },
    }

    console.log("[Cora Boletos] Sending invoice request:", JSON.stringify(invoiceRequest, null, 2))

    // Buscar cora_conta da empresa
    const supabase = createAdminClient()
    const { data: conta, error: contaError } = await supabase
      .from("cora_contas")
      .select("id")
      .eq("empresa_id", empresaId)
      .eq("status", "ativo")
      .single()

    if (contaError || !conta) {
      return NextResponse.json(
        { error: "Conta Cora não encontrada ou inativa. Conecte sua conta Cora nas Configurações." },
        { status: 400 }
      )
    }

    // Emitir boleto na Cora
    const client = new CoraClient(empresaId)
    const coraResponse = await client.createInvoice(invoiceRequest)

    // Salvar no banco local
    const { data: boleto, error: insertError } = await supabase
      .from("cora_boletos")
      .insert({
        empresa_id: empresaId,
        cora_conta_id: conta.id,
        cliente_id: clienteId || null,
        cora_invoice_id: coraResponse.id,
        tipo: "boleto",
        valor: valor,
        data_vencimento: dataVencimento,
        status: "aberto",
        codigo_barras: coraResponse.bankslip?.barcode || null,
        linha_digitavel: coraResponse.bankslip?.digitableLine || null,
        qr_code_pix: coraResponse.pix?.qrCode || null,
        url_pdf: coraResponse.documentUrl || null,
        payload_cora: coraResponse,
      })
      .select()
      .single()

    if (insertError) {
      console.error("[Cora Boletos] Erro ao salvar boleto:", insertError)
      return NextResponse.json(
        { error: "Boleto emitido na Cora mas houve erro ao salvar localmente" },
        { status: 500 }
      )
    }

    // Registrar audit log
    await logCoraAudit(empresaId, userId, "emissao_boleto", {
      boleto_id: boleto.id,
      cora_invoice_id: coraResponse.id,
      valor,
      data_vencimento: dataVencimento,
      pagador_nome: pagador.nome,
    })

    // Retornar dados do boleto (valor em reais)
    return NextResponse.json(
      {
        id: boleto.id,
        coraInvoiceId: coraResponse.id,
        valor: valor,
        dataVencimento: dataVencimento,
        status: "aberto",
        codigoBarras: coraResponse.bankslip?.barcode || null,
        linhaDigitavel: coraResponse.bankslip?.digitableLine || null,
        qrCodePix: coraResponse.pix?.qrCode || null,
        urlPdf: coraResponse.documentUrl || null,
        pagador: {
          nome: pagador.nome,
          documento: pagador.documento,
        },
      },
      { status: 201 }
    )
  } catch (error) {
    if (error instanceof CoraApiError) {
      console.error("[Cora Boletos] Erro API Cora:", error.statusCode, error.code, error.message)
      return NextResponse.json(
        { error: error.message || "Erro na comunicação com a Cora", codigoErro: error.code },
        { status: 502 }
      )
    }
    console.error("[Cora Boletos] Erro inesperado:", error)
    return NextResponse.json(
      { error: "Erro interno ao emitir boleto" },
      { status: 500 }
    )
  }
}

// === GET: Listar boletos ===

export async function GET(request: NextRequest) {
  const access = await validateCoraAccess()
  if (isCoraAccessError(access)) {
    return access
  }

  const { empresaId } = access

  try {
    const { searchParams } = new URL(request.url)
    const status = searchParams.get("status")
    const startDate = searchParams.get("startDate")
    const endDate = searchParams.get("endDate")
    const clienteNome = searchParams.get("clienteNome")
    const page = Math.max(1, parseInt(searchParams.get("page") || "1", 10))
    const limit = Math.min(100, Math.max(1, parseInt(searchParams.get("limit") || "20", 10)))
    const offset = (page - 1) * limit

    const supabase = createAdminClient()

    // Montar query base
    let query = supabase
      .from("cora_boletos")
      .select("*, clientes(nome)", { count: "exact" })
      .eq("empresa_id", empresaId)
      .order("created_at", { ascending: false })

    // Aplicar filtro de status
    if (status) {
      query = query.eq("status", status)
    }

    // Aplicar filtro de período (data de vencimento)
    if (startDate) {
      query = query.gte("data_vencimento", startDate)
    }
    if (endDate) {
      query = query.lte("data_vencimento", endDate)
    }

    // Aplicar filtro por nome do cliente (join com clientes)
    if (clienteNome) {
      query = query.not("cliente_id", "is", null)
        .ilike("clientes.nome", `%${clienteNome}%`)
    }

    // Aplicar paginação
    query = query.range(offset, offset + limit - 1)

    const { data: boletos, count, error } = await query

    if (error) {
      console.error("[Cora Boletos] Erro ao listar:", error)
      return NextResponse.json(
        { error: "Erro ao buscar boletos" },
        { status: 500 }
      )
    }

    // Formatar resposta (valores já estão em reais no banco)
    const boletosFormatados = (boletos || []).map((boleto: any) => ({
      id: boleto.id,
      coraInvoiceId: boleto.cora_invoice_id,
      tipo: boleto.tipo,
      carneId: boleto.carne_id,
      numeroParcela: boleto.numero_parcela,
      valor: boleto.valor,
      dataVencimento: boleto.data_vencimento,
      status: boleto.status,
      codigoBarras: boleto.codigo_barras,
      linhaDigitavel: boleto.linha_digitavel,
      qrCodePix: boleto.qr_code_pix,
      urlPdf: boleto.url_pdf,
      dataPagamento: boleto.data_pagamento,
      dataCancelamento: boleto.data_cancelamento,
      clienteNome: boleto.clientes?.nome || null,
      clienteId: boleto.cliente_id,
      vendaId: boleto.venda_id,
      contratoId: boleto.contrato_id,
      createdAt: boleto.created_at,
    }))

    return NextResponse.json({
      boletos: boletosFormatados,
      total: count || 0,
      page,
      limit,
    })
  } catch (error) {
    console.error("[Cora Boletos] Erro inesperado ao listar:", error)
    return NextResponse.json(
      { error: "Erro interno ao listar boletos" },
      { status: 500 }
    )
  }
}
