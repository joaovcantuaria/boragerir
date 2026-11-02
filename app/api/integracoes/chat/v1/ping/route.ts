import { NextRequest, NextResponse } from "next/server"
import { createAdminClient } from "@/lib/supabase/admin"
import { autenticarChat } from "@/lib/integracoes/chat"

// GET /api/integracoes/chat/v1/ping — o Chat confere se o vínculo está válido
export async function GET(req: NextRequest) {
  const auth = await autenticarChat(req)
  if (!auth.ok) return auth.resposta

  const { data: empresa } = await createAdminClient()
    .from("empresas").select("id, nome").eq("id", auth.empresaId).single()

  return NextResponse.json({ ok: true, empresa })
}
