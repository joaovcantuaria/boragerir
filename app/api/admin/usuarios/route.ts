import { NextRequest, NextResponse } from "next/server"
import { createAdminClient } from "@/lib/supabase/admin"
import { createClient } from "@supabase/supabase-js"

function getAdminAuthClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY!
  return createClient(url, key, { auth: { autoRefreshToken: false, persistSession: false } })
}

// POST — criar novo usuário admin
export async function POST(req: NextRequest) {
  try {
    const { nome, email, perfil, senha } = await req.json()
    if (!nome || !email || !perfil || !senha) {
      return NextResponse.json({ erro: "Dados incompletos" }, { status: 400 })
    }

    const authClient = getAdminAuthClient()
    const supabase = createAdminClient()

    // Criar usuário no Auth do Supabase
    const { data: authUser, error: errAuth } = await authClient.auth.admin.createUser({
      email,
      password: senha,
      email_confirm: true,
    })

    if (errAuth) return NextResponse.json({ erro: errAuth.message }, { status: 400 })

    // Inserir na tabela usuarios_admin
    const { data: usuario, error: errDB } = await supabase
      .from("usuarios_admin")
      .insert({ nome, email, perfil, user_id: authUser.user.id, ativo: true })
      .select().single()

    if (errDB) {
      // Rollback — remover usuário do auth se falhou no DB
      await authClient.auth.admin.deleteUser(authUser.user.id)
      return NextResponse.json({ erro: errDB.message }, { status: 500 })
    }

    return NextResponse.json({ usuario })
  } catch (err) {
    console.error("Erro ao criar usuário admin:", err)
    return NextResponse.json({ erro: "Erro interno" }, { status: 500 })
  }
}

// PUT — editar usuário admin
export async function PUT(req: NextRequest) {
  try {
    const { id, nome, perfil } = await req.json()
    if (!id || !nome || !perfil) {
      return NextResponse.json({ erro: "Dados incompletos" }, { status: 400 })
    }

    const supabase = createAdminClient()
    const { error } = await supabase
      .from("usuarios_admin")
      .update({ nome, perfil })
      .eq("id", id)

    if (error) return NextResponse.json({ erro: error.message }, { status: 500 })

    return NextResponse.json({ sucesso: true })
  } catch (err) {
    console.error("Erro ao editar usuário admin:", err)
    return NextResponse.json({ erro: "Erro interno" }, { status: 500 })
  }
}

// PATCH — ativar/desativar usuário admin
export async function PATCH(req: NextRequest) {
  try {
    const { id, ativo } = await req.json()
    if (!id || ativo === undefined) {
      return NextResponse.json({ erro: "Dados incompletos" }, { status: 400 })
    }

    const supabase = createAdminClient()
    const { error } = await supabase
      .from("usuarios_admin")
      .update({ ativo })
      .eq("id", id)

    if (error) return NextResponse.json({ erro: error.message }, { status: 500 })

    return NextResponse.json({ sucesso: true })
  } catch (err) {
    console.error("Erro ao alterar status do usuário admin:", err)
    return NextResponse.json({ erro: "Erro interno" }, { status: 500 })
  }
}
