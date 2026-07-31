import { NextRequest, NextResponse } from "next/server"
import { createAdminClient } from "@/lib/supabase/admin"

/**
 * API Route para redefinir a senha usando o token gerado por /api/auth/recuperar-senha.
 * Verifica o token, altera a senha e limpa o token do user_metadata.
 */
export async function POST(req: NextRequest) {
  try {
    const { email, token, novaSenha } = await req.json()

    if (!email || !token || !novaSenha) {
      return NextResponse.json({ error: "Email, token e nova senha são obrigatórios" }, { status: 400 })
    }

    if (novaSenha.length < 6) {
      return NextResponse.json({ error: "A senha deve ter no mínimo 6 caracteres" }, { status: 400 })
    }

    const admin = createAdminClient()

    // Buscar usuário pelo email
    const { data: listData } = await admin.auth.admin.listUsers()
    const usuario = listData?.users?.find(
      (u) => u.email?.toLowerCase() === email.toLowerCase()
    )

    if (!usuario) {
      return NextResponse.json({ error: "Link inválido ou expirado" }, { status: 400 })
    }

    // Verificar token
    const metadata = usuario.user_metadata || {}
    const tokenSalvo = metadata._reset_token
    const expira = metadata._reset_token_expira

    if (!tokenSalvo || tokenSalvo !== token) {
      return NextResponse.json({ error: "Link inválido ou já utilizado" }, { status: 400 })
    }

    if (Date.now() > expira) {
      // Limpar token expirado
      await admin.auth.admin.updateUserById(usuario.id, {
        user_metadata: {
          ...metadata,
          _reset_token: null,
          _reset_token_expira: null,
        },
      })
      return NextResponse.json({ error: "Link expirado. Solicite um novo." }, { status: 400 })
    }

    // Alterar senha
    const { error: updateError } = await admin.auth.admin.updateUserById(usuario.id, {
      password: novaSenha,
      user_metadata: {
        ...metadata,
        _reset_token: null,
        _reset_token_expira: null,
      },
    })

    if (updateError) {
      console.error("[api/auth/redefinir-senha] Erro ao alterar senha:", updateError.message)
      return NextResponse.json({ error: "Erro ao alterar senha" }, { status: 500 })
    }

    return NextResponse.json({ ok: true })
  } catch (err: unknown) {
    console.error("[api/auth/redefinir-senha] Erro inesperado:", err)
    return NextResponse.json({ error: "Erro interno" }, { status: 500 })
  }
}
