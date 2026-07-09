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

    // ── Aplicar cupom se fornecido ──────────────────────────
    let cupomAplicado: { id: string; tipo: string; valor: number; codigo: string } | null = null
    if (cupom_codigo) {
      const admin = createAdminClient()
      const { data: cupom } = await admin
        .from("cupons")
        .select("*")
        .eq("codigo", cupom_codigo.toUpperCase().trim())
        .eq("ativo", true)
        .single()

      if (cupom) {
        const vencido = cupom.validade && new Date() > new Date(cupom.validade)
        const esgotado = cupom.uso_maximo !== null && cupom.uso_atual >= cupom.uso_maximo
        if (!vencido && !esgotado) {
          cupomAplicado = { id: cupom.id, tipo: cupom.tipo, valor: cupom.valor, codigo: cupom.codigo }
          if (cupom.tipo === "percentual") {
            valorTotal = Math.max(0.01, valorTotal * (1 - cupom.valor / 100))
          } else {
            valorTotal = Math.max(0.01, valorTotal - cupom.valor)
          }
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

    // ── Tentativa 1: Nova API /v1/orders (Checkout Transparente v2) ──
    const orderBody = {
      type: "online",
      processing_mode: "automatic",
      total_amount: valorFinal.toFixed(2),
      external_reference: externalReference,
      description: descricao,
      payer: {
        email: payerEmail,
      },
      transactions: {
        payments: [
          {
            amount: valorFinal.toFixed(2),
            payment_method: {
              id: "pix",
              type: "bank_transfer",
            },
          },
        ],
      },
      notification_url: notificationUrl,
      metadata: { empresa_id: empresa.id, plano, periodicidade },
    }

    let resultado: Record<string, unknown> | null = null
    let modo = "orders_api"

    const ordersRes = await fetch("https://api.mercadopago.com/v1/orders", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${accessToken}`,
        "X-Idempotency-Key": randomUUID(),
      },
      body: JSON.stringify(orderBody),
    })

    const ordersText = await ordersRes.text()
    console.log("Orders API response:", ordersRes.status, ordersText.slice(0, 500))

    if (ordersRes.ok) {
      try { resultado = JSON.parse(ordersText) } catch {}
    }

    // Se Orders API falhou, tentar API legacy /v1/payments
    if (!ordersRes.ok || !resultado?.id) {
      modo = "payments_api"
      const partes = empresa.nome.trim().split(" ")
      const firstName = partes[0] ?? "Cliente"
      const lastName = partes.slice(1).join(" ") || firstName

      const paymentBody = {
        transaction_amount: valorFinal,
        description: descricao,
        payment_method_id: "pix",
        payer: {
          email: payerEmail,
          first_name: firstName,
          last_name: lastName,
        },
        metadata: { empresa_id: empresa.id, plano, periodicidade },
        notification_url: notificationUrl,
        external_reference: externalReference,
      }

      const payRes = await fetch("https://api.mercadopago.com/v1/payments", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${accessToken}`,
          "X-Idempotency-Key": randomUUID(),
        },
        body: JSON.stringify(paymentBody),
      })

      const payText = await payRes.text()
      console.log("Payments API response:", payRes.status, payText.slice(0, 500))

      if (payRes.ok) {
        try { resultado = JSON.parse(payText) } catch {}
      }

      // Se ambos falharam, usar Checkout Pro como último recurso
      if (!payRes.ok || !resultado?.id) {
        modo = "checkout_pro"
        const prefBody = {
          items: [{ title: descricao, quantity: 1, unit_price: valorFinal, currency_id: "BRL" }],
          payer: { email: payerEmail },
          payment_methods: {
            excluded_payment_types: [{ id: "credit_card" }, { id: "debit_card" }, { id: "ticket" }],
          },
          external_reference: externalReference,
          back_urls: {
            success: `${appUrl}/planos?status=aprovado&plano=${plano}`,
            failure: `${appUrl}/planos?status=falhou`,
            pending: `${appUrl}/planos?status=pendente&plano=${plano}`,
          },
          auto_return: "approved",
          notification_url: notificationUrl,
          metadata: { empresa_id: empresa.id, plano, periodicidade },
        }

        const prefRes = await fetch("https://api.mercadopago.com/checkout/preferences", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${accessToken}`,
            "X-Idempotency-Key": randomUUID(),
          },
          body: JSON.stringify(prefBody),
        })

        if (prefRes.ok) {
          const prefData = await prefRes.json()

          // Salvar assinatura pendente
          await salvarAssinatura(supabase, empresa.id, plano, periodicidade, valorFinal, String(prefData.id))
          if (cupomAplicado) await incrementarCupom(cupomAplicado.id)

          const valorOriginal = calcularValor(plano, periodicidade).valorTotal
          return NextResponse.json({
            sucesso: true,
            modo: "checkout_pro",
            init_point: prefData.init_point,
            preference_id: String(prefData.id),
            valor: valorFinal,
            valor_original: valorOriginal,
            desconto_aplicado: cupomAplicado ? Number((valorOriginal - valorFinal).toFixed(2)) : 0,
            cupom: cupomAplicado?.codigo ?? null,
          })
        }

        return NextResponse.json({ erro: "Não foi possível criar o pagamento" }, { status: 500 })
      }
    }

    // ── Extrair QR Code do resultado ─────────────────────────
    let qrCode: string | null = null
    let qrCodeText: string | null = null
    let paymentId = String(resultado!.id)

    if (modo === "orders_api") {
      // Na API de Orders, extrair QR do resultado explorando múltiplos caminhos
      const raw = JSON.stringify(resultado)
      
      // Buscar qr_code_base64 no JSON inteiro (pode estar em vários níveis)
      const qrBase64Match = raw.match(/"qr_code_base64":"([^"]+)"/)
      const qrCodeMatch = raw.match(/"qr_code":"([^"]+)"/)
      const ticketUrlMatch = raw.match(/"ticket_url":"([^"]+)"/)
      
      qrCode = qrBase64Match ? qrBase64Match[1] : null
      qrCodeText = qrCodeMatch ? qrCodeMatch[1] : (ticketUrlMatch ? ticketUrlMatch[1].replace(/\\\//g, "/") : null)
      
      // Buscar payment ID nos transactions
      const transactions = resultado!.transactions as Record<string, unknown> | undefined
      const payments = (transactions?.payments ?? []) as Record<string, unknown>[]
      if (payments.length > 0 && payments[0].id) {
        paymentId = String(payments[0].id)
      }
    } else {
      // API legacy /v1/payments
      const txData = (resultado!.point_of_interaction as Record<string, unknown>)?.transaction_data as Record<string, unknown> | undefined
      qrCode = (txData?.qr_code_base64 as string) ?? null
      qrCodeText = (txData?.qr_code as string) ?? (txData?.ticket_url as string) ?? null
    }

    // ── Salvar assinatura pendente ──────────────────────────
    await salvarAssinatura(supabase, empresa.id, plano, periodicidade, valorFinal, paymentId, qrCode, qrCodeText)
    if (cupomAplicado) await incrementarCupom(cupomAplicado.id)

    const valorOriginal = calcularValor(plano, periodicidade).valorTotal
    return NextResponse.json({
      sucesso: true,
      modo,
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

// ── Helpers ──────────────────────────────────────────────────

async function salvarAssinatura(
  supabase: Awaited<ReturnType<typeof createClient>>,
  empresaId: string, plano: string, periodicidade: string,
  valorTotal: number, paymentId: string,
  qrCode?: string | null, qrCodeText?: string | null
) {
  try {
    await supabase.from("assinaturas").insert({
      empresa_id: empresaId,
      plano,
      periodicidade,
      status: "pendente",
      forma_pagamento: "pix",
      valor_mensal: plano === "basico" ? 49 : plano === "agenda" ? 29 : 99,
      valor_total: valorTotal,
      mp_pix_payment_id: paymentId,
      mp_pix_qr_code: qrCode ?? null,
      mp_pix_qr_code_text: qrCodeText ?? null,
    })
  } catch (e) { console.warn("Assinatura não salva:", e) }
}

async function incrementarCupom(cupomId: string) {
  try {
    const admin = createAdminClient()
    const { data } = await admin.from("cupons").select("uso_atual").eq("id", cupomId).single()
    await admin.from("cupons").update({ uso_atual: (data?.uso_atual ?? 0) + 1 }).eq("id", cupomId)
  } catch (e) { console.warn("Cupom não incrementado:", e) }
}
