import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { createAdminClient } from "@/lib/supabase/admin"
import { calcularValor, type PlanoMP, type Periodicidade } from "@/lib/mercadopago/client"
import { randomUUID } from "crypto"

// Email da conta Mercado Pago (seller) — não pode ser usado como payer
const SELLER_EMAIL = "contatojoaovcantuaria@gmail.com"

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

    const partes = empresa.nome.trim().split(" ")
    const firstName = partes[0] ?? "Cliente"
    const lastName = partes.slice(1).join(" ") || firstName

    // IMPORTANTE: O email do payer NÃO pode ser igual ao do seller (dono das credenciais)
    // Se for igual, o MP retorna "Unauthorized use of live credentials"
    let payerEmail = empresa.email
    if (payerEmail?.toLowerCase() === SELLER_EMAIL.toLowerCase()) {
      payerEmail = user.email ?? `cliente+${empresa.id.slice(0, 8)}@boragerir.com`
    }

    const docLimpo = (empresa.documento ?? "").replace(/\D/g, "")
    const temDocValido = empresa.tipo_documento === "cnpj"
      ? docLimpo.length === 14
      : docLimpo.length === 11

    // ── Criar pagamento Pix ──────────────────────────────────
    const paymentBody = {
      transaction_amount: Number(valorTotal.toFixed(2)),
      description: descricao,
      payment_method_id: "pix",
      payer: {
        email: payerEmail,
        first_name: firstName,
        last_name: lastName,
        ...(temDocValido && {
          identification: {
            type: empresa.tipo_documento === "cnpj" ? "CNPJ" : "CPF",
            number: docLimpo,
          },
        }),
      },
      metadata: { empresa_id: empresa.id, plano, periodicidade },
      notification_url: notificationUrl,
    }

    const mpResponse = await fetch("https://api.mercadopago.com/v1/payments", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${accessToken}`,
        "X-Idempotency-Key": randomUUID(),
      },
      body: JSON.stringify(paymentBody),
    })

    const mpText = await mpResponse.text()
    let resultado: Record<string, unknown> | null = null

    try {
      resultado = JSON.parse(mpText)
    } catch {
      console.error("MP resposta não-JSON:", mpResponse.status, mpText.slice(0, 500))
      return NextResponse.json({
        erro: `Mercado Pago retornou resposta inválida (status ${mpResponse.status})`,
      }, { status: 500 })
    }

    // Se falhou, tentar sem identification
    if (!mpResponse.ok && temDocValido) {
      const paymentBodySimples = {
        transaction_amount: Number(valorTotal.toFixed(2)),
        description: descricao,
        payment_method_id: "pix",
        payer: { email: payerEmail, first_name: firstName, last_name: lastName },
        metadata: { empresa_id: empresa.id, plano, periodicidade },
        notification_url: notificationUrl,
      }

      const mpResponse2 = await fetch("https://api.mercadopago.com/v1/payments", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${accessToken}`,
          "X-Idempotency-Key": randomUUID(),
        },
        body: JSON.stringify(paymentBodySimples),
      })

      const mpText2 = await mpResponse2.text()
      try {
        resultado = JSON.parse(mpText2)
      } catch {
        return NextResponse.json({
          erro: `Mercado Pago retornou resposta inválida (status ${mpResponse2.status})`,
        }, { status: 500 })
      }

      if (!mpResponse2.ok || !resultado?.id) {
        const errMsg = (resultado as Record<string, unknown>)?.message ?? JSON.stringify(resultado)
        return NextResponse.json({ erro: `Erro no Mercado Pago: ${errMsg}` }, { status: 500 })
      }
    } else if (!mpResponse.ok) {
      const errMsg = (resultado as Record<string, unknown>)?.message ?? JSON.stringify(resultado)
      return NextResponse.json({ erro: `Erro no Mercado Pago: ${errMsg}` }, { status: 500 })
    }

    const paymentId = String(resultado!.id)
    const txData = (resultado!.point_of_interaction as Record<string, unknown>)?.transaction_data as
      { qr_code_base64?: string; qr_code?: string; ticket_url?: string } | undefined

    // ── Salvar assinatura pendente ──────────────────────────
    const valorOriginal = calcularValor(plano, periodicidade).valorTotal
    try {
      await supabase.from("assinaturas").insert({
        empresa_id: empresa.id,
        plano,
        periodicidade,
        status: "pendente",
        forma_pagamento: "pix",
        valor_mensal: plano === "basico" ? 49 : plano === "agenda" ? 29 : 99,
        valor_total: Number(valorTotal.toFixed(2)),
        mp_pix_payment_id: paymentId,
        mp_pix_qr_code: txData?.qr_code_base64 ?? null,
        mp_pix_qr_code_text: txData?.qr_code ?? null,
      })
    } catch (dbErr) {
      console.warn("Assinatura não salva:", dbErr)
    }

    // ── Incrementar uso do cupom ────────────────────────────
    if (cupomAplicado) {
      const admin = createAdminClient()
      await admin.from("cupons")
        .update({ uso_atual: (await admin.from("cupons").select("uso_atual").eq("id", cupomAplicado.id).single()).data?.uso_atual + 1 })
        .eq("id", cupomAplicado.id)
    }

    return NextResponse.json({
      sucesso: true,
      payment_id: paymentId,
      qr_code: txData?.qr_code_base64 ?? null,
      qr_code_text: txData?.qr_code ?? txData?.ticket_url ?? null,
      valor: Number(valorTotal.toFixed(2)),
      valor_original: valorOriginal,
      desconto_aplicado: cupomAplicado ? Number((valorOriginal - valorTotal).toFixed(2)) : 0,
      cupom: cupomAplicado?.codigo ?? null,
    })

  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : String(error)
    console.error("Erro fatal Pix:", msg)
    return NextResponse.json({ erro: msg }, { status: 500 })
  }
}
