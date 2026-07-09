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

  // Testar conectividade com Mercado Pago — diagnóstico completo
  try {
    const token = process.env.MERCADOPAGO_ACCESS_TOKEN ?? ""
    const tokenPrefix = token.slice(0, 12) + "..." // APP_USR-1234...

    // 1. Verificar /users/me (identidade da conta)
    const resMe = await fetch("https://api.mercadopago.com/users/me", {
      headers: { "Authorization": `Bearer ${token}` },
    })
    const meData = resMe.ok ? await resMe.json() : null

    // 2. Verificar se o token é de teste ou produção
    const isTestToken = token.includes("TEST")
    const isProductionToken = token.startsWith("APP_USR-") && !token.includes("TEST")

    // 3. Tentar criar pagamento mínimo para verificar permissão Pix
    let pixTest: { ok: boolean; status?: number; message?: string } = { ok: false }
    try {
      const resPix = await fetch("https://api.mercadopago.com/v1/payments", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${token}`,
          "Content-Type": "application/json",
          "X-Idempotency-Key": `diag-${Date.now()}`,
        },
        body: JSON.stringify({
          transaction_amount: 0.01,
          description: "Diagnóstico — ignorar",
          payment_method_id: "pix",
          payer: { email: "test@test.com" },
        }),
      })
      const pixData = await resPix.json()
      pixTest = {
        ok: resPix.ok,
        status: resPix.status,
        message: pixData?.message ?? pixData?.error ?? null,
      }
    } catch (e) {
      pixTest = { ok: false, message: e instanceof Error ? e.message : "erro desconhecido" }
    }

    diagnostico.mercadopago = {
      token_prefix: tokenPrefix,
      is_test_token: isTestToken,
      is_production_token: isProductionToken,
      users_me: { ok: resMe.ok, status: resMe.status, site_id: meData?.site_id, id: meData?.id },
      pix_test: pixTest,
    }
  } catch {
    diagnostico.mercadopago = { ok: false, erro: "Falha na conexão" }
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
