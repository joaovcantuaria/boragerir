import { NextRequest, NextResponse } from "next/server"
import { autenticarChat } from "@/lib/integracoes/chat"
import { buscarInativos } from "@/lib/integracoes/dados-clientes"

// GET /api/integracoes/chat/v1/inativos?dias=60&limite=200
// Clientes que já vieram, estão sem visita há "dias" (15 a 730) e não têm horário marcado
export async function GET(req: NextRequest) {
  const auth = await autenticarChat(req)
  if (!auth.ok) return auth.resposta

  const params = req.nextUrl.searchParams
  const dias = Number(params.get("dias") ?? 60)
  const limite = Number(params.get("limite") ?? 200)
  if (!Number.isInteger(dias) || dias < 15 || dias > 730) {
    return NextResponse.json({ erro: "\"dias\" deve ser um inteiro de 15 a 730" }, { status: 400 })
  }
  if (!Number.isInteger(limite) || limite < 1 || limite > 500) {
    return NextResponse.json({ erro: "\"limite\" deve ser um inteiro de 1 a 500" }, { status: 400 })
  }

  try {
    const clientes = await buscarInativos(auth.empresaId, dias, limite)
    return NextResponse.json({ total: clientes.length, clientes })
  } catch (e) {
    console.error("[integracao-chat] inativos:", e)
    return NextResponse.json({ erro: "Erro ao buscar clientes inativos" }, { status: 500 })
  }
}
