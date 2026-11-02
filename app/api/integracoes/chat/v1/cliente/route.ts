import { NextRequest, NextResponse } from "next/server"
import { autenticarChat } from "@/lib/integracoes/chat"
import { buscarResumoCliente } from "@/lib/integracoes/dados-clientes"

// GET /api/integracoes/chat/v1/cliente?telefone=5538999999999
// Resumo do cliente para a IA personalizar a conversa (visitas, favoritos, próximo horário)
export async function GET(req: NextRequest) {
  const auth = await autenticarChat(req)
  if (!auth.ok) return auth.resposta

  const telefone = (req.nextUrl.searchParams.get("telefone") ?? "").replace(/\D/g, "")
  if (telefone.length < 10 || telefone.length > 13) {
    return NextResponse.json({ erro: "\"telefone\" inválido" }, { status: 400 })
  }

  try {
    const cliente = await buscarResumoCliente(auth.empresaId, telefone)
    if (!cliente) return NextResponse.json({ erro: "Cliente não encontrado" }, { status: 404 })
    return NextResponse.json({ cliente })
  } catch (e) {
    console.error("[integracao-chat] cliente:", e)
    return NextResponse.json({ erro: "Erro ao buscar cliente" }, { status: 500 })
  }
}
