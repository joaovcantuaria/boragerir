import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { createAdminClient } from "@/lib/supabase/admin"

export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ erro: "Não autorizado" }, { status: 401 })
  }

  const { empresa_id, funcionario_id } = await req.json()

  if (!empresa_id || !funcionario_id) {
    return NextResponse.json({ erro: "empresa_id e funcionario_id são obrigatórios" }, { status: 400 })
  }

  const admin = createAdminClient()

  // Registrar logout
  await admin.from("sessoes_colaboradores").insert({
    empresa_id,
    funcionario_id,
    acao: "logout",
    ip: req.headers.get("x-forwarded-for") || req.headers.get("x-real-ip") || null,
    user_agent: req.headers.get("user-agent") || null,
  })

  return NextResponse.json({ sucesso: true })
}
