import { NextRequest, NextResponse } from "next/server"
import { createAdminClient } from "@/lib/supabase/admin"
import { createClient } from "@/lib/supabase/server"

export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (user?.email?.toLowerCase() !== "contato@boragerir.com") {
    return NextResponse.json({ erro: "Não autorizado" }, { status: 403 })
  }

  const { empresa_id } = await req.json()
  const admin = createAdminClient()

  const { data: empresa } = await admin
    .from("empresas").select("nome, email, plano, telefone").eq("id", empresa_id).single()
  if (!empresa) return NextResponse.json({ erro: "Empresa não encontrada" }, { status: 404 })

  const { data: assinatura } = await admin
    .from("assinaturas")
    .select("plano, proximo_vencimento, valor_total, periodicidade")
    .eq("empresa_id", empresa_id)
    .eq("status", "ativa")
    .single()

  const vencimento = assinatura?.proximo_vencimento
    ? new Date(assinatura.proximo_vencimento).toLocaleDateString("pt-BR")
    : "em breve"

  const valor = assinatura?.valor_total
    ? new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(assinatura.valor_total)
    : "valor do plano"

  // Template do e-mail de alerta
  const htmlEmail = `
<!DOCTYPE html>
<html lang="pt-BR">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
<body style="font-family:Arial,sans-serif;background:#f5f5f5;margin:0;padding:20px;">
  <div style="max-width:520px;margin:0 auto;background:#fff;border-radius:12px;overflow:hidden;border:1px solid #eee;">
    <div style="background:#F26E1D;padding:28px 24px;text-align:center;">
      <h1 style="color:white;margin:0;font-size:24px;font-weight:900;">Bora Gerir</h1>
      <p style="color:rgba(255,255,255,0.85);margin:6px 0 0;font-size:13px;">Gestão simples. Resultado de verdade.</p>
    </div>
    <div style="padding:28px 24px;">
      <h2 style="color:#1a1a1a;font-size:18px;margin:0 0 12px;">⚠️ Aviso de vencimento de assinatura</h2>
      <p style="color:#555;line-height:1.7;margin:0 0 16px;">
        Olá, <strong>${empresa.nome}</strong>!
      </p>
      <p style="color:#555;line-height:1.7;margin:0 0 16px;">
        Identificamos que sua assinatura do plano <strong>${assinatura?.plano ?? empresa.plano}</strong> vence em <strong>${vencimento}</strong>.
      </p>
      <p style="color:#555;line-height:1.7;margin:0 0 24px;">
        Para manter o acesso a todos os recursos do Bora Gerir, renove sua assinatura antes do vencimento.
      </p>
      <div style="background:#fff8f5;border:1px solid #F26E1D;border-radius:8px;padding:14px 16px;margin-bottom:24px;">
        <p style="margin:0;color:#F26E1D;font-weight:700;font-size:14px;">Detalhes da assinatura:</p>
        <p style="margin:6px 0 0;color:#555;font-size:13px;">Plano: ${assinatura?.plano ?? empresa.plano} (${assinatura?.periodicidade ?? "mensal"})</p>
        <p style="margin:4px 0 0;color:#555;font-size:13px;">Valor: ${valor}</p>
        <p style="margin:4px 0 0;color:#555;font-size:13px;">Vencimento: ${vencimento}</p>
      </div>
      <div style="text-align:center;">
        <a href="https://app.boragerir.com/planos" style="background:#F26E1D;color:white;padding:12px 28px;border-radius:8px;text-decoration:none;font-weight:700;font-size:14px;display:inline-block;">
          Renovar assinatura agora
        </a>
      </div>
      <p style="color:#999;font-size:11px;text-align:center;margin-top:20px;">
        Se você já renovou, ignore este e-mail.
      </p>
    </div>
    <div style="background:#f9f9f9;padding:14px;text-align:center;border-top:1px solid #eee;">
      <p style="color:#bbb;font-size:11px;margin:0;">© ${new Date().getFullYear()} Bora Gerir — app.boragerir.com</p>
    </div>
  </div>
</body>
</html>`

  // Tentar enviar via Resend (se configurado)
  const resendKey = process.env.RESEND_API_KEY
  let emailEnviado = false

  if (resendKey) {
    try {
      const response = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${resendKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          from: "Bora Gerir <noreply@boragerir.com>",
          to: [empresa.email],
          subject: `⚠️ Sua assinatura do Bora Gerir vence em ${vencimento}`,
          html: htmlEmail,
        }),
      })

      if (response.ok) {
        emailEnviado = true
        console.log(`✅ Alerta enviado via Resend para ${empresa.email}`)
      } else {
        const err = await response.text()
        console.error("Erro Resend:", err)
      }
    } catch (err) {
      console.error("Erro ao enviar via Resend:", err)
    }
  }

  // Registrar nota interna independente de envio
  await admin.from("notas_admin").insert({
    empresa_id,
    nota: `⚠️ Alerta de vencimento ${emailEnviado ? "ENVIADO" : "REGISTRADO (sem RESEND_API_KEY)"} em ${new Date().toLocaleDateString("pt-BR")}. Vencimento: ${vencimento}. E-mail: ${empresa.email}`,
  })

  return NextResponse.json({
    sucesso: true,
    emailEnviado,
    mensagem: emailEnviado
      ? `E-mail enviado com sucesso para ${empresa.email}`
      : `Nota registrada. Configure RESEND_API_KEY no Vercel para enviar e-mails reais.`,
    empresa: empresa.nome,
    email: empresa.email,
    vencimento,
  })
}
