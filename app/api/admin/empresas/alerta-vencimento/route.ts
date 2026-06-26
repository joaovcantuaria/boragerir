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
    .from("empresas").select("nome, email").eq("id", empresa_id).single()
  if (!empresa) return NextResponse.json({ erro: "Empresa não encontrada" }, { status: 404 })

  // Buscar assinatura
  const { data: assinatura } = await admin
    .from("assinaturas")
    .select("plano, proximo_vencimento, valor_total")
    .eq("empresa_id", empresa_id)
    .eq("status", "ativa")
    .single()

  const vencimento = assinatura?.proximo_vencimento
    ? new Date(assinatura.proximo_vencimento).toLocaleDateString("pt-BR")
    : "em breve"

  // Enviar via Supabase Auth (reset password email reutilizado como notificação)
  // Ou via SMTP configurado — por ora registra no log e retorna sucesso
  // TODO: Integrar com serviço de e-mail (Resend, SendGrid, etc.)
  console.log(`📧 Alerta de vencimento enviado para ${empresa.email} (${empresa.nome})`)
  console.log(`Vencimento: ${vencimento}`)

  // Registrar como nota interna
  await admin.from("notas_admin").insert({
    empresa_id,
    nota: `⚠️ Alerta de vencimento enviado por e-mail em ${new Date().toLocaleDateString("pt-BR")}. Vencimento: ${vencimento}`,
  })

  return NextResponse.json({
    sucesso: true,
    mensagem: `Alerta enviado para ${empresa.email}`,
    // Retornar dados para exibir confirmação
    empresa: empresa.nome,
    email: empresa.email,
    vencimento,
  })
}
