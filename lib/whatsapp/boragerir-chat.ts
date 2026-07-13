/**
 * Integração com BoraGerir Chat — API oficial Meta WhatsApp
 * Envia mensagens de notificação de agendamento via WhatsApp.
 * 
 * Endpoint: POST https://chat.boragerir.com/api/external/send
 * Autenticação: API Key no header
 */

import { normalizarTelefoneDDI } from "@/lib/webhook/n8n"

const BORAGERIR_CHAT_URL = "https://chat.boragerir.com/api/external/send"
const BORAGERIR_CHAT_APIKEY = process.env.BORAGERIR_CHAT_APIKEY || "bgc_13ce461f24bf83bb5c102692b1ebeece2f723ec66f614cef47e821d63157f16f"

interface EnviarWhatsAppParams {
  telefone: string // Formato brasileiro: (11) 99999-9999 ou 11999999999
  mensagem: string
}

/**
 * Envia uma mensagem WhatsApp via BoraGerir Chat.
 * Fire-and-forget: erros nunca afetam o fluxo principal.
 */
export async function enviarWhatsApp({ telefone, mensagem }: EnviarWhatsAppParams): Promise<{ sucesso: boolean; erro?: string }> {
  const numero = normalizarTelefoneDDI(telefone)

  if (!numero || numero.length < 12) {
    console.warn("[boragerir-chat] Telefone inválido:", telefone)
    return { sucesso: false, erro: "Telefone inválido" }
  }

  try {
    const res = await fetch(BORAGERIR_CHAT_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": BORAGERIR_CHAT_APIKEY,
      },
      body: JSON.stringify({
        to: numero,
        message: mensagem,
      }),
      signal: AbortSignal.timeout(10000),
    })

    if (!res.ok) {
      const body = await res.text().catch(() => "")
      console.warn(`[boragerir-chat] Erro ${res.status}: ${body}`)
      return { sucesso: false, erro: `HTTP ${res.status}` }
    }

    console.log(`[boragerir-chat] Mensagem enviada para ${numero}`)
    return { sucesso: true }
  } catch (err) {
    console.warn("[boragerir-chat] Falha ao enviar:", err)
    return { sucesso: false, erro: "Falha de conexão" }
  }
}

// ─── Templates de mensagem para agendamentos ───

export function msgSolicitacaoRecebida(params: {
  nomeCliente: string
  nomeEmpresa: string
  servico: string
  data: string
  horario: string
}): string {
  return `📅 *Solicitação de agendamento recebida!*

Olá, ${params.nomeCliente}! 👋

Sua solicitação em *${params.nomeEmpresa}* foi registrada com sucesso.

📋 Serviço: *${params.servico}*
📅 Data: *${params.data}*
🕐 Horário: *${params.horario}*

⏳ Aguarde a confirmação do estabelecimento. Você será notificado(a) assim que o status for atualizado.

_Mensagem automática — Bora Gerir_`
}

export function msgAgendamentoConfirmado(params: {
  nomeCliente: string
  nomeEmpresa: string
  servico: string
  data: string
  horario: string
}): string {
  return `✅ *Agendamento confirmado!*

Olá, ${params.nomeCliente}! 😊

Ótima notícia! Seu agendamento foi *confirmado*.

📋 Serviço: *${params.servico}*
📅 Data: *${params.data}*
🕐 Horário: *${params.horario}*
🏪 Local: *${params.nomeEmpresa}*

Aguardamos você! Em caso de imprevisto, entre em contato com antecedência.

_Mensagem automática — Bora Gerir_`
}

export function msgAgendamentoEspera(params: {
  nomeCliente: string
  nomeEmpresa: string
  servico: string
  data: string
  horario: string
}): string {
  return `⏳ *Lista de espera*

Olá, ${params.nomeCliente}!

Seu pedido de agendamento em *${params.nomeEmpresa}* está na *lista de espera*.

📋 Serviço: *${params.servico}*
📅 Data: *${params.data}*
🕐 Horário: *${params.horario}*

Assim que um horário for disponibilizado, você será notificado(a). Agradecemos a compreensão! 🙏

_Mensagem automática — Bora Gerir_`
}

export function msgAgendamentoCancelado(params: {
  nomeCliente: string
  nomeEmpresa: string
  servico: string
  data: string
  horario: string
}): string {
  return `❌ *Agendamento indisponível*

Olá, ${params.nomeCliente}.

Infelizmente, seu agendamento em *${params.nomeEmpresa}* não pôde ser confirmado.

📋 Serviço: *${params.servico}*
📅 Data: *${params.data}*
🕐 Horário: *${params.horario}*

Entre em contato para remarcar em outro horário disponível.

_Mensagem automática — Bora Gerir_`
}
