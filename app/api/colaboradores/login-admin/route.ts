import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { conferirHash, gerarHash, lerSegredosEmpresa, salvarSegredosEmpresa } from "@/lib/security/senhas"
import { consumirLimite, limparLimite, limiteBloqueadoAte, mensagemBloqueio } from "@/lib/security/limite-tentativas"


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

  // 5 senhas erradas em 15 min → bloqueia 15 min
  const chaveLimite = `colab-admin:${empresa_id}`
  const bloqueio = await limiteBloqueadoAte(chaveLimite)
  if (bloqueio) return NextResponse.json({ sucesso: false, erro: mensagemBloqueio(bloqueio) }, { status: 429 })

  // Verificar senha (hash fica só no servidor)
  const { senhaAdminHash } = await lerSegredosEmpresa(empresa_id)
  const { ok, atualizar } = await conferirHash(String(senha), senhaAdminHash)
  if (ok && atualizar) await salvarSegredosEmpresa(empresa_id, { senhaAdminHash: await gerarHash(String(senha)) }).catch(() => {})
  if (!ok) {
    const r = await consumirLimite(chaveLimite, 5, 900, 900)
    if (!r.permitido) return NextResponse.json({ sucesso: false, erro: mensagemBloqueio(r.bloqueadoAte) }, { status: 429 })
    return NextResponse.json({ sucesso: false, erro: "Senha incorreta" }, { status: 401 })
  }
  await limparLimite(chaveLimite)

  return NextResponse.json({ sucesso: true })
}
