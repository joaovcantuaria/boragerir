import { NextRequest, NextResponse } from "next/server"
import { getEmpresaAtiva } from "@/lib/get-empresa-ativa"
import { rateLimit } from "@/lib/security/rate-limit"
import { validarCupom } from "@/lib/integracoes/cupons-cliente"

// GET /api/cupons-cliente/validar?codigo=NIVER-XXXXX&cliente_id=... — usado pelo PDV
export async function GET(req: NextRequest) {
  const { user, empresa } = await getEmpresaAtiva()
  if (!user) return NextResponse.json({ erro: "Não autenticado" }, { status: 401 })
  if (!empresa) return NextResponse.json({ erro: "Empresa não encontrada" }, { status: 404 })

  const { allowed } = rateLimit(`validar-cupom-cliente:${user.id}`, { limit: 30, windowMs: 60_000 })
  if (!allowed) return NextResponse.json({ erro: "Muitas tentativas. Aguarde um minuto." }, { status: 429 })

  const codigo = req.nextUrl.searchParams.get("codigo") || ""
  if (!codigo.trim()) return NextResponse.json({ erro: "Informe o código" }, { status: 400 })
  const r = await validarCupom(empresa.id, codigo, req.nextUrl.searchParams.get("cliente_id"))
  if (!r.ok) return NextResponse.json({ erro: r.erro }, { status: 400 })
  return NextResponse.json({ cupom: r.cupom })
}
