import { NextRequest, NextResponse } from "next/server"
import { validateCoraAccess, isCoraAccessError } from "@/lib/cora/middleware"
import { createAdminClient } from "@/lib/supabase/admin"

/**
 * GET /api/cora/pix/status?boletoId=UUID
 *
 * Consulta o status de uma cobrança Pix/boleto no banco local.
 * Usado pelo PDV para polling — NÃO chama a API da Cora.
 *
 * Resposta: { status: "aberto" | "pago" | "vencido" | "cancelado", dataPagamento?: string }
 */
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
    .select("status, data_pagamento")
    .eq("id", boletoId)
    .eq("empresa_id", empresaId)
    .single()

  if (error || !boleto) {
    return NextResponse.json(
      { error: "Boleto não encontrado" },
      { status: 404 }
    )
  }

  return NextResponse.json({
    status: boleto.status,
    dataPagamento: boleto.data_pagamento || undefined,
  })
}
