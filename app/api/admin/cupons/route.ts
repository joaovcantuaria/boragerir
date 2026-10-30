import { NextRequest, NextResponse } from "next/server"
import { createAdminClient } from "@/lib/supabase/admin"
import { exigirAdmin } from "@/lib/auth/admin"

export async function GET() {
  const auth = await exigirAdmin(["super_admin"])
  if (!auth.ok) return auth.resposta
  const admin = createAdminClient()
  const { data } = await admin.from("cupons").select("*").order("created_at", { ascending: false })
  return NextResponse.json(data ?? [])
}

export async function POST(req: NextRequest) {
  const auth = await exigirAdmin(["super_admin"])
  if (!auth.ok) return auth.resposta

  const body = await req.json()
  const admin = createAdminClient()

  if (body._acao === "excluir") {
    const { error } = await admin.from("cupons").delete().eq("id", body.id)
    if (error) return NextResponse.json({ erro: error.message }, { status: 500 })
    return NextResponse.json({ sucesso: true })
  }

  if (body._acao === "toggle") {
    const { data: cupom } = await admin.from("cupons").select("ativo").eq("id", body.id).single()
    const { error } = await admin.from("cupons").update({ ativo: !cupom?.ativo }).eq("id", body.id)
    if (error) return NextResponse.json({ erro: error.message }, { status: 500 })
    return NextResponse.json({ sucesso: true })
  }

  // Criar novo cupom
  const { data, error } = await admin.from("cupons").insert({
    codigo: body.codigo.toUpperCase().trim(),
    descricao: body.descricao || null,
    tipo: body.tipo,
    valor: parseFloat(body.valor),
    planos_validos: body.planos_validos?.length > 0 ? body.planos_validos : [],
    periodicidades_validas: body.periodicidades_validas?.length > 0 ? body.periodicidades_validas : [],
    apenas_primeiro_mes: body.apenas_primeiro_mes || false,
    uso_maximo: body.uso_maximo ? parseInt(body.uso_maximo) : null,
    ativo: true,
    validade: body.validade || null,
  }).select().single()

  if (error) return NextResponse.json({ erro: error.message }, { status: 500 })
  return NextResponse.json(data)
}
