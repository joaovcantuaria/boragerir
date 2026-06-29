import { type NextRequest, NextResponse } from "next/server"
import { updateSession } from "@/lib/supabase/middleware"

// Headers de segurança HTTP aplicados em todas as respostas
function adicionarHeadersSeguranca(response: NextResponse): NextResponse {
  response.headers.set("X-Frame-Options", "DENY")
  response.headers.set("X-Content-Type-Options", "nosniff")
  response.headers.set("Referrer-Policy", "strict-origin-when-cross-origin")
  response.headers.set("Permissions-Policy", "camera=(), microphone=(), geolocation=()")
  response.headers.set(
    "Strict-Transport-Security",
    "max-age=31536000; includeSubDomains"
  )
  response.headers.set(
    "Content-Security-Policy",
    "frame-ancestors 'none'"
  )
  return response
}

export async function middleware(request: NextRequest) {
  const response = await updateSession(request)
  return adicionarHeadersSeguranca(response)
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
}
