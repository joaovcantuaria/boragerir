import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { randomUUID } from "crypto"

// Rota de diagnóstico — testa criação de Pix direto no MP
export async function GET(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (user?.email?.toLowerCase() !== "contato@boragerir.com") {
    return NextResponse.json({ erro: "Não autorizado" }, { status: 403 })
  }

  const accessToken = process.env.MERCADOPAGO_ACCESS_TOKEN ?? ""
  const resultados: Record<string, unknown> = {}

  // 1. Verificar identidade do token
  try {
    const resMe = await fetch("https://api.mercadopago.com/users/me", {
      headers: { "Authorization": `Bearer ${accessToken}` },
    })
    const meData = await resMe.json()
    resultados.users_me = {
      status: resMe.status,
      id: meData?.id,
      site_id: meData?.site_id,
      email: meData?.email,
      nickname: meData?.nickname,
    }
  } catch (e) {
    resultados.users_me = { erro: String(e) }
  }

  // 2. Tentar criar pagamento Pix mínimo (R$ 1,00)
  try {
    const body = {
      transaction_amount: 1.00,
      description: "Teste diagnóstico Bora Gerir",
      payment_method_id: "pix",
      payer: {
        email: "teste@boragerir.com",
        first_name: "Teste",
        last_name: "BoraGerir",
      },
    }

    const res = await fetch("https://api.mercadopago.com/v1/payments", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${accessToken}`,
        "X-Idempotency-Key": randomUUID(),
      },
      body: JSON.stringify(body),
    })

    const text = await res.text()
    let data: unknown = null
    try { data = JSON.parse(text) } catch { data = text.slice(0, 500) }

    resultados.criar_pix = {
      status: res.status,
      ok: res.ok,
      resposta: data,
    }
  } catch (e) {
    resultados.criar_pix = { erro: String(e) }
  }

  // 3. Info sobre o token
  resultados.token_info = {
    primeiros_chars: accessToken.slice(0, 20) + "...",
    tem_TEST: accessToken.includes("TEST"),
    comprimento: accessToken.length,
  }

  return NextResponse.json(resultados, { status: 200 })
}
