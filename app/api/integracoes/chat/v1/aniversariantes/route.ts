import { NextRequest, NextResponse } from "next/server"
import { autenticarChat } from "@/lib/integracoes/chat"
import { buscarAniversariantes } from "@/lib/integracoes/dados-clientes"

// GET /api/integracoes/chat/v1/aniversariantes?dias=0
// Clientes ativos com celular válido que fazem aniversário de hoje até daqui a "dias" (0 a 30)
export async function GET(req: NextRequest) {
  const auth = await autenticarChat(req)
  if (!auth.ok) return auth.resposta

  const dias = Number(req.nextUrl.searchParams.get("dias") ?? 0)
  if (!Number.isInteger(dias) || dias < 0 || dias > 30) {
    return NextResponse.json({ erro: "\"dias\" deve ser um inteiro de 0 a 30" }, { status: 400 })
  }

  try {
    const clientes = await buscarAniversariantes(auth.empresaId, dias)
    return NextResponse.json({ total: clientes.length, clientes })
  } catch (e) {
    console.error("[integracao-chat] aniversariantes:", e)
    return NextResponse.json({ erro: "Erro ao buscar aniversariantes" }, { status: 500 })
  }
}
