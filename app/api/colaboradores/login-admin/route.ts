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

  const { empresa_id, senha } = await req.json()

  if (!empresa_id || !senha) {
    return NextResponse.json({ erro: "empresa_id e senha são obrigatórios" }, { status: 400 })
  }

  // Verificar se o usuário é dono da empresa
  const { data: empresa } = await supabase
    .from("empresas")
    .select("id, senha_admin")
    .eq("id", empresa_id)
    .eq("user_id", user.id)
    .single()

  if (!empresa) {
    return NextResponse.json({ erro: "Empresa não encontrada" }, { status: 404 })
  }

  if (!empresa.senha_admin) {
    return NextResponse.json({ erro: "Senha de administrador não configurada" }, { status: 400 })
  }

  // Verificar senha
  const senhaHash = hashSenha(senha)
  if (senhaHash !== empresa.senha_admin) {
    return NextResponse.json({ sucesso: false, erro: "Senha incorreta" }, { status: 401 })
  }

  return NextResponse.json({ sucesso: true })
}
