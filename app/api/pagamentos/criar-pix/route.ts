import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { createAdminClient } from "@/lib/supabase/admin"
import { calcularValor, type PlanoMP, type Periodicidade } from "@/lib/mercadopago/client"
import { randomUUID } from "crypto"

export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ erro: "Não autenticado" }, { status: 401 })

    const { data: empresa } = await supabase
      .from("empresas").select("*").eq("user_id", user.id).single()
    if (!empresa) return NextResponse.json({ erro: "Empresa não encontrada" }, { status: 404 })

    const body = await req.json()
    const { plano, periodicidade, cupom_codigo } = body as {
      plano: PlanoMP; periodicidade: Periodicidade; cupom_codigo?: string
    }
    let { valorTotal, descricao } = calcularValor(plano, periodicidade)

    // ── Aplicar cupom ──────────────────────────────────────────
    let cupomAplicado: { id: string; tipo: string; valor: number; codigo: string } | null = null
    if (cupom_codigo) {
      const admin = createAdminClient()
      const { data: cupom } = await admin
        .from("cupons").select("*")
        .eq("codigo", cupom_codigo.toUpperCase().trim())
        .eq("ativo", true).single()

      if (cupom) {
        const vencido = cupom.validade && new Date() > new Date(cupom.validade)
        const esgotado = cupom.uso_maximo !== null && cupom.uso_atual >= cupom.uso_maximo
        if (!vencido && !esgotado) {
          cupomAplicado = { id: cupom.id, tipo: cupom.tipo, valor: cupom.valor, codigo: cupom.codigo }
          valorTotal = cupom.tipo === "percentual"
            ? Math.max(0.01, valorTotal * (1 - cupom.valor / 100))
            : Math.max(0.01, valorTotal - cupom.valor)
          descricao += ` (cupom ${cupom.codigo})`
        }
      }
    }

    const accessToken = process.env.MERCADOPAGO_ACCESS_TOKEN
    if (!accessToken) return NextResponse.json({ erro: "Gateway não configurado" }, { status: 500 })

    const appUrl = process.env.NEXT_PUBLIC_APP_URL || "https://app.boragerir.com"
    const notificationUrl = `${appUrl}/api/webhooks/mercadopago`
    const payerEmail = empresa.email || user.email || "cliente@boragerir.com"
    const valorFinal = Number(valorTotal.toFixed(2))
    const externalReference = `${empresa.id}|${plano}|${periodicidade}|${Date.now()}`

    // ── Criar pagamento via API /v1/orders (Checkout Transparente) ──
    const orderBody = {
      type: "online",
      processing_mode: "automatic",
      total_amount: valorFinal.toFixed(2),
      external_reference: externalReference,
      description: descricao,
      payer: { email: payerEmail },
      transactions: {
        payments: [{
          amount: valorFinal.toFixed(2),
          payment_method: { id: "pix", type: "bank_transfer" },
        }],
      },
      notification_url: notificationUrl,
    }

    const res = await fetch("https://api.mercadopago.com/v1/orders", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${accessToken}`,
        "X-Idempotency-Key": randomUUID(),
      },
      body: JSON.stringify(orderBody),
    })

    const resText = await res.text()

    if (!res.ok) {
      console.error("Orders API erro:", res.status, resText.slice(0, 500))
      return NextResponse.json({
        erro: `Erro ao gerar Pix (status ${res.status})`,
        detalhe: resText.slice(0, 200),
      }, { status: 500 })
    }

    let data: Record<string, unknown>
    try {
      data = JSON.parse(resText)
    } catch {
      console.error("Orders API resposta invalida:", resText.slice(0, 500))
      return NextResponse.json({ erro: "Resposta inválida do gateway" }, { status: 500 })
    }

    // ── Extrair QR Code da resposta ─────────────────────────────
    // A resposta pode ter QR em vários caminhos, buscar via regex no JSON
    const raw = resText
    const qrBase64Match = raw.match(/"qr_code_base64":"([^"]+)"/)
    const qrCodeMatch = raw.match(/"qr_code":"(00[^"]+)"/)  // Pix copia-e-cola sempre começa com 00
    const ticketUrlMatch = raw.match(/"ticket_url":"(https[^"]+)"/)

    const qrCode = qrBase64Match ? qrBase64Match[1] : null
    const qrCodeText = qrCodeMatch ? qrCodeMatch[1] : (ticketUrlMatch ? ticketUrlMatch[1] : null)

    // Extrair payment ID
    const paymentIdMatch = raw.match(/"payments":\[.*?"id":"([^"]+)"/)
    const orderId = String(data.id ?? "")
    const paymentId = paymentIdMatch ? paymentIdMatch[1] : orderId

    if (!qrCode && !qrCodeText) {
      console.error("Orders API sem QR Code:", resText.slice(0, 1000))
      return NextResponse.json({
        erro: "Pix gerado mas sem QR Code na resposta",
        order_id: orderId,
      }, { status: 500 })
    }

    // ── Salvar assinatura pendente ─────────────────────────────
    try {
      await supabase.from("assinaturas").insert({
        empresa_id: empresa.id,
        plano,
        periodicidade,
        status: "pendente",
        forma_pagamento: "pix",
        valor_mensal: plano === "basico" ? 49 : plano === "agenda" ? 29 : 99,
        valor_total: valorFinal,
        mp_pix_payment_id: paymentId,
        mp_pix_qr_code: qrCode,
        mp_pix_qr_code_text: qrCodeText,
      })
    } catch (e) { console.warn("Assinatura não salva:", e) }

    // ── Incrementar cupom ──────────────────────────────────────
    if (cupomAplicado) {
      try {
        const admin = createAdminClient()
        const { data: d } = await admin.from("cupons").select("uso_atual").eq("id", cupomAplicado.id).single()
        await admin.from("cupons").update({ uso_atual: (d?.uso_atual ?? 0) + 1 }).eq("id", cupomAplicado.id)
      } catch {}
    }

    const valorOriginal = calcularValor(plano, periodicidade).valorTotal
    return NextResponse.json({
      sucesso: true,
      payment_id: paymentId,
      qr_code: qrCode,
      qr_code_text: qrCodeText,
      valor: valorFinal,
      valor_original: valorOriginal,
      desconto_aplicado: cupomAplicado ? Number((valorOriginal - valorFinal).toFixed(2)) : 0,
      cupom: cupomAplicado?.codigo ?? null,
    })

  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : String(error)
    console.error("Erro fatal Pix:", msg)
    return NextResponse.json({ erro: msg }, { status: 500 })
  }
}
