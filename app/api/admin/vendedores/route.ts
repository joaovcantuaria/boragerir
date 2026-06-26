import { NextRequest, NextResponse } from "next/server"
import { createAdminClient } from "@/lib/supabase/admin"
import { createClient } from "@/lib/supabase/server"

function gerarCodigo(nome: string): string {
  const base = nome.toLowerCase().replace(/\s+/g, "").substring(0, 8)
  const sufixo = Math.random().toString(36).substring(2, 6).toUpperCase()
  return `${base}${sufixo}`
}

export async function GET() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (user?.email?.toLowerCase() !== "contato@boragerir.com") {
    return NextResponse.json({ erro: "Não autorizado" }, { status: 403 })
  }
  const admin = createAdminClient()
  const { data } = await admin.from("vendedores").select("*").order("created_at", { ascending: false })
  return NextResponse.json(data ?? [])
}

export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (user?.email?.toLowerCase() !== "contato@boragerir.com") {
    return NextResponse.json({ erro: "Não autorizado" }, { status: 403 })
  }

  const body = await req.json()
  const admin = createAdminClient()

  if (body._acao === "excluir") {
    const { error } = await admin.from("vendedores").delete().eq("id", body.id)
    if (error) return NextResponse.json({ erro: error.message }, { status: 500 })
    return NextResponse.json({ sucesso: true })
  }

  if (body._acao === "editar") {
    const { error } = await admin.from("vendedores").update({
      nome: body.nome,
      email: body.email,
      telefone: body.telefone || null,
      comissao_percentual: parseFloat(body.comissao_percentual) || 30,
      observacoes: body.observacoes || null,
      ativo: body.ativo ?? true,
    }).eq("id", body.id)
    if (error) return NextResponse.json({ erro: error.message }, { status: 500 })
    return NextResponse.json({ sucesso: true })
  }

  // Criar novo vendedor
  const { data, error } = await admin.from("vendedores").insert({
    nome: body.nome,
    email: body.email,
    telefone: body.telefone || null,
    comissao_percentual: parseFloat(body.comissao_percentual) || 30,
    codigo_indicacao: gerarCodigo(body.nome),
    observacoes: body.observacoes || null,
  }).select().single()

  if (error) return NextResponse.json({ erro: error.message }, { status: 500 })
  return NextResponse.json(data)
}
