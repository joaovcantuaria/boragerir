import { NextRequest, NextResponse } from "next/server"
import { createAdminClient } from "@/lib/supabase/admin"
import { createClient } from "@/lib/supabase/server"

export async function GET(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (user?.email?.toLowerCase() !== "contato@boragerir.com") {
    return NextResponse.json({ erro: "Não autorizado" }, { status: 403 })
  }

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
