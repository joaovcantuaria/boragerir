import { NextRequest, NextResponse } from "next/server"
import { createAdminClient } from "@/lib/supabase/admin"
import { enviarEmail, templateBase } from "@/lib/email/brevo"
import crypto from "crypto"

// Armazena códigos temporários em memória (expira em 10min)
const codigosPendentes = new Map<string, { codigo: string; expira: number }>()

export async function POST(req: NextRequest) {
  const { empresa_id, acao, codigo } = await req.json()

  if (!empresa_id) {
    return NextResponse.json({ erro: "empresa_id é obrigatório" }, { status: 400 })
  }

  const admin = createAdminClient()

  // Buscar empresa e email
  const { data: empresa } = await admin
    .from("empresas")
    .select("id, email, nome, user_id")
    .eq("id", empresa_id)
    .single()

  if (!empresa) {
    return NextResponse.json({ erro: "Empresa não encontrada" }, { status: 404 })
  }

  // AÇÃO: Enviar código por email
  if (acao === "enviar") {
    const codigoReset = Math.floor(100000 + Math.random() * 900000).toString()

    // Salvar código com expiração de 10 minutos
    codigosPendentes.set(empresa_id, {
      codigo: crypto.createHash("sha256").update(codigoReset).digest("hex"),
      expira: Date.now() + 10 * 60 * 1000,
    })

    // Buscar email do usuário dono da empresa
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
      <p style="color:#999;font-size:11px;">Se você não solicitou esta ação, ignore este e-mail. Seu PIN permanecerá inalterado.</p>
    `)

    const resultado = await enviarEmail({
      para: { email: emailDestino, nome: empresa.nome },
      assunto: "🔑 Código de Reset do PIN - Bora Gerir",
      html,
    })

    if (!resultado.sucesso) {
      return NextResponse.json({ erro: resultado.erro || "Erro ao enviar email" }, { status: 500 })
    }

    // Mascarar email para resposta
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

    const pendente = codigosPendentes.get(empresa_id)

    if (!pendente) {
      return NextResponse.json({ valido: false, erro: "Nenhum código pendente. Solicite novamente." }, { status: 400 })
    }

    if (Date.now() > pendente.expira) {
      codigosPendentes.delete(empresa_id)
      return NextResponse.json({ valido: false, erro: "Código expirado. Solicite novamente." }, { status: 400 })
    }

    const codigoHash = crypto.createHash("sha256").update(codigo).digest("hex")

    if (codigoHash !== pendente.codigo) {
      return NextResponse.json({ valido: false, erro: "Código incorreto" }, { status: 400 })
    }

    // Código correto — resetar PIN
    codigosPendentes.delete(empresa_id)

    await admin
      .from("empresas")
      .update({ pin_gerente: null })
      .eq("id", empresa_id)

    return NextResponse.json({ valido: true, sucesso: true })
  }

  return NextResponse.json({ erro: "Ação inválida" }, { status: 400 })
}
