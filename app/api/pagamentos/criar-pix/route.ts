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
    const externalReference = `${empresa.id}|${plano}|${periodicidade}|${Date.now()}`

    // ── Tentativa 1: API direta /v1/payments (Checkout Transparente) ──
    const pixResult = await tentarPixDireto(accessToken, {
      valor: Number(valorTotal.toFixed(2)),
      descricao,
      email: empresa.email,
      nome: empresa.nome,
      documento: empresa.documento,
      tipoDocumento: empresa.tipo_documento,
      empresaId: empresa.id,
      plano,
      periodicidade,
      notificationUrl: `${appUrl}/api/webhooks/mercadopago`,
    })

    if (pixResult.sucesso) {
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
          mp_pix_payment_id: pixResult.payment_id,
          mp_pix_qr_code: pixResult.qr_code ?? null,
          mp_pix_qr_code_text: pixResult.qr_code_text ?? null,
        })
      } catch (dbErr) {
        console.warn("Assinatura não salva:", dbErr)
      }

      // Incrementar cupom
      if (cupomAplicado) {
        const admin = createAdminClient()
        await admin.from("cupons")
          .update({ uso_atual: (await admin.from("cupons").select("uso_atual").eq("id", cupomAplicado.id).single()).data?.uso_atual + 1 })
          .eq("id", cupomAplicado.id)
      }

      const valorOriginalCalc = calcularValor(plano, periodicidade).valorTotal
      return NextResponse.json({
        sucesso: true,
        payment_id: pixResult.payment_id,
        qr_code: pixResult.qr_code,
        qr_code_text: pixResult.qr_code_text,
        valor: Number(valorTotal.toFixed(2)),
        valor_original: valorOriginalCalc,
        desconto_aplicado: cupomAplicado ? Number((valorOriginalCalc - valorTotal).toFixed(2)) : 0,
        cupom: cupomAplicado?.codigo ?? null,
      })
    }

    // ── Tentativa 2: Checkout Pro (Preference) — funciona sem homologação ──
    console.warn("Pix direto falhou, usando Checkout Pro:", pixResult.erro)

    const preferenceBody = {
      items: [{
        title: descricao,
        quantity: 1,
        unit_price: Number(valorTotal.toFixed(2)),
        currency_id: "BRL",
      }],
      payer: {
        email: empresa.email,
        name: empresa.nome,
      },
      payment_methods: {
        excluded_payment_types: [{ id: "credit_card" }, { id: "debit_card" }, { id: "ticket" }],
        installments: 1,
      },
      external_reference: externalReference,
      back_urls: {
        success: `${appUrl}/planos?status=aprovado&plano=${plano}`,
        failure: `${appUrl}/planos?status=falhou`,
        pending: `${appUrl}/planos?status=pendente&plano=${plano}`,
      },
      auto_return: "approved",
      notification_url: `${appUrl}/api/webhooks/mercadopago`,
      metadata: { empresa_id: empresa.id, plano, periodicidade },
    }

    const prefResponse = await fetch("https://api.mercadopago.com/checkout/preferences", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${accessToken}`,
        "X-Idempotency-Key": randomUUID(),
      },
      body: JSON.stringify(preferenceBody),
    })

    const prefText = await prefResponse.text()
    let prefData: Record<string, unknown> | null = null
    try {
      prefData = JSON.parse(prefText)
    } catch {
      console.error("Preference resposta não-JSON:", prefResponse.status, prefText.slice(0, 500))
      return NextResponse.json({ erro: "Erro ao criar preferência de pagamento" }, { status: 500 })
    }

    if (!prefResponse.ok || !prefData?.id) {
      const errMsg = (prefData as Record<string, unknown>)?.message ?? JSON.stringify(prefData)
      console.error("Preference erro:", errMsg)
      return NextResponse.json({ erro: `Erro no Mercado Pago: ${errMsg}` }, { status: 500 })
    }

    // Salvar assinatura pendente com referência da preference
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
        mp_pix_payment_id: String(prefData.id),
      })
    } catch (dbErr) {
      console.warn("Assinatura não salva:", dbErr)
    }

    // Incrementar cupom
    if (cupomAplicado) {
      const admin = createAdminClient()
      await admin.from("cupons")
        .update({ uso_atual: (await admin.from("cupons").select("uso_atual").eq("id", cupomAplicado.id).single()).data?.uso_atual + 1 })
        .eq("id", cupomAplicado.id)
    }

    // Retornar URL do Checkout Pro — o frontend vai redirecionar
    return NextResponse.json({
      sucesso: true,
      modo: "checkout_pro",
      init_point: prefData.init_point as string,
      payment_id: String(prefData.id),
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

// ── Função auxiliar: tenta criar Pix via API direta ──────────────
async function tentarPixDireto(accessToken: string, opts: {
  valor: number; descricao: string; email: string; nome: string;
  documento?: string; tipoDocumento?: string; empresaId: string;
  plano: string; periodicidade: string; notificationUrl: string;
}): Promise<{
  sucesso: boolean; payment_id?: string; qr_code?: string;
  qr_code_text?: string; erro?: string;
}> {
  const partes = opts.nome.trim().split(" ")
  const firstName = partes[0] ?? "Cliente"
  const lastName = partes.slice(1).join(" ") || firstName

  const docLimpo = (opts.documento ?? "").replace(/\D/g, "")
  const temDocValido = opts.tipoDocumento === "cnpj"
    ? docLimpo.length === 14
    : docLimpo.length === 11

  const paymentBody = {
    transaction_amount: opts.valor,
    description: opts.descricao,
    payment_method_id: "pix",
    payer: {
      email: opts.email,
      first_name: firstName,
      last_name: lastName,
      ...(temDocValido && {
        identification: {
          type: opts.tipoDocumento === "cnpj" ? "CNPJ" : "CPF",
          number: docLimpo,
        },
      }),
    },
    metadata: { empresa_id: opts.empresaId, plano: opts.plano, periodicidade: opts.periodicidade },
    notification_url: opts.notificationUrl,
  }

  try {
    const res = await fetch("https://api.mercadopago.com/v1/payments", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${accessToken}`,
        "X-Idempotency-Key": randomUUID(),
      },
      body: JSON.stringify(paymentBody),
    })

    const text = await res.text()
    if (!text) return { sucesso: false, erro: "Resposta vazia do MP" }

    const data = JSON.parse(text)

    if (res.ok && data?.id) {
      const txData = data.point_of_interaction?.transaction_data
      return {
        sucesso: true,
        payment_id: String(data.id),
        qr_code: txData?.qr_code_base64 ?? null,
        qr_code_text: txData?.qr_code ?? txData?.ticket_url ?? null,
      }
    }

    return { sucesso: false, erro: data?.message ?? `Status ${res.status}` }
  } catch (e) {
    return { sucesso: false, erro: e instanceof Error ? e.message : String(e) }
  }
}
