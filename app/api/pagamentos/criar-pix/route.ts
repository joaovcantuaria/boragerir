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

    // Montar nome e sobrenome da empresa
    const partes = empresa.nome.trim().split(" ")
    const firstName = partes[0] ?? empresa.nome
    const lastName = partes.slice(1).join(" ") || firstName

    const resultado = await payment.create({
      body: {
        transaction_amount: valorTotal,
        description: descricao,
        payment_method_id: "pix",
        payer: {
          email: empresa.email,
          first_name: firstName,
          last_name: lastName,
          // CPF/CNPJ do pagador (obrigatório em produção)
          identification: empresa.documento
            ? {
                type: empresa.tipo_documento === "cnpj" ? "CNPJ" : "CPF",
                number: empresa.documento.replace(/\D/g, ""),
              }
            : undefined,
        },
        metadata: {
          empresa_id: empresa.id,
          plano,
          periodicidade,
        },
        notification_url: `${process.env.NEXT_PUBLIC_APP_URL}/api/webhooks/mercadopago`,
      },
    })

    if (!resultado.id) {
      return NextResponse.json({ erro: "Erro ao criar pagamento no Mercado Pago" }, { status: 500 })
    }

    // Salvar assinatura pendente
    await supabase.from("assinaturas").insert({
      empresa_id: empresa.id,
      plano,
      periodicidade,
      status: "pendente",
      forma_pagamento: "pix",
      valor_mensal: plano === "basico" ? 49 : 99,
      valor_total: valorTotal,
      mp_pix_payment_id: resultado.id.toString(),
      mp_pix_qr_code: resultado.point_of_interaction?.transaction_data?.qr_code_base64 ?? null,
      mp_pix_qr_code_text: resultado.point_of_interaction?.transaction_data?.qr_code ?? null,
    })

    return NextResponse.json({
      sucesso: true,
      payment_id: resultado.id.toString(),
      qr_code: resultado.point_of_interaction?.transaction_data?.qr_code_base64,
      qr_code_text: resultado.point_of_interaction?.transaction_data?.qr_code,
      valor: valorTotal,
    })

  } catch (error: unknown) {
    console.error("Erro ao criar Pix:", JSON.stringify(error, null, 2))
    const msg = error instanceof Error ? error.message : "Erro ao criar pagamento Pix"
    return NextResponse.json({ erro: msg }, { status: 500 })
  }
}
