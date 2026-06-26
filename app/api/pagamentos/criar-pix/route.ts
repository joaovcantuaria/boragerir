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

    const accessToken = process.env.MERCADOPAGO_ACCESS_TOKEN
    if (!accessToken) {
      console.error("MERCADOPAGO_ACCESS_TOKEN não configurado")
      return NextResponse.json({ erro: "Gateway de pagamento não configurado" }, { status: 500 })
    }

    const mp = new MercadoPagoConfig({ accessToken })
    const payment = new Payment(mp)

    // Nome do pagador
    const partes = empresa.nome.trim().split(" ")
    const firstName = partes[0] ?? "Cliente"
    const lastName = partes.slice(1).join(" ") || firstName

    const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "https://app.boragerir.com"

    console.log("Criando Pix:", {
      valor: valorTotal,
      email: empresa.email,
      plano,
      periodicidade,
    })

    const resultado = await payment.create({
      body: {
        transaction_amount: valorTotal,
        description: descricao,
        payment_method_id: "pix",
        payer: {
          email: empresa.email,
          first_name: firstName,
          last_name: lastName,
          ...(empresa.documento && {
            identification: {
              type: empresa.tipo_documento === "cnpj" ? "CNPJ" : "CPF",
              number: empresa.documento.replace(/\D/g, ""),
            },
          }),
        },
        metadata: {
          empresa_id: empresa.id,
          plano,
          periodicidade,
        },
        notification_url: `${appUrl}/api/webhooks/mercadopago`,
      },
    })

    console.log("Resultado MP:", {
      id: resultado.id,
      status: resultado.status,
      hasQr: !!resultado.point_of_interaction?.transaction_data?.qr_code,
    })

    if (!resultado.id) {
      return NextResponse.json({ erro: "Mercado Pago não retornou ID do pagamento" }, { status: 500 })
    }

    // Tentar salvar no banco (sem bloquear se tabela não existir)
    try {
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
    } catch (dbErr) {
      console.warn("Aviso: não foi possível salvar assinatura no banco:", dbErr)
      // Continua mesmo sem salvar — o Pix ainda funciona
    }

    return NextResponse.json({
      sucesso: true,
      payment_id: resultado.id.toString(),
      qr_code: resultado.point_of_interaction?.transaction_data?.qr_code_base64,
      qr_code_text: resultado.point_of_interaction?.transaction_data?.qr_code,
      valor: valorTotal,
    })

  } catch (error: unknown) {
    const mensagem = error instanceof Error ? error.message : "Erro desconhecido"
    const detalhes = JSON.stringify(error, Object.getOwnPropertyNames(error))
    console.error("Erro ao criar Pix:", detalhes)
    return NextResponse.json({
      erro: mensagem,
      detalhes: process.env.NODE_ENV === "development" ? detalhes : undefined,
    }, { status: 500 })
  }
}
