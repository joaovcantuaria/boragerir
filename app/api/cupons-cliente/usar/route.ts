import { NextRequest, NextResponse } from "next/server"
import { createAdminClient } from "@/lib/supabase/admin"
import { getEmpresaAtiva } from "@/lib/get-empresa-ativa"
import { usarCupom } from "@/lib/integracoes/cupons-cliente"

// POST /api/cupons-cliente/usar { codigo, venda_id } — o PDV chama depois de registrar a venda
export async function POST(req: NextRequest) {
  const { user, empresa } = await getEmpresaAtiva()
  if (!user) return NextResponse.json({ erro: "Não autenticado" }, { status: 401 })
  if (!empresa) return NextResponse.json({ erro: "Empresa não encontrada" }, { status: 404 })

  const { codigo, venda_id } = await req.json().catch(() => ({}))
  if (typeof codigo !== "string" || typeof venda_id !== "string") return NextResponse.json({ erro: "Pedido inválido" }, { status: 400 })

  // A venda precisa ser da mesma empresa
  const { data: venda } = await createAdminClient()
    .from("vendas").select("id, cliente_id").eq("id", venda_id).eq("empresa_id", empresa.id).maybeSingle()
  if (!venda) return NextResponse.json({ erro: "Venda não encontrada" }, { status: 404 })

  const ok = await usarCupom(empresa.id, codigo, venda_id, venda.cliente_id)
  if (!ok) return NextResponse.json({ erro: "Cupom já usado ou inválido" }, { status: 409 })
  return NextResponse.json({ sucesso: true })
}
