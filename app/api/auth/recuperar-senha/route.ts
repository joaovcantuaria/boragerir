import { NextRequest, NextResponse } from "next/server"
import { createAdminClient } from "@/lib/supabase/admin"
import { enviarEmail, templateBase } from "@/lib/email/brevo"

/**
 * API Route de recuperação de senha.
 * Usa admin client para gerar o link de reset e envia via Brevo,
 * evitando depender do SMTP configurado no Supabase.
 */
export async function POST(req: NextRequest) {
  try {
    const { email } = await req.json()

    if (!email) {
      return NextResponse.json(
        { error: "Email é obrigatório" },
        { status: 400 }
      )
    }

    const admin = createAdminClient()

    // Gerar link de recuperação via admin API
    const redirectTo = `${process.env.NEXT_PUBLIC_APP_URL || "https://app.boragerir.com"}/auth/reset-password`

    const { data, error } = await admin.auth.admin.generateLink({
      type: "recovery",
      email,
      options: {
        redirectTo,
      },
    })

    if (error) {
      // Não revelar se o email existe ou não (segurança)
      console.warn("[api/auth/recuperar-senha] Erro ao gerar link:", error.message)
      // Retorna sucesso mesmo assim para não vazar informação
      return NextResponse.json({ ok: true })
    }

    // O link gerado pelo Supabase
    const resetLink = data?.properties?.action_link

    if (!resetLink) {
      console.error("[api/auth/recuperar-senha] Link não gerado")
      return NextResponse.json({ ok: true })
    }

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

    await enviarEmail({
      para: { email },
      assunto: "Redefinir senha — Bora Gerir",
      html,
    })

    return NextResponse.json({ ok: true })
  } catch (err: unknown) {
    console.error("[api/auth/recuperar-senha] Erro inesperado:", err)
    // Retorna sucesso para não vazar informação sobre emails existentes
    return NextResponse.json({ ok: true })
  }
}
