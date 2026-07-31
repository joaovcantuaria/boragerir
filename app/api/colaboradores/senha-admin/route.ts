import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { createAdminClient } from "@/lib/supabase/admin"
import crypto from "crypto"

function hashSenha(senha: string): string {
  return crypto.createHash("sha256").update(senha).digest("hex")
}

// Configurar/atualizar senha do admin
export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ erro: "Não autorizado" }, { status: 401 })
  }

  const { empresa_id, senha } = await req.json()

  if (!empresa_id || !senha) {
    return NextResponse.json({ erro: "empresa_id e senha são obrigatórios" }, { status: 400 })
  }

  if (senha.length < 4) {
    return NextResponse.json({ erro: "Senha deve ter no mínimo 4 caracteres" }, { status: 400 })
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

  const { error } = await admin
    .from("empresas")
    .update({ senha_admin: hashSenha(senha) })
    .eq("id", empresa_id)

  if (error) {
    return NextResponse.json({ erro: error.message }, { status: 500 })
  }

  return NextResponse.json({ sucesso: true })
}

// Verificar se tem senha configurada
export async function GET(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ erro: "Não autorizado" }, { status: 401 })
  }

  const { searchParams } = new URL(req.url)
  const empresa_id = searchParams.get("empresa_id")

  if (!empresa_id) {
    return NextResponse.json({ erro: "empresa_id é obrigatório" }, { status: 400 })
  }

  const { data: empresa } = await supabase
    .from("empresas")
    .select("senha_admin")
    .eq("id", empresa_id)
    .eq("user_id", user.id)
    .single()

  if (!empresa) {
    return NextResponse.json({ erro: "Empresa não encontrada" }, { status: 404 })
  }

  return NextResponse.json({ temSenha: !!empresa.senha_admin })
}
