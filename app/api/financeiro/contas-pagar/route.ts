import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import type { TablesInsert } from "@/types/database"
import { formatarMoeda } from "@/lib/utils"

export async function GET(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ erro: "Não autenticado" }, { status: 401 })

  // Tentar usar empresa do cookie, senão pegar a primeira
  const empresaIdCookie = req.cookies.get("empresa_ativa_id")?.value
  let empresa: { id: string } | null = null

  if (empresaIdCookie) {
    const { data } = await supabase.from("empresas").select("id").eq("id", empresaIdCookie).eq("user_id", user.id).maybeSingle()
    empresa = data
  }
  if (!empresa) {
    const { data: empresas } = await supabase.from("empresas").select("id").eq("user_id", user.id).order("created_at", { ascending: true })
    empresa = empresas?.[0] ?? null
  }
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

  // Tentar usar empresa do cookie, senão pegar a primeira
  const empresaIdCookie = req.cookies.get("empresa_ativa_id")?.value
  let empresa: { id: string } | null = null

  if (empresaIdCookie) {
    const { data } = await supabase.from("empresas").select("id").eq("id", empresaIdCookie).eq("user_id", user.id).maybeSingle()
    empresa = data
  }
  if (!empresa) {
    const { data: empresas } = await supabase.from("empresas").select("id").eq("user_id", user.id).order("created_at", { ascending: true })
    empresa = empresas?.[0] ?? null
  }
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

  // Dar baixa: total (padrão) ou parcial (valor_pago menor que o saldo em aberto)
  if (body._acao === "pagar") {
    // Buscar dados da conta para registrar no caixa
    const { data: conta } = await supabase.from("contas_pagar")
      .select("*")
      .eq("id", body.id)
      .eq("empresa_id", empresa.id)
      .single()
    if (!conta) return NextResponse.json({ erro: "Conta não encontrada" }, { status: 404 })
    if (conta.status === "pago") return NextResponse.json({ erro: "Esta conta já está paga" }, { status: 400 })

    const saldo = Math.round((Number(conta.valor) - Number(conta.valor_pago ?? 0)) * 100) / 100
    const informado = Number(body.valor_pago)
    const valorAgora = Number.isFinite(informado) && informado > 0 ? Math.round(informado * 100) / 100 : saldo
    if (valorAgora > saldo + 0.001) {
      return NextResponse.json({ erro: `Valor maior que o saldo em aberto (${saldo.toFixed(2)})` }, { status: 400 })
    }
    const parcial = valorAgora < saldo - 0.001

    let contaAtualizada = null
    if (parcial) {
      const { data, error } = await supabase.rpc("pagar_conta_parcial", { p_id: body.id, p_valor: valorAgora })
      if (error) return NextResponse.json({ erro: error.message }, { status: 400 })
      contaAtualizada = data
    } else {
      const { data, error } = await supabase.from("contas_pagar")
        .update({ status: "pago", data_pagamento: new Date().toISOString() })
        .eq("id", body.id)
        .eq("empresa_id", empresa.id)
        .select()
        .single()
      if (error) return NextResponse.json({ erro: error.message }, { status: 500 })
      contaAtualizada = data
    }

    // Registrar movimentação no caixa (se houver caixa aberto)
    // skipMovimentacao: true quando o frontend já inseriu a movimentação (plano gestão via modal)
    if (conta && !body.skipMovimentacao) {
      const { data: caixaAberto } = await supabase
        .from("caixas")
        .select("id")
        .eq("empresa_id", empresa.id)
        .eq("status", "aberto")
        .order("created_at", { ascending: true })
        .limit(1)
        .maybeSingle()

      if (caixaAberto) {
        const base = parcial
          ? `Pagamento parcial: ${conta.descricao} (${formatarMoeda(valorAgora)} de ${formatarMoeda(Number(conta.valor))})`
          : `Pagamento: ${conta.descricao}`
        const descricaoMov = body.forma_pagamento ? `${base} [${body.forma_pagamento}]` : base

        await supabase.from("movimentacoes_caixa").insert({
          empresa_id: empresa.id,
          caixa_id: caixaAberto.id,
          tipo: "saida",
          categoria: "despesa",
          descricao: descricaoMov,
          valor: valorAgora,
          conta_pagar_id: body.id,
        })
      }
    }

    return NextResponse.json({ sucesso: true, parcial, conta: contaAtualizada })
  }

  // Criar nova conta
  const { descricao, valor, data_vencimento, categoria, recorrencia, observacoes, qtd_parcelas } = body

  if (!descricao || !valor || !data_vencimento) {
    return NextResponse.json({ erro: "Descrição, valor e data de vencimento são obrigatórios" }, { status: 400 })
  }

  // Fornecedor é opcional (sem ele = lançamento avulso); se vier, precisa ser desta empresa
  let fornecedorId: string | null = null
  if (typeof body.fornecedor_id === "string" && body.fornecedor_id) {
    const { data: fornecedor } = await supabase.from("fornecedores")
      .select("id").eq("id", body.fornecedor_id).eq("empresa_id", empresa.id).maybeSingle()
    if (!fornecedor) return NextResponse.json({ erro: "Fornecedor não encontrado" }, { status: 400 })
    fornecedorId = fornecedor.id
  }

  const grupoId = crypto.randomUUID()
  const registros: TablesInsert<"contas_pagar">[] = []
  const dataBase = new Date(data_vencimento + "T12:00:00")
  const quantidade = Math.min(Math.max(parseInt(qtd_parcelas) || 12, 1), 120)

  if (recorrencia === "mensal") {
    for (let i = 0; i < quantidade; i++) {
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
        fornecedor_id: fornecedorId,
      })
    }
  } else if (recorrencia === "semanal") {
    for (let i = 0; i < quantidade; i++) {
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
        fornecedor_id: fornecedorId,
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
      fornecedor_id: fornecedorId,
    })
  }

  const { data, error } = await supabase.from("contas_pagar").insert(registros).select()
  if (error) return NextResponse.json({ erro: error.message }, { status: 500 })
  return NextResponse.json({ sucesso: true, data })
}
