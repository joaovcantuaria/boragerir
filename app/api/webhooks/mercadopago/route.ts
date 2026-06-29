import { NextRequest, NextResponse } from "next/server"
import { MercadoPagoConfig, Payment, PreApproval } from "mercadopago"
import { createClient } from "@/lib/supabase/server"
import { createHmac } from "crypto"

const mp = new MercadoPagoConfig({
  accessToken: process.env.MERCADOPAGO_ACCESS_TOKEN!,
})

// Valida a assinatura do webhook do Mercado Pago
function validarAssinaturaMP(req: NextRequest, body: string): boolean {
  const secret = process.env.MERCADOPAGO_WEBHOOK_SECRET
  if (!secret) return true // sem secret configurado, aceita (compatibilidade)

  const xSignature = req.headers.get("x-signature") ?? ""
  const xRequestId = req.headers.get("x-request-id") ?? ""
  const dataId = req.nextUrl.searchParams.get("data.id") ?? ""

  // Formato: ts=<timestamp>,v1=<hash>
  const parts = Object.fromEntries(xSignature.split(",").map(p => p.split("=")))
  const ts = parts["ts"] ?? ""
  const v1 = parts["v1"] ?? ""

  if (!ts || !v1) return false

  const manifest = `id:${dataId};request-id:${xRequestId};ts:${ts};`
  const expected = createHmac("sha256", secret).update(manifest).digest("hex")

  return expected === v1
}

export async function POST(req: NextRequest) {
  try {
    const rawBody = await req.text()

    // Valida assinatura — rejeita chamadas não originadas do Mercado Pago
    if (!validarAssinaturaMP(req, rawBody)) {
      console.warn("Webhook MP: assinatura inválida")
      return NextResponse.json({ erro: "Assinatura inválida" }, { status: 401 })
    }

    const body = JSON.parse(rawBody)
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
          await supabase.from("assinaturas")
            .update({
              status: "ativa",
              data_inicio: new Date().toISOString(),
              mp_payment_id: pagamento.id?.toString(),
            })
            .eq("empresa_id", meta.empresa_id)
            .eq("mp_pix_payment_id", pagamento.id?.toString())

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
