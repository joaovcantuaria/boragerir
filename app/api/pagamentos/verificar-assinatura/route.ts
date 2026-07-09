import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { createAdminClient } from "@/lib/supabase/admin"

export async function GET(req: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ ativa: false }, { status: 401 })

    const { data: empresa } = await supabase
      .from("empresas")
      .select("id, plano, plano_ativo")
      .eq("user_id", user.id)
      .single()

    if (!empresa) return NextResponse.json({ ativa: false })

    // Verificar se já tem assinatura ativa
    const admin = createAdminClient()
    const { data: assinaturaAtiva } = await admin
      .from("assinaturas")
      .select("status, plano")
      .eq("empresa_id", empresa.id)
      .eq("status", "ativa")
      .order("created_at", { ascending: false })
      .limit(1)
      .single()

    if (assinaturaAtiva) {
      return NextResponse.json({ ativa: true, plano: assinaturaAtiva.plano })
    }

    // Se não está ativa, verificar com o MP se existe pagamento aprovado
    const { data: pendente } = await admin
      .from("assinaturas")
      .select("*")
      .eq("empresa_id", empresa.id)
      .eq("status", "pendente")
      .order("created_at", { ascending: false })
      .limit(1)
      .single()

    if (pendente) {
      const accessToken = process.env.MERCADOPAGO_ACCESS_TOKEN
      if (accessToken) {
        try {
          // Buscar pagamentos aprovados recentes (últimos 30 minutos)
          // com external_reference contendo o empresa_id
          const searchUrl = `https://api.mercadopago.com/v1/payments/search?` +
            `sort=date_created&criteria=desc&limit=5&status=approved&` +
            `external_reference=${empresa.id}`

          const res = await fetch(searchUrl, {
            headers: { "Authorization": `Bearer ${accessToken}` },
          })

          if (res.ok) {
            const data = await res.json()
            if (data.results?.length > 0) {
              // Verificar se o pagamento é recente (últimos 30 minutos)
              // E se corresponde ao plano pendente (pela descrição ou valor)
              const agora = new Date()
              const pagamentoRecente = data.results.find((p: Record<string, unknown>) => {
                const criado = new Date(p.date_created as string)
                const diffMinutos = (agora.getTime() - criado.getTime()) / 60000
                // Só considerar pagamentos dos últimos 30 minutos
                // E que o valor bata com o da assinatura pendente
                const valorBate = Math.abs((p.transaction_amount as number) - pendente.valor_total) < 0.1
                return diffMinutos < 30 && valorBate
              })

              if (pagamentoRecente) {
                // Pagamento aprovado encontrado — ativar!
                await admin.from("assinaturas")
                  .update({
                    status: "ativa",
                    data_inicio: new Date().toISOString(),
                    mp_payment_id: String(pagamentoRecente.id),
                  })
                  .eq("id", pendente.id)

                await admin.from("empresas")
                  .update({ plano: pendente.plano, plano_ativo: true })
                  .eq("id", empresa.id)

                return NextResponse.json({ ativa: true, plano: pendente.plano })
              }
            }
          }
        } catch {}
      }
    }

    // Também verificar se a empresa já tem plano ativo (pode ter sido ativada por outro caminho)
    if (empresa.plano !== "gratuito" && empresa.plano_ativo === true) {
      return NextResponse.json({ ativa: true, plano: empresa.plano })
    }

    return NextResponse.json({ ativa: false })
  } catch {
    return NextResponse.json({ ativa: false })
  }
}
