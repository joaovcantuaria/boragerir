import { NextRequest, NextResponse } from "next/server"
import { createAdminClient } from "@/lib/supabase/admin"
import { exigirAdmin } from "@/lib/auth/admin"

export async function POST(req: NextRequest) {
  const auth = await exigirAdmin(["super_admin"])
  if (!auth.ok) return auth.resposta

  const { empresa_id } = await req.json()
  if (!empresa_id) return NextResponse.json({ erro: "empresa_id obrigatório" }, { status: 400 })

  const admin = createAdminClient()

  // Excluir em cascata (RLS off com service role)
  const { error } = await admin.from("empresas").delete().eq("id", empresa_id)
  if (error) return NextResponse.json({ erro: error.message }, { status: 500 })

  return NextResponse.json({ sucesso: true })
}
