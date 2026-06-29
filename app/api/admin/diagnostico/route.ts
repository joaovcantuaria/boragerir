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

  // Variáveis de ambiente — apenas presença, nunca valores
  diagnostico.env = {
    supabase_url: !!process.env.NEXT_PUBLIC_SUPABASE_URL,
    supabase_anon: !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    supabase_service: !!process.env.SUPABASE_SERVICE_ROLE_KEY,
    mp_access_token: !!process.env.MERCADOPAGO_ACCESS_TOKEN,
    mp_public_key: !!process.env.NEXT_PUBLIC_MERCADOPAGO_PUBLIC_KEY,
    app_url: !!process.env.NEXT_PUBLIC_APP_URL,
    brevo_key: !!process.env.BREVO_API_KEY,
    groq_key: !!process.env.GROQ_API_KEY,
  }

  // Testar conectividade com Mercado Pago (sem criar pagamento real)
  try {
    const res = await fetch("https://api.mercadopago.com/users/me", {
      headers: { "Authorization": `Bearer ${process.env.MERCADOPAGO_ACCESS_TOKEN}` },
    })
    diagnostico.mercadopago = { ok: res.ok, status: res.status }
  } catch {
    diagnostico.mercadopago = { ok: false }
  }

  // Testar tabela assinaturas
  try {
    const { error } = await supabase.from("assinaturas").select("id").limit(1)
    diagnostico.tabela_assinaturas = { ok: !error }
  } catch {
    diagnostico.tabela_assinaturas = { ok: false }
  }

  return NextResponse.json(diagnostico, { status: 200 })
}
