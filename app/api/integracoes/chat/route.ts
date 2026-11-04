import { NextRequest, NextResponse } from "next/server"
import { createAdminClient } from "@/lib/supabase/admin"
import { getEmpresaAtiva } from "@/lib/get-empresa-ativa"
import { rateLimit } from "@/lib/security/rate-limit"
import {
  integracaoConfigurada, descriptografarChave, desvincularNoChat, conectarEmpresa,
} from "@/lib/integracoes/chat"

// Conexão da empresa ativa com o BoraGerir Chat (tela Configurações → Chat)

// GET — status da conexão
export async function GET() {
  const { user, empresa } = await getEmpresaAtiva()
  if (!user) return NextResponse.json({ erro: "Não autenticado" }, { status: 401 })
  if (!empresa) return NextResponse.json({ erro: "Empresa não encontrada" }, { status: 404 })

  const { data } = await createAdminClient()
    .from("integracoes_chat")
    .select("chat_api_key_final, conectado_em, ultimo_uso_em, total_requisicoes")
    .eq("empresa_id", empresa.id)
    .eq("ativo", true)
    .maybeSingle()

  return NextResponse.json({
    empresa_nome: empresa.nome,
    configurado: integracaoConfigurada(),
    conectado: !!data,
    chave_final: data?.chat_api_key_final ?? null,
    conectado_em: data?.conectado_em ?? null,
    ultimo_uso_em: data?.ultimo_uso_em ?? null,
    total_requisicoes: data?.total_requisicoes ?? 0,
  })
}

// POST — conectar (ou reconectar) com a API key do Chat
export async function POST(req: NextRequest) {
  const { user, empresa } = await getEmpresaAtiva()
  if (!user) return NextResponse.json({ erro: "Não autenticado" }, { status: 401 })
  if (!empresa) return NextResponse.json({ erro: "Empresa não encontrada" }, { status: 404 })
  if (!integracaoConfigurada()) {
    return NextResponse.json({ erro: "Integração indisponível no momento. Fale com o suporte." }, { status: 503 })
  }

  const { allowed } = rateLimit(`conectar-chat:${user.id}`, { limit: 10, windowMs: 60 * 60_000 })
  if (!allowed) return NextResponse.json({ erro: "Muitas tentativas. Tente em 1 hora." }, { status: 429 })

  const { chat_api_key } = await req.json().catch(() => ({}))
  const chave = typeof chat_api_key === "string" ? chat_api_key.trim() : ""
  if (!/^bgc_[0-9a-f]{64}$/.test(chave)) {
    return NextResponse.json({ erro: "API key inválida. Ela começa com \"bgc_\" e fica no Chat em Configurações → Integrações." }, { status: 400 })
  }

  const resultado = await conectarEmpresa(empresa, chave)
  if (!resultado.ok) return NextResponse.json({ erro: resultado.erro }, { status: resultado.status })

  return NextResponse.json({ sucesso: true })
}

// DELETE — desconectar
export async function DELETE() {
  const { user, empresa } = await getEmpresaAtiva()
  if (!user) return NextResponse.json({ erro: "Não autenticado" }, { status: 401 })
  if (!empresa) return NextResponse.json({ erro: "Empresa não encontrada" }, { status: 404 })

  const admin = createAdminClient()
  const { data } = await admin
    .from("integracoes_chat").select("chat_api_key_enc").eq("empresa_id", empresa.id).maybeSingle()
  if (!data) return NextResponse.json({ sucesso: true })

  // Apagar aqui invalida o token na hora; avisar o Chat é só limpeza
  await admin.from("integracoes_chat").delete().eq("empresa_id", empresa.id)
  try {
    await desvincularNoChat(descriptografarChave(data.chat_api_key_enc))
  } catch { /* ignora */ }

  return NextResponse.json({ sucesso: true })
}
