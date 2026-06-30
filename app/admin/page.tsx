import { createAdminClient } from "@/lib/supabase/admin"
import { AdminDashboard } from "@/components/admin/admin-dashboard"

export const dynamic = "force-dynamic"
export const metadata = { title: "Admin — Bora Gerir" }

export default async function AdminPage() {
  try {
    const supabase = createAdminClient()

    // Buscar apenas empresas — o mínimo para carregar
    const { data: empresasRecentes, error: errEmpresas } = await supabase
      .from("empresas")
      .select("id, nome, area_atuacao, plano, created_at, logo_url")
      .order("created_at", { ascending: false })
      .limit(8)

    if (errEmpresas) {
      console.error("Erro ao buscar empresas:", errEmpresas)
    }

    const { count: totalEmpresas } = await supabase
      .from("empresas")
      .select("*", { count: "exact", head: true })

    // Contagem por plano
    const contagemPlanos = (empresasRecentes ?? []).reduce((acc: Record<string, number>, e) => {
      acc[e.plano] = (acc[e.plano] ?? 0) + 1
      return acc
    }, {})

    // Assinaturas — pode não existir ainda
    let assinaturas: Array<{ id: string; plano: string; periodicidade: string; status: string; valor_total: number; forma_pagamento: string | null; created_at: string }> = []
    let totalAtivas = 0
    let receitaMensal = 0
    let receitaTotal = 0

    try {
      const { data: assinaturaData } = await supabase
        .from("assinaturas")
        .select("id, plano, periodicidade, status, valor_total, forma_pagamento, created_at")
        .order("created_at", { ascending: false })
        .limit(10)

      assinaturas = assinaturaData ?? []
      const ativas = assinaturas.filter((a) => a.status === "ativa")
      totalAtivas = ativas.length
      receitaMensal = ativas.reduce((s, a) => s + (a.periodicidade === "anual" ? a.valor_total / 12 : a.valor_total), 0)
      receitaTotal = ativas.reduce((s, a) => s + a.valor_total, 0)
    } catch {
      // tabela assinaturas ainda não existe
    }

    // Tickets — pode não existir ainda
    let tickets: Array<{ id: string; assunto: string; status: string; prioridade: string; created_at: string; empresa_id: string | null }> = []
    try {
      const { data: ticketData } = await supabase
        .from("tickets_suporte")
        .select("id, assunto, status, prioridade, created_at, empresa_id")
        .eq("status", "aberto")
        .order("created_at", { ascending: false })
        .limit(5)
      tickets = ticketData ?? []
    } catch {
      // tabela tickets ainda não existe
    }

    // Analytics de visitas — pode não existir ainda
    let analytics = { site: 0, login: 0, cadastro: 0, hoje: 0, semana: 0, mes: 0 }
    try {
      const agora = new Date()
      const hoje = new Date(agora.getFullYear(), agora.getMonth(), agora.getDate()).toISOString()
      const semana = new Date(agora.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString()
      const mes = new Date(agora.getFullYear(), agora.getMonth(), 1).toISOString()

      const [
        { count: site }, { count: login }, { count: cadastro },
        { count: hojeCount }, { count: semanaCount }, { count: mesCount },
      ] = await Promise.all([
        supabase.from("visitas_analytics").select("*", { count: "exact", head: true }).eq("pagina", "site"),
        supabase.from("visitas_analytics").select("*", { count: "exact", head: true }).eq("pagina", "login"),
        supabase.from("visitas_analytics").select("*", { count: "exact", head: true }).eq("pagina", "cadastro"),
        supabase.from("visitas_analytics").select("*", { count: "exact", head: true }).gte("created_at", hoje),
        supabase.from("visitas_analytics").select("*", { count: "exact", head: true }).gte("created_at", semana),
        supabase.from("visitas_analytics").select("*", { count: "exact", head: true }).gte("created_at", mes),
      ])
      analytics = { site: site ?? 0, login: login ?? 0, cadastro: cadastro ?? 0, hoje: hojeCount ?? 0, semana: semanaCount ?? 0, mes: mesCount ?? 0 }
    } catch { /* tabela ainda não existe */ }

    return (
      <AdminDashboard
        totalEmpresas={totalEmpresas ?? 0}
        totalAssinaturasAtivas={totalAtivas}
        receitaMensal={receitaMensal}
        receitaTotal={receitaTotal}
        empresasRecentes={empresasRecentes ?? []}
        assinaturas={assinaturas}
        ticketsAbertos={tickets}
        contagemPlanos={contagemPlanos}
        analytics={analytics}
      />
    )
  } catch (error) {
    console.error("Erro fatal no admin:", error)
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center space-y-4">
          <p className="text-2xl font-black text-white">Erro ao carregar painel</p>
          <p className="text-white/50 text-sm">
            Verifique se a variável <code className="text-primary">SUPABASE_SERVICE_ROLE_KEY</code> está configurada no Vercel.
          </p>
          <p className="text-white/30 text-xs font-mono">
            {error instanceof Error ? error.message : String(error)}
          </p>
        </div>
      </div>
    )
  }
}
