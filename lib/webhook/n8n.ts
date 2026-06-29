/**
 * Utilitário para disparar webhooks para o n8n.
 * Sempre fire-and-forget: erros nunca afetam o fluxo principal.
 */

const WEBHOOK_URL =
  "https://n8n-production-b8162.up.railway.app/webhook-test/ac1f3243-80c9-43bd-aed2-8588512f5366"

export type WebhookSolicitacaoCriada = {
  evento: "solicitacao_criada"
  nome: string
  telefone: string   // com DDI, ex: 5511999999999
  data: string       // ex: "28/06/2026"
  horario: string    // ex: "14:30"
  servico: string
}

export type WebhookStatusAtualizado = {
  evento: "status_atualizado"
  status: "confirmado" | "em_espera"
  nome: string
  telefone: string   // com DDI
  data: string
  horario: string
}

type WebhookPayload = WebhookSolicitacaoCriada | WebhookStatusAtualizado

/**
 * Normaliza o telefone adicionando DDI 55 (Brasil) se necessário.
 * Aceita formatos: (11) 99999-9999 / 11999999999 / 5511999999999
 */
export function normalizarTelefoneDDI(telefone: string): string {
  const limpo = telefone.replace(/\D/g, "")
  if (limpo.startsWith("55") && limpo.length >= 12) return limpo
  return `55${limpo}`
}

/**
 * Dispara o webhook para o n8n de forma assíncrona.
 * Nunca lança exceção — erros são logados silenciosamente.
 */
export async function dispararWebhook(payload: WebhookPayload): Promise<void> {
  console.log("[webhook] Iniciando disparo:", JSON.stringify(payload))
  try {
    const res = await fetch(WEBHOOK_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
      signal: AbortSignal.timeout(8000),
    })
    if (!res.ok) {
      const body = await res.text().catch(() => "")
      console.warn(`[webhook] Resposta não-ok: ${res.status} — ${body}`)
    } else {
      console.log(`[webhook] Disparo bem-sucedido: ${res.status}`)
    }
  } catch (err) {
    console.warn("[webhook] Erro ao disparar webhook:", err)
  }
}
