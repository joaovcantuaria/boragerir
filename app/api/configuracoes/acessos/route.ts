import { NextRequest, NextResponse } from "next/server"
import { createAdminClient } from "@/lib/supabase/admin"
import { createClient } from "@/lib/supabase/server"
import crypto from "crypto"

function hashPin(pin: string): string {
  return crypto.createHash("sha256").update(pin).digest("hex")
}

export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ erro: "Não autorizado" }, { status: 401 })
  }

  const { empresa_id, pin, restricoes_acesso } = await req.json()

  if (!empresa_id) {
    return NextResponse.json({ erro: "empresa_id é obrigatório" }, { status: 400 })
  }

  // Verificar se o usuário tem acesso a esta empresa
  const { data: empresa } = await supabase
    .from("empresas")
    .select("id")
    .eq("id", empresa_id)
    .eq("user_id", user.id)
    .single()

  if (!empresa) {
    return NextResponse.json({ erro: "Empresa não encontrada" }, { status: 404 })
  }

  const admin = createAdminClient()

  const updateData: Record<string, unknown> = {}

  // Se pin foi enviado, faz o hash e salva
  if (pin) {
    if (pin.length < 4 || pin.length > 6 || !/^\d+$/.test(pin)) {
      return NextResponse.json({ erro: "PIN deve ter entre 4 e 6 dígitos numéricos" }, { status: 400 })
    }
    updateData.pin_gerente = hashPin(pin)
  }

  // Se restricoes_acesso foi enviado, salva
  if (restricoes_acesso !== undefined) {
    updateData.restricoes_acesso = restricoes_acesso
  }

  if (Object.keys(updateData).length === 0) {
    return NextResponse.json({ erro: "Nenhum dado para atualizar" }, { status: 400 })
  }

  const { error } = await admin
    .from("empresas")
    .update(updateData)
    .eq("id", empresa_id)

  if (error) {
    return NextResponse.json({ erro: error.message }, { status: 500 })
  }

  return NextResponse.json({ sucesso: true })
}

export async function GET(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ erro: "Não autorizado" }, { status: 401 })
  }

  const { searchParams } = new URL(req.url)
  const empresa_id = searchParams.get("empresa_id")

  if (!empresa_id) {
    return NextResponse.json({ erro: "empresa_id é obrigatório" }, { status: 400 })
  }

  const { data: empresa } = await supabase
    .from("empresas")
    .select("pin_gerente, restricoes_acesso")
    .eq("id", empresa_id)
    .eq("user_id", user.id)
    .single()

  if (!empresa) {
    return NextResponse.json({ erro: "Empresa não encontrada" }, { status: 404 })
  }

  return NextResponse.json({
    pin_configurado: !!empresa.pin_gerente,
    restricoes_acesso: empresa.restricoes_acesso || {},
  })
}
