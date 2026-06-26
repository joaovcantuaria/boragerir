import { createAdminClient } from "@/lib/supabase/admin"
import { AdminDashboard } from "@/components/admin/admin-dashboard"

export const dynamic = "force-dynamic"
export const metadata = { title: "Admin — Bora Gerir" }

export default async function AdminPage() {
  const supabase = createAdminClient()

  const [
    { count: totalEmpresas },
    { count: totalAtivas },
    { data: empresasRecentes },
    { data: assinaturas },
    { data: tickets },
    { data: assinaturasPorPlano },
  ] = await Promise.all([
    supabase.from("empresas").select("*", { count: "exact", head: true }),
    supabase.from("assinaturas").select("*", { count: "exact", head: true }).eq("status", "ativa"),
    supabase.from("empresas")
      .select("id, nome, area_atuacao, plano, created_at, logo_url")
      .order("created_at", { ascending: false })
      .limit(8),
    supabase.from("assinaturas")
      .select("id, plano, periodicidade, status, valor_total, forma_pagamento, created_at")
      .order("created_at", { ascending: false })
      .limit(10),
    supabase.from("tickets_suporte")
      .select("id, assunto, status, prioridade, created_at, empresa_id")
      .eq("status", "aberto")
      .order("created_at", { ascending: false })
      .limit(5),
    supabase.from("empresas")
      .select("plano"),
  ])

  // Receita mensal estimada
  const { data: assinaturasAtivas } = await supabase
    .from("assinaturas")
    .select("valor_total, periodicidade")
    .eq("status", "ativa")

  const receitaMensal = (assinaturasAtivas ?? []).reduce((sum, a) => {
    return sum + (a.periodicidade === "anual" ? a.valor_total / 12 : a.valor_total)
  }, 0)

  const receitaTotal = (assinaturasAtivas ?? []).reduce((sum, a) => sum + a.valor_total, 0)

  // Contagem por plano
  const contagemPlanos = (assinaturasPorPlano ?? []).reduce((acc: Record<string, number>, e) => {
    acc[e.plano] = (acc[e.plano] ?? 0) + 1
    return acc
  }, {})

  return (
    <AdminDashboard
      totalEmpresas={totalEmpresas ?? 0}
      totalAssinaturasAtivas={totalAtivas ?? 0}
      receitaMensal={receitaMensal}
      receitaTotal={receitaTotal}
      empresasRecentes={empresasRecentes ?? []}
      assinaturas={assinaturas ?? []}
      ticketsAbertos={tickets ?? []}
      contagemPlanos={contagemPlanos}
    />
  )
}
