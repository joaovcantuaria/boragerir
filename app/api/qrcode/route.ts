import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"

/**
 * GET /api/qrcode?d=<texto>  →  imagem PNG do QR Code
 * Gerada pelo servidor (o navegador não precisa acessar site externo, que pode
 * estar bloqueado na rede/extensão do usuário). Só para usuários logados.
 */
export async function GET(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ erro: "Não autenticado" }, { status: 401 })

  const dado = req.nextUrl.searchParams.get("d") ?? ""
  if (!dado || dado.length > 1000) {
    return NextResponse.json({ erro: "Conteúdo inválido" }, { status: 400 })
  }

  try {
    const url = `https://api.qrserver.com/v1/create-qr-code/?size=300x300&margin=10&format=png&data=${encodeURIComponent(dado)}`
    const resposta = await fetch(url, { cache: "no-store" })
    if (!resposta.ok) throw new Error(`gerador respondeu ${resposta.status}`)
    const imagem = await resposta.arrayBuffer()
    return new NextResponse(imagem, {
      headers: {
        "Content-Type": "image/png",
        "Cache-Control": "private, max-age=3600",
      },
    })
  } catch (e) {
    console.error("[api/qrcode] falha ao gerar QR:", e)
    return NextResponse.json({ erro: "Não foi possível gerar o QR Code" }, { status: 502 })
  }
}
