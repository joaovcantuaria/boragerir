import { NextRequest, NextResponse } from "next/server"
import { getEmpresaAtiva } from "@/lib/get-empresa-ativa"
import { rateLimit } from "@/lib/security/rate-limit"
import { CHAT_URL, CALLBACK_URL, COOKIE_CONEXAO, gerarPkce, integracaoConfigurada } from "@/lib/integracoes/chat"

// GET /api/integracoes/chat/conectar — botão "Conectar com BoraGerir Chat"
// Leva o dono para o Chat (login/cadastro + autorizar); a volta cai em /api/integracoes/chat/callback
export async function GET(req: NextRequest) {
  const { user, empresa } = await getEmpresaAtiva()
  if (!user) return NextResponse.redirect(new URL("/login", req.url))

  const voltarComErro = (mensagem: string) =>
    NextResponse.redirect(new URL(`/configuracoes?aba=chat&chat_erro=${encodeURIComponent(mensagem)}`, req.url))

  if (!empresa) return voltarComErro("Empresa não encontrada.")
  if (!integracaoConfigurada()) return voltarComErro("Integração indisponível no momento. Fale com o suporte.")

  const { allowed } = rateLimit(`conectar-chat:${user.id}`, { limit: 10, windowMs: 60 * 60_000 })
  if (!allowed) return voltarComErro("Muitas tentativas. Tente em 1 hora.")

  const { state, verifier, challenge } = gerarPkce()
  const destino = new URL(`${CHAT_URL}/conectar-app`)
  destino.searchParams.set("redirect_uri", CALLBACK_URL)
  destino.searchParams.set("state", state)
  destino.searchParams.set("code_challenge", challenge)
  destino.searchParams.set("empresa", empresa.nome)
  if (user.email) destino.searchParams.set("email", user.email)

  const res = NextResponse.redirect(destino)
  res.cookies.set(COOKIE_CONEXAO, JSON.stringify({ state, verifier, empresa_id: empresa.id }), {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/api/integracoes/chat",
    maxAge: 10 * 60,
  })
  return res
}
