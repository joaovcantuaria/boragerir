import { NextRequest, NextResponse } from "next/server"
import { dispararWebhook, normalizarTelefoneDDI } from "@/lib/webhook/n8n"
import { rateLimit, getIP, sanitizarInput } from "@/lib/security/rate-limit"
import { format, parseISO } from "date-fns"
import { ptBR } from "date-fns/locale"

export async function POST(req: NextRequest) {
  // Rate limit: máx 30 por IP por minuto
  const ip = getIP(req)
  const { allowed } = rateLimit(`webhook-solicitacao:${ip}`, { limit: 30, windowMs: 60_000 })
  if (!allowed) {
    return NextResponse.json({ sucesso: false }, { status: 429 })
  }

  try {
    const body = await req.json()
    const nome = sanitizarInput(String(body.nome ?? ""), 100)
    const telefone = String(body.telefone ?? "").replace(/\D/g, "").slice(0, 15)
    const data_hora = String(body.data_hora ?? "")
    const servico = sanitizarInput(String(body.servico ?? ""), 200)
    const empresa = sanitizarInput(String(body.empresa ?? ""), 200)

    if (!nome || !telefone || !data_hora || !servico) {
      return NextResponse.json({ erro: "Dados insuficientes" }, { status: 400 })
    }

    const dataISO = parseISO(data_hora)

    dispararWebhook({
      evento: "solicitacao_criada",
      empresa,
      nome,
      telefone: normalizarTelefoneDDI(telefone),
      data: format(dataISO, "dd/MM/yyyy", { locale: ptBR }),
      horario: format(dataISO, "HH:mm"),
      servico,
    })

    return NextResponse.json({ sucesso: true })
  } catch (err) {
    console.error("[webhook-solicitacao] Erro")
    return NextResponse.json({ sucesso: false })
  }
}
