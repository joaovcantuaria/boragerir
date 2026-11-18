import { NextRequest, NextResponse } from "next/server"
import { validateCoraAccess, isCoraAccessError } from "@/lib/cora/middleware"
import { createAdminClient } from "@/lib/supabase/admin"
import { CoraClient } from "@/lib/cora/client"
import { aplicarStatusBoleto, CAMPOS_BOLETO_CONCILIACAO, type BoletoConciliacao } from "@/lib/cora/conciliacao"

/**
 * GET /api/cora/pix/status?boletoId=UUID
 *
 * Status de uma cobrança Pix/boleto. Usado pelo PDV (consulta a cada 5 s).
 * Se no banco ainda está "aberto", confere direto na Cora: assim o pagamento é
 * reconhecido mesmo que o aviso automático (webhook) da Cora não chegue.
 *
 * Resposta: { status: "aberto" | "pago" | "vencido" | "cancelado", dataPagamento?: string }
 */
const STATUS_CORA: Record<string, "pago" | "cancelado"> = {
  PAID: "pago",
  CANCELED: "cancelado",
  CANCELLED: "cancelado",
}

export async function GET(request: NextRequest) {
  const access = await validateCoraAccess()
  if (isCoraAccessError(access)) {
    return access
  }

  const { empresaId } = access

  const boletoId = request.nextUrl.searchParams.get("boletoId")

  if (!boletoId) {
    return NextResponse.json(
      { error: "Parâmetro 'boletoId' é obrigatório" },
      { status: 400 }
    )
  }

  const supabase = createAdminClient()

  const { data: boleto, error } = await supabase
    .from("cora_boletos")
    .select(`${CAMPOS_BOLETO_CONCILIACAO}, data_pagamento, cora_invoice_id`)
    .eq("id", boletoId)
    .eq("empresa_id", empresaId)
    .single()

  if (error || !boleto) {
    return NextResponse.json(
      { error: "Boleto não encontrado" },
      { status: 404 }
    )
  }

  // Ainda em aberto aqui: pergunta para a Cora se já foi pago
  if (boleto.status === "aberto" && boleto.cora_invoice_id) {
    try {
      const fatura = await new CoraClient(empresaId).getInvoice(boleto.cora_invoice_id)
      const novo = STATUS_CORA[String(fatura.status ?? "").toUpperCase()]
      if (novo) {
        await aplicarStatusBoleto(supabase, boleto as BoletoConciliacao, novo)
        return NextResponse.json({
          status: novo,
          dataPagamento: novo === "pago" ? new Date().toISOString() : undefined,
        })
      }
    } catch (e) {
      // Falha ao consultar a Cora: responde com o que está no banco; a próxima consulta tenta de novo
      console.error("[Cora Pix status] Falha ao consultar a Cora:", e)
    }
  }

  return NextResponse.json({
    status: boleto.status,
    dataPagamento: boleto.data_pagamento || undefined,
  })
}
