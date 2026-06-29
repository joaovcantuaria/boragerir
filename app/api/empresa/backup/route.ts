import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { rateLimit, getIP } from "@/lib/security/rate-limit"

export async function GET(req: NextRequest) {
  // Rate limit: máx 10 exports por hora por IP
  const ip = getIP(req)
  const { allowed } = rateLimit(`backup-export:${ip}`, { limit: 10, windowMs: 60 * 60_000 })
  if (!allowed) {
    return NextResponse.json({ erro: "Limite de exports atingido. Tente em 1 hora." }, { status: 429 })
  }

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ erro: "Não autenticado" }, { status: 401 })

  const { data: empresa } = await supabase
    .from("empresas").select("*").eq("user_id", user.id).single()
  if (!empresa) return NextResponse.json({ erro: "Empresa não encontrada" }, { status: 404 })

  // Buscar todos os dados da empresa em paralelo
  const [
    { data: clientes },
    { data: produtos },
    { data: funcionarios },
    { data: agendamentos },
    { data: vendas },
    { data: itensVenda },
    { data: orcamentos },
    { data: itensOrcamento },
    { data: categorias },
    { data: agendaConfig },
    { data: caixas },
    { data: movimentacoes },
  ] = await Promise.all([
    supabase.from("clientes").select("*").eq("empresa_id", empresa.id),
    supabase.from("produtos_servicos").select("*").eq("empresa_id", empresa.id),
    supabase.from("funcionarios").select("*").eq("empresa_id", empresa.id),
    supabase.from("agendamentos").select("*").eq("empresa_id", empresa.id),
    supabase.from("vendas").select("*").eq("empresa_id", empresa.id),
    supabase.from("itens_venda").select("*").eq("empresa_id", empresa.id),
    supabase.from("orcamentos").select("*").eq("empresa_id", empresa.id),
    supabase.from("itens_orcamento").select("*").eq("empresa_id", empresa.id),
    supabase.from("categorias").select("*").eq("empresa_id", empresa.id),
    supabase.from("agenda_config").select("*").eq("empresa_id", empresa.id).maybeSingle(),
    supabase.from("caixas").select("*").eq("empresa_id", empresa.id),
    supabase.from("movimentacoes_caixa").select("*").eq("empresa_id", empresa.id),
  ])

  const backup = {
    versao: "1.0",
    sistema: "Bora Gerir",
    gerado_em: new Date().toISOString(),
    empresa: {
      nome: empresa.nome,
      tipo_documento: empresa.tipo_documento,
      documento: empresa.documento,
      area_atuacao: empresa.area_atuacao,
      telefone: empresa.telefone,
      email: empresa.email,
      endereco_rua: empresa.endereco_rua,
      endereco_numero: empresa.endereco_numero,
      endereco_bairro: empresa.endereco_bairro,
      endereco_cidade: empresa.endereco_cidade,
      endereco_estado: empresa.endereco_estado,
      endereco_cep: empresa.endereco_cep,
      plano: empresa.plano,
      slug: empresa.slug,
    },
    dados: {
      clientes: clientes ?? [],
      produtos_servicos: produtos ?? [],
      funcionarios: funcionarios ?? [],
      categorias: categorias ?? [],
      agendamentos: agendamentos ?? [],
      vendas: vendas ?? [],
      itens_venda: itensVenda ?? [],
      orcamentos: orcamentos ?? [],
      itens_orcamento: itensOrcamento ?? [],
      agenda_config: agendaConfig ?? null,
      caixas: caixas ?? [],
      movimentacoes_caixa: movimentacoes ?? [],
    },
    resumo: {
      total_clientes: clientes?.length ?? 0,
      total_produtos: produtos?.length ?? 0,
      total_funcionarios: funcionarios?.length ?? 0,
      total_agendamentos: agendamentos?.length ?? 0,
      total_vendas: vendas?.length ?? 0,
      total_orcamentos: orcamentos?.length ?? 0,
    },
  }

  return NextResponse.json(backup)
}
