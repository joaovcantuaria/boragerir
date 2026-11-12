import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { conferirHash, gerarHash, lerSegredosEmpresa, salvarSegredosEmpresa } from "@/lib/security/senhas"
import { consumirLimite, limparLimite, limiteBloqueadoAte, mensagemBloqueio } from "@/lib/security/limite-tentativas"

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

  const { pinHash } = await lerSegredosEmpresa(empresa_id)
  if (!pinHash) {
    return NextResponse.json({ valido: false, erro: "PIN de gerente não configurado" }, { status: 400 })
  }

  const { ok: valido, atualizar } = await conferirHash(pin, pinHash)
  // PIN antigo (SHA-256): regrava no formato forte
  if (valido && atualizar) await salvarSegredosEmpresa(empresa_id, { pinHash: await gerarHash(pin) }).catch(() => {})

  if (!valido) {
    const r = await consumirLimite(chave, 5, 900, 900)
    if (!r.permitido) return NextResponse.json({ valido: false, erro: mensagemBloqueio(r.bloqueadoAte) }, { status: 429 })
    return NextResponse.json({ valido: false })
  }
  await limparLimite(chave)
  return NextResponse.json({ valido })
}
