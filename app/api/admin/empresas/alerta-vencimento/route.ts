import { NextRequest, NextResponse } from "next/server"
import { createAdminClient } from "@/lib/supabase/admin"
import { createClient } from "@/lib/supabase/server"
import { enviarEmail, templateAlertaVencimento } from "@/lib/email/brevo"

export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (user?.email?.toLowerCase() !== "contato@boragerir.com") {
    return NextResponse.json({ erro: "Não autorizado" }, { status: 403 })
  }

  const { empresa_id } = await req.json()
  const admin = createAdminClient()

  const { data: empresa } = await admin
    .from("empresas").select("nome, email, plano").eq("id", empresa_id).single()
  if (!empresa) return NextResponse.json({ erro: "Empresa não encontrada" }, { status: 404 })

  const { data: assinatura } = await admin
    .from("assinaturas")
    .select("plano, periodicidade, proximo_vencimento, valor_total")
    .eq("empresa_id", empresa_id)
    .eq("status", "ativa")
    .single()

  const vencimento = assinatura?.proximo_vencimento
    ? new Date(assinatura.proximo_vencimento).toLocaleDateString("pt-BR")
    : "em breve"

  const valor = assinatura?.valor_total
    ? new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(assinatura.valor_total)
    : "valor do plano"

  // Enviar e-mail via Brevo
  const { sucesso, erro } = await enviarEmail({
    para: { email: empresa.email, nome: empresa.nome },
    assunto: `⚠️ Sua assinatura do Bora Gerir vence em ${vencimento}`,
    html: templateAlertaVencimento({
      nomeEmpresa: empresa.nome,
      plano: assinatura?.plano ?? empresa.plano,
      periodicidade: assinatura?.periodicidade ?? "mensal",
      valor,
      vencimento,
    }),
  })

  // Registrar nota interna
  await admin.from("notas_admin").insert({
    empresa_id,
    nota: `⚠️ Alerta de vencimento ${sucesso ? "ENVIADO" : "FALHOU"} em ${new Date().toLocaleDateString("pt-BR")}. Vencimento: ${vencimento}. E-mail: ${empresa.email}${erro ? ` | Erro: ${erro}` : ""}`,
  })

  return NextResponse.json({
    sucesso,
    mensagem: sucesso
      ? `✅ E-mail enviado para ${empresa.email}`
      : `❌ Falha ao enviar: ${erro}`,
    empresa: empresa.nome,
    email: empresa.email,
    vencimento,
  })
}
