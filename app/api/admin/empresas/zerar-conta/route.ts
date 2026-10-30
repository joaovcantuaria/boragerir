import { NextRequest, NextResponse } from "next/server"
import { createAdminClient } from "@/lib/supabase/admin"
import { exigirAdmin } from "@/lib/auth/admin"

/**
 * Zera os dados operacionais de uma empresa (mantém cadastro, clientes, produtos, configurações).
 * Apaga: vendas, caixas, movimentações, orçamentos, agendamentos, tarefas.
 * Uso exclusivo: painel admin autenticado.
 */
export async function POST(req: NextRequest) {
  try {
    const auth = await exigirAdmin(["super_admin"])
    if (!auth.ok) return auth.resposta

    const adminDb = createAdminClient()

    const { empresa_id } = await req.json()
    if (!empresa_id) return NextResponse.json({ erro: "empresa_id obrigatório" }, { status: 400 })

    // Confirmar que empresa existe
    const { data: empresa } = await adminDb.from("empresas").select("id, nome").eq("id", empresa_id).single()
    if (!empresa) return NextResponse.json({ erro: "Empresa não encontrada" }, { status: 404 })

    const supabase = adminDb

    // Deletar na ordem correta (respeitar foreign keys)
    const erros: string[] = []

    const ops = [
      { tabela: "itens_venda",        fn: () => supabase.from("itens_venda").delete().eq("empresa_id", empresa_id) },
      { tabela: "itens_orcamento",    fn: () => supabase.from("itens_orcamento").delete().eq("empresa_id", empresa_id) },
      { tabela: "movimentacoes_caixa",fn: () => supabase.from("movimentacoes_caixa").delete().eq("empresa_id", empresa_id) },
      { tabela: "vendas",             fn: () => supabase.from("vendas").delete().eq("empresa_id", empresa_id) },
      { tabela: "caixas",             fn: () => supabase.from("caixas").delete().eq("empresa_id", empresa_id) },
      { tabela: "orcamentos",         fn: () => supabase.from("orcamentos").delete().eq("empresa_id", empresa_id) },
      { tabela: "agendamentos",       fn: () => supabase.from("agendamentos").delete().eq("empresa_id", empresa_id) },
      { tabela: "tarefas",            fn: () => supabase.from("tarefas").delete().eq("empresa_id", empresa_id) },
      { tabela: "blocos_tarefas",     fn: () => supabase.from("blocos_tarefas").delete().eq("empresa_id", empresa_id) },
    ]

    for (const op of ops) {
      const { error } = await op.fn()
      if (error) {
        console.error(`[zerar-conta] Erro em ${op.tabela}:`, error.message, error.code)
        erros.push(`${op.tabela}: ${error.message}`)
      } else {
        console.log(`[zerar-conta] ${op.tabela} ✓`)
      }
    }

    // Zerar pontos de fidelidade dos clientes
    const { error: errPontos } = await supabase.from("clientes").update({ pontos_fidelidade: 0 }).eq("empresa_id", empresa_id)
    if (errPontos) erros.push(`clientes: ${errPontos.message}`)

    if (erros.length > 0) {
      console.error(`[zerar-conta] Erros:`, erros)
      return NextResponse.json({ erro: `Erros ao zerar: ${erros.join("; ")}` }, { status: 500 })
    }

    console.log(`[admin] Conta zerada: ${empresa.nome} (${empresa_id})`)

    return NextResponse.json({
      sucesso: true,
      mensagem: `Conta "${empresa.nome}" zerada com sucesso. Dados cadastrais preservados.`,
    })
  } catch (err) {
    console.error("Erro ao zerar conta:", err)
    return NextResponse.json({ erro: "Erro interno" }, { status: 500 })
  }
}
