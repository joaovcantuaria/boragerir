import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { createAdminClient } from "@/lib/supabase/admin"
import crypto from "crypto"

function hashSenha(senha: string): string {
  return crypto.createHash("sha256").update(senha).digest("hex")
}

export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ erro: "Não autorizado" }, { status: 401 })
  }

  const { empresa_id, funcionario_id, usuario, senha, perfil, permissoes } = await req.json()

  if (!empresa_id || !funcionario_id || !usuario || !senha) {
    return NextResponse.json({ erro: "Campos obrigatórios: empresa_id, funcionario_id, usuario, senha" }, { status: 400 })
  }

  // Verificar se o usuário é dono da empresa
  const { data: empresa } = await supabase
    .from("empresas")
    .select("id")
    .eq("id", empresa_id)
    .eq("user_id", user.id)
    .single()

  if (!empresa) {
    return NextResponse.json({ erro: "Empresa não encontrada" }, { status: 404 })
  }

  const admin = createAdminClient()

  // Verificar se o usuario já existe nessa empresa
  const { data: existente } = await admin
    .from("funcionarios")
    .select("id")
    .eq("empresa_id", empresa_id)
    .eq("usuario", usuario.toLowerCase().trim())
    .neq("id", funcionario_id)
    .maybeSingle()

  if (existente) {
    return NextResponse.json({ erro: "Este nome de usuário já está em uso" }, { status: 409 })
  }

  // Validações
  if (usuario.length < 3) {
    return NextResponse.json({ erro: "Usuário deve ter no mínimo 3 caracteres" }, { status: 400 })
  }
  if (senha.length < 4) {
    return NextResponse.json({ erro: "Senha deve ter no mínimo 4 caracteres" }, { status: 400 })
  }
  if (perfil && !["admin", "gerente", "colaborador"].includes(perfil)) {
    return NextResponse.json({ erro: "Perfil inválido" }, { status: 400 })
  }

  // Atualizar funcionário com credenciais
  const { error } = await admin
    .from("funcionarios")
    .update({
      usuario: usuario.toLowerCase().trim(),
      senha_hash: hashSenha(senha),
      perfil: perfil || "colaborador",
      permissoes: permissoes || {},
    })
    .eq("id", funcionario_id)
    .eq("empresa_id", empresa_id)

  if (error) {
    return NextResponse.json({ erro: error.message }, { status: 500 })
  }

  return NextResponse.json({ sucesso: true })
}

// Atualizar permissões de um colaborador
export async function PUT(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ erro: "Não autorizado" }, { status: 401 })
  }

  const { empresa_id, funcionario_id, perfil, permissoes, senha } = await req.json()

  if (!empresa_id || !funcionario_id) {
    return NextResponse.json({ erro: "empresa_id e funcionario_id são obrigatórios" }, { status: 400 })
  }

  const { data: empresa } = await supabase
    .from("empresas")
    .select("id")
    .eq("id", empresa_id)
    .eq("user_id", user.id)
    .single()

  if (!empresa) {
    return NextResponse.json({ erro: "Empresa não encontrada" }, { status: 404 })
  }

  const admin = createAdminClient()
  const updateData: Record<string, unknown> = {}

  if (perfil) updateData.perfil = perfil
  if (permissoes !== undefined) updateData.permissoes = permissoes
  if (senha) updateData.senha_hash = hashSenha(senha)

  if (Object.keys(updateData).length === 0) {
    return NextResponse.json({ erro: "Nenhum dado para atualizar" }, { status: 400 })
  }

  const { error } = await admin
    .from("funcionarios")
    .update(updateData)
    .eq("id", funcionario_id)
    .eq("empresa_id", empresa_id)

  if (error) {
    return NextResponse.json({ erro: error.message }, { status: 500 })
  }

  return NextResponse.json({ sucesso: true })
}
