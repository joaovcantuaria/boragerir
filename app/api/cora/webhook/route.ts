import { NextRequest, NextResponse } from "next/server"
import { createAdminClient } from "@/lib/supabase/admin"
import type { CoraWebhookPayload } from "@/lib/cora/types"

// === Mapeamento de triggers para status local ===

const INVOICE_TRIGGER_MAP: Record<string, string> = {
  "invoice.paid": "pago",
  "invoice.overdue": "vencido",
  "invoice.canceled": "cancelado",
}

const TRANSFER_TRIGGER_MAP: Record<string, string> = {
  "transfer.completed": "concluida",
  "transfer.canceled": "cancelada",
}

// === POST: Receber webhook da Cora ===

export async function POST(request: NextRequest) {
  // 1. Validar Authorization header
  const authHeader = request.headers.get("authorization")
  const webhookSecret = process.env.CORA_WEBHOOK_SECRET

  if (!webhookSecret || authHeader !== webhookSecret) {
    return NextResponse.json(
      { error: "Unauthorized" },
      { status: 401 }
    )
  }

  try {
    // 2. Parse do payload
    const payload: CoraWebhookPayload = await request.json()
    const { resource, trigger, data } = payload
    const resourceId = data.id as string

    if (!resourceId) {
      return NextResponse.json(
        { error: "Payload inválido: data.id ausente" },
        { status: 400 }
      )
    }

    const supabase = createAdminClient()

    // 3. Processar conforme resource type
    if (resource === "invoice" || resource === "payment") {
      return await processInvoiceEvent(supabase, trigger, resourceId)
    }

    if (resource === "transfer") {
      return await processTransferEvent(supabase, trigger, resourceId)
    }

    // Resource desconhecido — aceitar sem processar
    return NextResponse.json({ status: "ignored", resource })
  } catch (error) {
    console.error("[Cora Webhook] Erro ao processar webhook:", error)
    return NextResponse.json(
      { error: "Erro interno ao processar webhook" },
      { status: 500 }
    )
  }
}

// === Processamento de eventos de invoice (boleto/pix) ===

async function processInvoiceEvent(
  supabase: ReturnType<typeof createAdminClient>,
  trigger: string,
  coraInvoiceId: string
) {
  const targetStatus = INVOICE_TRIGGER_MAP[trigger]

  if (!targetStatus) {
    // Trigger não mapeado — aceitar sem processar
    return NextResponse.json({ status: "ignored", trigger })
  }

  // Buscar boleto pelo cora_invoice_id
  const { data: boleto, error: fetchError } = await supabase
    .from("cora_boletos")
    .select("id, status, venda_id, parcela_id, contrato_id, empresa_id, valor, valor_receber_id")
    .eq("cora_invoice_id", coraInvoiceId)
    .single()

  if (fetchError || !boleto) {
    // Boleto não encontrado — pode ser de outra integração
    console.warn("[Cora Webhook] Boleto não encontrado para cora_invoice_id:", coraInvoiceId)
    return NextResponse.json({ status: "not_found", coraInvoiceId })
  }

  // Idempotência: se já está no status alvo, retornar 200 sem fazer nada
  if (boleto.status === targetStatus) {
    return NextResponse.json({ status: "already_processed", boletoId: boleto.id })
  }

  // Montar update
  const updateData: Record<string, unknown> = {
    status: targetStatus,
    updated_at: new Date().toISOString(),
  }

  // Para trigger "paid": registrar data de pagamento
  if (trigger === "invoice.paid") {
    updateData.data_pagamento = new Date().toISOString()
  }

  // Atualizar status do boleto
  const { error: updateError } = await supabase
    .from("cora_boletos")
    .update(updateData)
    .eq("id", boleto.id)

  if (updateError) {
    console.error("[Cora Webhook] Erro ao atualizar boleto:", updateError)
    return NextResponse.json(
      { error: "Erro ao atualizar boleto" },
      { status: 500 }
    )
  }

  // === Task 9.2: Baixa automática em vendas e parcelas ===
  if (trigger === "invoice.paid") {
    await processPaymentReconciliation(supabase, boleto)
  }

  return NextResponse.json({ status: "processed", boletoId: boleto.id, newStatus: targetStatus })
}

// === Processamento de eventos de transferência ===

async function processTransferEvent(
  supabase: ReturnType<typeof createAdminClient>,
  trigger: string,
  coraTransferId: string
) {
  const targetStatus = TRANSFER_TRIGGER_MAP[trigger]

  if (!targetStatus) {
    // Trigger não mapeado — aceitar sem processar
    return NextResponse.json({ status: "ignored", trigger })
  }

  // Buscar transação pelo cora_transfer_id
  const { data: transacao, error: fetchError } = await supabase
    .from("cora_transacoes")
    .select("id, status")
    .eq("cora_transfer_id", coraTransferId)
    .single()

  if (fetchError || !transacao) {
    console.warn("[Cora Webhook] Transação não encontrada para cora_transfer_id:", coraTransferId)
    return NextResponse.json({ status: "not_found", coraTransferId })
  }

  // Idempotência: se já está no status alvo, retornar 200
  if (transacao.status === targetStatus) {
    return NextResponse.json({ status: "already_processed", transacaoId: transacao.id })
  }

  // Atualizar status
  const { error: updateError } = await supabase
    .from("cora_transacoes")
    .update({
      status: targetStatus,
      updated_at: new Date().toISOString(),
    })
    .eq("id", transacao.id)

  if (updateError) {
    console.error("[Cora Webhook] Erro ao atualizar transação:", updateError)
    return NextResponse.json(
      { error: "Erro ao atualizar transação" },
      { status: 500 }
    )
  }

  return NextResponse.json({ status: "processed", transacaoId: transacao.id, newStatus: targetStatus })
}

// === Baixa automática: vendas e parcelas de contrato ===

async function processPaymentReconciliation(
  supabase: ReturnType<typeof createAdminClient>,
  boleto: {
    id: string;
    venda_id: string | null;
    parcela_id: string | null;
    contrato_id: string | null;
    empresa_id: string | null;
    valor: number | null;
    valor_receber_id: string | null;
  }
) {
  // Quando boleto pago e tem venda_id: marcar venda como concluída
  if (boleto.venda_id) {
    // First check current status
    const { data: venda } = await supabase
      .from("vendas")
      .select("status, forma_pagamento, total")
      .eq("id", boleto.venda_id)
      .single()

    if (venda && venda.status === "pendente_boleto") {
      // Update to concluida
      await supabase
        .from("vendas")
        .update({ status: "concluida", updated_at: new Date().toISOString() })
        .eq("id", boleto.venda_id)

      // Create caixa entry
      if (boleto.empresa_id) {
        await criarMovimentacaoCaixa(
          supabase,
          boleto.empresa_id,
          venda.total ?? boleto.valor ?? 0,
          `Pagamento boleto - Venda`
        )
      }
    } else if (venda && venda.status !== "concluida") {
      // Not pendente_boleto but also not concluida — just update
      await supabase
        .from("vendas")
        .update({ status: "concluida", updated_at: new Date().toISOString() })
        .eq("id", boleto.venda_id)
    }
  }

  // Quando boleto pago e tem parcela_id: dar baixa na parcela do contrato
  if (boleto.parcela_id) {
    const { error: parcelaError } = await supabase
      .from("contratos_parcelas")
      .update({
        status: "pago",
        data_pagamento: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq("id", boleto.parcela_id)

    if (parcelaError) {
      console.error("[Cora Webhook] Erro ao atualizar parcela:", parcelaError)
      return
    }

    // Verificar se todas as parcelas do contrato estão pagas
    if (boleto.contrato_id) {
      await checkAndCompleteContract(supabase, boleto.contrato_id)
    }
  }

  // Quando boleto pago e tem valor_receber_id: dar baixa no valor a receber
  if (boleto.valor_receber_id) {
    const { data: valorReceber } = await supabase
      .from("valores_receber")
      .select("id, status, valor, descricao")
      .eq("id", boleto.valor_receber_id)
      .single()

    if (valorReceber && valorReceber.status === "pendente") {
      await supabase
        .from("valores_receber")
        .update({ status: "recebido" })
        .eq("id", boleto.valor_receber_id)

      if (boleto.empresa_id) {
        await criarMovimentacaoCaixa(
          supabase,
          boleto.empresa_id,
          valorReceber.valor ?? boleto.valor ?? 0,
          `Pagamento boleto - ${valorReceber.descricao || "Valor a Receber"}`
        )
      }
    }
  }
}

// === Cria movimentação no caixa da empresa ===

async function criarMovimentacaoCaixa(
  supabase: ReturnType<typeof createAdminClient>,
  empresaId: string,
  valor: number,
  descricao: string
) {
  // Find open caixa
  let { data: caixa } = await supabase
    .from("caixas")
    .select("id")
    .eq("empresa_id", empresaId)
    .eq("status", "aberto")
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle()

  // Fallback: last closed caixa
  if (!caixa) {
    const { data: lastCaixa } = await supabase
      .from("caixas")
      .select("id")
      .eq("empresa_id", empresaId)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle()
    caixa = lastCaixa
  }

  if (!caixa) {
    console.warn("[Cora Webhook] Nenhum caixa encontrado para empresa:", empresaId)
    return
  }

  await supabase.from("movimentacoes_caixa").insert({
    empresa_id: empresaId,
    caixa_id: caixa.id,
    tipo: "entrada",
    categoria: "venda",
    descricao,
    valor,
  })
}

// === Verifica se todas as parcelas de um contrato estão pagas ===

async function checkAndCompleteContract(
  supabase: ReturnType<typeof createAdminClient>,
  contratoId: string
) {
  // Buscar parcelas não pagas do contrato
  const { data: parcelasPendentes, error } = await supabase
    .from("contratos_parcelas")
    .select("id")
    .eq("contrato_id", contratoId)
    .neq("status", "pago")

  if (error) {
    console.error("[Cora Webhook] Erro ao verificar parcelas do contrato:", error)
    return
  }

  // Se não há parcelas pendentes, contrato está concluído
  if (!parcelasPendentes || parcelasPendentes.length === 0) {
    const { error: contratoError } = await supabase
      .from("contratos")
      .update({
        status: "concluido",
        updated_at: new Date().toISOString(),
      })
      .eq("id", contratoId)

    if (contratoError) {
      console.error("[Cora Webhook] Erro ao concluir contrato:", contratoError)
    }
  }
}
