import type { createAdminClient } from "@/lib/supabase/admin"

/**
 * Baixa de cobranças Cora (boleto/Pix) — usada pelo webhook e pela consulta do PDV.
 * O status só muda se ainda não estiver no alvo (update condicional), então a baixa
 * da venda/caixa acontece uma única vez mesmo que webhook e consulta cheguem juntos.
 */

type Admin = ReturnType<typeof createAdminClient>

export interface BoletoConciliacao {
  id: string
  status: string | null
  venda_id: string | null
  parcela_id: string | null
  contrato_id: string | null
  empresa_id: string | null
  valor: number | null
  valor_receber_id: string | null
}

export const CAMPOS_BOLETO_CONCILIACAO =
  "id, status, venda_id, parcela_id, contrato_id, empresa_id, valor, valor_receber_id"

/** Muda o status do boleto (se ainda não estiver nele). Retorna true se esta chamada mudou. */
export async function aplicarStatusBoleto(
  supabase: Admin,
  boleto: BoletoConciliacao,
  novoStatus: "pago" | "vencido" | "cancelado"
): Promise<boolean> {
  const agora = new Date().toISOString()
  const dados: Record<string, unknown> = { status: novoStatus, updated_at: agora }
  if (novoStatus === "pago") dados.data_pagamento = agora

  const { data, error } = await supabase
    .from("cora_boletos")
    .update(dados)
    .eq("id", boleto.id)
    .neq("status", novoStatus)
    .select("id")

  if (error) throw error
  const mudou = (data?.length ?? 0) > 0
  if (mudou && novoStatus === "pago") await processPaymentReconciliation(supabase, boleto)
  return mudou
}

// === Baixa automática: vendas e parcelas de contrato ===

async function processPaymentReconciliation(
  supabase: Admin,
  boleto: BoletoConciliacao
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
  supabase: Admin,
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
  supabase: Admin,
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
