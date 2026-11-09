import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { getEmpresaAtiva } from "@/lib/get-empresa-ativa"
import { TIPOS_RASTREIO, lerCodigoRastreio } from "@/lib/rastreio"

/** GET ?codigo=VD-261109-00001-4 → qual operação é, valor, data e situação (só da empresa ativa). */
export async function GET(req: NextRequest) {
  const { user, empresa } = await getEmpresaAtiva()
  if (!user) return NextResponse.json({ erro: "Não autenticado" }, { status: 401 })
  if (!empresa) return NextResponse.json({ erro: "Empresa não encontrada" }, { status: 404 })

  const leitura = lerCodigoRastreio(req.nextUrl.searchParams.get("codigo") ?? "")
  if (!leitura.ok) return NextResponse.json({ erro: leitura.erro }, { status: 400 })

  const tipo = TIPOS_RASTREIO[leitura.prefixo]
  const supabase = await createClient()
  const base = { codigo: leitura.codigo, tipo: tipo.rotulo, link: tipo.link }
  const naoEncontrado = NextResponse.json({ erro: "Nenhuma operação com esse código nesta empresa" }, { status: 404 })

  switch (tipo.tabela) {
    case "vendas": {
      const { data } = await supabase.from("vendas")
        .select("numero_venda, total, status, forma_pagamento, created_at, clientes(nome_completo)")
        .eq("empresa_id", empresa.id).eq("codigo_rastreio", leitura.codigo).maybeSingle()
      if (!data) return naoEncontrado
      const cliente = (data.clientes as { nome_completo?: string } | null)?.nome_completo
      return NextResponse.json({
        ...base, valor: data.total, data: data.created_at, status: data.status,
        descricao: `Venda #${String(data.numero_venda).padStart(4, "0")}${cliente ? ` — ${cliente}` : ""}`,
        detalhe: data.forma_pagamento,
      })
    }
    case "movimentacoes_caixa": {
      const { data } = await supabase.from("movimentacoes_caixa")
        .select("tipo, categoria, descricao, valor, created_at")
        .eq("empresa_id", empresa.id).eq("codigo_rastreio", leitura.codigo).maybeSingle()
      if (!data) {
        // Lançamento cancelado: sai do caixa, mas o código continua rastreável
        const { data: cancelado } = await supabase.from("movimentacoes_canceladas")
          .select("descricao, valor, lancado_em, cancelado_em, motivo")
          .eq("empresa_id", empresa.id).eq("codigo_rastreio", leitura.codigo).maybeSingle()
        if (!cancelado) return naoEncontrado
        return NextResponse.json({
          ...base, valor: cancelado.valor, data: cancelado.lancado_em ?? cancelado.cancelado_em, status: "cancelado",
          descricao: cancelado.descricao,
          detalhe: `Cancelado em ${new Date(cancelado.cancelado_em).toLocaleDateString("pt-BR", { timeZone: "America/Sao_Paulo" })}${cancelado.motivo ? ` — ${cancelado.motivo}` : ""}`,
        })
      }
      return NextResponse.json({ ...base, valor: data.valor, data: data.created_at, status: data.tipo, descricao: data.descricao, detalhe: data.categoria })
    }
    case "caixas": {
      const { data } = await supabase.from("caixas")
        .select("nome_caixa, valor_abertura, valor_fechamento, status, data_abertura, data_fechamento")
        .eq("empresa_id", empresa.id).eq("codigo_rastreio", leitura.codigo).maybeSingle()
      if (!data) return naoEncontrado
      return NextResponse.json({
        ...base, valor: data.valor_abertura, data: data.data_abertura, status: data.status,
        descricao: data.nome_caixa || "Caixa",
        detalhe: data.data_fechamento ? `Fechado com ${data.valor_fechamento ?? 0}` : null,
      })
    }
    case "contas_pagar": {
      const { data } = await supabase.from("contas_pagar")
        .select("descricao, valor, status, data_vencimento, data_pagamento, created_at")
        .eq("empresa_id", empresa.id).eq("codigo_rastreio", leitura.codigo).maybeSingle()
      if (!data) return naoEncontrado
      return NextResponse.json({
        ...base, valor: data.valor, data: data.created_at, status: data.status, descricao: data.descricao,
        detalhe: data.data_pagamento ? `Pago em ${data.data_pagamento.slice(0, 10)}` : `Vence em ${data.data_vencimento}`,
      })
    }
    case "valores_receber": {
      const { data } = await supabase.from("valores_receber")
        .select("devedor, valor, status, data_vencimento, created_at")
        .eq("empresa_id", empresa.id).eq("codigo_rastreio", leitura.codigo).maybeSingle()
      if (!data) return naoEncontrado
      return NextResponse.json({ ...base, valor: data.valor, data: data.created_at, status: data.status, descricao: data.devedor, detalhe: `Vence em ${data.data_vencimento}` })
    }
    case "debitos_clientes": {
      const { data } = await supabase.from("debitos_clientes")
        .select("descricao, valor_total, valor_aberto, status, created_at, clientes(nome_completo)")
        .eq("empresa_id", empresa.id).eq("codigo_rastreio", leitura.codigo).maybeSingle()
      if (!data) return naoEncontrado
      const cliente = (data.clientes as { nome_completo?: string } | null)?.nome_completo
      return NextResponse.json({
        ...base, valor: data.valor_total, data: data.created_at, status: data.status,
        descricao: [cliente, data.descricao].filter(Boolean).join(" — ") || "Débito",
        detalhe: `Em aberto: ${data.valor_aberto}`,
      })
    }
    case "contratos_parcelas": {
      const { data } = await supabase.from("contratos_parcelas")
        .select("numero_parcela, valor, status, data_vencimento, data_pagamento, created_at")
        .eq("empresa_id", empresa.id).eq("codigo_rastreio", leitura.codigo).maybeSingle()
      if (!data) return naoEncontrado
      return NextResponse.json({
        ...base, valor: data.valor, data: data.created_at, status: data.status,
        descricao: `Parcela ${data.numero_parcela}`,
        detalhe: data.data_pagamento ? `Paga em ${data.data_pagamento.slice(0, 10)}` : `Vence em ${data.data_vencimento}`,
      })
    }
  }
  return naoEncontrado
}
