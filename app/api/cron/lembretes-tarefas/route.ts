import { NextRequest, NextResponse } from "next/server"
import { processarLembretesTarefas } from "@/lib/lembretes-tarefas/motor"

export const dynamic = "force-dynamic"
export const maxDuration = 60

/**
 * /api/cron/lembretes-tarefas — chamado a cada 15 min pelo pg_cron do Supabase do App.
 * Autenticação: header "Authorization: Bearer <CRON_SECRET>".
 */
async function processar(req: NextRequest) {
  const segredo = process.env.CRON_SECRET
  if (!segredo || req.headers.get("authorization") !== `Bearer ${segredo}`) {
    return NextResponse.json({ erro: "Não autorizado" }, { status: 401 })
  }
  const resumo = await processarLembretesTarefas(Date.now() + 50_000)
  return NextResponse.json({ ok: true, ...resumo })
}

export const GET = processar
export const POST = processar
