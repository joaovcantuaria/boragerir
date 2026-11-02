import { NextRequest, NextResponse } from "next/server"
import { createAdminClient } from "@/lib/supabase/admin"
import { getEmpresaAtiva } from "@/lib/get-empresa-ativa"
import { rateLimit } from "@/lib/security/rate-limit"
import {
  integracaoConfigurada, criptografarChave, descriptografarChave,
  gerarTokenApp, hashToken, vincularNoChat, desvincularNoChat,
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

  const admin = createAdminClient()
  const { data: anterior } = await admin
    .from("integracoes_chat").select("chat_api_key_enc").eq("empresa_id", empresa.id).maybeSingle()

  // Vincula primeiro no Chat; só salva aqui se o Chat aceitou a key
  const token = gerarTokenApp()
  const vinculo = await vincularNoChat(chave, token, empresa.nome)
  if (!vinculo.ok) return NextResponse.json({ erro: vinculo.erro }, { status: vinculo.status })

  const { error } = await admin.from("integracoes_chat").upsert({
    empresa_id: empresa.id,
    chat_api_key_enc: criptografarChave(chave),
    chat_api_key_final: chave.slice(-4),
    app_token_hash: hashToken(token),
    ativo: true,
    conectado_em: new Date().toISOString(),
    ultimo_uso_em: null,
    total_requisicoes: 0,
  }, { onConflict: "empresa_id" })

  if (error) {
    await desvincularNoChat(chave)
    return NextResponse.json({ erro: "Erro ao salvar a conexão." }, { status: 500 })
  }

  // Se trocou de conta do Chat, remove o vínculo da conta antiga (o token antigo já não vale)
  if (anterior) {
    try {
      const chaveAntiga = descriptografarChave(anterior.chat_api_key_enc)
      if (chaveAntiga !== chave) await desvincularNoChat(chaveAntiga)
    } catch { /* vínculo antigo já não funciona sem o token; nada a fazer */ }
  }

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
