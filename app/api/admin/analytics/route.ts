import { NextRequest, NextResponse } from "next/server"
import { createAdminClient } from "@/lib/supabase/admin"
import { createClient } from "@/lib/supabase/server"

export async function GET(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ erro: "Não autenticado" }, { status: 401 })

  const admin = createAdminClient()
  const { data: usuarioAdmin } = await admin
    .from("usuarios_admin").select("ativo").eq("email", user.email ?? "").single()
  if (!usuarioAdmin?.ativo) return NextResponse.json({ erro: "Sem permissão" }, { status: 403 })

  const agora = new Date()
  const hoje = new Date(agora.getFullYear(), agora.getMonth(), agora.getDate()).toISOString()
  const semana = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()
  const mes = new Date(agora.getFullYear(), agora.getMonth(), 1).toISOString()

  const [{ data: totalGeral }, { data: hoje30 }, { data: semana7 }, { data: esteMes }] = await Promise.all([
    admin.from("visitas_analytics").select("pagina"),
    admin.from("visitas_analytics").select("pagina").gte("created_at", hoje),
    admin.from("visitas_analytics").select("pagina").gte("created_at", semana),
    admin.from("visitas_analytics").select("pagina").gte("created_at", mes),
  ])

  function contar(lista: { pagina: string }[] | null) {
    const site = lista?.filter((v) => v.pagina === "site").length ?? 0
    const login = lista?.filter((v) => v.pagina === "login").length ?? 0
    const cadastro = lista?.filter((v) => v.pagina === "cadastro").length ?? 0
    return { site, login, cadastro, total: site + login + cadastro }
  }

  return NextResponse.json({
    hoje: contar(hoje30),
    semana: contar(semana7),
    mes: contar(esteMes),
    total: contar(totalGeral),
  })
}
