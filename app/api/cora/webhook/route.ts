import { NextRequest, NextResponse } from "next/server"
import { createAdminClient } from "@/lib/supabase/admin"
import type { CoraWebhookPayload } from "@/lib/cora/types"
import { aplicarStatusBoleto, CAMPOS_BOLETO_CONCILIACAO } from "@/lib/cora/conciliacao"

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
    .select(CAMPOS_BOLETO_CONCILIACAO)
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

  // Atualiza o status e, se pago, dá baixa na venda/parcela/caixa (uma única vez)
  try {
    await aplicarStatusBoleto(supabase, boleto, targetStatus as "pago" | "vencido" | "cancelado")
  } catch (updateError) {
    console.error("[Cora Webhook] Erro ao atualizar boleto:", updateError)
    return NextResponse.json(
      { error: "Erro ao atualizar boleto" },
      { status: 500 }
    )
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
