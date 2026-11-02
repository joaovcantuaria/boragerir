import crypto from "crypto"
import { NextResponse, type NextRequest } from "next/server"
import { createAdminClient } from "@/lib/supabase/admin"
import { encrypt, decrypt } from "@/lib/cora/crypto"
import { rateLimit } from "@/lib/security/rate-limit"

/**
 * Integração Bora Gerir App ↔ BoraGerir Chat, por empresa.
 *
 * - App → Chat: o App guarda a API key "bgc_..." da empresa (criptografada)
 * - Chat → App: o Chat recebe um token "bga_..." para ler dados em /api/integracoes/chat/v1/*
 *   (no banco do App fica só o SHA-256 do token)
 */

export const CHAT_URL = process.env.BORAGERIR_CHAT_URL || "https://chat.boragerir.com"
const APP_URL = process.env.NEXT_PUBLIC_APP_URL || "https://app.boragerir.com"

function chaveCriptografia(): string {
  const chave = process.env.INTEGRACOES_ENCRYPTION_KEY ?? ""
  if (!/^[0-9a-f]{64}$/i.test(chave)) {
    throw new Error("INTEGRACOES_ENCRYPTION_KEY ausente ou inválida (precisa de 64 caracteres hex)")
  }
  return chave
}

export function integracaoConfigurada(): boolean {
  return /^[0-9a-f]{64}$/i.test(process.env.INTEGRACOES_ENCRYPTION_KEY ?? "")
}

export const criptografarChave = (texto: string) => encrypt(texto, chaveCriptografia())
export const descriptografarChave = (texto: string) => decrypt(texto, chaveCriptografia())

export function gerarTokenApp(): string {
  return "bga_" + crypto.randomBytes(32).toString("hex")
}

export function hashToken(token: string): string {
  return crypto.createHash("sha256").update(token).digest("hex")
}

// ─── Chamadas App → Chat ─────────────────────────────────────

type RespostaChat = { ok: true } | { ok: false; erro: string; status: number }

async function chamarAppLink(chatApiKey: string, init: RequestInit): Promise<RespostaChat> {
  try {
    const res = await fetch(`${CHAT_URL}/api/external/app-link`, {
      ...init,
      headers: { "Content-Type": "application/json", "x-api-key": chatApiKey },
      signal: AbortSignal.timeout(15000),
    })
    if (res.ok) return { ok: true }
    if (res.status === 401) return { ok: false, erro: "API key do Chat inválida ou inativa.", status: 400 }
    if (res.status === 404) return { ok: false, erro: "O BoraGerir Chat ainda não suporta a integração (atualize o Chat).", status: 502 }
    const corpo = await res.json().catch(() => null)
    return { ok: false, erro: corpo?.error ?? `O Chat respondeu com erro ${res.status}.`, status: 502 }
  } catch {
    return { ok: false, erro: "Não foi possível conectar ao BoraGerir Chat.", status: 502 }
  }
}

export function vincularNoChat(chatApiKey: string, appToken: string, nomeEmpresa: string) {
  return chamarAppLink(chatApiKey, {
    method: "POST",
    body: JSON.stringify({ app_url: APP_URL, app_token: appToken, empresa_nome: nomeEmpresa }),
  })
}

export function desvincularNoChat(chatApiKey: string) {
  return chamarAppLink(chatApiKey, { method: "DELETE" })
}

// ─── Autenticação Chat → App ─────────────────────────────────

type AutenticacaoChat =
  | { ok: true; empresaId: string }
  | { ok: false; resposta: NextResponse }

// Valida o header "Authorization: Bearer bga_..." e devolve a empresa dona do token.
// Uso nas rotas v1: const auth = await autenticarChat(req); if (!auth.ok) return auth.resposta
export async function autenticarChat(req: NextRequest): Promise<AutenticacaoChat> {
  const token = req.headers.get("authorization")?.replace(/^Bearer\s+/i, "").trim() ?? ""
  if (!/^bga_[0-9a-f]{64}$/.test(token)) {
    return { ok: false, resposta: NextResponse.json({ erro: "Token ausente ou inválido" }, { status: 401 }) }
  }

  const admin = createAdminClient()
  const { data: integracao } = await admin
    .from("integracoes_chat")
    .select("id, empresa_id, total_requisicoes")
    .eq("app_token_hash", hashToken(token))
    .eq("ativo", true)
    .maybeSingle()

  if (!integracao) {
    return { ok: false, resposta: NextResponse.json({ erro: "Token ausente ou inválido" }, { status: 401 }) }
  }

  const { allowed } = rateLimit(`integracao-chat:${integracao.id}`, { limit: 120, windowMs: 60_000 })
  if (!allowed) {
    return { ok: false, resposta: NextResponse.json({ erro: "Limite de requisições atingido. Tente em 1 minuto." }, { status: 429 }) }
  }

  await admin
    .from("integracoes_chat")
    .update({ ultimo_uso_em: new Date().toISOString(), total_requisicoes: integracao.total_requisicoes + 1 })
    .eq("id", integracao.id)

  return { ok: true, empresaId: integracao.empresa_id }
}
