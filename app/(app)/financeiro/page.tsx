import { createClient } from "@/lib/supabase/server"
import { FinanceiroClient } from "@/components/financeiro/financeiro-client"
import { redirect } from "next/navigation"

export const dynamic = "force-dynamic"
export const metadata = { title: "Financeiro" }

export default async function FinanceiroPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect("/login")

  const { data: empresa } = await supabase
    .from("empresas").select("*").eq("user_id", user.id).single()
  if (!empresa) redirect("/onboarding")

  const inicioMes = new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString()
  const fimMes = new Date(new Date().getFullYear(), new Date().getMonth() + 1, 0, 23, 59, 59).toISOString()

  const [{ data: vendas }, { data: movimentacoes }, { data: funcionarios }] = await Promise.all([
    supabase.from("vendas")
      .select("*, itens_venda(nome_item, subtotal, comissao_valor, funcionario_id:venda_id), clientes(nome_completo)")
      .eq("empresa_id", empresa.id)
      .gte("created_at", inicioMes)
      .lte("created_at", fimMes)
      .order("created_at", { ascending: false }),
    supabase.from("movimentacoes_caixa")
      .select("*")
      .eq("empresa_id", empresa.id)
      .gte("created_at", inicioMes)
      .lte("created_at", fimMes),
    supabase.from("funcionarios").select("id, nome").eq("empresa_id", empresa.id).eq("ativo", true),
  ])

  return (
    <FinanceiroClient
      empresaId={empresa.id}
      plano={empresa.plano}
      vendas={vendas ?? []}
      movimentacoes={movimentacoes ?? []}
      funcionarios={funcionarios ?? []}
    />
  )
}
