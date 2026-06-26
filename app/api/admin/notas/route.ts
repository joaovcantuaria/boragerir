import { NextRequest, NextResponse } from "next/server"
import { createAdminClient } from "@/lib/supabase/admin"
import { createClient } from "@/lib/supabase/server"

export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (user?.email !== "contato@boragerir.com") {
    return NextResponse.json({ erro: "Não autorizado" }, { status: 403 })
  }

  const { empresa_id, nota } = await req.json()
  const admin = createAdminClient()

  const { data, error } = await admin.from("notas_admin").insert({ empresa_id, nota }).select().single()
  if (error) return NextResponse.json({ erro: error.message }, { status: 500 })

  return NextResponse.json(data)
}
