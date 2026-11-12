import { NextRequest, NextResponse } from "next/server"
import { buscarUsuarioPorEmail } from "@/lib/supabase/buscar-usuario"
import { algumBloqueado, consumirLimite, limparLimite, ipDaRequisicao, mensagemBloqueio } from "@/lib/security/limite-tentativas"
import { createClient } from "@supabase/supabase-js"
import { createServerClient } from "@supabase/ssr"

// API Route de login que permite acesso mesmo sem email confirmado.
// Fluxo:
// 1. Tenta login normal (signInWithPassword)
// 2. Se retornar "Email not confirmed", usa service role para confirmar o email automaticamente
//    e depois tenta o login novamente
// 3. Retorna os cookies de sessão para o cliente

export async function POST(req: NextRequest) {
  const { email, password } = await req.json()

  if (!email || !password) {
    return NextResponse.json({ error: "Email e senha obrigatórios" }, { status: 400 })
  }

  // Limite de tentativas: 5 erros por e-mail (15 min) e 30 por IP (bloqueio de 30 min)
  const emailNorm = String(email).trim().toLowerCase()
  const chaves = [`login:${emailNorm}`, `login-ip:${ipDaRequisicao(req)}`]
  const bloqueio = await algumBloqueado(chaves)
  if (bloqueio) return NextResponse.json({ error: mensagemBloqueio(bloqueio) }, { status: 429 })

  const falhaLogin = async () => {
    const [porEmail, porIp] = await Promise.all([
      consumirLimite(chaves[0], 5, 900, 900),
      consumirLimite(chaves[1], 30, 900, 1800),
    ])
    if (!porEmail.permitido || !porIp.permitido) {
      return NextResponse.json({ error: mensagemBloqueio(porEmail.bloqueadoAte ?? porIp.bloqueadoAte) }, { status: 429 })
    }
    return NextResponse.json({ error: "E-mail ou senha incorretos." }, { status: 401 })
  }

  const url        = process.env.NEXT_PUBLIC_SUPABASE_URL!
  const anonKey    = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

  // Criar cliente SSR para gerenciar cookies de sessão
  const response = NextResponse.json({ ok: true })

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

  // Tentativa 1: login normal
  const { data, error } = await supabase.auth.signInWithPassword({ email, password })

  if (!error) {
    // Login funcionou normalmente — retorna com sessão
    await limparLimite(chaves[0])
    return response
  }

  // Se o erro é "Email not confirmed" e temos service role, confirma o email e tenta de novo
  if (error.message.includes("Email not confirmed") && serviceKey) {
    try {
      const adminClient = createClient(url, serviceKey, {
        auth: { autoRefreshToken: false, persistSession: false },
      })

      // Buscar o usuário pelo email
      const usuario = await buscarUsuarioPorEmail(adminClient, email)

      if (usuario && !usuario.email_confirmed_at) {
        // Confirmar o email automaticamente
        await adminClient.auth.admin.updateUserById(usuario.id, {
          email_confirm: true,
        })
      }

      // Tentativa 2: login após confirmação automática
      const { error: error2 } = await supabase.auth.signInWithPassword({ email, password })

      if (!error2) {
        await limparLimite(chaves[0])
        return response
      }

      return falhaLogin()
    } catch {
      return falhaLogin()
    }
  }

  // Outros erros (senha errada, etc.)
  return falhaLogin()
}
