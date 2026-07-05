import { createServerClient } from "@supabase/ssr"
import { NextResponse, type NextRequest } from "next/server"
import type { Database } from "@/types/database"

const PERMISSOES: Record<string, string[]> = {
  super_admin: ["/admin"],
  quase_admin: ["/admin", "/admin/empresas", "/admin/assinaturas", "/admin/vendedores", "/admin/cupons", "/admin/atendimentos-ia", "/admin/suporte"],
  vendas:      ["/admin/empresas", "/admin/assinaturas"],
  atendimento: ["/admin/atendimentos-ia", "/admin/suporte"],
}

function temPermissao(perfil: string, pathname: string): boolean {
  if (perfil === "super_admin") return true
  const permitidas = PERMISSOES[perfil] ?? []
  return permitidas.some((r) => pathname === r || pathname.startsWith(r + "/"))
}

// Verifica admin usando service role (preferencial) ou RPC como fallback
async function verificarAdmin(
  email: string,
  url: string,
  key: string,
  serviceKey: string | undefined
): Promise<{ ativo: boolean; perfil: string } | null> {
  try {
    if (serviceKey) {
      const { createClient } = await import("@supabase/supabase-js")
      const admin = createClient(url, serviceKey, { auth: { persistSession: false } })
      const { data } = await admin
        .from("usuarios_admin")
        .select("perfil, ativo")
        .eq("email", email)
        .maybeSingle()
      return data ?? null
    }

    // Fallback: RPC com SECURITY DEFINER (não precisa de service role)
    const { createClient } = await import("@supabase/supabase-js")
    const client = createClient(url, key, { auth: { persistSession: false } })
    const { data } = await client.rpc("verificar_usuario_admin", { p_email: email })
    if (data && data.length > 0) return data[0]
    return null
  } catch {
    return null
  }
}

export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request })

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

  const supabase = createServerClient<Database>(url, key, {
    cookies: {
      getAll() { return request.cookies.getAll() },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value))
        supabaseResponse = NextResponse.next({ request })
        cookiesToSet.forEach(({ name, value, options }) =>
          supabaseResponse.cookies.set(name, value, options)
        )
      },
    },
  })

  const { data: { user } } = await supabase.auth.getUser()
  const { pathname } = request.nextUrl

  const rotasPublicas = ["/login", "/cadastro", "/"]
  const eRotaPublica = rotasPublicas.some((r) => pathname === r || pathname.startsWith("/auth/"))
  const eRotaAdmin   = pathname.startsWith("/admin")
  const eRotaAgendar = pathname.startsWith("/agendar/")
  const eRotaApi     = pathname.startsWith("/api/")

  if (eRotaAgendar || eRotaApi) return supabaseResponse

  if (!user && !eRotaPublica) {
    const redirectUrl = request.nextUrl.clone()
    redirectUrl.pathname = "/login"
    return NextResponse.redirect(redirectUrl)
  }

  // Usuário logado tentando acessar login/cadastro
  if (user && (pathname === "/login" || pathname === "/cadastro")) {
    const adminData = await verificarAdmin(user.email ?? "", url, key, serviceKey)
    if (adminData?.ativo) {
      const redirectUrl = request.nextUrl.clone()
      redirectUrl.pathname = "/admin"
      return NextResponse.redirect(redirectUrl)
    }
    const redirectUrl = request.nextUrl.clone()
    redirectUrl.pathname = "/dashboard"
    return NextResponse.redirect(redirectUrl)
  }

  // Proteção do painel admin
  if (eRotaAdmin && user) {
    const adminData = await verificarAdmin(user.email ?? "", url, key, serviceKey)

    if (!adminData?.ativo) {
      const redirectUrl = request.nextUrl.clone()
      redirectUrl.pathname = "/dashboard"
      return NextResponse.redirect(redirectUrl)
    }

    if (!temPermissao(adminData.perfil, pathname)) {
      const permitidas = PERMISSOES[adminData.perfil] ?? []
      const redirectUrl = request.nextUrl.clone()
      redirectUrl.pathname = permitidas[0] ?? "/dashboard"
      return NextResponse.redirect(redirectUrl)
    }

    return supabaseResponse
  }

  // Rotas normais do app
  if (user && !eRotaPublica && !eRotaAdmin && pathname !== "/onboarding") {
    // Admin tentando acessar rota normal → redirecionar para /admin
    const adminData = await verificarAdmin(user.email ?? "", url, key, serviceKey)
    if (adminData?.ativo) {
      const redirectUrl = request.nextUrl.clone()
      redirectUrl.pathname = "/admin"
      return NextResponse.redirect(redirectUrl)
    }

    const { data: empresa } = await supabase
      .from("empresas").select("id, plano, plano_ativo").eq("user_id", user.id).single()

    if (!empresa) {
      const redirectUrl = request.nextUrl.clone()
      redirectUrl.pathname = "/onboarding"
      return NextResponse.redirect(redirectUrl)
    }

    const eRotaPlanos = pathname.startsWith("/planos")

    if (!empresa.plano_ativo && empresa.plano !== "gratuito" && !eRotaPlanos) {
      const redirectUrl = request.nextUrl.clone()
      redirectUrl.pathname = "/planos"
      redirectUrl.searchParams.set("plano", empresa.plano)
      redirectUrl.searchParams.set("novo", "1")
      return NextResponse.redirect(redirectUrl)
    }

    if (empresa.plano === "agenda" && empresa.plano_ativo) {
      const rotasPermitidas = ["/agendamentos", "/configuracoes"]
      const eRotaPermitida = rotasPermitidas.some(
        (r) => pathname === r || pathname.startsWith(r + "/")
      )
      if (!eRotaPermitida) {
        const redirectUrl = request.nextUrl.clone()
        redirectUrl.pathname = "/agendamentos"
        return NextResponse.redirect(redirectUrl)
      }
      return supabaseResponse
    }

    if (empresa.plano === "gestao" && empresa.plano_ativo) {
      const rotasPermitidas = ["/dashboard", "/caixa", "/financeiro", "/funcionarios", "/tarefas", "/configuracoes", "/empresas"]
      const eRotaPermitida = rotasPermitidas.some(
        (r) => pathname === r || pathname.startsWith(r + "/")
      )
      if (!eRotaPermitida) {
        const redirectUrl = request.nextUrl.clone()
        redirectUrl.pathname = "/dashboard"
        return NextResponse.redirect(redirectUrl)
      }
      return supabaseResponse
    }
  }

  return supabaseResponse
}
