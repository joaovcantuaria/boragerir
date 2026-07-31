import { NextRequest, NextResponse } from "next/server"
import { createAdminClient } from "@/lib/supabase/admin"
import { enviarEmail, templateBase } from "@/lib/email/brevo"
import crypto from "crypto"

export async function POST(req: NextRequest) {
  const { empresa_id, acao, codigo } = await req.json()

  if (!empresa_id) {
    return NextResponse.json({ erro: "empresa_id é obrigatório" }, { status: 400 })
  }

  const admin = createAdminClient()

  // Buscar empresa
  const { data: empresa } = await admin
    .from("empresas")
    .select("id, email, nome, user_id, restricoes_acesso")
    .eq("id", empresa_id)
    .single()

  if (!empresa) {
    return NextResponse.json({ erro: "Empresa não encontrada" }, { status: 404 })
  }

  // AÇÃO: Enviar código por email
  if (acao === "enviar") {
    const codigoReset = Math.floor(100000 + Math.random() * 900000).toString()
    const codigoHash = crypto.createHash("sha256").update(codigoReset).digest("hex")
    const expira = Date.now() + 10 * 60 * 1000 // 10 minutos

    // Salvar código no banco (dentro de restricoes_acesso como campo temporário)
    const restricoesAtuais = empresa.restricoes_acesso || {}
    await admin
      .from("empresas")
      .update({
        restricoes_acesso: {
          ...restricoesAtuais,
          _reset_pin: { hash: codigoHash, expira },
        },
      })
      .eq("id", empresa_id)

    // Buscar email do usuário dono
    const { data: userData } = await admin.auth.admin.getUserById(empresa.user_id)
    const emailDestino = userData?.user?.email || empresa.email

    // Enviar email via Brevo
    const html = templateBase(`
      <h2 style="color:#1a1a1a;font-size:18px;margin:0 0 16px;">🔑 Código de Reset do PIN</h2>
      <p>Olá!</p>
      <p>Você solicitou o reset do PIN de gerente da empresa <strong>${empresa.nome}</strong>.</p>
      <div style="background:#fff8f5;border:2px solid #F26E1D;border-radius:12px;padding:20px;margin:20px 0;text-align:center;">
        <p style="margin:0;color:#666;font-size:12px;">Seu código de verificação:</p>
        <p style="margin:8px 0 0;color:#F26E1D;font-size:32px;font-weight:900;letter-spacing:8px;">${codigoReset}</p>
      </div>
      <p>Este código expira em <strong>10 minutos</strong>.</p>
      <p style="color:#999;font-size:11px;">Se você não solicitou esta ação, ignore este e-mail.</p>
    `)

    const resultado = await enviarEmail({
      para: { email: emailDestino, nome: empresa.nome },
      assunto: "🔑 Código de Reset do PIN - Bora Gerir",
      html,
    })

    if (!resultado.sucesso) {
      return NextResponse.json({ erro: resultado.erro || "Erro ao enviar email" }, { status: 500 })
    }

    const emailMascarado = emailDestino.replace(
      /(.{2})(.*)(@.*)/,
      (_, a, b, c) => a + "*".repeat(Math.min(b.length, 5)) + c
    )

    return NextResponse.json({ sucesso: true, email: emailMascarado })
  }

  // AÇÃO: Verificar código e resetar PIN
  if (acao === "verificar") {
    if (!codigo || codigo.length !== 6) {
      return NextResponse.json({ valido: false, erro: "Código inválido" }, { status: 400 })
    }

    const restricoes = empresa.restricoes_acesso as Record<string, unknown> || {}
    const resetData = restricoes._reset_pin as { hash: string; expira: number } | undefined

    if (!resetData) {
      return NextResponse.json({ valido: false, erro: "Nenhum código pendente. Solicite novamente." }, { status: 400 })
    }

    if (Date.now() > resetData.expira) {
      // Limpar código expirado
      const { _reset_pin, ...resto } = restricoes
      await admin.from("empresas").update({ restricoes_acesso: resto }).eq("id", empresa_id)
      return NextResponse.json({ valido: false, erro: "Código expirado. Solicite novamente." }, { status: 400 })
    }

    const codigoHash = crypto.createHash("sha256").update(codigo).digest("hex")

    if (codigoHash !== resetData.hash) {
      return NextResponse.json({ valido: false, erro: "Código incorreto" }, { status: 400 })
    }

    // Código correto — resetar PIN e limpar código temporário
    const { _reset_pin, ...restoRestricoes } = restricoes
    await admin
      .from("empresas")
      .update({ pin_gerente: null, restricoes_acesso: restoRestricoes })
      .eq("id", empresa_id)

    return NextResponse.json({ valido: true, sucesso: true })
  }

  return NextResponse.json({ erro: "Ação inválida" }, { status: 400 })
}
