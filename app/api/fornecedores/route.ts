import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { getEmpresaAtiva } from "@/lib/get-empresa-ativa"
import { CAMPOS_FORNECEDOR, TOTAIS_VAZIOS, somarContasPorFornecedor, validarFornecedor } from "@/lib/fornecedores"

/**
 * Fornecedores da empresa ativa.
 *  GET    → lista (com totais das contas a pagar de cada um)
 *  POST   → cadastra
 *  PUT    → atualiza (body.id)
 *  DELETE → desativa (?id=) — as contas já lançadas continuam com o vínculo
 */

async function contexto() {
  const { user, empresa } = await getEmpresaAtiva()
  if (!user) return { erro: NextResponse.json({ erro: "Não autenticado" }, { status: 401 }) }
  if (!empresa) return { erro: NextResponse.json({ erro: "Empresa não encontrada" }, { status: 404 }) }
  return { empresaId: empresa.id as string, supabase: await createClient() }
}

export async function GET(req: NextRequest) {
  const c = await contexto()
  if ("erro" in c) return c.erro
  const incluirInativos = req.nextUrl.searchParams.get("inativos") === "1"

  let query = c.supabase.from("fornecedores").select(CAMPOS_FORNECEDOR).eq("empresa_id", c.empresaId).order("nome")
  if (!incluirInativos) query = query.eq("ativo", true)
  const { data: fornecedores, error } = await query
  if (error) return NextResponse.json({ erro: error.message }, { status: 500 })

  // Totais por fornecedor (em aberto / pago / próximo vencimento)
  const { data: contas } = await c.supabase.from("contas_pagar")
    .select("fornecedor_id, valor, valor_pago, status, data_vencimento")
    .eq("empresa_id", c.empresaId)
    .not("fornecedor_id", "is", null)
    .limit(5000)

  const totais = somarContasPorFornecedor(contas ?? [])

  return NextResponse.json((fornecedores ?? []).map((f) => ({
    ...f,
    ...(totais.get(f.id) ?? TOTAIS_VAZIOS),
  })))
}

export async function POST(req: NextRequest) {
  const c = await contexto()
  if ("erro" in c) return c.erro
  const v = validarFornecedor(await req.json().catch(() => null))
  if ("erro" in v) return NextResponse.json({ erro: v.erro }, { status: 400 })

  const { data, error } = await c.supabase.from("fornecedores")
    .insert({ ...v.dados, empresa_id: c.empresaId })
    .select(CAMPOS_FORNECEDOR).single()
  if (error) return NextResponse.json({ erro: error.message }, { status: 500 })
  return NextResponse.json(data)
}

export async function PUT(req: NextRequest) {
  const c = await contexto()
  if ("erro" in c) return c.erro
  const body = await req.json().catch(() => null)
  const id = typeof body?.id === "string" ? body.id : ""
  if (!id) return NextResponse.json({ erro: "Fornecedor não informado" }, { status: 400 })

  // Reativar sem mexer no resto
  if (body._acao === "reativar") {
    const { error } = await c.supabase.from("fornecedores")
      .update({ ativo: true, updated_at: new Date().toISOString() }).eq("id", id).eq("empresa_id", c.empresaId)
    if (error) return NextResponse.json({ erro: error.message }, { status: 500 })
    return NextResponse.json({ sucesso: true })
  }

  const v = validarFornecedor(body)
  if ("erro" in v) return NextResponse.json({ erro: v.erro }, { status: 400 })
  const { data, error } = await c.supabase.from("fornecedores")
    .update({ ...v.dados, updated_at: new Date().toISOString() })
    .eq("id", id).eq("empresa_id", c.empresaId)
    .select(CAMPOS_FORNECEDOR).maybeSingle()
  if (error) return NextResponse.json({ erro: error.message }, { status: 500 })
  if (!data) return NextResponse.json({ erro: "Fornecedor não encontrado" }, { status: 404 })
  return NextResponse.json(data)
}

export async function DELETE(req: NextRequest) {
  const c = await contexto()
  if ("erro" in c) return c.erro
  const id = req.nextUrl.searchParams.get("id")
  if (!id) return NextResponse.json({ erro: "Fornecedor não informado" }, { status: 400 })
  const { error } = await c.supabase.from("fornecedores")
    .update({ ativo: false, updated_at: new Date().toISOString() })
    .eq("id", id).eq("empresa_id", c.empresaId)
  if (error) return NextResponse.json({ erro: error.message }, { status: 500 })
  return NextResponse.json({ sucesso: true })
}
