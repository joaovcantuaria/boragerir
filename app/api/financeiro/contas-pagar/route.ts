import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"

export async function GET(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ erro: "Não autenticado" }, { status: 401 })

  const { data: empresa } = await supabase.from("empresas").select("id").eq("user_id", user.id).single()
  if (!empresa) return NextResponse.json({ erro: "Empresa não encontrada" }, { status: 404 })

  const { searchParams } = req.nextUrl
  const inicio = searchParams.get("inicio")
  const fim = searchParams.get("fim")

  let query = supabase
    .from("contas_pagar")
    .select("*")
    .eq("empresa_id", empresa.id)
    .order("data_vencimento", { ascending: true })

  if (inicio) query = query.gte("data_vencimento", inicio)
  if (fim) query = query.lte("data_vencimento", fim)

  const { data, error } = await query
  if (error) return NextResponse.json({ erro: error.message }, { status: 500 })
  return NextResponse.json(data ?? [])
}

export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ erro: "Não autenticado" }, { status: 401 })

  const { data: empresa } = await supabase.from("empresas").select("id").eq("user_id", user.id).single()
  if (!empresa) return NextResponse.json({ erro: "Empresa não encontrada" }, { status: 404 })

  const body = await req.json()

  // Excluir
  if (body._acao === "excluir") {
    if (body.tipo === "todas_futuras") {
      // Excluir esta e todas as futuras do mesmo grupo
      await supabase.from("contas_pagar")
        .delete()
        .eq("empresa_id", empresa.id)
        .eq("recorrencia_grupo", body.grupo_id)
        .gte("data_vencimento", body.data_vencimento)
    } else {
      await supabase.from("contas_pagar").delete().eq("id", body.id).eq("empresa_id", empresa.id)
    }
    return NextResponse.json({ sucesso: true })
  }

  // Marcar como pago
  if (body._acao === "pagar") {
    const { error } = await supabase.from("contas_pagar")
      .update({ status: "pago", data_pagamento: new Date().toISOString() })
      .eq("id", body.id)
      .eq("empresa_id", empresa.id)
    if (error) return NextResponse.json({ erro: error.message }, { status: 500 })
    return NextResponse.json({ sucesso: true })
  }

  // Criar nova conta
  const { descricao, valor, data_vencimento, categoria, recorrencia, observacoes } = body

  if (!descricao || !valor || !data_vencimento) {
    return NextResponse.json({ erro: "Descrição, valor e data de vencimento são obrigatórios" }, { status: 400 })
  }

  const grupoId = crypto.randomUUID()
  const registros: object[] = []
  const dataBase = new Date(data_vencimento + "T12:00:00")

  if (recorrencia === "mensal") {
    for (let i = 0; i < 12; i++) {
      const d = new Date(dataBase)
      d.setMonth(d.getMonth() + i)
      registros.push({
        empresa_id: empresa.id,
        descricao,
        valor: parseFloat(valor),
        data_vencimento: d.toISOString().substring(0, 10),
        categoria: categoria || "outros",
        recorrencia,
        recorrencia_grupo: grupoId,
        status: "pendente",
        observacoes: observacoes || null,
      })
    }
  } else if (recorrencia === "semanal") {
    for (let i = 0; i < 52; i++) {
      const d = new Date(dataBase)
      d.setDate(d.getDate() + i * 7)
      registros.push({
        empresa_id: empresa.id,
        descricao,
        valor: parseFloat(valor),
        data_vencimento: d.toISOString().substring(0, 10),
        categoria: categoria || "outros",
        recorrencia,
        recorrencia_grupo: grupoId,
        status: "pendente",
        observacoes: observacoes || null,
      })
    }
  } else {
    registros.push({
      empresa_id: empresa.id,
      descricao,
      valor: parseFloat(valor),
      data_vencimento: data_vencimento,
      categoria: categoria || "outros",
      recorrencia: "avulso",
      recorrencia_grupo: null,
      status: "pendente",
      observacoes: observacoes || null,
    })
  }

  const { data, error } = await supabase.from("contas_pagar").insert(registros).select()
  if (error) return NextResponse.json({ erro: error.message }, { status: 500 })
  return NextResponse.json({ sucesso: true, data })
}
