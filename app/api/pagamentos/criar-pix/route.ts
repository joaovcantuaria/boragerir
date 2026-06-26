import { NextRequest, NextResponse } from "next/server"
import { MercadoPagoConfig, Payment } from "mercadopago"
import { createClient } from "@/lib/supabase/server"
import { calcularValor, type PlanoMP, type Periodicidade } from "@/lib/mercadopago/client"

export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ erro: "Não autenticado" }, { status: 401 })

    const { data: empresa } = await supabase
      .from("empresas").select("*").eq("user_id", user.id).single()
    if (!empresa) return NextResponse.json({ erro: "Empresa não encontrada" }, { status: 404 })

    const body = await req.json()
    const { plano, periodicidade } = body as { plano: PlanoMP; periodicidade: Periodicidade }

    const { valorTotal, descricao } = calcularValor(plano, periodicidade)

    const mp = new MercadoPagoConfig({
      accessToken: process.env.MERCADOPAGO_ACCESS_TOKEN!,
    })

    const payment = new Payment(mp)
    const resultado = await payment.create({
      body: {
        transaction_amount: valorTotal,
        description: descricao,
        payment_method_id: "pix",
        payer: {
          email: empresa.email,
          first_name: empresa.nome,
        },
        metadata: {
          empresa_id: empresa.id,
          plano,
          periodicidade,
        },
        notification_url: `${process.env.NEXT_PUBLIC_APP_URL}/api/webhooks/mercadopago`,
      },
    })

    // Salvar assinatura pendente
    await supabase.from("assinaturas").insert({
      empresa_id: empresa.id,
      plano,
      periodicidade,
      status: "pendente",
      forma_pagamento: "pix",
      valor_mensal: plano === "basico" ? 49 : 99,
      valor_total: valorTotal,
      mp_pix_payment_id: resultado.id?.toString(),
      mp_pix_qr_code: resultado.point_of_interaction?.transaction_data?.qr_code_base64 ?? null,
      mp_pix_qr_code_text: resultado.point_of_interaction?.transaction_data?.qr_code ?? null,
    })

    return NextResponse.json({
      sucesso: true,
      payment_id: resultado.id,
      qr_code: resultado.point_of_interaction?.transaction_data?.qr_code_base64,
      qr_code_text: resultado.point_of_interaction?.transaction_data?.qr_code,
      valor: valorTotal,
    })

  } catch (error) {
    console.error("Erro ao criar Pix:", error)
    return NextResponse.json({ erro: "Erro ao criar pagamento Pix" }, { status: 500 })
  }
}
