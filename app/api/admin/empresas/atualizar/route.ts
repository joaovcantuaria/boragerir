import { NextRequest, NextResponse } from "next/server"
import { createAdminClient } from "@/lib/supabase/admin"
import { createClient } from "@/lib/supabase/server"

export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ erro: "Não autenticado" }, { status: 401 })

  const admin = createAdminClient()
  const { data: usuarioAdmin } = await admin
    .from("usuarios_admin").select("perfil, ativo").eq("email", user.email ?? "").single()

  if (!usuarioAdmin?.ativo) {
    return NextResponse.json({ erro: "Sem permissão." }, { status: 403 })
  }

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
