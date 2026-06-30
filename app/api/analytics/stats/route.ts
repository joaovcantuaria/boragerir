import { NextResponse } from "next/server"
import { createAdminClient } from "@/lib/supabase/admin"
import { createClient } from "@/lib/supabase/server"

export async function GET() {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ erro: "Não autenticado" }, { status: 401 })

    const admin = createAdminClient()
    const { data: usuarioAdmin } = await admin
      .from("usuarios_admin").select("ativo").eq("email", user.email ?? "").single()
    if (!usuarioAdmin?.ativo) return NextResponse.json({ erro: "Sem permissão" }, { status: 403 })

    const agora = new Date()
    const hoje = new Date(agora.getFullYear(), agora.getMonth(), agora.getDate()).toISOString()
    const semana = new Date(agora.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString()
    const mes = new Date(agora.getFullYear(), agora.getMonth(), 1).toISOString()

    // Buscar contagens em paralelo
    const [
      { count: totalSite },
      { count: totalLogin },
      { count: totalCadastro },
      { count: hojeTotal },
      { count: semanaTotal },
      { count: mesTotal },
      { data: porDia },
    ] = await Promise.all([
      admin.from("visitas_analytics").select("*", { count: "exact", head: true }).eq("pagina", "site"),
      admin.from("visitas_analytics").select("*", { count: "exact", head: true }).eq("pagina", "login"),
      admin.from("visitas_analytics").select("*", { count: "exact", head: true }).eq("pagina", "cadastro"),
      admin.from("visitas_analytics").select("*", { count: "exact", head: true }).gte("created_at", hoje),
      admin.from("visitas_analytics").select("*", { count: "exact", head: true }).gte("created_at", semana),
      admin.from("visitas_analytics").select("*", { count: "exact", head: true }).gte("created_at", mes),
      // Últimos 7 dias agrupados por dia e página
      admin.from("visitas_analytics").select("pagina, created_at").gte("created_at", semana).order("created_at"),
    ])

    // Agrupar por dia
    const diasMap: Record<string, Record<string, number>> = {}
    ;(porDia ?? []).forEach((v: { pagina: string; created_at: string }) => {
      const dia = v.created_at.slice(0, 10)
      if (!diasMap[dia]) diasMap[dia] = { site: 0, login: 0, cadastro: 0 }
      diasMap[dia][v.pagina] = (diasMap[dia][v.pagina] ?? 0) + 1
    })

    const graficoDias = Object.entries(diasMap)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([dia, counts]) => ({ dia, ...counts }))

    return NextResponse.json({
      totais: {
        site: totalSite ?? 0,
        login: totalLogin ?? 0,
        cadastro: totalCadastro ?? 0,
        geral: (totalSite ?? 0) + (totalLogin ?? 0) + (totalCadastro ?? 0),
      },
      periodos: {
        hoje: hojeTotal ?? 0,
        semana: semanaTotal ?? 0,
        mes: mesTotal ?? 0,
      },
      graficoDias,
    })
  } catch (err) {
    console.error("Erro ao buscar analytics:", err)
    return NextResponse.json({ erro: "Erro interno" }, { status: 500 })
  }
}
