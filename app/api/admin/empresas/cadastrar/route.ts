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
  const { email, senha, nome_empresa, nome_titular, telefone, area_atuacao, plano, max_empresas } = body

  if (!email || !senha || !telefone) {
    return NextResponse.json({ erro: "Campos obrigatórios: email, senha, telefone" }, { status: 400 })
  }

  // Para planos normais, nome_empresa e area_atuacao são obrigatórios
  if (plano !== "gestao" && (!nome_empresa || !area_atuacao)) {
    return NextResponse.json({ erro: "Campos obrigatórios: nome_empresa, area_atuacao" }, { status: 400 })
  }

  const admin = createAdminClient()

  // 1. Criar usuário no Auth
  const { data: authUser, error: authError } = await admin.auth.admin.createUser({
    email,
    password: senha,
    email_confirm: true,
    user_metadata: {
      nome_completo: nome_titular || nome_empresa || email.split("@")[0],
      telefone,
    },
  })

  if (authError) {
    if (authError.message.includes("already been registered")) {
      return NextResponse.json({ erro: "Este e-mail já está cadastrado." }, { status: 409 })
    }
    return NextResponse.json({ erro: authError.message }, { status: 500 })
  }

  // 2. Para plano gestão: criar empresa "container" que define o plano e limites
  //    O nome será o nome do titular (o cliente cria suas empresas reais depois)
  //    Para outros planos: criar a empresa normalmente
  const nomeEmpresa = plano === "gestao"
    ? (nome_empresa || nome_titular || email.split("@")[0])
    : nome_empresa

  const { data: empresa, error: empresaError } = await admin.from("empresas").insert({
    user_id: authUser.user.id,
    nome: nomeEmpresa,
    area_atuacao: area_atuacao || "Gestão",
    telefone,
    email,
    plano: plano || "gratuito",
    plano_ativo: true,
    max_empresas: max_empresas ? parseInt(max_empresas) : (plano === "gestao" ? 1 : null),
  }).select().single()

  if (empresaError) {
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
