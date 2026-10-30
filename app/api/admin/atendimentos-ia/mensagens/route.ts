import { NextRequest, NextResponse } from "next/server"
import { createAdminClient } from "@/lib/supabase/admin"
import { exigirAdmin } from "@/lib/auth/admin"

export async function GET(req: NextRequest) {
  const auth = await exigirAdmin(["super_admin"])
  if (!auth.ok) return auth.resposta

  const conversa_id = req.nextUrl.searchParams.get("conversa_id")
  if (!conversa_id) return NextResponse.json({ erro: "conversa_id obrigatório" }, { status: 400 })

  const admin = createAdminClient()
  const { data } = await admin
    .from("mensagens_mel")
    .select("role, conteudo, created_at")
    .eq("conversa_id", conversa_id)
    .order("created_at")

  return NextResponse.json(data ?? [])
}
