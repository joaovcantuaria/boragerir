import { type NextRequest, NextResponse } from "next/server"
import { createServerClient } from "@supabase/ssr"

const ADMIN_EMAIL = "contato@boragerir.com"

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl

  // ── Rotas públicas ────────────────────────────────────────
  if (
    pathname.startsWith("/demo") ||
    pathname.startsWith("/auth/") ||
    pathname.startsWith("/api/") ||
    pathname.startsWith("/agendar/") ||  // página pública de agendamento
    pathname === "/agendar" ||
    pathname === "/login" ||
    pathname === "/cadastro" ||
    pathname === "/"
  ) {
    return NextResponse.next({ request })
  }

  // ── Supabase não configurado → demo ───────────────────────
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? ""
  if (!supabaseUrl || supabaseUrl.includes("placeholder") || !supabaseUrl.startsWith("http")) {
    return NextResponse.redirect(new URL("/demo", request.url))
  }

  // ── Criar cliente Supabase ────────────────────────────────
  let response = NextResponse.next({ request })

  const supabase = createServerClient(
    supabaseUrl,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll: () => request.cookies.getAll(),
        setAll: (cookiesToSet) => {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value))
          response = NextResponse.next({ request })
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  const { data: { user } } = await supabase.auth.getUser()
  const isAdmin = user?.email?.toLowerCase() === ADMIN_EMAIL.toLowerCase()

  // ── Rota /admin ───────────────────────────────────────────
  if (pathname.startsWith("/admin")) {
    if (!user) return NextResponse.redirect(new URL("/login", request.url))
    if (!isAdmin) return NextResponse.redirect(new URL("/dashboard", request.url))
    return response
  }

  // ── Admin acessando rota normal → vai pro admin ───────────
  if (isAdmin) {
    return NextResponse.redirect(new URL("/admin", request.url))
  }

  // ── Usuário não autenticado ───────────────────────────────
  if (!user) {
    return NextResponse.redirect(new URL("/login", request.url))
  }

  // ── Redirecionar autenticado no login/cadastro ────────────
  if (pathname === "/login" || pathname === "/cadastro") {
    return NextResponse.redirect(new URL("/dashboard", request.url))
  }

  // ── Verificar onboarding ──────────────────────────────────
  if (pathname !== "/onboarding") {
    const { data: empresa } = await supabase
      .from("empresas")
      .select("id")
      .eq("user_id", user.id)
      .single()

    if (!empresa) {
      return NextResponse.redirect(new URL("/onboarding", request.url))
    }
  }

  return response
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
}
