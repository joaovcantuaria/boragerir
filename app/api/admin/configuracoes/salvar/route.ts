import { NextRequest, NextResponse } from "next/server"
import { createAdminClient } from "@/lib/supabase/admin"
import { createClient } from "@/lib/supabase/server"

export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (user?.email !== "contato@boragerir.com") {
    return NextResponse.json({ erro: "Não autorizado" }, { status: 403 })
  }

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
