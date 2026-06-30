import { NextRequest, NextResponse } from "next/server"
import { createAdminClient } from "@/lib/supabase/admin"

export async function POST(req: NextRequest) {
  try {
    const { pagina } = await req.json()

    if (!["site", "login", "cadastro"].includes(pagina)) {
      return NextResponse.json({ ok: false })
    }

    const userAgent = req.headers.get("user-agent") ?? null

    // Ignorar bots conhecidos
    if (userAgent && /bot|crawler|spider|crawl|slurp|googlebot|bingbot/i.test(userAgent)) {
      return NextResponse.json({ ok: false })
    }

    const supabase = createAdminClient()
    await supabase.from("visitas_analytics").insert({ pagina, user_agent: userAgent })

    return NextResponse.json({ ok: true })
  } catch {
    return NextResponse.json({ ok: false })
  }
}
