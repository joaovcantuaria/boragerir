import { NextRequest, NextResponse } from "next/server"
import { validateCoraAccess, isCoraAccessError } from "@/lib/cora/middleware"
import { CoraClient, CoraApiError } from "@/lib/cora/client"

/**
 * GET /api/cora/extrato
 * Consulta o extrato da conta Cora da empresa.
 * Query params: startDate (YYYY-MM-DD), endDate (YYYY-MM-DD)
 * Se não informados, usa últimos 30 dias.
 */
export async function GET(request: NextRequest) {
  const access = await validateCoraAccess()
  if (isCoraAccessError(access)) {
    return access
  }

  const { empresaId } = access

  try {
    const searchParams = request.nextUrl.searchParams
    let startDate = searchParams.get("startDate")
    let endDate = searchParams.get("endDate")

    // Se datas não fornecidas, default = últimos 30 dias
    if (!startDate || !endDate) {
      const now = new Date()
      const thirtyDaysAgo = new Date(now)
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)

      endDate = endDate || now.toISOString().split("T")[0]
      startDate = startDate || thirtyDaysAgo.toISOString().split("T")[0]
    }

    // Validar formato das datas (YYYY-MM-DD)
    const dateRegex = /^\d{4}-\d{2}-\d{2}$/
    if (!dateRegex.test(startDate) || !dateRegex.test(endDate)) {
      return NextResponse.json(
        { error: "Formato de data inválido. Use YYYY-MM-DD" },
        { status: 400 }
      )
    }

    // Validar que as datas são válidas
    const startParsed = new Date(startDate + "T00:00:00")
    const endParsed = new Date(endDate + "T00:00:00")

    if (isNaN(startParsed.getTime()) || isNaN(endParsed.getTime())) {
      return NextResponse.json(
        { error: "Data inválida" },
        { status: 400 }
      )
    }

    // Validar startDate <= endDate
    if (startParsed > endParsed) {
      return NextResponse.json(
        { error: "A data inicial deve ser menor ou igual à data final" },
        { status: 400 }
      )
    }

    // Consultar extrato na Cora
    const coraClient = new CoraClient(empresaId)
    const statement = await coraClient.getStatement(startDate, endDate)

    // Converter valores de centavos → reais
    const entradas = statement.entries.map((entry) => ({
      id: entry.id,
      data: entry.date,
      tipo: entry.type === "CREDIT" ? "entrada" : "saida",
      descricao: entry.description,
      valor: entry.amount / 100,
      saldoApos: entry.balance / 100,
    }))

    return NextResponse.json({
      saldo: statement.balance / 100,
      entradas,
      periodo: { inicio: startDate, fim: endDate },
    })
  } catch (error) {
    if (error instanceof CoraApiError) {
      console.error("[Cora Extrato] API error:", error.statusCode, error.code, error.message)
      return NextResponse.json(
        { error: error.message || "Erro ao consultar extrato na Cora", code: error.code },
        { status: error.statusCode >= 500 ? 502 : 422 }
      )
    }

    console.error("[Cora Extrato] Erro inesperado:", error)
    return NextResponse.json(
      { error: "Serviço de extrato indisponível. Tente novamente em alguns instantes." },
      { status: 500 }
    )
  }
}
