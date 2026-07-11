import { NextRequest, NextResponse } from "next/server"
import { createAdminClient } from "@/lib/supabase/admin"
import { createClient } from "@/lib/supabase/server"
import { addDays, addMonths, format } from "date-fns"
import { enviarEmail, templateTesteGratis, templateAssinaturaConfirmada } from "@/lib/email/brevo"

/**
 * Cria assinatura manual para uma empresa (sem cobrança MP).
 * Tipos: "teste" (7, 15, 30 dias) ou "pago" (1-48 meses com valor customizado).
 */
export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ erro: "Não autenticado" }, { status: 401 })

  const admin = createAdminClient()
  const { data: usuarioAdmin } = await admin
    .from("usuarios_admin")
    .select("perfil, ativo")
    .eq("email", user.email ?? "")
    .single()

  if (!usuarioAdmin?.ativo || usuarioAdmin.perfil !== "super_admin") {
    return NextResponse.json({ erro: "Apenas super_admin pode criar assinaturas manuais." }, { status: 403 })
  }

  const body = await req.json()
  const { empresa_id, tipo, plano, meses, dias_teste, valor_recebido } = body

  if (!empresa_id || !tipo) {
    return NextResponse.json({ erro: "empresa_id e tipo são obrigatórios" }, { status: 400 })
  }

  const agora = new Date()

  // Cancelar assinaturas ativas anteriores da empresa
  await admin.from("assinaturas")
    .update({ status: "cancelada" })
    .eq("empresa_id", empresa_id)
    .in("status", ["ativa", "pendente"])

  if (tipo === "teste") {
    const diasValidos = [7, 15, 30]
    if (!diasValidos.includes(dias_teste)) {
      return NextResponse.json({ erro: "dias_teste deve ser 7, 15 ou 30" }, { status: 400 })
    }

    const dataFim = addDays(agora, dias_teste)

    await admin.from("assinaturas").insert({
      empresa_id,
      plano: plano ?? "profissional",
      periodicidade: "mensal",
      status: "ativa",
      forma_pagamento: null,
      valor_mensal: 0,
      valor_total: 0,
      data_inicio: agora.toISOString(),
      data_fim: dataFim.toISOString(),
      proximo_vencimento: dataFim.toISOString(),
    })

    // Ativar plano na empresa
    await admin.from("empresas").update({
      plano: plano ?? "profissional",
      plano_ativo: true,
    }).eq("id", empresa_id)

    // Enviar email de teste grátis
    const { data: empresaData } = await admin.from("empresas").select("nome, email, user_id").eq("id", empresa_id).single()
    if (empresaData) {
      const { data: userData } = await admin.auth.admin.getUserById(empresaData.user_id)
      const emailDestino = userData?.user?.email || empresaData.email
      const planoNome = (plano ?? "profissional").charAt(0).toUpperCase() + (plano ?? "profissional").slice(1)
      enviarEmail({
        para: { email: emailDestino, nome: empresaData.nome },
        assunto: `🎉 Teste grátis ativado — Plano ${planoNome} | Bora Gerir`,
        html: templateTesteGratis({
          nomeEmpresa: empresaData.nome,
          plano: planoNome,
          diasTeste: dias_teste,
          dataVencimento: format(dataFim, "dd/MM/yyyy"),
        }),
      }).catch(() => {})
    }

    return NextResponse.json({
      sucesso: true,
      mensagem: `Período de teste de ${dias_teste} dias ativado! Vence em ${dataFim.toLocaleDateString("pt-BR")}.`,
    })
  }

  if (tipo === "pago") {
    if (!plano || !meses || meses < 1 || meses > 48) {
      return NextResponse.json({ erro: "plano e meses (1-48) são obrigatórios para plano pago" }, { status: 400 })
    }

    const valoresPadrao: Record<string, number> = { basico: 49, profissional: 99, agenda: 29 }
    const valorMensalPadrao = valoresPadrao[plano] ?? 49
    const valorTotal = valorMensalPadrao * meses
    const valorRecebidoNum = valor_recebido ? parseFloat(valor_recebido) : valorTotal
    const desconto = Math.max(0, valorTotal - valorRecebidoNum)

    const dataFim = addMonths(agora, meses)

    await admin.from("assinaturas").insert({
      empresa_id,
      plano,
      periodicidade: meses === 1 ? "mensal" : "anual",
      status: "ativa",
      forma_pagamento: "pix",
      valor_mensal: valorMensalPadrao,
      valor_total: valorRecebidoNum,
      data_inicio: agora.toISOString(),
      data_fim: dataFim.toISOString(),
      proximo_vencimento: addMonths(agora, 1).toISOString(),
    })

    // Ativar plano na empresa
    await admin.from("empresas").update({
      plano,
      plano_ativo: true,
    }).eq("id", empresa_id)

    // Enviar email de confirmação de assinatura
    const { data: empresaData2 } = await admin.from("empresas").select("nome, email, user_id").eq("id", empresa_id).single()
    if (empresaData2) {
      const { data: userData2 } = await admin.auth.admin.getUserById(empresaData2.user_id)
      const emailDestino2 = userData2?.user?.email || empresaData2.email
      const planoNome2 = plano.charAt(0).toUpperCase() + plano.slice(1)
      enviarEmail({
        para: { email: emailDestino2, nome: empresaData2.nome },
        assunto: `✅ Assinatura confirmada — Plano ${planoNome2} | Bora Gerir`,
        html: templateAssinaturaConfirmada({
          nomeEmpresa: empresaData2.nome,
          plano: planoNome2,
          valor: `R$ ${valorRecebidoNum.toFixed(2)}`,
          periodicidade: meses === 1 ? "Mensal" : `${meses} meses`,
          dataVencimento: format(addMonths(agora, 1), "dd/MM/yyyy"),
        }),
      }).catch(() => {})
    }

    return NextResponse.json({
      sucesso: true,
      mensagem: `Plano ${plano} ativado por ${meses} mês${meses > 1 ? "es" : ""}. Valor: R$${valorRecebidoNum.toFixed(2)}${desconto > 0 ? ` (desconto de R$${desconto.toFixed(2)})` : ""}.`,
      desconto,
    })
  }

  return NextResponse.json({ erro: "tipo inválido (use 'teste' ou 'pago')" }, { status: 400 })
}
