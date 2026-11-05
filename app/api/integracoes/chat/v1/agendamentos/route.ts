import { NextRequest, NextResponse } from "next/server"
import { createAdminClient } from "@/lib/supabase/admin"
import { autenticarChat } from "@/lib/integracoes/chat"
import { normalizarTelefoneDDI } from "@/lib/webhook/n8n"

// GET /api/integracoes/chat/v1/agendamentos?horas=24
// Agendamentos confirmados/agendados das próximas N horas (1 a 72), para lembretes.
export async function GET(req: NextRequest) {
  const auth = await autenticarChat(req)
  if (!auth.ok) return auth.resposta

  const horas = Number(req.nextUrl.searchParams.get("horas") ?? 24)
  if (!Number.isInteger(horas) || horas < 1 || horas > 72) {
    return NextResponse.json({ erro: "\"horas\" deve ser um inteiro de 1 a 72" }, { status: 400 })
  }

  const agora = new Date()
  const ate = new Date(agora.getTime() + horas * 60 * 60 * 1000)
  const { data, error } = await createAdminClient()
    .from("agendamentos")
    .select("id, data_hora, status, cliente_id, nome_cliente_avulso, telefone_cliente_avulso, clientes(nome_completo, telefone), produtos_servicos(nome), funcionarios(nome)")
    .eq("empresa_id", auth.empresaId)
    .in("status", ["agendado", "confirmado"])
    .gte("data_hora", agora.toISOString())
    .lte("data_hora", ate.toISOString())
    .order("data_hora")
    .limit(500)
  if (error) return NextResponse.json({ erro: "Erro ao buscar agendamentos" }, { status: 500 })

  const um = <T,>(rel: T | T[] | null): T | null => (Array.isArray(rel) ? rel[0] ?? null : rel)
  const agendamentos = (data || [])
    .map((a) => {
      const cliente = um(a.clientes as unknown as { nome_completo: string; telefone: string } | null)
      const telefone = normalizarTelefoneDDI(cliente?.telefone || a.telefone_cliente_avulso || "")
      return {
        id: a.id,
        data_hora: a.data_hora,
        status: a.status,
        cliente_id: a.cliente_id,
        nome: cliente?.nome_completo || a.nome_cliente_avulso || "Cliente",
        telefone: /^55\d{2}9\d{8}$/.test(telefone) ? telefone : null,
        servico: um(a.produtos_servicos as unknown as { nome: string } | null)?.nome ?? null,
        profissional: um(a.funcionarios as unknown as { nome: string } | null)?.nome ?? null,
      }
    })
    .filter((a) => a.telefone)
  return NextResponse.json({ total: agendamentos.length, agendamentos })
}
