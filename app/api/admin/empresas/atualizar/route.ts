import { NextRequest, NextResponse } from "next/server"
import { createAdminClient } from "@/lib/supabase/admin"
import { exigirAdmin } from "@/lib/auth/admin"

export async function POST(req: NextRequest) {
  const auth = await exigirAdmin()
  if (!auth.ok) return auth.resposta

  const admin = createAdminClient()

  const { empresa_id, dados } = await req.json()
  if (!empresa_id || !dados) {
    return NextResponse.json({ erro: "empresa_id e dados são obrigatórios" }, { status: 400 })
  }

  // Campos editáveis pelo admin
  const camposPermitidos = [
    "nome", "telefone", "area_atuacao",
    "endereco_rua", "endereco_numero", "endereco_bairro",
    "endereco_cidade", "endereco_estado", "endereco_cep",
    "max_empresas",
  ]
  const dadosFiltrados = Object.fromEntries(
    Object.entries(dados).filter(([k]) => camposPermitidos.includes(k))
  )

  const { error } = await admin.from("empresas").update(dadosFiltrados).eq("id", empresa_id)
  if (error) return NextResponse.json({ erro: error.message }, { status: 500 })

  return NextResponse.json({ sucesso: true })
}
