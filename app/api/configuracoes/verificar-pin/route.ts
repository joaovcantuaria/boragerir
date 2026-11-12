import { NextRequest, NextResponse } from "next/server"
import { createAdminClient } from "@/lib/supabase/admin"
import { createClient } from "@/lib/supabase/server"
import { consumirLimite, limparLimite, limiteBloqueadoAte, mensagemBloqueio } from "@/lib/security/limite-tentativas"
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

  // Só quem está logado e tem acesso à empresa (RLS) pode testar o PIN
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ valido: false, erro: "Não autenticado" }, { status: 401 })
  const { data: minhaEmpresa } = await supabase.from("empresas").select("id").eq("id", empresa_id).maybeSingle()
  if (!minhaEmpresa) return NextResponse.json({ valido: false, erro: "Empresa não encontrada" }, { status: 404 })

  // 5 PINs errados em 15 minutos → bloqueia por 15 minutos
  const chave = `pin:${empresa_id}`
  const bloqueio = await limiteBloqueadoAte(chave)
  if (bloqueio) return NextResponse.json({ valido: false, erro: mensagemBloqueio(bloqueio) }, { status: 429 })

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

  const pinHash = Buffer.from(hashPin(pin))
  const salvo = Buffer.from(String(empresa.pin_gerente))
  const valido = pinHash.length === salvo.length && crypto.timingSafeEqual(pinHash, salvo)

  if (!valido) {
    const r = await consumirLimite(chave, 5, 900, 900)
    if (!r.permitido) return NextResponse.json({ valido: false, erro: mensagemBloqueio(r.bloqueadoAte) }, { status: 429 })
    return NextResponse.json({ valido: false })
  }
  await limparLimite(chave)
  return NextResponse.json({ valido })
}
