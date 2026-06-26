import { type NextRequest, NextResponse } from "next/server"
import { updateSession } from "@/lib/supabase/middleware"

const ADMIN_EMAIL = "contato@boragerir.com"

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl

  // ── Rotas públicas — sem verificação ─────────────────────
  if (
    pathname.startsWith("/demo") ||
    pathname.startsWith("/auth/") ||
    pathname === "/login" ||
    pathname === "/cadastro" ||
    pathname === "/"
  ) {
    return NextResponse.next({ request })
  }

  // ── Verificar se Supabase está configurado ────────────────
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  if (!supabaseUrl || supabaseUrl.includes("placeholder") || !supabaseUrl.startsWith("http")) {
    const url = request.nextUrl.clone()
    url.pathname = "/demo"
    return NextResponse.redirect(url)
  }

  // ── Obter usuário logado ──────────────────────────────────
  const { createServerClient } = await import("@supabase/ssr")
  const { cookies } = await import("next/headers")
  const cookieStore = await cookies()

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll: () => cookieStore.getAll(),
        setAll: () => {},
      },
    }
  )

  const { data: { user } } = await supabase.auth.getUser()

  // ── Admin: acesso total ao /admin, sem onboarding ─────────
  if (pathname.startsWith("/admin")) {
    if (!user) {
      const url = request.nextUrl.clone()
      url.pathname = "/login"
      url.searchParams.set("redirect", "/admin")
      return NextResponse.redirect(url)
    }
    if (user.email?.toLowerCase() !== ADMIN_EMAIL.toLowerCase()) {
      // Não é admin → vai pro dashboard normal
      const url = request.nextUrl.clone()
      url.pathname = "/dashboard"
      return NextResponse.redirect(url)
    }
    // É admin → passa direto, sem verificar empresa
    return NextResponse.next({ request })
  }

  // ── Admin logado tentando acessar rotas normais → admin ───
  if (user?.email?.toLowerCase() === ADMIN_EMAIL.toLowerCase() && !pathname.startsWith("/admin")) {
    const url = request.nextUrl.clone()
    url.pathname = "/admin"
    return NextResponse.redirect(url)
  }

  // ── Rotas autenticadas normais ────────────────────────────
  if (!user) {
    const url = request.nextUrl.clone()
    url.pathname = "/login"
    return NextResponse.redirect(url)
  }

  // Autenticado mas sem empresa → onboarding
  if (pathname !== "/onboarding") {
    const { data: empresa } = await supabase
      .from("empresas")
      .select("id")
      .eq("user_id", user.id)
      .single()

    if (!empresa) {
      const url = request.nextUrl.clone()
      url.pathname = "/onboarding"
      return NextResponse.redirect(url)
    }
  }

  // Autenticado no login/cadastro → dashboard
  if (pathname === "/login" || pathname === "/cadastro") {
    const url = request.nextUrl.clone()
    url.pathname = "/dashboard"
    return NextResponse.redirect(url)
  }

  return await updateSession(request)
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
}
