import { NextRequest, NextResponse } from "next/server"
import { createAdminClient } from "@/lib/supabase/admin"

// GET — busca termos e política (público, sem auth)
export async function GET() {
  try {
    const supabase = createAdminClient()
    const { data } = await supabase
      .from("configuracoes_sistema")
      .select("chave, valor")
      .in("chave", ["termos_uso", "politica_privacidade"])

    const termos = data?.find((c) => c.chave === "termos_uso")?.valor ?? { texto: "" }
    const politica = data?.find((c) => c.chave === "politica_privacidade")?.valor ?? { texto: "" }

    return NextResponse.json({ termos, politica })
  } catch {
    return NextResponse.json({ termos: { texto: "" }, politica: { texto: "" } })
  }
}
