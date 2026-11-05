import { NextRequest, NextResponse } from "next/server"
import { createAdminClient } from "@/lib/supabase/admin"
import { autenticarChat } from "@/lib/integracoes/chat"
import { criarCupomCliente } from "@/lib/integracoes/cupons-cliente"

// POST /api/integracoes/chat/v1/cupons
// { cliente_id, origem: "aniversario"|"reativacao", tipo: "percentual"|"fixo", valor, validade_dias }
// Cria (ou reaproveita) um cupom para o cliente resgatar no PDV.
export async function POST(req: NextRequest) {
  const auth = await autenticarChat(req)
  if (!auth.ok) return auth.resposta

  const { cliente_id, origem, tipo, valor, validade_dias } = await req.json().catch(() => ({}))
  if (typeof cliente_id !== "string") return NextResponse.json({ erro: "cliente_id obrigatório" }, { status: 400 })
  if (origem !== "aniversario" && origem !== "reativacao") return NextResponse.json({ erro: "origem inválida" }, { status: 400 })
  if (tipo !== "percentual" && tipo !== "fixo") return NextResponse.json({ erro: "tipo inválido" }, { status: 400 })
  const v = Number(valor)
  if (!Number.isFinite(v) || v <= 0 || (tipo === "percentual" && v > 100) || v > 100000) {
    return NextResponse.json({ erro: "valor inválido" }, { status: 400 })
  }
  const dias = Number(validade_dias ?? 7)
  if (!Number.isInteger(dias) || dias < 1 || dias > 90) return NextResponse.json({ erro: "validade_dias deve ser de 1 a 90" }, { status: 400 })

  // O cliente precisa ser da empresa dona do token
  const { data: cliente } = await createAdminClient()
    .from("clientes").select("id").eq("id", cliente_id).eq("empresa_id", auth.empresaId).maybeSingle()
  if (!cliente) return NextResponse.json({ erro: "Cliente não encontrado" }, { status: 404 })

  const r = await criarCupomCliente({ empresaId: auth.empresaId, clienteId: cliente_id, origem, tipo, valor: v, validadeDias: dias })
  if (!r.ok) return NextResponse.json({ erro: r.erro }, { status: 500 })
  return NextResponse.json({ cupom: r.cupom, reaproveitado: r.reaproveitado })
}
