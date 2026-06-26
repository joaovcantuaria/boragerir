import { NextRequest, NextResponse } from "next/server"
import { createAdminClient } from "@/lib/supabase/admin"
import { createClient } from "@/lib/supabase/server"

export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (user?.email?.toLowerCase() !== "contato@boragerir.com") {
    return NextResponse.json({ erro: "Não autorizado" }, { status: 403 })
  }

  const { assinatura_id, acao } = await req.json()
  // acao: "bloquear" | "desbloquear" | "cancelar" | "excluir"

  const admin = createAdminClient()

  if (acao === "excluir") {
    const { error } = await admin.from("assinaturas").delete().eq("id", assinatura_id)
    if (error) return NextResponse.json({ erro: error.message }, { status: 500 })

    // Rebaixar empresa para gratuito
    const { data: assinatura } = await admin.from("assinaturas").select("empresa_id").eq("id", assinatura_id).single()
    if (assinatura) {
      await admin.from("empresas").update({ plano: "gratuito" }).eq("id", assinatura.empresa_id)
    }
    return NextResponse.json({ sucesso: true, acao: "excluida" })
  }

  const statusMap: Record<string, string> = {
    bloquear: "pausada",
    desbloquear: "ativa",
    cancelar: "cancelada",
  }

  const novoStatus = statusMap[acao]
  if (!novoStatus) return NextResponse.json({ erro: "Ação inválida" }, { status: 400 })

  // Buscar empresa_id antes de atualizar
  const { data: assinaturaAtual } = await admin
    .from("assinaturas").select("empresa_id, plano").eq("id", assinatura_id).single()

  const { error } = await admin
    .from("assinaturas").update({ status: novoStatus }).eq("id", assinatura_id)
  if (error) return NextResponse.json({ erro: error.message }, { status: 500 })

  // Se cancelar/pausar → rebaixar empresa para gratuito
  if ((acao === "cancelar" || acao === "bloquear") && assinaturaAtual) {
    await admin.from("empresas")
      .update({ plano: "gratuito" })
      .eq("id", assinaturaAtual.empresa_id)
  }

  // Se desbloquear → restaurar plano
  if (acao === "desbloquear" && assinaturaAtual) {
    await admin.from("empresas")
      .update({ plano: assinaturaAtual.plano, plano_ativo: true })
      .eq("id", assinaturaAtual.empresa_id)
  }

  return NextResponse.json({ sucesso: true, status: novoStatus })
}
