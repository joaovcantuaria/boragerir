import { NextResponse } from "next/server"
import { createAdminClient } from "@/lib/supabase/admin"

// Rota pública — busca termos de uso e política de privacidade
export async function GET() {
  try {
    const supabase = createAdminClient()
    const { data: configs } = await supabase
      .from("configuracoes_sistema")
      .select("chave, valor")
      .in("chave", ["termos_uso", "politica_privacidade"])

    const termos = configs?.find((c) => c.chave === "termos_uso")?.valor ?? "<p>Termos de uso em elaboração.</p>"
    const politica = configs?.find((c) => c.chave === "politica_privacidade")?.valor ?? "<p>Política de privacidade em elaboração.</p>"

    return NextResponse.json({ termos, politica })
  } catch {
    return NextResponse.json(
      { termos: "<p>Termos de uso em elaboração.</p>", politica: "<p>Política de privacidade em elaboração.</p>" }
    )
  }
}
