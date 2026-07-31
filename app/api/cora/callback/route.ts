import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { storeTokens } from "@/lib/cora/tokens"
import { CoraClient } from "@/lib/cora/client"
import { createAdminClient } from "@/lib/supabase/admin"
import type { CoraTokenResponse } from "@/lib/cora/types"

const CORA_CLIENT_ID = process.env.CORA_CLIENT_ID!
const CORA_CLIENT_SECRET = process.env.CORA_CLIENT_SECRET!
const CORA_API_URL = process.env.CORA_API_URL!
const CORA_REDIRECT_URI = process.env.CORA_REDIRECT_URI!
const NEXT_PUBLIC_APP_URL = process.env.NEXT_PUBLIC_APP_URL!

export async function GET(req: NextRequest) {
  const searchParams = req.nextUrl.searchParams
  const code = searchParams.get("code")
  const state = searchParams.get("state")

  // 1. Extrair e validar parâmetros obrigatórios
  if (!code || !state) {
    return NextResponse.redirect(
      `${NEXT_PUBLIC_APP_URL}/configuracoes?cora_error=Parâmetros inválidos no callback`
    )
  }

  // 2. Validar state contra cookie (proteção CSRF)
  const storedState = req.cookies.get("cora_oauth_state")?.value

  if (!storedState || storedState !== state) {
    return NextResponse.redirect(
      `${NEXT_PUBLIC_APP_URL}/configuracoes?cora_error=Estado inválido. Tente conectar novamente.`
    )
  }

  // 3. Validar sessão do usuário
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.redirect(
      `${NEXT_PUBLIC_APP_URL}/login`
    )
  }

  // 4. Obter empresa do usuário
  const { data: empresa } = await supabase
    .from("empresas")
    .select("id, plano")
    .eq("user_id", user.id)
    .single()

  if (!empresa || empresa.plano !== "profissional") {
    return NextResponse.redirect(
      `${NEXT_PUBLIC_APP_URL}/configuracoes?cora_error=Plano Profissional necessário`
    )
  }

  const empresaId = empresa.id

  // 5. Trocar authorization_code por tokens via POST /oauth/token
  const credentials = Buffer.from(`${CORA_CLIENT_ID}:${CORA_CLIENT_SECRET}`).toString("base64")

  let tokens: CoraTokenResponse
  try {
    // OAuth endpoint is at the base URL, not under /v2
    const baseUrl = CORA_API_URL.replace(/\/v2\/?$/, "")
    const tokenResponse = await fetch(`${baseUrl}/oauth/token`, {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        "Authorization": `Basic ${credentials}`,
      },
      body: new URLSearchParams({
        grant_type: "authorization_code",
        code,
        redirect_uri: CORA_REDIRECT_URI,
      }),
    })

    if (!tokenResponse.ok) {
      const errorBody = await tokenResponse.text().catch(() => "")
      console.error("[Cora OAuth] Token exchange failed:", tokenResponse.status, errorBody)
      return NextResponse.redirect(
        `${NEXT_PUBLIC_APP_URL}/configuracoes?cora_error=Falha ao obter tokens da Cora`
      )
    }

    tokens = await tokenResponse.json()
  } catch (error) {
    console.error("[Cora OAuth] Token exchange error:", error)
    return NextResponse.redirect(
      `${NEXT_PUBLIC_APP_URL}/configuracoes?cora_error=Erro de comunicação com a Cora`
    )
  }

  // 6. Extrair cora_account_id (vem no token response ou no escopo)
  // A Cora retorna o account_id no campo "account_id" ou como parte do scope/sub
  const coraAccountId = (tokens as any).account_id || (tokens as any).sub || empresaId

  // 7. Armazenar tokens criptografados
  try {
    await storeTokens(empresaId, tokens, coraAccountId)
  } catch (error) {
    console.error("[Cora OAuth] Store tokens error:", error)
    return NextResponse.redirect(
      `${NEXT_PUBLIC_APP_URL}/configuracoes?cora_error=Erro ao salvar credenciais`
    )
  }

  // 8. Registrar webhook para receber notificações de invoice
  let webhookId: string | null = null
  try {
    const webhookUrl = `${NEXT_PUBLIC_APP_URL}/api/cora/webhook`
    const client = new CoraClient(empresaId)

    const webhookResponse = await client.registerWebhook({
      url: webhookUrl,
      resource: "invoice",
      trigger: "*",
    })

    webhookId = webhookResponse.id
  } catch (error) {
    // Webhook registration failure is non-critical — log but continue
    console.error("[Cora OAuth] Webhook registration error:", error)
  }

  // 9. Salvar webhook_id na cora_contas
  if (webhookId) {
    try {
      const adminSupabase = createAdminClient()
      await adminSupabase
        .from("cora_contas")
        .update({ webhook_id: webhookId, updated_at: new Date().toISOString() })
        .eq("empresa_id", empresaId)
    } catch (error) {
      console.error("[Cora OAuth] Webhook ID update error:", error)
    }
  }

  // 10. Limpar cookie de state e redirecionar com sucesso
  const redirectUrl = `${NEXT_PUBLIC_APP_URL}/configuracoes?cora_success=Conta Cora conectada com sucesso`
  const response = NextResponse.redirect(redirectUrl)
  response.cookies.set("cora_oauth_state", "", {
    httpOnly: true,
    secure: true,
    sameSite: "lax",
    maxAge: 0,
    path: "/",
  })

  return response
}
