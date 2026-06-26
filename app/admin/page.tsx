import { createAdminClient } from "@/lib/supabase/admin"
import { AdminDashboard } from "@/components/admin/admin-dashboard"

export const dynamic = "force-dynamic"
export const metadata = { title: "Admin — Bora Gerir" }

export default async function AdminPage() {
  const supabase = createAdminClient()

  // Buscar dados — fallback para [] se tabela não existir ainda
  const [empresasResult, assinaturasResult, ticketsResult] = await Promise.allSettled([
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
  ])

  const empresasRecentes = empresasResult.status === "fulfilled" ? (empresasResult.value.data ?? []) : []
  const assinaturas = assinaturasResult.status === "fulfilled" ? (assinaturasResult.value.data ?? []) : []
  const tickets = ticketsResult.status === "fulfilled" ? (ticketsResult.value.data ?? []) : []

  // Total de empresas
  const { count: totalEmpresas } = await supabase
    .from("empresas").select("*", { count: "exact", head: true })

  // Assinaturas ativas
  const { data: assinaturasAtivas } = await supabase
    .from("assinaturas")
    .select("valor_total, periodicidade")
    .eq("status", "ativa")
    .catch(() => ({ data: [] }))

  const totalAtivas = assinaturasAtivas?.length ?? 0
  const receitaMensal = (assinaturasAtivas ?? []).reduce((sum, a) => {
    return sum + (a.periodicidade === "anual" ? a.valor_total / 12 : a.valor_total)
  }, 0)
  const receitaTotal = (assinaturasAtivas ?? []).reduce((sum, a) => sum + a.valor_total, 0)

  // Contagem por plano
  const { data: todoPlanos } = await supabase.from("empresas").select("plano")
  const contagemPlanos = (todoPlanos ?? []).reduce((acc: Record<string, number>, e) => {
    acc[e.plano] = (acc[e.plano] ?? 0) + 1
    return acc
  }, {})

  return (
    <AdminDashboard
      totalEmpresas={totalEmpresas ?? 0}
      totalAssinaturasAtivas={totalAtivas}
      receitaMensal={receitaMensal}
      receitaTotal={receitaTotal}
      empresasRecentes={empresasRecentes}
      assinaturas={assinaturas}
      ticketsAbertos={tickets}
      contagemPlanos={contagemPlanos}
    />
  )
}
