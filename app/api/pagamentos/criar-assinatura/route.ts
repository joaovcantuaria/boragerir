import { NextRequest, NextResponse } from "next/server"
import { MercadoPagoConfig, PreApproval } from "mercadopago"
import { createClient } from "@/lib/supabase/server"
import { createAdminClient } from "@/lib/supabase/admin"
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
    const { plano, periodicidade, card_token, cupom_codigo } = body as {
      plano: PlanoMP
      periodicidade: Periodicidade
      card_token: string
      cupom_codigo?: string
    }

    if (!card_token || card_token === "token_simulado") {
      return NextResponse.json({
        erro: "Token do cartão inválido. Use o SDK do Mercado Pago para tokenizar o cartão."
      }, { status: 400 })
    }

    let { valorTotal, valorMensal, descricao } = calcularValor(plano, periodicidade)

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
            valorMensal = Math.max(0.01, valorMensal * (1 - cupom.valor / 100))
          } else {
            valorTotal = Math.max(0.01, valorTotal - cupom.valor)
            valorMensal = Math.max(0.01, valorMensal - cupom.valor)
          }
          descricao += ` (cupom ${cupom.codigo})`
        }
      }
    }

    const mp = new MercadoPagoConfig({ accessToken: process.env.MERCADOPAGO_ACCESS_TOKEN! })
    const preApproval = new PreApproval(mp)

    const dataInicio = new Date()
    const dataFim = periodicidade === "anual"
      ? addYears(dataInicio, 1)
      : addMonths(dataInicio, 13)

    const resultado = await preApproval.create({
      body: {
        payer_email: empresa.email,
        card_token_id: card_token,
        reason: descricao,
        auto_recurring: {
          frequency: 1,
          frequency_type: "months",
          transaction_amount: periodicidade === "anual"
            ? Number(valorTotal.toFixed(2))
            : Number(valorMensal.toFixed(2)),
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

    // ── Ativar assinatura ───────────────────────────────────
    await supabase.from("assinaturas").insert({
      empresa_id: empresa.id,
      plano,
      periodicidade,
      status: "ativa",
      forma_pagamento: "cartao",
      valor_mensal: Number(valorMensal.toFixed(2)),
      valor_total: Number(valorTotal.toFixed(2)),
      mp_preapproval_id: resultado.id,
      data_inicio: dataInicio.toISOString(),
      data_fim: dataFim.toISOString(),
      proximo_vencimento: addMonths(dataInicio, 1).toISOString(),
    })

    await supabase.from("empresas").update({
      plano, plano_ativo: true,
    }).eq("id", empresa.id)

    // ── Incrementar uso do cupom ────────────────────────────
    if (cupomAplicado) {
      const admin = createAdminClient()
      const { data: c } = await admin.from("cupons").select("uso_atual").eq("id", cupomAplicado.id).single()
      await admin.from("cupons").update({ uso_atual: (c?.uso_atual ?? 0) + 1 }).eq("id", cupomAplicado.id)
    }

    return NextResponse.json({ sucesso: true, preapproval_id: resultado.id })

  } catch (error: unknown) {
    console.error("Erro ao criar assinatura:", JSON.stringify(error, null, 2))
    const msg = error instanceof Error ? error.message : "Erro ao processar assinatura"
    return NextResponse.json({ erro: msg }, { status: 500 })
  }
}