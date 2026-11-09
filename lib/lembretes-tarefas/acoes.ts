import crypto from "crypto"

/**
 * Botões "✅ Concluí" e "⏰ Adiar 1 dia" das mensagens de tarefa no WhatsApp.
 * O payload do botão leva ação + tarefa + assinatura (HMAC); só o App sabe assinar,
 * então ninguém monta um payload válido para a tarefa de outra empresa.
 * Formato: tarefa:<acao>:<tarefaId>:<assinatura16>
 */

export type AcaoTarefa = "concluir" | "adiar"

function chave(): Buffer {
  const base = process.env.INTEGRACOES_ENCRYPTION_KEY || ""
  if (!/^[0-9a-f]{64}$/i.test(base)) throw new Error("INTEGRACOES_ENCRYPTION_KEY ausente ou inválida")
  // Chave própria para este uso, derivada da chave das integrações
  return crypto.createHmac("sha256", Buffer.from(base, "hex")).update("lembretes-tarefas").digest()
}

function assinatura(acao: AcaoTarefa, tarefaId: string): string {
  return crypto.createHmac("sha256", chave()).update(`${acao}:${tarefaId}`).digest("hex").slice(0, 16)
}

export function payloadDoBotao(acao: AcaoTarefa, tarefaId: string): string {
  return `tarefa:${acao}:${tarefaId}:${assinatura(acao, tarefaId)}`
}

export function lerPayload(payload: string): { acao: AcaoTarefa; tarefaId: string } | null {
  const m = payload.match(/^tarefa:(concluir|adiar):([0-9a-f-]{36}):([0-9a-f]{16})$/)
  if (!m) return null
  const [, acao, tarefaId, recebida] = m
  const esperada = assinatura(acao as AcaoTarefa, tarefaId)
  if (!crypto.timingSafeEqual(Buffer.from(recebida), Buffer.from(esperada))) return null
  return { acao: acao as AcaoTarefa, tarefaId }
}
