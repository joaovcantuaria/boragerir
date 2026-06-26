import { type NextRequest, NextResponse } from "next/server"
import { updateSession } from "@/lib/supabase/middleware"

const ADMIN_EMAIL = "contato@boragerir.com"

// Next.js 16+ usa "proxy" em vez de "middleware"
export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl

  // ── Rotas demo e públicas ─────────────────────────────────
  if (
    pathname.startsWith("/demo") ||
    pathname.startsWith("/auth/") ||
    pathname === "/login" ||
    pathname === "/cadastro" ||
    pathname === "/"
  ) {
    return NextResponse.next({ request })
  }

  // ── Proteção do painel admin ──────────────────────────────
  if (pathname.startsWith("/admin")) {
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

    // Não autenticado → login
    if (!user) {
      const url = request.nextUrl.clone()
      url.pathname = "/login"
      return NextResponse.redirect(url)
    }

    // Não é admin → dashboard
    if (user.email !== ADMIN_EMAIL) {
      const url = request.nextUrl.clone()
      url.pathname = "/dashboard"
      return NextResponse.redirect(url)
    }

    return NextResponse.next({ request })
  }

  // ── Verificar se Supabase está configurado ────────────────
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  if (!supabaseUrl || supabaseUrl.includes("placeholder") || !supabaseUrl.startsWith("http")) {
    const url = request.nextUrl.clone()
    url.pathname = "/demo"
    return NextResponse.redirect(url)
  }

  return await updateSession(request)
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
}
