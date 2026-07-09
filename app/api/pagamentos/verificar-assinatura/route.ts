import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"

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

    // Verificar se tem assinatura ativa recente
    const { data: assinatura } = await supabase
      .from("assinaturas")
      .select("status")
      .eq("empresa_id", empresa.id)
      .eq("status", "ativa")
      .order("created_at", { ascending: false })
      .limit(1)
      .single()

    const ativa = !!assinatura || (empresa.plano !== "gratuito" && empresa.plano_ativo === true)

    return NextResponse.json({ ativa, plano: empresa.plano })
  } catch {
    return NextResponse.json({ ativa: false })
  }
}
