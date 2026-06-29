import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { rateLimit, getIP } from "@/lib/security/rate-limit"

export async function POST(req: NextRequest) {
  // Rate limit: máx 3 imports por hora
  const ip = getIP(req)
  const { allowed } = rateLimit(`backup-import:${ip}`, { limit: 3, windowMs: 60 * 60_000 })
  if (!allowed) {
    return NextResponse.json({ erro: "Limite de imports atingido. Tente em 1 hora." }, { status: 429 })
  }

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ erro: "Não autenticado" }, { status: 401 })

  const { data: empresa } = await supabase
    .from("empresas").select("id").eq("user_id", user.id).single()
  if (!empresa) return NextResponse.json({ erro: "Empresa não encontrada" }, { status: 404 })

  let backup: any
  try {
    backup = await req.json()
  } catch {
    return NextResponse.json({ erro: "Arquivo de backup inválido" }, { status: 400 })
  }

  // Validar estrutura do backup
  if (!backup?.versao || backup?.sistema !== "Bora Gerir" || !backup?.dados) {
    return NextResponse.json({ erro: "Arquivo não é um backup válido do Bora Gerir" }, { status: 400 })
  }

  const { dados } = backup
  const resultados: Record<string, { importados: number; erros: number }> = {}

  // Helper para importar com upsert silencioso
  async function importar(tabela: string, registros: any[], campoConflito: string) {
    if (!registros?.length) { resultados[tabela] = { importados: 0, erros: 0 }; return }

    let importados = 0
    let erros = 0

    // Substituir empresa_id pelo da empresa atual
    const registrosNormalizados = registros.map((r: any) => ({
      ...r,
      empresa_id: empresa.id,
    }))

    // Importar em lotes de 50
    const LOTE = 50
    for (let i = 0; i < registrosNormalizados.length; i += LOTE) {
      const lote = registrosNormalizados.slice(i, i + LOTE)
      const { error } = await supabase
        .from(tabela as any)
        .upsert(lote, { onConflict: campoConflito, ignoreDuplicates: false })

      if (error) { erros += lote.length }
      else { importados += lote.length }
    }

    resultados[tabela] = { importados, erros }
  }

  // Importar na ordem correta (respeitar foreign keys)
  await importar("categorias", dados.categorias, "id")
  await importar("clientes", dados.clientes, "id")
  await importar("funcionarios", dados.funcionarios, "id")
  await importar("produtos_servicos", dados.produtos_servicos, "id")
  await importar("agendamentos", dados.agendamentos, "id")
  await importar("caixas", dados.caixas, "id")
  await importar("vendas", dados.vendas, "id")
  await importar("itens_venda", dados.itens_venda, "id")
  await importar("orcamentos", dados.orcamentos, "id")
  await importar("itens_orcamento", dados.itens_orcamento, "id")
  await importar("movimentacoes_caixa", dados.movimentacoes_caixa, "id")

  // Agenda config — upsert único
  if (dados.agenda_config) {
    const { error } = await supabase.from("agenda_config").upsert(
      { ...dados.agenda_config, empresa_id: empresa.id },
      { onConflict: "empresa_id" }
    )
    resultados["agenda_config"] = { importados: error ? 0 : 1, erros: error ? 1 : 0 }
  }

  const totalImportados = Object.values(resultados).reduce((s, r) => s + r.importados, 0)
  const totalErros = Object.values(resultados).reduce((s, r) => s + r.erros, 0)

  return NextResponse.json({
    sucesso: true,
    resumo: { total_importados: totalImportados, total_erros: totalErros },
    detalhes: resultados,
  })
}
