import { NextRequest, NextResponse } from "next/server"
import { createAdminClient } from "@/lib/supabase/admin"
import { createHmac } from "crypto"

// Valida a assinatura do webhook do Mercado Pago
function validarAssinaturaMP(req: NextRequest): boolean {
  const secret = process.env.MERCADOPAGO_WEBHOOK_SECRET
  if (!secret) return true // sem secret configurado, aceita

  const xSignature = req.headers.get("x-signature") ?? ""
  const xRequestId = req.headers.get("x-request-id") ?? ""
  const dataId = req.nextUrl.searchParams.get("data.id") ?? ""

  // Formato: ts=<timestamp>,v1=<hash>
  const parts = Object.fromEntries(xSignature.split(",").map(p => p.split("=")))
  const ts = parts["ts"] ?? ""
  const v1 = parts["v1"] ?? ""

  if (!ts || !v1) return true // Se não tem assinatura, aceita (compatibilidade)

  const manifest = `id:${dataId};request-id:${xRequestId};ts:${ts};`
  const expected = createHmac("sha256", secret).update(manifest).digest("hex")

  return expected === v1
}

export async function POST(req: NextRequest) {
  try {
    const rawBody = await req.text()

    // Valida assinatura
    if (!validarAssinaturaMP(req)) {
      console.warn("Webhook MP: assinatura inválida, mas processando mesmo assim")
    }

    const body = JSON.parse(rawBody)
    const { type, data, action } = body

    console.log("Webhook MP recebido:", type, action, data?.id)

    // Usar admin client (não depende de sessão do usuário)
    const supabase = createAdminClient()
    const accessToken = process.env.MERCADOPAGO_ACCESS_TOKEN!

    // ── Pagamento confirmado ──────────────────────────────────
    if (type === "payment") {
      // Buscar detalhes do pagamento via fetch direto
      let pagamento: Record<string, unknown> | null = null
      try {
        const res = await fetch(`https://api.mercadopago.com/v1/payments/${data.id}`, {
          headers: { "Authorization": `Bearer ${accessToken}` },
        })
        if (res.ok) {
          pagamento = await res.json()
        } else {
          console.error("Webhook: erro ao buscar pagamento", res.status, await res.text().catch(() => ""))
          // Mesmo sem conseguir buscar, retornar 200 para o MP não retentar infinitamente
          return NextResponse.json({ ok: true, aviso: "Não conseguiu buscar pagamento" })
        }
      } catch (e) {
        console.error("Webhook: falha na requisição ao MP", e)
        return NextResponse.json({ ok: true })
      }

      const status = pagamento?.status as string
      const meta = (pagamento?.metadata ?? {}) as Record<string, string>
      const externalRef = pagamento?.external_reference as string | undefined
      const paymentId = String(pagamento?.id ?? data.id)

      if (status === "approved") {
        // Tentar metadata primeiro, fallback para external_reference
        let empresaId = meta?.empresa_id
        let plano = meta?.plano

        if (!empresaId && externalRef) {
          // external_reference formato: "empresa_id|plano|periodicidade|timestamp"
          const partes = externalRef.split("|")
          empresaId = partes[0]
          plano = partes[1]
        }

        if (empresaId) {
          // Ativar assinatura pendente mais recente dessa empresa
          const { data: updated } = await supabase.from("assinaturas")
            .update({
              status: "ativa",
              data_inicio: new Date().toISOString(),
              mp_payment_id: paymentId,
            })
            .eq("empresa_id", empresaId)
            .eq("status", "pendente")
            .order("created_at", { ascending: false })
            .limit(1)
            .select("id")

          if (!updated?.length) {
            // Fallback: tentar por mp_pix_payment_id exato
            await supabase.from("assinaturas")
              .update({
                status: "ativa",
                data_inicio: new Date().toISOString(),
                mp_payment_id: paymentId,
              })
              .eq("mp_pix_payment_id", paymentId)
          }

          // Atualizar plano da empresa
          if (plano) {
            await supabase.from("empresas")
              .update({ plano, plano_ativo: true })
              .eq("id", empresaId)
          }

          console.log(`✅ Pagamento ${paymentId} aprovado — empresa ${empresaId}, plano ${plano}`)
        } else {
          console.warn(`⚠️ Pagamento ${paymentId} aprovado mas sem empresa_id`)
        }
      }

      if (status === "cancelled" || status === "rejected") {
        const empresaId = meta?.empresa_id
        if (empresaId) {
          await supabase.from("assinaturas")
            .update({ status: "cancelada" })
            .eq("empresa_id", empresaId)
            .eq("status", "pendente")
          console.log(`❌ Pagamento ${paymentId} ${status} — empresa ${empresaId}`)
        }
      }
    }

    // ── Assinatura recorrente (cartão) ────────────────────────
    if (type === "subscription_preapproval") {
      try {
        const res = await fetch(`https://api.mercadopago.com/preapproval/${data.id}`, {
          headers: { "Authorization": `Bearer ${accessToken}` },
        })
        if (!res.ok) return NextResponse.json({ ok: true })

        const assinatura = await res.json()
        const meta = (assinatura.metadata ?? {}) as Record<string, string>

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
          }
        }
      } catch (e) {
        console.error("Webhook subscription error:", e)
      }
    }

    return NextResponse.json({ ok: true })

  } catch (error) {
    console.error("Erro no webhook MP:", error)
    // Sempre retornar 200 para evitar retentativas infinitas do MP
    return NextResponse.json({ ok: true, erro: "Erro interno" })
  }
}

// Mercado Pago envia GET para validar a URL
export async function GET() {
  return NextResponse.json({ status: "webhook ativo — Bora Gerir" })
}
