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

    // Verificar APENAS no banco se a assinatura foi ativada (pelo webhook)
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

    // Verificar se a empresa já tem plano ativo (ativado manualmente pelo admin)
    if (empresa.plano !== "gratuito" && empresa.plano_ativo === true) {
      return NextResponse.json({ ativa: true, plano: empresa.plano })
    }

    return NextResponse.json({ ativa: false })
  } catch {
    return NextResponse.json({ ativa: false })
  }
}
