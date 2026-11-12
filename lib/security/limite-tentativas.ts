import { createAdminClient } from "@/lib/supabase/admin"

/**
 * Limite de tentativas guardado no banco (migration 20261116_seguranca_auditoria.sql).
 * Vale para todas as instâncias da Vercel — o limite em memória (rate-limit.ts) não vale.
 * Se o banco falhar, NÃO bloqueia (fail-open) para nunca derrubar o login por causa disso.
 */

export function ipDaRequisicao(req: Request): string {
  const h = req.headers
  return (h.get("x-real-ip") || h.get("x-forwarded-for")?.split(",")[0] || "desconhecido").trim()
}

export async function limiteBloqueadoAte(chave: string): Promise<Date | null> {
  try {
    const { data, error } = await createAdminClient().rpc("limite_bloqueado_ate", { p_chave: chave })
    if (error || !data) return null
    return new Date(data as string)
  } catch {
    return null
  }
}

/** Conta uma tentativa; passou de `max` na janela → bloqueia por `bloqueioSeg`. */
export async function consumirLimite(chave: string, max: number, janelaSeg: number, bloqueioSeg: number): Promise<{ permitido: boolean; bloqueadoAte: Date | null }> {
  try {
    const { data, error } = await createAdminClient().rpc("limite_consumir", {
      p_chave: chave, p_max: max, p_janela_seg: janelaSeg, p_bloqueio_seg: bloqueioSeg,
    })
    if (error || !data) {
      if (error) console.error("[limite-tentativas] falha:", error.message)
      return { permitido: true, bloqueadoAte: null }
    }
    const r = data as { permitido: boolean; bloqueado_ate: string | null }
    return { permitido: r.permitido, bloqueadoAte: r.bloqueado_ate ? new Date(r.bloqueado_ate) : null }
  } catch {
    return { permitido: true, bloqueadoAte: null }
  }
}

export async function limparLimite(chave: string): Promise<void> {
  try {
    await createAdminClient().rpc("limite_limpar", { p_chave: chave })
  } catch {
    // sem efeito colateral se falhar
  }
}

/** Primeira chave bloqueada entre várias (ex.: e-mail e IP). */
export async function algumBloqueado(chaves: string[]): Promise<Date | null> {
  const resultados = await Promise.all(chaves.map(limiteBloqueadoAte))
  const datas = resultados.filter((d): d is Date => !!d)
  return datas.length ? new Date(Math.max(...datas.map((d) => d.getTime()))) : null
}

export function mensagemBloqueio(ate: Date | null): string {
  if (!ate) return "Muitas tentativas. Aguarde alguns minutos e tente novamente."
  const minutos = Math.max(1, Math.ceil((ate.getTime() - Date.now()) / 60000))
  return `Muitas tentativas. Tente novamente em ${minutos} minuto${minutos === 1 ? "" : "s"}.`
}

/** Escapa texto para colocar dentro de HTML de e-mail (evita injeção de HTML/links). */
export function escaparHtml(valor: unknown): string {
  return String(valor ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;")
}
