import { NextRequest, NextResponse } from "next/server"
import { createAdminClient } from "@/lib/supabase/admin"
import { getIP, rateLimit } from "@/lib/security/rate-limit"
import { normalizarTelefoneDDI } from "@/lib/webhook/n8n"
import { lerPayload } from "@/lib/lembretes-tarefas/acoes"
import { agoraSaoPaulo, somarDias } from "@/lib/lembretes-tarefas/regras"

/**
 * POST /api/whatsapp/acao-tarefa { payload, phone } — chamado pelo BoraGerir Chat quando a pessoa
 * toca em "✅ Concluí" ou "⏰ Adiar 1 dia" num lembrete. Vale só se a assinatura do botão confere
 * E o telefone que tocou é o mesmo cadastrado nos lembretes da empresa dona da tarefa.
 * Devolve `mensagem` para o Chat responder no WhatsApp.
 */
export async function POST(req: NextRequest) {
  const { allowed } = rateLimit(`acao-tarefa:${getIP(req)}`, { limit: 60, windowMs: 60_000 })
  if (!allowed) return NextResponse.json({ erro: "Muitas requisições" }, { status: 429 })

  const { payload, phone } = await req.json().catch(() => ({}))
  const acao = typeof payload === "string" ? lerPayload(payload) : null
  if (!acao) return NextResponse.json({ erro: "Botão inválido" }, { status: 400 })

  const admin = createAdminClient()
  const { data: tarefa } = await admin
    .from("tarefas").select("id, empresa_id, titulo, prazo, status").eq("id", acao.tarefaId).maybeSingle()
  if (!tarefa) return NextResponse.json({ mensagem: "Não encontrei essa tarefa — ela pode ter sido excluída." })

  const { data: config } = await admin
    .from("lembretes_tarefas_config").select("telefone").eq("empresa_id", tarefa.empresa_id).maybeSingle()
  if (!config || normalizarTelefoneDDI(String(phone || "")) !== normalizarTelefoneDDI(config.telefone)) {
    return NextResponse.json({ erro: "Telefone não autorizado para esta tarefa" }, { status: 403 })
  }

  if (tarefa.status === "concluido") {
    return NextResponse.json({ mensagem: `"${tarefa.titulo}" já estava concluída. 👍` })
  }

  if (acao.acao === "concluir") {
    await admin.from("tarefas").update({ status: "concluido" }).eq("id", tarefa.id)
    return NextResponse.json({ mensagem: `✅ Feito! "${tarefa.titulo}" marcada como concluída. Mandou bem!` })
  }

  // Adiar: amanhã (ou um dia depois do prazo, se ele ainda for futuro)
  const hoje = agoraSaoPaulo().data
  const base = tarefa.prazo && tarefa.prazo > hoje ? tarefa.prazo : hoje
  const novoPrazo = somarDias(base, 1)
  await admin.from("tarefas").update({ prazo: novoPrazo }).eq("id", tarefa.id)
  const [, mes, dia] = novoPrazo.split("-")
  return NextResponse.json({ mensagem: `⏰ Combinado: "${tarefa.titulo}" ficou para ${dia}/${mes}. Eu te lembro!` })
}
