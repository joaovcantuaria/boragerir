import { NextRequest, NextResponse } from "next/server"
import { createAdminClient } from "@/lib/supabase/admin"
import { enviarEmail, templateBase } from "@/lib/email/brevo"
import crypto from "crypto"
import { buscarUsuarioPorEmail } from "@/lib/supabase/buscar-usuario"
import { consumirLimite, ipDaRequisicao } from "@/lib/security/limite-tentativas"

/**
 * API Route de recuperação de senha.
 * Fluxo próprio: gera token, salva no banco (tabela empresas não — usa user_metadata),
 * envia email via Brevo com link contendo o token.
 * A página de reset verifica o token e altera a senha via admin API.
 */
export async function POST(req: NextRequest) {
  try {
    const { email } = await req.json()

    if (!email) {
      return NextResponse.json({ error: "Email é obrigatório" }, { status: 400 })
    }

    // Evita usar a tela para disparar e-mails em massa (resposta igual, sem revelar nada)
    const emailNorm = String(email).trim().toLowerCase()
    const [porEmail, porIp] = await Promise.all([
      consumirLimite(`recuperar:${emailNorm}`, 3, 3600, 3600),
      consumirLimite(`recuperar-ip:${ipDaRequisicao(req)}`, 10, 3600, 3600),
    ])
    if (!porEmail.permitido || !porIp.permitido) {
      console.warn("[api/auth/recuperar-senha] limite atingido")
      return NextResponse.json({ ok: true })
    }

    const admin = createAdminClient()
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || "https://app.boragerir.com"

    // Buscar usuário pelo email
    const usuario = await buscarUsuarioPorEmail(admin, email)

    // Não revelar se o email existe ou não (segurança)
    if (!usuario) {
      console.warn("[api/auth/recuperar-senha] E-mail não cadastrado:", email)
      return NextResponse.json({ ok: true })
    }

    // Gerar token único
    const token = crypto.randomBytes(32).toString("hex")
    const expira = Date.now() + 60 * 60 * 1000 // 1 hora

    // Salvar token no user_metadata (não visível para o usuário)
    await admin.auth.admin.updateUserById(usuario.id, {
      user_metadata: {
        ...usuario.user_metadata,
        _reset_token: token,
        _reset_token_expira: expira,
      },
    })

    // Construir link de reset
    const resetLink = `${appUrl}/auth/reset-password?token=${token}&email=${encodeURIComponent(email)}`

    // Enviar email via Brevo
    const html = templateBase(`
      <h2 style="color:#1a1a1a;font-size:18px;margin:0 0 16px;">Redefinir sua senha</h2>
      <p>Olá!</p>
      <p>Recebemos uma solicitação para redefinir a senha da sua conta no <strong>Bora Gerir</strong>.</p>
      <p>Clique no botão abaixo para criar uma nova senha:</p>
      <div style="text-align:center;margin:24px 0;">
        <a href="${resetLink}" class="btn">Redefinir minha senha →</a>
      </div>
      <p style="color:#666;font-size:12px;">Se você não solicitou esta alteração, ignore este e-mail. O link expira em 1 hora.</p>
      <p style="color:#888;font-size:11px;margin-top:20px;">Se o botão não funcionar, copie e cole este link no navegador:<br>
        <span style="word-break:break-all;color:#F26E1D;">${resetLink}</span>
      </p>
    `)

    const envio = await enviarEmail({
      para: { email },
      assunto: "Redefinir senha — Bora Gerir",
      html,
    })
    if (!envio.sucesso) {
      // Não revela ao visitante, mas fica registrado nos logs da Vercel para diagnóstico
      console.error("[api/auth/recuperar-senha] Falha ao enviar e-mail:", envio.erro)
    }

    return NextResponse.json({ ok: true })
  } catch (err: unknown) {
    console.error("[api/auth/recuperar-senha] Erro inesperado:", err)
    return NextResponse.json({ ok: true })
  }
}
