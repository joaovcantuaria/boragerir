import { NextRequest, NextResponse } from "next/server"
import { createAdminClient } from "@/lib/supabase/admin"
import { exigirAdmin } from "@/lib/auth/admin"

export async function POST(req: NextRequest) {
  const auth = await exigirAdmin(["super_admin"])
  if (!auth.ok) return auth.resposta

  const { chave, valor } = await req.json()
  const admin = createAdminClient()

  const { error } = await admin.from("configuracoes_sistema").upsert({
    chave,
    valor,
    updated_at: new Date().toISOString(),
  }, { onConflict: "chave" })

  if (error) return NextResponse.json({ erro: error.message }, { status: 500 })

  return NextResponse.json({ sucesso: true })
}
