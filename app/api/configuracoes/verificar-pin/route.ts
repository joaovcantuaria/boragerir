import { NextRequest, NextResponse } from "next/server"
import { createAdminClient } from "@/lib/supabase/admin"
import crypto from "crypto"

function hashPin(pin: string): string {
  return crypto.createHash("sha256").update(pin).digest("hex")
}

export async function POST(req: NextRequest) {
  const { empresa_id, pin } = await req.json()

  if (!empresa_id || !pin) {
    return NextResponse.json({ valido: false, erro: "empresa_id e pin são obrigatórios" }, { status: 400 })
  }

  if (!/^\d{4,6}$/.test(pin)) {
    return NextResponse.json({ valido: false, erro: "PIN inválido" }, { status: 400 })
  }

  const admin = createAdminClient()

  const { data: empresa, error } = await admin
    .from("empresas")
    .select("pin_gerente")
    .eq("id", empresa_id)
    .single()

  if (error || !empresa) {
    return NextResponse.json({ valido: false, erro: "Empresa não encontrada" }, { status: 404 })
  }

  if (!empresa.pin_gerente) {
    return NextResponse.json({ valido: false, erro: "PIN de gerente não configurado" }, { status: 400 })
  }

  const pinHash = hashPin(pin)
  const valido = pinHash === empresa.pin_gerente

  return NextResponse.json({ valido })
}
