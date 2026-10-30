import { NextRequest, NextResponse } from "next/server"
import { createAdminClient } from "@/lib/supabase/admin"
import { exigirAdmin } from "@/lib/auth/admin"

export async function GET() {
  const auth = await exigirAdmin(["super_admin"])
  if (!auth.ok) return auth.resposta
  const admin = createAdminClient()
  const { data } = await admin.from("notificacoes_admin")
    .select("*").order("created_at", { ascending: false }).limit(50)
  return NextResponse.json(data ?? [])
}

export async function POST(req: NextRequest) {
  const auth = await exigirAdmin(["super_admin"])
  if (!auth.ok) return auth.resposta
  const { id } = await req.json() // marcar como lida
  const admin = createAdminClient()

  if (id === "todas") {
    await admin.from("notificacoes_admin").update({ lida: true }).eq("lida", false)
  } else {
    await admin.from("notificacoes_admin").update({ lida: true }).eq("id", id)
  }
  return NextResponse.json({ sucesso: true })
}
