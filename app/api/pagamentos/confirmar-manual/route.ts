import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { createAdminClient } from "@/lib/supabase/admin"

// Rota para confirmar pagamento manualmente (admin)
// Também serve como fallback quando o webhook não funciona
export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ erro: "Não autenticado" }, { status: 401 })

    // Verificar se é admin ou o próprio usuário tentando confirmar
    const isAdmin = user.email?.toLowerCase() === "contato@boragerir.com"

    const { empresa_id } = await req.json()
    const targetEmpresaId = empresa_id ?? null

    const admin = createAdminClient()

    // Se for admin com empresa_id, ativar essa empresa
    if (isAdmin && targetEmpresaId) {
      const { data: assinatura } = await admin.from("assinaturas")
        .select("*")
        .eq("empresa_id", targetEmpresaId)
        .eq("status", "pendente")
        .order("created_at", { ascending: false })
        .limit(1)
        .single()

      if (assinatura) {
        await admin.from("assinaturas")
          .update({ status: "ativa", data_inicio: new Date().toISOString() })
          .eq("id", assinatura.id)

        await admin.from("empresas")
          .update({ plano: assinatura.plano, plano_ativo: true })
          .eq("id", targetEmpresaId)

        return NextResponse.json({ sucesso: true, plano: assinatura.plano })
      }
      return NextResponse.json({ erro: "Nenhuma assinatura pendente" }, { status: 404 })
    }

    // Usuário comum — verificar se TEM pagamento aprovado no MP
    const { data: empresa } = await supabase.from("empresas")
      .select("id").eq("user_id", user.id).single()
    if (!empresa) return NextResponse.json({ erro: "Empresa não encontrada" }, { status: 404 })

    // Buscar assinatura pendente mais recente
    const { data: assinatura } = await admin.from("assinaturas")
      .select("*")
      .eq("empresa_id", empresa.id)
      .eq("status", "pendente")
      .order("created_at", { ascending: false })
      .limit(1)
      .single()

    if (!assinatura) return NextResponse.json({ erro: "Nenhuma assinatura pendente" }, { status: 404 })

    // Tentar verificar com o MP se o pagamento foi aprovado
    const accessToken = process.env.MERCADOPAGO_ACCESS_TOKEN
    if (accessToken && assinatura.mp_pix_payment_id) {
      // Buscar pagamentos recentes da conta
      try {
        const res = await fetch(
          `https://api.mercadopago.com/v1/payments/search?external_reference=${empresa.id}&status=approved&sort=date_created&criteria=desc&limit=5`,
          { headers: { "Authorization": `Bearer ${accessToken}` } }
        )
        if (res.ok) {
          const data = await res.json()
          if (data.results?.length > 0) {
            // Tem pagamento aprovado — ativar
            await admin.from("assinaturas")
              .update({ status: "ativa", data_inicio: new Date().toISOString(), mp_payment_id: String(data.results[0].id) })
              .eq("id", assinatura.id)

            await admin.from("empresas")
              .update({ plano: assinatura.plano, plano_ativo: true })
              .eq("id", empresa.id)

            return NextResponse.json({ sucesso: true, plano: assinatura.plano })
          }
        }
      } catch {}
    }

    return NextResponse.json({ erro: "Pagamento ainda não confirmado", status: "pendente" }, { status: 202 })
  } catch (error) {
    return NextResponse.json({ erro: "Erro interno" }, { status: 500 })
  }
}
