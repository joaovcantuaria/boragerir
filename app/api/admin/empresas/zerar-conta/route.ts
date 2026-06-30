import { NextRequest, NextResponse } from "next/server"
import { createAdminClient } from "@/lib/supabase/admin"
import { createClient } from "@/lib/supabase/server"

/**
 * Zera os dados operacionais de uma empresa (mantém cadastro, clientes, produtos, configurações).
 * Apaga: vendas, caixas, movimentações, orçamentos, agendamentos, tarefas.
 * Uso exclusivo: painel admin autenticado.
 */
export async function POST(req: NextRequest) {
  try {
    // Verificar autenticação do admin
    const supabaseAuth = await createClient()
    const { data: { user } } = await supabaseAuth.auth.getUser()
    if (!user) return NextResponse.json({ erro: "Não autenticado" }, { status: 401 })

    const adminDb = createAdminClient()
    const { data: usuarioAdmin } = await adminDb
      .from("usuarios_admin")
      .select("perfil, ativo")
      .eq("email", user.email ?? "")
      .single()

    if (!usuarioAdmin?.ativo || usuarioAdmin.perfil !== "super_admin") {
      return NextResponse.json({ erro: "Sem permissão. Apenas super_admin pode zerar contas." }, { status: 403 })
    }

    const { empresa_id } = await req.json()
    if (!empresa_id) return NextResponse.json({ erro: "empresa_id obrigatório" }, { status: 400 })

    // Confirmar que empresa existe
    const { data: empresa } = await adminDb.from("empresas").select("id, nome").eq("id", empresa_id).single()
    if (!empresa) return NextResponse.json({ erro: "Empresa não encontrada" }, { status: 404 })

    const supabase = adminDb

    // Deletar na ordem correta (respeitar foreign keys)
    // 1. Itens de venda e orçamento primeiro
    await supabase.from("itens_venda").delete().eq("empresa_id", empresa_id)
    await supabase.from("itens_orcamento").delete().eq("empresa_id", empresa_id)

    // 2. Movimentações de caixa
    await supabase.from("movimentacoes_caixa").delete().eq("empresa_id", empresa_id)

    // 3. Vendas, caixas, orçamentos, agendamentos
    await supabase.from("vendas").delete().eq("empresa_id", empresa_id)
    await supabase.from("caixas").delete().eq("empresa_id", empresa_id)
    await supabase.from("orcamentos").delete().eq("empresa_id", empresa_id)
    await supabase.from("agendamentos").delete().eq("empresa_id", empresa_id)

    // 4. Tarefas e blocos
    await supabase.from("tarefas").delete().eq("empresa_id", empresa_id)
    await supabase.from("blocos_tarefas").delete().eq("empresa_id", empresa_id)

    // 5. Zerar pontos de fidelidade dos clientes
    await supabase.from("clientes").update({ pontos_fidelidade: 0 }).eq("empresa_id", empresa_id)

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
