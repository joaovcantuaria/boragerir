import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { createAdminClient } from "@/lib/supabase/admin"

export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ erro: "Não autenticado" }, { status: 401 })

    const { codigo, plano, periodicidade } = await req.json()
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

    // Verificar periodicidade (mensal/anual)
    if (cupom.periodicidades_validas && Array.isArray(cupom.periodicidades_validas) && cupom.periodicidades_validas.length > 0 && periodicidade) {
      if (!cupom.periodicidades_validas.includes(periodicidade)) {
        const permitidas = cupom.periodicidades_validas.join(" ou ")
        return NextResponse.json({ erro: `Cupom válido apenas para plano ${permitidas}` }, { status: 400 })
      }
    }

    // Verificar se é apenas primeiro mês — checar se usuário já teve assinatura paga
    if (cupom.apenas_primeiro_mes) {
      const { data: empresas } = await supabase
        .from("empresas")
        .select("id")
        .eq("user_id", user.id)

      if (empresas && empresas.length > 0) {
        const empresaIds = empresas.map((e) => e.id)
        const { data: assinaturas } = await admin
          .from("assinaturas")
          .select("id")
          .in("empresa_id", empresaIds)
          .eq("status", "ativa")
          .limit(1)

        if (assinaturas && assinaturas.length > 0) {
          return NextResponse.json({ erro: "Cupom válido apenas para a primeira assinatura" }, { status: 400 })
        }
      }
    }

    return NextResponse.json({
      valido: true,
      codigo: cupom.codigo,
      tipo: cupom.tipo,
      valor: cupom.valor,
      descricao: cupom.descricao,
      apenas_primeiro_mes: cupom.apenas_primeiro_mes || false,
    })
  } catch (error) {
    console.error("Erro ao validar cupom:", error)
    return NextResponse.json({ erro: "Erro interno" }, { status: 500 })
  }
}
