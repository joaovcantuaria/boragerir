import { NextRequest, NextResponse } from "next/server"
import { createAdminClient } from "@/lib/supabase/admin"
import { createClient } from "@/lib/supabase/server"

export async function POST(req: NextRequest) {
  // Verificar se é admin
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (user?.email?.toLowerCase() !== "contato@boragerir.com") {
    return NextResponse.json({ erro: "Não autorizado" }, { status: 403 })
  }

  const body = await req.json()
  const { email, senha, nome_empresa, telefone, area_atuacao, plano } = body

  if (!email || !senha || !nome_empresa || !telefone || !area_atuacao) {
    return NextResponse.json({ erro: "Campos obrigatórios: email, senha, nome_empresa, telefone, area_atuacao" }, { status: 400 })
  }

  const admin = createAdminClient()

  // 1. Criar usuário no Auth
  const { data: authUser, error: authError } = await admin.auth.admin.createUser({
    email,
    password: senha,
    email_confirm: true, // confirma o email automaticamente
    user_metadata: {
      nome_completo: nome_empresa,
      telefone,
    },
  })

  if (authError) {
    if (authError.message.includes("already been registered")) {
      return NextResponse.json({ erro: "Este e-mail já está cadastrado." }, { status: 409 })
    }
    return NextResponse.json({ erro: authError.message }, { status: 500 })
  }

  // 2. Criar empresa vinculada ao usuário
  const { data: empresa, error: empresaError } = await admin.from("empresas").insert({
    user_id: authUser.user.id,
    nome: nome_empresa,
    area_atuacao,
    telefone,
    email,
    plano: plano || "gratuito",
    plano_ativo: true,
  }).select().single()

  if (empresaError) {
    // Rollback: excluir o usuário criado
    await admin.auth.admin.deleteUser(authUser.user.id)
    return NextResponse.json({ erro: empresaError.message }, { status: 500 })
  }

  return NextResponse.json({
    sucesso: true,
    empresa: {
      id: empresa.id,
      nome: empresa.nome,
      email: empresa.email,
      plano: empresa.plano,
    },
    user_id: authUser.user.id,
  })
}
