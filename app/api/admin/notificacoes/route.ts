import { NextRequest, NextResponse } from "next/server"
import { createAdminClient } from "@/lib/supabase/admin"
import { createClient } from "@/lib/supabase/server"

export async function GET() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (user?.email?.toLowerCase() !== "contato@boragerir.com") {
    return NextResponse.json({ erro: "Não autorizado" }, { status: 403 })
  }
  const admin = createAdminClient()
  const { data } = await admin.from("notificacoes_admin")
    .select("*").order("created_at", { ascending: false }).limit(50)
  return NextResponse.json(data ?? [])
}

export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (user?.email?.toLowerCase() !== "contato@boragerir.com") {
    return NextResponse.json({ erro: "Não autorizado" }, { status: 403 })
  }
  const { id } = await req.json() // marcar como lida
  const admin = createAdminClient()

  if (id === "todas") {
    await admin.from("notificacoes_admin").update({ lida: true }).eq("lida", false)
  } else {
    await admin.from("notificacoes_admin").update({ lida: true }).eq("id", id)
  }
  return NextResponse.json({ sucesso: true })
}
