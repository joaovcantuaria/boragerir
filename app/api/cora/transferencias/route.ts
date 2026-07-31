import { NextRequest, NextResponse } from "next/server"
import { validateCoraAccess, isCoraAccessError } from "@/lib/cora/middleware"
import { CoraClient, CoraApiError } from "@/lib/cora/client"
import { createAdminClient } from "@/lib/supabase/admin"
import { logCoraAudit } from "@/lib/cora/audit"
import type { CoraTransferRequest } from "@/lib/cora/types"

// === POST: Solicitar transferência ===

export async function POST(request: NextRequest) {
  const access = await validateCoraAccess()
  if (isCoraAccessError(access)) {
    return access
  }

  const { empresaId, userId } = access

  try {
    const body = await request.json()
    const { banco, agencia, conta, tipoConta, documento, nomeTitular, valor, descricao } = body

    // Validação dos dados
    const erros: string[] = []

    if (!banco || banco.trim() === "") erros.push("banco é obrigatório")
    if (!agencia || agencia.trim() === "") erros.push("agencia é obrigatório")
    if (!conta || conta.trim() === "") erros.push("conta é obrigatório")
    if (!tipoConta || !["corrente", "poupanca"].includes(tipoConta)) {
      erros.push("tipoConta deve ser 'corrente' ou 'poupanca'")
    }
    if (!documento || documento.trim() === "") erros.push("documento é obrigatório")
    if (!nomeTitular || nomeTitular.trim() === "") erros.push("nomeTitular é obrigatório")
    if (!valor || typeof valor !== "number" || valor <= 0) {
      erros.push("valor deve ser um número positivo")
    }
    if (!descricao || descricao.trim() === "") erros.push("descricao é obrigatório")

    if (erros.length > 0) {
      return NextResponse.json(
        { error: "Dados inválidos", campos: erros },
        { status: 400 }
      )
    }

    // Converter valor de reais para centavos
    const valorCentavos = Math.round(valor * 100)

    // Mapear tipoConta para accountType da Cora
    const accountType = tipoConta === "corrente" ? "CHECKING" : "SAVINGS"

    // Montar CoraTransferRequest
    const transferRequest: CoraTransferRequest = {
      amount: valorCentavos,
      description: descricao.trim(),
      destination: {
        bankCode: banco.trim(),
        branchNumber: agencia.trim(),
        accountNumber: conta.trim(),
        accountType,
        document: documento.trim(),
        name: nomeTitular.trim(),
      },
    }

    // Buscar cora_conta da empresa
    const supabase = createAdminClient()
    const { data: coraConta, error: contaError } = await supabase
      .from("cora_contas")
      .select("id")
      .eq("empresa_id", empresaId)
      .eq("status", "ativo")
      .single()

    if (contaError || !coraConta) {
      return NextResponse.json(
        { error: "Conta Cora não encontrada ou inativa. Conecte sua conta Cora nas Configurações." },
        { status: 400 }
      )
    }

    // Enviar transferência para a Cora
    const client = new CoraClient(empresaId)
    const coraResponse = await client.createTransfer(transferRequest)

    // Salvar na tabela cora_transacoes
    const { data: transacao, error: insertError } = await supabase
      .from("cora_transacoes")
      .insert({
        empresa_id: empresaId,
        cora_conta_id: coraConta.id,
        cora_transfer_id: coraResponse.id,
        tipo: "transferencia",
        valor,
        descricao: descricao.trim(),
        conta_destino: {
          banco: banco.trim(),
          agencia: agencia.trim(),
          conta: conta.trim(),
          tipoConta,
          documento: documento.trim(),
          nomeTitular: nomeTitular.trim(),
        },
        status: "iniciada",
      })
      .select()
      .single()

    if (insertError) {
      console.error("[Cora Transferencias] Erro ao salvar transação:", insertError)
      return NextResponse.json(
        { error: "Transferência enviada à Cora mas houve erro ao salvar localmente" },
        { status: 500 }
      )
    }

    // Registrar audit log
    await logCoraAudit(empresaId, userId, "transferencia", {
      transacao_id: transacao.id,
      cora_transfer_id: coraResponse.id,
      valor,
    })

    // Retornar dados da transferência
    return NextResponse.json(
      {
        id: transacao.id,
        coraTransferId: coraResponse.id,
        valor,
        descricao: descricao.trim(),
        contaDestino: {
          banco: banco.trim(),
          agencia: agencia.trim(),
          conta: conta.trim(),
          tipoConta,
          documento: documento.trim(),
          nomeTitular: nomeTitular.trim(),
        },
        status: "iniciada",
        createdAt: transacao.created_at,
      },
      { status: 201 }
    )
  } catch (error) {
    if (error instanceof CoraApiError) {
      console.error("[Cora Transferencias] Erro API Cora:", error.statusCode, error.code, error.message)
      return NextResponse.json(
        { error: error.message || "Erro na comunicação com a Cora", codigoErro: error.code },
        { status: 502 }
      )
    }
    console.error("[Cora Transferencias] Erro inesperado:", error)
    return NextResponse.json(
      { error: "Erro interno ao solicitar transferência" },
      { status: 500 }
    )
  }
}

// === GET: Listar transferências ===

export async function GET(request: NextRequest) {
  const access = await validateCoraAccess()
  if (isCoraAccessError(access)) {
    return access
  }

  const { empresaId } = access

  try {
    const { searchParams } = new URL(request.url)
    const page = Math.max(1, parseInt(searchParams.get("page") || "1", 10))
    const limit = Math.min(100, Math.max(1, parseInt(searchParams.get("limit") || "20", 10)))
    const offset = (page - 1) * limit

    const supabase = createAdminClient()

    const { data: transferencias, count, error } = await supabase
      .from("cora_transacoes")
      .select("*", { count: "exact" })
      .eq("empresa_id", empresaId)
      .order("created_at", { ascending: false })
      .range(offset, offset + limit - 1)

    if (error) {
      console.error("[Cora Transferencias] Erro ao listar:", error)
      return NextResponse.json(
        { error: "Erro ao buscar transferências" },
        { status: 500 }
      )
    }

    // Formatar resposta
    const transferenciasFormatadas = (transferencias || []).map((t: any) => ({
      id: t.id,
      coraTransferId: t.cora_transfer_id,
      tipo: t.tipo,
      valor: t.valor,
      descricao: t.descricao,
      contaDestino: t.conta_destino,
      status: t.status,
      createdAt: t.created_at,
      updatedAt: t.updated_at,
    }))

    return NextResponse.json({
      transferencias: transferenciasFormatadas,
      total: count || 0,
      page,
      limit,
    })
  } catch (error) {
    console.error("[Cora Transferencias] Erro inesperado ao listar:", error)
    return NextResponse.json(
      { error: "Erro interno ao listar transferências" },
      { status: 500 }
    )
  }
}
