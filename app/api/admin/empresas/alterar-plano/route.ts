import { NextRequest, NextResponse } from "next/server"
import { createAdminClient } from "@/lib/supabase/admin"
import { createClient } from "@/lib/supabase/server"

export async function POST(req: NextRequest) {
  // Verificar se é admin
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (user?.email?.toLowerCase() !== "contato@boragerir.com") {
    return NextResponse.json({ erro: "Não autorizado" }, { status: 403 })
  }

  const { empresa_id, plano } = await req.json()

  if (!empresa_id || !plano) {
    return NextResponse.json({ erro: "empresa_id e plano são obrigatórios" }, { status: 400 })
  }

  const planosValidos = ["gratuito", "agenda", "basico", "profissional", "gestao"]
  if (!planosValidos.includes(plano)) {
    return NextResponse.json({ erro: "Plano inválido" }, { status: 400 })
  }

  const admin = createAdminClient()

  // Atualizar plano da empresa
  const { error } = await admin
    .from("empresas")
    .update({ plano, plano_ativo: plano !== "gratuito" })
    .eq("id", empresa_id)

  if (error) {
    console.error("Erro ao alterar plano:", error)
    return NextResponse.json({ erro: error.message }, { status: 500 })
  }

  // Cancelar assinaturas ativas anteriores
  await admin
    .from("assinaturas")
    .update({ status: "cancelada" })
    .eq("empresa_id", empresa_id)
    .eq("status", "ativa")

  // Se for plano pago, criar nova assinatura ativa (alterada pelo admin)
  if (plano !== "gratuito") {
    const valorMensal = plano === "agenda" ? 29 : plano === "basico" ? 49 : plano === "gestao" ? 79 : 99
    await admin.from("assinaturas").insert({
      empresa_id,
      plano,
      periodicidade: "mensal",
      status: "ativa",
      forma_pagamento: "manual",
      valor_mensal: valorMensal,
      valor_total: valorMensal,
      data_inicio: new Date().toISOString(),
    })
  }

  return NextResponse.json({ sucesso: true, plano })
}
