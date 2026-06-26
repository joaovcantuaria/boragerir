import { NextRequest, NextResponse } from "next/server"
import { createAdminClient } from "@/lib/supabase/admin"

// Rota de setup inicial do admin — só funciona uma vez
// Acesse: POST /api/admin/setup com { email, password }
export async function POST(req: NextRequest) {
  const { email, password, secret } = await req.json()

  // Chave secreta para autorizar o setup
  if (secret !== "boragerir-setup-2025") {
    return NextResponse.json({ erro: "Não autorizado" }, { status: 403 })
  }

  if (email !== "contato@boragerir.com") {
    return NextResponse.json({ erro: "E-mail não autorizado" }, { status: 403 })
  }

  const admin = createAdminClient()

  // Criar usuário admin diretamente via service role (sem confirmação de e-mail)
  const { data, error } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true, // já confirma automaticamente
  })

  if (error) {
    // Se usuário já existe, retornar sucesso mesmo assim
    if (error.message.includes("already been registered")) {
      return NextResponse.json({ sucesso: true, mensagem: "Usuário já existe." })
    }
    return NextResponse.json({ erro: error.message }, { status: 500 })
  }

  return NextResponse.json({
    sucesso: true,
    mensagem: "Admin criado com sucesso! Acesse app.boragerir.com/admin",
    user_id: data.user?.id,
  })
}
