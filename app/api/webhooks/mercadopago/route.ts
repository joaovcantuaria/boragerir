import { NextRequest, NextResponse } from "next/server"
import { MercadoPagoConfig, Payment, PreApproval } from "mercadopago"
import { createClient } from "@/lib/supabase/server"

const mp = new MercadoPagoConfig({
  accessToken: process.env.MERCADOPAGO_ACCESS_TOKEN!,
})

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { type, data } = body

    console.log("Webhook MP recebido:", type, data?.id)

    const supabase = await createClient()

    // ── Pagamento Pix confirmado ──────────────────────────────
    if (type === "payment") {
      const payment = new Payment(mp)
      const pagamento = await payment.get({ id: data.id })

      if (pagamento.status === "approved") {
        const meta = pagamento.metadata as {
          empresa_id?: string
          plano?: string
          periodicidade?: string
        }

        if (meta?.empresa_id) {
          // Ativar assinatura Pix
          await supabase.from("assinaturas")
            .update({
              status: "ativa",
              data_inicio: new Date().toISOString(),
              mp_payment_id: pagamento.id?.toString(),
            })
            .eq("empresa_id", meta.empresa_id)
            .eq("mp_pix_payment_id", pagamento.id?.toString())

          // Atualizar plano na empresa
          if (meta.plano) {
            await supabase.from("empresas")
              .update({ plano: meta.plano, plano_ativo: true })
              .eq("id", meta.empresa_id)
          }

          console.log(`✅ Pix aprovado para empresa ${meta.empresa_id}`)
        }
      }

      if (pagamento.status === "cancelled" || pagamento.status === "rejected") {
        const meta = pagamento.metadata as { empresa_id?: string }
        if (meta?.empresa_id) {
          await supabase.from("assinaturas")
            .update({ status: "cancelada" })
            .eq("mp_pix_payment_id", pagamento.id?.toString())
          console.log(`❌ Pix cancelado/rejeitado para empresa ${meta.empresa_id}`)
        }
      }
    }

    // ── Assinatura recorrente (cartão) ────────────────────────
    if (type === "subscription_preapproval") {
      const preApproval = new PreApproval(mp)
      const assinatura = await preApproval.get({ id: data.id })
      const meta = assinatura.metadata as { empresa_id?: string; plano?: string }

      if (!meta?.empresa_id) return NextResponse.json({ ok: true })

      if (assinatura.status === "authorized") {
        await supabase.from("assinaturas")
          .update({ status: "ativa" })
          .eq("mp_preapproval_id", data.id)

        await supabase.from("empresas")
          .update({ plano: meta.plano ?? "basico", plano_ativo: true })
          .eq("id", meta.empresa_id)

        console.log(`✅ Assinatura ativada para empresa ${meta.empresa_id}`)
      }

      if (assinatura.status === "cancelled" || assinatura.status === "paused") {
        await supabase.from("assinaturas")
          .update({ status: assinatura.status === "cancelled" ? "cancelada" : "pausada" })
          .eq("mp_preapproval_id", data.id)

        // Rebaixar para plano gratuito se cancelado
        if (assinatura.status === "cancelled") {
          await supabase.from("empresas")
            .update({ plano: "gratuito", plano_ativo: true })
            .eq("id", meta.empresa_id)
          console.log(`⚠️ Empresa ${meta.empresa_id} rebaixada para gratuito`)
        }
      }
    }

    return NextResponse.json({ ok: true })

  } catch (error) {
    console.error("Erro no webhook MP:", error)
    return NextResponse.json({ erro: "Erro interno" }, { status: 500 })
  }
}

// Mercado Pago envia GET para validar a URL
export async function GET() {
  return NextResponse.json({ status: "webhook ativo — Bora Gerir" })
}
