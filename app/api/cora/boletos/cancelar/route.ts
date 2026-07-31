import { NextRequest, NextResponse } from "next/server"
import { validateCoraAccess, isCoraAccessError } from "@/lib/cora/middleware"
import { CoraClient, CoraApiError } from "@/lib/cora/client"
import { logCoraAudit } from "@/lib/cora/audit"
import { createAdminClient } from "@/lib/supabase/admin"

export async function POST(req: NextRequest) {
  // 1. Validar acesso (sessão + plano profissional)
  const access = await validateCoraAccess()
  if (isCoraAccessError(access)) {
    return access
  }

  const { empresaId, userId } = access

  // 2. Obter boletoId do body
  let body: { boletoId?: string }
  try {
    body = await req.json()
  } catch {
    return NextResponse.json(
      { error: "Body inválido" },
      { status: 400 }
    )
  }

  const { boletoId } = body

  if (!boletoId) {
    return NextResponse.json(
      { error: "boletoId é obrigatório" },
      { status: 400 }
    )
  }

  try {
    const supabase = createAdminClient()

    // 3. Buscar boleto pertencente à empresa
    const { data: boleto, error: fetchError } = await supabase
      .from("cora_boletos")
      .select("*")
      .eq("id", boletoId)
      .eq("empresa_id", empresaId)
      .single()

    if (fetchError || !boleto) {
      return NextResponse.json(
        { error: "Boleto não encontrado" },
        { status: 404 }
      )
    }

    // 4. Verificar se boleto já está pago
    if (boleto.status === "pago") {
      return NextResponse.json(
        { error: "Não é possível cancelar um boleto já pago" },
        { status: 400 }
      )
    }

    // 5. Verificar se boleto já está cancelado
    if (boleto.status === "cancelado") {
      return NextResponse.json(
        { error: "Boleto já está cancelado" },
        { status: 400 }
      )
    }

    // 6. Cancelar na Cora
    const client = new CoraClient(empresaId)
    await client.cancelInvoice(boleto.cora_invoice_id)

    // 7. Atualizar status local
    const { data: updatedBoleto, error: updateError } = await supabase
      .from("cora_boletos")
      .update({
        status: "cancelado",
        data_cancelamento: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq("id", boletoId)
      .eq("empresa_id", empresaId)
      .select()
      .single()

    if (updateError) {
      console.error("[Cora Cancelar Boleto] Erro ao atualizar:", updateError)
      return NextResponse.json(
        { error: "Erro ao atualizar status do boleto" },
        { status: 500 }
      )
    }

    // 8. Registrar audit log
    await logCoraAudit(empresaId, userId, "cancelamento_boleto", {
      boleto_id: boletoId,
      cora_invoice_id: boleto.cora_invoice_id,
    })

    // 9. Retornar boleto atualizado
    return NextResponse.json(updatedBoleto)
  } catch (error) {
    if (error instanceof CoraApiError) {
      console.error("[Cora Cancelar Boleto] Erro API Cora:", error.message)
      return NextResponse.json(
        { error: error.message || "Erro ao cancelar boleto na Cora" },
        { status: error.statusCode >= 500 ? 502 : error.statusCode }
      )
    }

    console.error("[Cora Cancelar Boleto] Erro inesperado:", error)
    return NextResponse.json(
      { error: "Erro interno ao cancelar boleto" },
      { status: 500 }
    )
  }
}
