import { NextRequest, NextResponse } from "next/server"
import { createAdminClient } from "@/lib/supabase/admin"
import { createServerClient } from "@supabase/ssr"
import { enviarEmail, templateBoasVindasCadastro } from "@/lib/email/brevo"

/**
 * API Route de cadastro que cria o usuário via admin client (service role).
 * Isso evita depender do envio de email de confirmação pelo Supabase Auth,
 * que pode falhar com 500 se o SMTP customizado estiver mal configurado.
 *
 * Fluxo:
 * 1. Cria o usuário com email_confirm: true (já confirmado)
 * 2. Faz login automático para estabelecer a sessão
 * 3. Retorna cookies de sessão para o cliente
 */
export async function POST(req: NextRequest) {
  try {
    const { nome, email, senha } = await req.json()

    if (!nome || !email || !senha) {
      return NextResponse.json(
        { error: "Nome, email e senha são obrigatórios" },
        { status: 400 }
      )
    }

    if (senha.length < 6) {
      return NextResponse.json(
        { error: "A senha deve ter no mínimo 6 caracteres" },
        { status: 400 }
      )
    }

    const admin = createAdminClient()

    // Criar usuário com email já confirmado (sem necessidade de SMTP)
    const { data: newUser, error: createError } = await admin.auth.admin.createUser({
      email,
      password: senha,
      email_confirm: true,
      user_metadata: {
        nome_completo: nome,
        aceite_termos: true,
        aceite_termos_data: new Date().toISOString(),
        aceite_politica: true,
        aceite_politica_data: new Date().toISOString(),
      },
    })

    if (createError) {
      console.error("[api/auth/cadastro] Erro ao criar usuário:", createError.message)

      if (createError.message?.includes("already been registered") || createError.message?.includes("already exists")) {
        return NextResponse.json(
          { error: "already_registered", message: "Este e-mail já possui uma conta." },
          { status: 409 }
        )
      }

      return NextResponse.json(
        { error: "create_failed", message: createError.message },
        { status: 500 }
      )
    }

    // Enviar email de boas-vindas via Brevo (não bloqueia o fluxo se falhar)
    enviarEmail({
      para: { email, nome },
      assunto: "Bem-vindo(a) ao Bora Gerir! 🎉",
      html: templateBoasVindasCadastro({ nome }),
    }).catch((err) => console.warn("[api/auth/cadastro] Falha ao enviar email de boas-vindas:", err))

    // Fazer login automático para estabelecer sessão
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL!
    const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

    const response = NextResponse.json({
      ok: true,
      user: { id: newUser.user.id, email: newUser.user.email },
    })

    const supabase = createServerClient(url, anonKey, {
      cookies: {
        getAll: () => req.cookies.getAll(),
        setAll: (cookies) => {
          cookies.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options)
          )
        },
      },
    })

    const { error: loginError } = await supabase.auth.signInWithPassword({
      email,
      password: senha,
    })

    if (loginError) {
      // Usuário foi criado mas login falhou — não é crítico, ele pode logar manualmente
      console.warn("[api/auth/cadastro] Login automático falhou:", loginError.message)
      return NextResponse.json({
        ok: true,
        user: { id: newUser.user.id, email: newUser.user.email },
        autoLogin: false,
      })
    }

    return response
  } catch (err: unknown) {
    console.error("[api/auth/cadastro] Erro inesperado:", err)
    return NextResponse.json(
      { error: "internal_error", message: "Erro interno ao criar conta" },
      { status: 500 }
    )
  }
}
