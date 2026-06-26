import { NextRequest, NextResponse } from "next/server"

// Rota pública temporária para testar o MP — remover após diagnóstico
export async function GET(req: NextRequest) {
  const accessToken = process.env.MERCADOPAGO_ACCESS_TOKEN

  if (!accessToken) {
    return NextResponse.json({ erro: "Token não configurado" })
  }

  try {
    // Testar credenciais chamando a API de usuário do MP
    const response = await fetch("https://api.mercadopago.com/users/me", {
      headers: {
        "Authorization": `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
    })

    const data = await response.json()

    if (!response.ok) {
      return NextResponse.json({
        ok: false,
        status: response.status,
        erro: data,
      })
    }

    return NextResponse.json({
      ok: true,
      usuario: {
        id: data.id,
        email: data.email,
        site_id: data.site_id,
        status: data.status,
        pais: data.country_id,
        verificado: data.identification?.type,
      },
    })
  } catch (err) {
    return NextResponse.json({ ok: false, erro: String(err) })
  }
}
