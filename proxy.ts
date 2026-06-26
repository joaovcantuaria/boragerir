import { type NextRequest, NextResponse } from "next/server"
import { updateSession } from "@/lib/supabase/middleware"

// Next.js 16+ usa "proxy" em vez de "middleware"
export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl

  // Rotas demo e públicas — passar direto sem tocar no Supabase
  if (
    pathname.startsWith("/demo") ||
    pathname.startsWith("/auth/") ||
    pathname === "/login" ||
    pathname === "/cadastro" ||
    pathname === "/"
  ) {
    return NextResponse.next({ request })
  }

  // Para as demais rotas, verificar se o Supabase está configurado
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  if (!supabaseUrl || supabaseUrl.includes("placeholder") || !supabaseUrl.startsWith("http")) {
    // Supabase não configurado — redirecionar para o demo
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
