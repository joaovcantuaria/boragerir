import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"

export async function GET(req: NextRequest) {
  // Só admin pode acessar
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (user?.email?.toLowerCase() !== "contato@boragerir.com") {
    return NextResponse.json({ erro: "Não autorizado" }, { status: 403 })
  }

  const diagnostico: Record<string, unknown> = {}

  // 1. Variáveis de ambiente
  diagnostico.env = {
    supabase_url: !!process.env.NEXT_PUBLIC_SUPABASE_URL,
    supabase_anon: !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    supabase_service: !!process.env.SUPABASE_SERVICE_ROLE_KEY,
    mp_access_token: !!process.env.MERCADOPAGO_ACCESS_TOKEN,
    mp_public_key: !!process.env.NEXT_PUBLIC_MERCADOPAGO_PUBLIC_KEY,
    app_url: process.env.NEXT_PUBLIC_APP_URL,
  }

  // 2. Testar Mercado Pago
  try {
    const { MercadoPagoConfig, Payment } = await import("mercadopago")
    const mp = new MercadoPagoConfig({
      accessToken: process.env.MERCADOPAGO_ACCESS_TOKEN!,
    })
    const payment = new Payment(mp)

    // Criar Pix de R$ 0,01 para testar
    const resultado = await payment.create({
      body: {
        transaction_amount: 0.01,
        description: "Teste diagnóstico",
        payment_method_id: "pix",
        payer: {
          email: "test@boragerir.com",
          first_name: "Teste",
          last_name: "Diagnostico",
          identification: { type: "CPF", number: "12345678909" },
        },
      },
    })

    diagnostico.mercadopago = {
      ok: true,
      payment_id: resultado.id,
      status: resultado.status,
      tem_qr: !!resultado.point_of_interaction?.transaction_data?.qr_code,
    }
  } catch (err: unknown) {
    diagnostico.mercadopago = {
      ok: false,
      erro: err instanceof Error ? err.message : String(err),
      detalhes: JSON.stringify(err, Object.getOwnPropertyNames(err)),
    }
  }

  // 3. Testar tabela assinaturas
  try {
    const { data, error } = await supabase.from("assinaturas").select("id").limit(1)
    diagnostico.tabela_assinaturas = { ok: !error, erro: error?.message }
  } catch (err) {
    diagnostico.tabela_assinaturas = { ok: false, erro: String(err) }
  }

  return NextResponse.json(diagnostico, { status: 200 })
}
