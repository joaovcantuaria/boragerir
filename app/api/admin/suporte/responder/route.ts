import { NextRequest, NextResponse } from "next/server"
import { createAdminClient } from "@/lib/supabase/admin"
import { exigirAdmin } from "@/lib/auth/admin"

export async function POST(req: NextRequest) {
  const auth = await exigirAdmin(["super_admin"])
  if (!auth.ok) return auth.resposta

  const { ticket_id, resposta, email, empresa_nome, assunto } = await req.json()
  const admin = createAdminClient()

  // Atualizar ticket
  const { error } = await admin.from("tickets_suporte").update({
    resposta_admin: resposta,
    status: "resolvido",
    respondido_em: new Date().toISOString(),
  }).eq("id", ticket_id)

  if (error) return NextResponse.json({ erro: error.message }, { status: 500 })

  // Enviar e-mail via Supabase Edge Function ou SMTP
  // Por ora registrar apenas no banco — integrar SMTP depois
  console.log(`📧 Resposta para ${email} (${empresa_nome}): ${assunto}`)

  return NextResponse.json({ sucesso: true })
}
