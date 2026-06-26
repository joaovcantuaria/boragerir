import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { enviarEmail, templateBase } from "@/lib/email/brevo"
import { format, parseISO } from "date-fns"
import { ptBR } from "date-fns/locale"

export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ erro: "Não autenticado" }, { status: 401 })

    const { agendamento_id, acao } = await req.json()
    // acao: "confirmar" | "espera" | "cancelar"

    const { data: empresa } = await supabase
      .from("empresas").select("nome, telefone").eq("user_id", user.id).single()

    const { data: agendamento } = await supabase
      .from("agendamentos")
      .select("*, produtos_servicos(nome)")
      .eq("id", agendamento_id)
      .single()

    if (!agendamento) return NextResponse.json({ erro: "Agendamento não encontrado" }, { status: 404 })

    // Mapear ação para status
    const novoStatus = acao === "confirmar" ? "confirmado" : acao === "espera" ? "espera" : "cancelado"

    const { error } = await supabase
      .from("agendamentos")
      .update({ status: novoStatus })
      .eq("id", agendamento_id)

    if (error) return NextResponse.json({ erro: error.message }, { status: 500 })

    // Enviar e-mail se tiver e-mail do cliente
    const emailCliente = agendamento.email_cliente
    const nomeCliente = agendamento.nome_cliente_avulso ?? "Cliente"
    const servico = agendamento.produtos_servicos?.nome ?? "Serviço"
    const dataFormatada = format(parseISO(agendamento.data_hora), "EEEE, d 'de' MMMM 'de' yyyy", { locale: ptBR })
    const horario = format(parseISO(agendamento.data_hora), "HH:mm")
    const protocolo = `AG-${agendamento_id.slice(-7).toUpperCase()}`

    if (emailCliente) {
      let assunto = ""
      let corBadge = ""
      let emoji = ""
      let mensagemPrincipal = ""
      let detalheExtra = ""

      if (acao === "confirmar") {
        assunto = `✅ Agendamento confirmado — ${empresa?.nome}`
        corBadge = "#22c55e"
        emoji = "✅"
        mensagemPrincipal = "Ótima notícia! Seu agendamento foi <strong>confirmado</strong>."
        detalheExtra = "Aguardamos você no dia e horário marcado. Em caso de imprevisto, entre em contato com antecedência."
      } else if (acao === "espera") {
        assunto = `⏳ Lista de espera — ${empresa?.nome}`
        corBadge = "#f59e0b"
        emoji = "⏳"
        mensagemPrincipal = "Seu pedido de agendamento foi recebido e está na <strong>lista de espera</strong>."
        detalheExtra = "Assim que um horário for disponibilizado, entraremos em contato para confirmar. Agradecemos sua compreensão!"
      } else {
        assunto = `❌ Agendamento cancelado — ${empresa?.nome}`
        corBadge = "#ef4444"
        emoji = "❌"
        mensagemPrincipal = "Infelizmente, seu agendamento precisou ser <strong>cancelado</strong>."
        detalheExtra = "Entre em contato para remarcar em outro horário disponível."
      }

      const html = templateBase(`
        <h2 style="color:#1a1a1a;font-size:18px;margin:0 0 16px;">${emoji} ${acao === "confirmar" ? "Agendamento confirmado!" : acao === "espera" ? "Lista de espera" : "Agendamento cancelado"}</h2>
        <p>Olá, <strong>${nomeCliente}</strong>!</p>
        <p>${mensagemPrincipal}</p>
        <div style="background:#f9f9f9;border-left:4px solid ${corBadge};border-radius:4px;padding:14px 16px;margin:16px 0;">
          <p style="margin:0;font-size:13px;">📋 Serviço: <strong>${servico}</strong></p>
          <p style="margin:6px 0 0;font-size:13px;">📅 Data: <strong>${dataFormatada}</strong></p>
          <p style="margin:4px 0 0;font-size:13px;">🕐 Horário: <strong>${horario}</strong></p>
          <p style="margin:4px 0 0;font-size:13px;">🏪 Estabelecimento: <strong>${empresa?.nome}</strong></p>
          <p style="margin:4px 0 0;font-size:13px;">🔖 Protocolo: <strong>${protocolo}</strong></p>
        </div>
        <p>${detalheExtra}</p>
        <p style="font-size:12px;color:#888;">Telefone: ${empresa?.telefone ?? ""}</p>
      `)

      await enviarEmail({
        para: { email: emailCliente, nome: nomeCliente },
        assunto,
        html,
      })
    }

    return NextResponse.json({ sucesso: true, status: novoStatus })

  } catch (err) {
    console.error("Erro ao confirmar agendamento:", err)
    return NextResponse.json({ erro: "Erro interno" }, { status: 500 })
  }
}
