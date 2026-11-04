import { NextRequest, NextResponse } from "next/server"
import { getEmpresaAtiva } from "@/lib/get-empresa-ativa"
import { COOKIE_CONEXAO, conectarEmpresa, trocarCodigoNoChat } from "@/lib/integracoes/chat"

// GET /api/integracoes/chat/callback?code=...&state=... — volta do Chat depois de "Autorizar"
export async function GET(req: NextRequest) {
  const voltar = (query: string) => {
    const res = NextResponse.redirect(new URL(`/configuracoes?aba=chat&${query}`, req.url))
    res.cookies.set(COOKIE_CONEXAO, "", { path: "/api/integracoes/chat", maxAge: 0 })
    return res
  }
  const erro = (mensagem: string) => voltar(`chat_erro=${encodeURIComponent(mensagem)}`)

  let salvo: { state?: string; verifier?: string; empresa_id?: string } = {}
  try {
    salvo = JSON.parse(req.cookies.get(COOKIE_CONEXAO)?.value ?? "{}")
  } catch { /* cookie inválido: tratado abaixo */ }

  const params = req.nextUrl.searchParams
  if (params.get("error") === "access_denied") return erro("Conexão cancelada no BoraGerir Chat.")
  if (!salvo.state || !salvo.verifier || !salvo.empresa_id) return erro("A conexão expirou. Clique em Conectar de novo.")
  if (params.get("state") !== salvo.state) return erro("Não foi possível validar a conexão. Clique em Conectar de novo.")

  const codigo = params.get("code") ?? ""
  if (!codigo) return erro("O BoraGerir Chat não devolveu a autorização.")

  const { user, empresa } = await getEmpresaAtiva()
  if (!user) return NextResponse.redirect(new URL("/login", req.url))
  if (!empresa || empresa.id !== salvo.empresa_id) {
    return erro("A empresa selecionada mudou durante a conexão. Clique em Conectar de novo.")
  }

  const troca = await trocarCodigoNoChat(codigo, salvo.verifier)
  if (!troca.ok) return erro(troca.erro)
  if (!/^bgc_[0-9a-f]{64}$/.test(troca.chave)) return erro("O BoraGerir Chat devolveu uma chave inválida.")

  const resultado = await conectarEmpresa(empresa, troca.chave)
  if (!resultado.ok) return erro(resultado.erro)

  return voltar("chat=conectado")
}
