import { NextRequest, NextResponse } from "next/server"
import { createAdminClient } from "@/lib/supabase/admin"
import { createClient } from "@/lib/supabase/server"
import crypto from "crypto"

// Armazena códigos temporários em memória (em produção, usar Redis ou tabela)
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

    // Buscar email do usuário dono da empresa via auth
    const { data: userData } = await admin.auth.admin.getUserById(empresa.user_id)
    const emailDestino = userData?.user?.email || empresa.email

    // Enviar email via Supabase (ou API interna)
    try {
      // Usar a API interna de email se disponível
      const resEmail = await fetch(`${process.env.NEXT_PUBLIC_APP_URL}/api/admin/suporte/enviar-email`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          empresa_id: empresa.id,
          email: emailDestino,
          assunto: "Código de Reset do PIN - Bora Gerir",
          mensagem: `Olá!\n\nVocê solicitou o reset do PIN de gerente da empresa "${empresa.nome}".\n\nSeu código de verificação é:\n\n🔑 ${codigoReset}\n\nEste código expira em 10 minutos.\n\nSe você não solicitou esta ação, ignore este e-mail.\n\n— Bora Gerir`,
        }),
      })

      if (!resEmail.ok) {
        // Fallback: enviar via Supabase Auth magic link como alternativa
        return NextResponse.json({ erro: "Erro ao enviar email. Tente novamente." }, { status: 500 })
      }
    } catch {
      return NextResponse.json({ erro: "Erro ao enviar email" }, { status: 500 })
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
