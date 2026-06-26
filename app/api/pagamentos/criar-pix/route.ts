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
    if (!accessToken) return NextResponse.json({ erro: "Gateway não configurado" }, { status: 500 })

    const mp = new MercadoPagoConfig({ accessToken })
    const payment = new Payment(mp)

    const partes = empresa.nome.trim().split(" ")
    const firstName = partes[0] ?? "Cliente"
    const lastName = partes.slice(1).join(" ") || firstName
    const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "https://app.boragerir.com"

    // Documento limpo e válido
    const docLimpo = (empresa.documento ?? "").replace(/\D/g, "")
    const temDocValido = empresa.tipo_documento === "cnpj"
      ? docLimpo.length === 14
      : docLimpo.length === 11

    // Tentar COM documento primeiro, depois SEM se falhar
    const tentativas = [
      // Tentativa 1: com identificação
      {
        transaction_amount: valorTotal,
        description: descricao,
        payment_method_id: "pix",
        payer: {
          email: empresa.email,
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
        notification_url: `${appUrl}/api/webhooks/mercadopago`,
      },
      // Tentativa 2: sem identificação (mais permissivo)
      {
        transaction_amount: valorTotal,
        description: descricao,
        payment_method_id: "pix",
        payer: { email: empresa.email, first_name: firstName, last_name: lastName },
        metadata: { empresa_id: empresa.id, plano, periodicidade },
        notification_url: `${appUrl}/api/webhooks/mercadopago`,
      },
    ]

    let resultado = null
    let ultimoErro = ""

    for (const body of tentativas) {
      try {
        resultado = await payment.create({ body })
        if (resultado?.id) break
      } catch (err: unknown) {
        ultimoErro = err instanceof Error ? err.message : String(err)
        console.warn("Tentativa falhou:", ultimoErro)
      }
    }

    if (!resultado?.id) {
      console.error("Todas as tentativas falharam:", ultimoErro)
      return NextResponse.json({ erro: `Erro no Mercado Pago: ${ultimoErro}` }, { status: 500 })
    }

    // Salvar assinatura pendente
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
      console.warn("Assinatura não salva no banco:", dbErr)
    }

    return NextResponse.json({
      sucesso: true,
      payment_id: resultado.id.toString(),
      qr_code: resultado.point_of_interaction?.transaction_data?.qr_code_base64,
      qr_code_text: resultado.point_of_interaction?.transaction_data?.qr_code,
      valor: valorTotal,
    })

  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : String(error)
    console.error("Erro fatal Pix:", msg)
    return NextResponse.json({ erro: msg }, { status: 500 })
  }
}
