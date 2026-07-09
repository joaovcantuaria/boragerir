import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { createAdminClient } from "@/lib/supabase/admin"

export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ erro: "Não autenticado" }, { status: 401 })

    const { codigo, plano } = await req.json()
    if (!codigo?.trim()) return NextResponse.json({ erro: "Código inválido" }, { status: 400 })

    const admin = createAdminClient()
    const { data: cupom, error } = await admin
      .from("cupons")
      .select("*")
      .eq("codigo", codigo.toUpperCase().trim())
      .single()

    if (error || !cupom) {
      return NextResponse.json({ erro: "Cupom não encontrado" }, { status: 404 })
    }

    // Verificar se está ativo
    if (!cupom.ativo) {
      return NextResponse.json({ erro: "Este cupom não está mais disponível" }, { status: 400 })
    }

    // Verificar validade (data)
    if (cupom.validade) {
      const vencimento = new Date(cupom.validade)
      vencimento.setHours(23, 59, 59, 999)
      if (new Date() > vencimento) {
        return NextResponse.json({ erro: "Cupom expirado" }, { status: 400 })
      }
    }

    // Verificar quantidade disponível
    if (cupom.uso_maximo !== null && cupom.uso_atual >= cupom.uso_maximo) {
      return NextResponse.json({ erro: "Cupom esgotado" }, { status: 400 })
    }

    // Verificar se é válido para o plano
    if (cupom.planos_validos && Array.isArray(cupom.planos_validos) && cupom.planos_validos.length > 0 && plano) {
      if (!cupom.planos_validos.includes(plano)) {
        return NextResponse.json({ erro: "Cupom não válido para este plano" }, { status: 400 })
      }
    }

    return NextResponse.json({
      valido: true,
      codigo: cupom.codigo,
      tipo: cupom.tipo,       // "percentual" | "fixo"
      valor: cupom.valor,     // % ou R$
      descricao: cupom.descricao,
    })
  } catch (error) {
    console.error("Erro ao validar cupom:", error)
    return NextResponse.json({ erro: "Erro interno" }, { status: 500 })
  }
}
