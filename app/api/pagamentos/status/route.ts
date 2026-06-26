import { NextRequest, NextResponse } from "next/server"
import { MercadoPagoConfig, Payment } from "mercadopago"

const mp = new MercadoPagoConfig({
  accessToken: process.env.MERCADOPAGO_ACCESS_TOKEN!,
})

export async function GET(req: NextRequest) {
  const payment_id = req.nextUrl.searchParams.get("payment_id")
  if (!payment_id) return NextResponse.json({ erro: "payment_id obrigatório" }, { status: 400 })

  try {
    const payment = new Payment(mp)
    const resultado = await payment.get({ id: payment_id })
    return NextResponse.json({ status: resultado.status, status_detail: resultado.status_detail })
  } catch {
    return NextResponse.json({ erro: "Pagamento não encontrado" }, { status: 404 })
  }
}
