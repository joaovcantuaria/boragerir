import { NextRequest, NextResponse } from "next/server"
import { dispararWebhook, normalizarTelefoneDDI } from "@/lib/webhook/n8n"
import { format, parseISO } from "date-fns"
import { ptBR } from "date-fns/locale"

/**
 * Dispara o webhook "solicitacao_criada" para o n8n.
 * Chamado pelo client após salvar o agendamento no banco.
 */
export async function POST(req: NextRequest) {
  try {
    const { nome, telefone, data_hora, servico } = await req.json()

    console.log("[webhook-solicitacao] Recebido:", { nome, telefone, data_hora, servico })

    if (!nome || !telefone || !data_hora || !servico) {
      console.warn("[webhook-solicitacao] Dados insuficientes")
      return NextResponse.json({ erro: "Dados insuficientes" }, { status: 400 })
    }

    const dataISO = parseISO(data_hora)

    console.log("[webhook-solicitacao] Disparando webhook para n8n...")

    // Fire-and-forget — não aguarda para não atrasar a resposta
    dispararWebhook({
      evento: "solicitacao_criada",
      nome,
      telefone: normalizarTelefoneDDI(telefone),
      data: format(dataISO, "dd/MM/yyyy", { locale: ptBR }),
      horario: format(dataISO, "HH:mm"),
      servico,
    })

    console.log("[webhook-solicitacao] Webhook enfileirado com sucesso")

    return NextResponse.json({ sucesso: true })
  } catch (err) {
    console.error("[webhook-solicitacao] Erro:", err)
    return NextResponse.json({ sucesso: false })
  }
}
