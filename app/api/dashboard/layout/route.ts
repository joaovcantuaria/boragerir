import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"

// GET — carregar layout salvo
export async function GET(req: NextRequest) {
  const empresaId = req.nextUrl.searchParams.get("empresa_id")
  if (!empresaId) return NextResponse.json({ layout: null })

  const supabase = await createClient()
  const { data } = await supabase
    .from("dashboard_layouts")
    .select("layout")
    .eq("empresa_id", empresaId)
    .single()

  return NextResponse.json({ layout: data?.layout ?? null })
}

// POST — salvar layout
export async function POST(req: NextRequest) {
  const { empresa_id, layout } = await req.json()
  if (!empresa_id || !layout) {
    return NextResponse.json({ error: "empresa_id e layout obrigatórios" }, { status: 400 })
  }

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: "Não autenticado" }, { status: 401 })

  // Upsert — insere ou atualiza
  const { error } = await supabase
    .from("dashboard_layouts")
    .upsert(
      { empresa_id, layout, updated_at: new Date().toISOString() },
      { onConflict: "empresa_id" }
    )

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}
