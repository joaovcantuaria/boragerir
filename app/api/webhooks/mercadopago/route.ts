import { NextRequest, NextResponse } from "next/server"
import { createAdminClient } from "@/lib/supabase/admin"

export async function POST(req: NextRequest) {
  try {
    const rawBody = await req.text()
    console.log("Webhook MP raw:", rawBody.slice(0, 500))

    const body = JSON.parse(rawBody)
    const { type, data, action } = body

    console.log("Webhook MP:", JSON.stringify({ type, action, dataId: data?.id }))

    const supabase = createAdminClient()
    const accessToken = process.env.MERCADOPAGO_ACCESS_TOKEN!

    // ── Pagamento ──────────────────────────────────────────────
    if (type === "payment" && data?.id) {
      // Tentar buscar detalhes do pagamento
      let pagamento: Record<string, unknown> | null = null
      try {
        const res = await fetch(`https://api.mercadopago.com/v1/payments/${data.id}`, {
          headers: { "Authorization": `Bearer ${accessToken}` },
        })
        const text = await res.text()
        console.log("Webhook MP payment fetch:", res.status, text.slice(0, 300))
        if (res.ok) {
          pagamento = JSON.parse(text)
        }
      } catch (e) {
        console.error("Webhook: erro ao buscar pagamento:", e)
      }

      if (pagamento && pagamento.status === "approved") {
        const meta = (pagamento.metadata ?? {}) as Record<string, string>
        const externalRef = pagamento.external_reference as string | undefined
        const paymentId = String(pagamento.id)

        let empresaId = meta?.empresa_id
        let plano = meta?.plano

        if (!empresaId && externalRef) {
          // external_reference é o empresa_id direto
          empresaId = externalRef
        }

        console.log("Webhook MP approved:", { empresaId, plano, paymentId })

        if (empresaId) {
          // Ativar assinatura pendente
          const { data: updated, error: errUpdate } = await supabase.from("assinaturas")
            .update({
              status: "ativa",
              data_inicio: new Date().toISOString(),
              mp_payment_id: paymentId,
            })
            .eq("empresa_id", empresaId)
            .eq("status", "pendente")
            .select("id")

          console.log("Webhook assinatura update:", { updated, errUpdate })

          // Atualizar plano da empresa
          if (plano) {
            const { error: errEmpresa } = await supabase.from("empresas")
              .update({ plano, plano_ativo: true })
              .eq("id", empresaId)
            console.log("Webhook empresa update:", { plano, errEmpresa })
          }
        }
      }

      if (pagamento && (pagamento.status === "cancelled" || pagamento.status === "rejected")) {
        const meta = (pagamento.metadata ?? {}) as Record<string, string>
        if (meta?.empresa_id) {
          await supabase.from("assinaturas")
            .update({ status: "cancelada" })
            .eq("empresa_id", meta.empresa_id)
            .eq("status", "pendente")
        }
      }
    }

    // ── Merchant Order (Checkout Pro envia isso) ───────────────
    if (type === "merchant_order" && data?.id) {
      try {
        const res = await fetch(`https://api.mercadopago.com/merchant_orders/${data.id}`, {
          headers: { "Authorization": `Bearer ${accessToken}` },
        })
        if (res.ok) {
          const order = await res.json()
          console.log("Webhook merchant_order:", JSON.stringify(order).slice(0, 500))

          // Verificar se todos os pagamentos estão aprovados
          const payments = order.payments ?? []
          const totalPago = payments
            .filter((p: Record<string, unknown>) => p.status === "approved")
            .reduce((sum: number, p: Record<string, unknown>) => sum + (p.transaction_amount as number ?? 0), 0)

          if (totalPago >= order.total_amount && order.external_reference) {
            // external_reference é o empresa_id
            const empresaId = order.external_reference

            if (empresaId) {
              // Buscar assinatura pendente para saber o plano
              const { data: assPendente } = await supabase.from("assinaturas")
                .select("id, plano")
                .eq("empresa_id", empresaId)
                .eq("status", "pendente")
                .order("created_at", { ascending: false })
                .limit(1)
                .single()

              if (assPendente) {
                await supabase.from("assinaturas")
                  .update({
                    status: "ativa",
                    data_inicio: new Date().toISOString(),
                    mp_payment_id: payments[0]?.id?.toString() ?? "",
                  })
                  .eq("id", assPendente.id)

                await supabase.from("empresas")
                  .update({ plano: assPendente.plano, plano_ativo: true })
                  .eq("id", empresaId)

                console.log("Webhook merchant_order ativou:", { empresaId, plano: assPendente.plano })
              }
            }
          }
        }
      } catch (e) {
        console.error("Webhook merchant_order erro:", e)
      }
    }

    return NextResponse.json({ ok: true })
  } catch (error) {
    console.error("Webhook MP erro fatal:", error)
    return NextResponse.json({ ok: true })
  }
}

// GET para validação de URL
export async function GET() {
  return NextResponse.json({ status: "webhook ativo — Bora Gerir" })
}
