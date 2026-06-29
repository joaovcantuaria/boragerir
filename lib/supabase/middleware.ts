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

  // Rotas públicas de agendamento não precisam de auth
  if (eRotaAgendar) return supabaseResponse

  if (!user && !eRotaPublica) {
    const redirectUrl = request.nextUrl.clone()
    redirectUrl.pathname = "/login"
    return NextResponse.redirect(redirectUrl)
  }

  if (user && (pathname === "/login" || pathname === "/cadastro")) {
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
    const { data: empresa } = await supabase
      .from("empresas").select("id, plano, plano_ativo").eq("user_id", user.id).single()
    if (!empresa) {
      const redirectUrl = request.nextUrl.clone()
      redirectUrl.pathname = "/onboarding"
      return NextResponse.redirect(redirectUrl)
    }

    // Plano "agenda" — acesso restrito apenas a agendamentos e configurações
    if (empresa.plano === "agenda") {
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

    // Se plano pago mas não ativo (aguardando pagamento) → forçar para tela de planos
    // Exceção: a própria tela de planos e pagamento
    const eRotaPlanos = pathname.startsWith("/planos")
    if (!empresa.plano_ativo && empresa.plano !== "gratuito" && !eRotaPlanos) {
      const redirectUrl = request.nextUrl.clone()
      redirectUrl.pathname = "/planos"
      redirectUrl.searchParams.set("plano", empresa.plano)
      redirectUrl.searchParams.set("novo", "1")
      return NextResponse.redirect(redirectUrl)
    }
  }

  return supabaseResponse
}
