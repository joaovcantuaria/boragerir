/**
 * Integração com BoraGerir Chat — API oficial Meta WhatsApp
 * Envia mensagens de notificação de agendamento via WhatsApp usando templates aprovados.
 * 
 * Endpoint: POST https://chat.boragerir.com/api/external/send
 * Autenticação: x-api-key no header
 */

import { normalizarTelefoneDDI } from "@/lib/webhook/n8n"

const BORAGERIR_CHAT_URL = "https://chat.boragerir.com/api/external/send"
const BORAGERIR_CHAT_APIKEY = process.env.BORAGERIR_CHAT_APIKEY || "bgc_13ce461f24bf83bb5c102692b1ebeece2f723ec66f614cef47e821d63157f16f"

// ─── Templates aprovados ───
type TemplateName = "solicitacao_agendamento" | "confirmacao_agendamento" | "agendamento_indisponivel"

interface EnviarTemplateParams {
  telefone: string
  template: TemplateName
  nomeCliente: string
  data: string       // ex: "15/07/2026"
  horario: string    // ex: "14:00"
  nomeEmpresa: string
}

/**
 * Envia uma mensagem WhatsApp usando template aprovado via BoraGerir Chat.
 * Fire-and-forget: erros nunca afetam o fluxo principal.
 */
export async function enviarWhatsAppTemplate(params: EnviarTemplateParams): Promise<{ sucesso: boolean; erro?: string }> {
  const numero = normalizarTelefoneDDI(params.telefone)

  if (!numero || numero.length < 12) {
    console.warn("[boragerir-chat] Telefone inválido:", params.telefone)
    return { sucesso: false, erro: "Telefone inválido" }
  }

  const payload = {
    phone: numero,
    template: params.template,
    language: "pt_BR",
    variables: [params.nomeCliente, params.data, params.horario, params.nomeEmpresa],
    contact_name: params.nomeCliente,
  }

  try {
    const res = await fetch(BORAGERIR_CHAT_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": BORAGERIR_CHAT_APIKEY,
      },
      body: JSON.stringify(payload),
      signal: AbortSignal.timeout(10000),
    })

    if (!res.ok) {
      const body = await res.text().catch(() => "")
      console.warn(`[boragerir-chat] Erro ${res.status}: ${body}`)
      return { sucesso: false, erro: `HTTP ${res.status}` }
    }

    const data = await res.json().catch(() => null)
    console.log(`[boragerir-chat] Template "${params.template}" enviado para ${numero}`, data)
    return { sucesso: true }
  } catch (err) {
    console.warn("[boragerir-chat] Falha ao enviar:", err)
    return { sucesso: false, erro: "Falha de conexão" }
  }
}

/**
 * Envia mensagem de texto livre (só funciona dentro da janela de 24h).
 * Use para mensagens avulsas quando já existe conversa ativa.
 */
export async function enviarWhatsAppTexto(telefone: string, mensagem: string): Promise<{ sucesso: boolean; erro?: string }> {
  const numero = normalizarTelefoneDDI(telefone)

  if (!numero || numero.length < 12) {
    return { sucesso: false, erro: "Telefone inválido" }
  }

  try {
    const res = await fetch(BORAGERIR_CHAT_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": BORAGERIR_CHAT_APIKEY,
      },
      body: JSON.stringify({ phone: numero, message: mensagem }),
      signal: AbortSignal.timeout(10000),
    })

    if (!res.ok) {
      const body = await res.text().catch(() => "")
      console.warn(`[boragerir-chat] Erro texto ${res.status}: ${body}`)
      return { sucesso: false, erro: `HTTP ${res.status}` }
    }

    return { sucesso: true }
  } catch (err) {
    console.warn("[boragerir-chat] Falha ao enviar texto:", err)
    return { sucesso: false, erro: "Falha de conexão" }
  }
}
