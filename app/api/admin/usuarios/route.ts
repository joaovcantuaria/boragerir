import { NextRequest, NextResponse } from "next/server"
import { createAdminClient } from "@/lib/supabase/admin"
import { createClient } from "@supabase/supabase-js"
import { createClient as createServerClient } from "@/lib/supabase/server"

function getAdminAuthClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY!
  return createClient(url, key, { auth: { autoRefreshToken: false, persistSession: false } })
}

// Verifica se o caller é um admin autenticado e ativo
async function verificarAdmin(): Promise<{ autorizado: boolean; erro?: string }> {
  try {
    const supabase = await createServerClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return { autorizado: false, erro: "Não autenticado" }

    const adminDb = createAdminClient()
    const { data: usuarioAdmin } = await adminDb
      .from("usuarios_admin")
      .select("perfil, ativo")
      .eq("email", user.email ?? "")
      .single()

    if (!usuarioAdmin || !usuarioAdmin.ativo) {
      return { autorizado: false, erro: "Sem permissão" }
    }
    return { autorizado: true }
  } catch {
    return { autorizado: false, erro: "Erro ao verificar permissão" }
  }
}

// POST — criar novo usuário admin
export async function POST(req: NextRequest) {
  const { autorizado, erro } = await verificarAdmin()
  if (!autorizado) return NextResponse.json({ erro }, { status: 401 })

  try {
    const { nome, email, perfil, senha } = await req.json()
    if (!nome || !email || !perfil || !senha) {
      return NextResponse.json({ erro: "Dados incompletos" }, { status: 400 })
    }

    const authClient = getAdminAuthClient()
    const supabase = createAdminClient()

    const { data: authUser, error: errAuth } = await authClient.auth.admin.createUser({
      email,
      password: senha,
      email_confirm: true,
    })

    if (errAuth) return NextResponse.json({ erro: errAuth.message }, { status: 400 })

    const { data: usuario, error: errDB } = await supabase
      .from("usuarios_admin")
      .insert({ nome, email, perfil, user_id: authUser.user.id, ativo: true })
      .select().single()

    if (errDB) {
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
  const { autorizado, erro } = await verificarAdmin()
  if (!autorizado) return NextResponse.json({ erro }, { status: 401 })

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
  const { autorizado, erro } = await verificarAdmin()
  if (!autorizado) return NextResponse.json({ erro }, { status: 401 })

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
