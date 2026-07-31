import { NextRequest, NextResponse } from "next/server"
import { validateCoraAccess, isCoraAccessError } from "@/lib/cora/middleware"
import { createAdminClient } from "@/lib/supabase/admin"

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const access = await validateCoraAccess()
  if (isCoraAccessError(access)) {
    return access
  }

  const { empresaId } = access
  const { id } = await params

  try {
    const supabase = createAdminClient()

    const { data: boleto, error } = await supabase
      .from("cora_boletos")
      .select("*")
      .eq("id", id)
      .eq("empresa_id", empresaId)
      .single()

    if (error || !boleto) {
      return NextResponse.json(
        { error: "Boleto não encontrado" },
        { status: 404 }
      )
    }

    return NextResponse.json(boleto)
  } catch (error) {
    console.error("[Cora Boletos GET /id] Erro:", error)
    return NextResponse.json(
      { error: "Erro ao buscar boleto" },
      { status: 500 }
    )
  }
}
