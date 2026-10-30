import { NextRequest, NextResponse } from "next/server"
import { createAdminClient } from "@/lib/supabase/admin"
import { exigirAdmin } from "@/lib/auth/admin"

export async function POST(req: NextRequest) {
  const auth = await exigirAdmin(["super_admin"])
  if (!auth.ok) return auth.resposta

  const { empresa_id, nota } = await req.json()
  const admin = createAdminClient()

  const { data, error } = await admin.from("notas_admin").insert({ empresa_id, nota }).select().single()
  if (error) return NextResponse.json({ erro: error.message }, { status: 500 })

  return NextResponse.json(data)
}
