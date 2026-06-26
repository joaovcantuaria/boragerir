import { NextRequest, NextResponse } from "next/server"
import { MercadoPagoConfig, PreApproval } from "mercadopago"
import { createClient } from "@/lib/supabase/server"
import { calcularValor, type PlanoMP, type Periodicidade } from "@/lib/mercadopago/client"
import { addMonths, addYears } from "date-fns"

export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ erro: "Não autenticado" }, { status: 401 })

    const { data: empresa } = await supabase
      .from("empresas").select("*").eq("user_id", user.id).single()
    if (!empresa) return NextResponse.json({ erro: "Empresa não encontrada" }, { status: 404 })

    const body = await req.json()
    const { plano, periodicidade, card_token } = body as {
      plano: PlanoMP
      periodicidade: Periodicidade
      card_token: string
    }

    if (!card_token || card_token === "token_simulado") {
      return NextResponse.json({
        erro: "Token do cartão inválido. Use o SDK do Mercado Pago para tokenizar o cartão."
      }, { status: 400 })
    }

    const { valorTotal, valorMensal, descricao } = calcularValor(plano, periodicidade)
    const mp = new MercadoPagoConfig({ accessToken: process.env.MERCADOPAGO_ACCESS_TOKEN! })
    const preApproval = new PreApproval(mp)

    const dataInicio = new Date()
    const dataFim = periodicidade === "anual"
      ? addYears(dataInicio, 1)
      : addMonths(dataInicio, 13) // 1 ano + 1 mês de margem para mensal

    const resultado = await preApproval.create({
      body: {
        payer_email: empresa.email,
        card_token_id: card_token,
        reason: descricao,
        auto_recurring: {
          frequency: 1,
          frequency_type: "months",
          transaction_amount: periodicidade === "anual" ? valorTotal : valorMensal,
          currency_id: "BRL",
          start_date: dataInicio.toISOString(),
          ...(periodicidade === "anual" && { end_date: dataFim.toISOString() }),
        },
        back_url: `${process.env.NEXT_PUBLIC_APP_URL}/dashboard?assinatura=sucesso`,
        notification_url: `${process.env.NEXT_PUBLIC_APP_URL}/api/webhooks/mercadopago`,
        metadata: {
          empresa_id: empresa.id,
          plano,
          periodicidade,
        },
      },
    })

    if (resultado.status !== "authorized") {
      return NextResponse.json({
        erro: "Pagamento não autorizado. Verifique os dados do cartão.",
        status: resultado.status,
      }, { status: 400 })
    }

    // Ativar assinatura
    await supabase.from("assinaturas").insert({
      empresa_id: empresa.id,
      plano,
      periodicidade,
      status: "ativa",
      forma_pagamento: "cartao",
      valor_mensal: valorMensal,
      valor_total: valorTotal,
      mp_preapproval_id: resultado.id,
      data_inicio: dataInicio.toISOString(),
      data_fim: dataFim.toISOString(),
      proximo_vencimento: addMonths(dataInicio, 1).toISOString(),
    })

    // Atualizar plano na empresa
    await supabase.from("empresas").update({
      plano, plano_ativo: true,
    }).eq("id", empresa.id)

    return NextResponse.json({ sucesso: true, preapproval_id: resultado.id })

  } catch (error: unknown) {
    console.error("Erro ao criar assinatura:", JSON.stringify(error, null, 2))
    const msg = error instanceof Error ? error.message : "Erro ao processar assinatura"
    return NextResponse.json({ erro: msg }, { status: 500 })
  }
}
