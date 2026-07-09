import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { createAdminClient } from "@/lib/supabase/admin"

export async function GET(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (user?.email?.toLowerCase() !== "contato@boragerir.com") {
    return NextResponse.json({ erro: "Não autorizado" }, { status: 403 })
  }

  const admin = createAdminClient()
  const resultados: Record<string, unknown> = {}

  // Buscar empresa do usuário de teste (Ruan Treinador)
  const { data: empresas } = await admin.from("empresas")
    .select("id, nome, plano, plano_ativo")
    .ilike("nome", "%Treinador%")
    .limit(1)

  if (!empresas?.length) {
    return NextResponse.json({ erro: "Empresa não encontrada" })
  }

  const empresa = empresas[0]
  resultados.empresa = empresa

  // Tentar inserir assinatura "agenda" de teste
  const { data: insertData, error: insertErr } = await admin.from("assinaturas").insert({
    empresa_id: empresa.id,
    plano: "agenda",
    periodicidade: "mensal",
    status: "pendente",
    forma_pagamento: "pix",
    valor_mensal: 29,
    valor_total: 29.00,
    mp_pix_payment_id: "TESTE_" + Date.now(),
  }).select("id, plano, status")

  resultados.insert = { data: insertData, error: insertErr }

  // Se inseriu, deletar o registro de teste
  if (insertData?.length) {
    await admin.from("assinaturas").delete().eq("id", insertData[0].id)
    resultados.limpou = true
  }

  return NextResponse.json(resultados)
}
