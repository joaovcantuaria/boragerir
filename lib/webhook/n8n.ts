/**
 * Utilitário para disparar webhooks para o n8n.
 * Sempre fire-and-forget: erros nunca afetam o fluxo principal.
 */

const WEBHOOK_URL =
  "https://n8n-production-b8162.up.railway.app/webhook/ac1f3243-80c9-43bd-aed2-8588512f5366"

export type WebhookSolicitacaoCriada = {
  evento: "solicitacao_criada"
  empresa: string
  nome: string
  telefone: string   // com DDI, ex: 5511999999999
  data: string       // ex: "28/06/2026"
  horario: string    // ex: "14:30"
  servico: string
}

export type WebhookStatusAtualizado = {
  evento: "status_atualizado"
  empresa: string
  status: "confirmado" | "em_espera"
  nome: string
  telefone: string   // com DDI
  data: string
  horario: string
}

type WebhookPayload = WebhookSolicitacaoCriada | WebhookStatusAtualizado

/**
 * Normaliza o telefone adicionando DDI 55 (Brasil) e garantindo o 9º dígito.
 * Aceita formatos: (11) 99999-9999 / 11999999999 / 5511999999999
 */
export function normalizarTelefoneDDI(telefone: string): string {
  const limpo = telefone.replace(/\D/g, "")

  // Remove o DDI 55 se já existir para normalizar
  const semDDI = limpo.startsWith("55") && limpo.length >= 12
    ? limpo.slice(2)
    : limpo

  // Garante o 9º dígito para celulares brasileiros
  // Formato: DDD (2 dígitos) + número (8 ou 9 dígitos)
  // Se tiver 10 dígitos (DDD + 8), insere o 9 após o DDD
  const comNono = semDDI.length === 10
    ? `${semDDI.slice(0, 2)}9${semDDI.slice(2)}`
    : semDDI

  return `55${comNono}`
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
