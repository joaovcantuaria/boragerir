import { NextRequest, NextResponse } from "next/server"
import { validateCoraAccess, isCoraAccessError } from "@/lib/cora/middleware"
import crypto from "crypto"

export async function GET(req: NextRequest) {
  // 1. Valida sessão e plano profissional
  const access = await validateCoraAccess()
  if (isCoraAccessError(access)) {
    return access
  }

  // 2. Gera state aleatório para proteção CSRF
  const state = crypto.randomBytes(32).toString("hex")

  // 3. Monta a URL de autorização OAuth da Cora
  const coraApiUrl = process.env.CORA_API_URL!
  const clientId = process.env.CORA_CLIENT_ID!
  const redirectUri = process.env.CORA_REDIRECT_URI!

  // OAuth endpoint is at the base URL, not under /v2
  const baseUrl = coraApiUrl.replace(/\/v2\/?$/, "")
  const authorizeUrl = new URL(`${baseUrl}/oauth/authorize`)
  authorizeUrl.searchParams.set("client_id", clientId)
  authorizeUrl.searchParams.set("redirect_uri", redirectUri)
  authorizeUrl.searchParams.set("response_type", "code")
  authorizeUrl.searchParams.set("scope", "openid")
  authorizeUrl.searchParams.set("state", state)

  // 4. Armazena state em cookie para validação no callback
  const response = NextResponse.redirect(authorizeUrl.toString())
  response.cookies.set("cora_oauth_state", state, {
    httpOnly: true,
    secure: true,
    sameSite: "lax",
    maxAge: 600, // 10 minutos
    path: "/",
  })

  return response
}
