/**
 * Integração com BoraGerir Chat — API oficial Meta WhatsApp
 * Envia mensagens de notificação de agendamento via WhatsApp usando templates aprovados.
 * 
 * Endpoint: POST https://chat.boragerir.com/api/external/agendamento
 * Autenticação: x-api-key no header
 * 
 * O campo "type" define qual template é enviado:
 *   - "solicitacao"  → template solicitacao_agendamento
 *   - "confirmacao"  → template confirmacao_agendamento
 *   - "indisponivel" → template agendamento_indisponivel
 */

import { normalizarTelefoneDDI } from "@/lib/webhook/n8n"

const BORAGERIR_CHAT_URL = "https://chat.boragerir.com/api/external/agendamento"
const BORAGERIR_CHAT_SEND_URL = "https://chat.boragerir.com/api/external/send"
const BORAGERIR_CHAT_APIKEY = process.env.BORAGERIR_CHAT_APIKEY || ""

// ─── Tipos de agendamento aceitos pela API ───
type AgendamentoType = "solicitacao" | "confirmacao" | "indisponivel"

// Mapeamento do template interno para o type da API
const TEMPLATE_TO_TYPE: Record<string, AgendamentoType> = {
  "solicitacao_agendamento": "solicitacao",
  "confirmacao_agendamento": "confirmacao",
  "agendamento_indisponivel": "indisponivel",
}

type TemplateName = "solicitacao_agendamento" | "confirmacao_agendamento" | "agendamento_indisponivel"

interface EnviarTemplateParams {
  telefone: string
  template: TemplateName
  nomeCliente: string
  data: string       // ex: "25 de Julho de 2026"
  horario: string    // ex: "13:30"
  nomeEmpresa: string
  servico?: string   // ex: "Limpeza de Pele"
}

/**
 * Envia uma mensagem WhatsApp usando o endpoint dedicado de agendamento do BoraGerir Chat.
 * Fire-and-forget: erros nunca afetam o fluxo principal.
 */
export async function enviarWhatsAppTemplate(params: EnviarTemplateParams): Promise<{ sucesso: boolean; erro?: string }> {
  if (!BORAGERIR_CHAT_APIKEY) {
    console.warn("⚠️ BORAGERIR_CHAT_APIKEY não configurada. WhatsApp não enviado.")
    return { sucesso: false, erro: "BORAGERIR_CHAT_APIKEY não configurada" }
  }

  const numero = normalizarTelefoneDDI(params.telefone)

  if (!numero || numero.length < 12) {
    console.warn("[boragerir-chat] Telefone inválido:", params.telefone)
    return { sucesso: false, erro: "Telefone inválido" }
  }

  const type = TEMPLATE_TO_TYPE[params.template]
  if (!type) {
    console.warn("[boragerir-chat] Template desconhecido:", params.template)
    return { sucesso: false, erro: "Template desconhecido" }
  }

  const payload = {
    phone: numero,
    type,
    nome: params.nomeCliente,
    servico: params.servico || "Serviço",
    data: params.data,
    horario: params.horario,
    empresa: params.nomeEmpresa,
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
    console.log(`[boragerir-chat] Agendamento "${type}" enviado para ${numero}`, data)
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
    const res = await fetch(BORAGERIR_CHAT_SEND_URL, {
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
