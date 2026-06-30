import { createServerClient } from "@supabase/ssr"
import { NextResponse, type NextRequest } from "next/server"
import type { Database } from "@/types/database"

// Permissões por perfil — quais rotas cada perfil pode acessar no admin
const PERMISSOES: Record<string, string[]> = {
  super_admin: ["/admin"],                                                        // tudo
  quase_admin: ["/admin", "/admin/empresas", "/admin/assinaturas", "/admin/vendedores", "/admin/cupons", "/admin/atendimentos-ia", "/admin/suporte"],
  vendas:      ["/admin/empresas", "/admin/assinaturas"],
  atendimento: ["/admin/atendimentos-ia", "/admin/suporte"],
}

function temPermissao(perfil: string, pathname: string): boolean {
  if (perfil === "super_admin") return true
  const permitidas = PERMISSOES[perfil] ?? []
  return permitidas.some((r) => pathname === r || pathname.startsWith(r + "/"))
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
  const eRotaAdmin = pathname.startsWith("/admin")
  const eRotaAgendar = pathname.startsWith("/agendar/")
  const eRotaApi = pathname.startsWith("/api/")

  // Rotas públicas de agendamento e APIs não precisam de redirect pelo middleware
  if (eRotaAgendar || eRotaApi) return supabaseResponse

  if (!user && !eRotaPublica) {
    const redirectUrl = request.nextUrl.clone()
    redirectUrl.pathname = "/login"
    return NextResponse.redirect(redirectUrl)
  }

  if (user && (pathname === "/login" || pathname === "/cadastro")) {
    // Checar se é admin ANTES de redirecionar para dashboard
    if (serviceKey) {
      const { createClient } = await import("@supabase/supabase-js")
      const adminClient = createClient(url, serviceKey, { auth: { persistSession: false } })
      const { data: usuarioAdmin } = await adminClient
        .from("usuarios_admin")
        .select("ativo")
        .eq("email", user.email ?? "")
        .maybeSingle()

      if (usuarioAdmin?.ativo) {
        const redirectUrl = request.nextUrl.clone()
        redirectUrl.pathname = "/admin"
        return NextResponse.redirect(redirectUrl)
      }
    }

    const redirectUrl = request.nextUrl.clone()
    redirectUrl.pathname = "/dashboard"
    return NextResponse.redirect(redirectUrl)
  }

  // Proteção do painel admin
  if (eRotaAdmin && user && serviceKey) {
    const { createClient } = await import("@supabase/supabase-js")
    const adminClient = createClient(url, serviceKey, { auth: { persistSession: false } })
    const { data: usuarioAdmin } = await adminClient
      .from("usuarios_admin")
      .select("perfil, ativo")
      .eq("email", user.email ?? "")
      .single()

    if (!usuarioAdmin || !usuarioAdmin.ativo) {
      const redirectUrl = request.nextUrl.clone()
      redirectUrl.pathname = "/dashboard"
      return NextResponse.redirect(redirectUrl)
    }

    if (!temPermissao(usuarioAdmin.perfil, pathname)) {
      // Redireciona para a primeira rota permitida
      const permitidas = PERMISSOES[usuarioAdmin.perfil] ?? []
      const redirectUrl = request.nextUrl.clone()
      redirectUrl.pathname = permitidas[0] ?? "/dashboard"
      return NextResponse.redirect(redirectUrl)
    }
  } else if (eRotaAdmin && user && !serviceKey) {
    // Sem service role configurada — bloqueia acesso ao admin por segurança
    const redirectUrl = request.nextUrl.clone()
    redirectUrl.pathname = "/dashboard"
    return NextResponse.redirect(redirectUrl)
  }

  if (user && !eRotaPublica && !eRotaAdmin && pathname !== "/onboarding") {
    // Verificar se é usuário admin acessando rota normal — redirecionar para /admin
    if (serviceKey) {
      const { createClient } = await import("@supabase/supabase-js")
      const adminClient = createClient(url, serviceKey, { auth: { persistSession: false } })
      const { data: usuarioAdmin } = await adminClient
        .from("usuarios_admin")
        .select("ativo")
        .eq("email", user.email ?? "")
        .maybeSingle()

      if (usuarioAdmin?.ativo) {
        const redirectUrl = request.nextUrl.clone()
        redirectUrl.pathname = "/admin"
        return NextResponse.redirect(redirectUrl)
      }
    }

    const { data: empresa } = await supabase
      .from("empresas").select("id, plano, plano_ativo").eq("user_id", user.id).single()
    if (!empresa) {
      const redirectUrl = request.nextUrl.clone()
      redirectUrl.pathname = "/onboarding"
      return NextResponse.redirect(redirectUrl)
    }

    const eRotaPlanos = pathname.startsWith("/planos")

    // GATE DE PAGAMENTO — qualquer plano pago sem plano_ativo vai para pagamento
    // Esta verificação vem ANTES de qualquer outra para garantir que nunca seja bypassada
    if (!empresa.plano_ativo && empresa.plano !== "gratuito" && !eRotaPlanos) {
      const redirectUrl = request.nextUrl.clone()
      redirectUrl.pathname = "/planos"
      redirectUrl.searchParams.set("plano", empresa.plano)
      redirectUrl.searchParams.set("novo", "1")
      return NextResponse.redirect(redirectUrl)
    }

    // Plano "agenda" ativo — acesso restrito apenas a agendamentos e configurações
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
  }

  return supabaseResponse
}
