import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { createAdminClient } from "@/lib/supabase/admin"
import crypto from "crypto"
import { consumirLimite, limparLimite, limiteBloqueadoAte, mensagemBloqueio } from "@/lib/security/limite-tentativas"

function hashSenha(senha: string): string {
  return crypto.createHash("sha256").update(senha).digest("hex")
}

export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ erro: "Não autorizado" }, { status: 401 })
  }

  const { empresa_id, usuario, senha } = await req.json()

  if (!empresa_id || !usuario || !senha) {
    return NextResponse.json({ erro: "empresa_id, usuario e senha são obrigatórios" }, { status: 400 })
  }

  // Verificar se o usuário tem acesso a esta empresa
  const { data: empresa } = await supabase
    .from("empresas")
    .select("id")
    .eq("id", empresa_id)
    .eq("user_id", user.id)
    .single()

  if (!empresa) {
    return NextResponse.json({ erro: "Empresa não encontrada" }, { status: 404 })
  }

  // 5 senhas erradas para o mesmo usuário em 15 min → bloqueia 15 min
  const chaveLimite = `colab:${empresa_id}:${String(usuario).toLowerCase().trim()}`
  const bloqueio = await limiteBloqueadoAte(chaveLimite)
  if (bloqueio) return NextResponse.json({ erro: mensagemBloqueio(bloqueio) }, { status: 429 })

  const admin = createAdminClient()

  // Buscar colaborador pelo usuario
  const { data: colaborador, error } = await admin
    .from("funcionarios")
    .select("id, nome, cargo, perfil, permissoes, usuario, senha_hash, ativo")
    .eq("empresa_id", empresa_id)
    .eq("usuario", usuario.toLowerCase().trim())
    .single()

  if (error || !colaborador) {
    return NextResponse.json({ erro: "Usuário ou senha incorretos" }, { status: 401 })
  }

  if (!colaborador.ativo) {
    return NextResponse.json({ erro: "Colaborador inativo" }, { status: 403 })
  }

  if (!colaborador.senha_hash) {
    return NextResponse.json({ erro: "Colaborador sem senha configurada" }, { status: 400 })
  }

  // Verificar senha
  const senhaHash = hashSenha(senha)
  if (senhaHash !== colaborador.senha_hash) {
    const r = await consumirLimite(chaveLimite, 5, 900, 900)
    if (!r.permitido) return NextResponse.json({ erro: mensagemBloqueio(r.bloqueadoAte) }, { status: 429 })
    return NextResponse.json({ erro: "Usuário ou senha incorretos" }, { status: 401 })
  }
  await limparLimite(chaveLimite)

  // Atualizar ultimo_login
  await admin
    .from("funcionarios")
    .update({ ultimo_login: new Date().toISOString() })
    .eq("id", colaborador.id)

  // Registrar sessão
  await admin.from("sessoes_colaboradores").insert({
    empresa_id,
    funcionario_id: colaborador.id,
    acao: "login",
    ip: req.headers.get("x-forwarded-for") || req.headers.get("x-real-ip") || null,
    user_agent: req.headers.get("user-agent") || null,
  })

  return NextResponse.json({
    sucesso: true,
    colaborador: {
      id: colaborador.id,
      nome: colaborador.nome,
      cargo: colaborador.cargo,
      perfil: colaborador.perfil,
      permissoes: colaborador.permissoes,
    },
  })
}
