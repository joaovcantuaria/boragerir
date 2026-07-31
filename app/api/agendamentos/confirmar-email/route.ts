import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { enviarEmail, templateAgendamentoConfirmado } from "@/lib/email/brevo"
import { enviarWhatsAppTemplate } from "@/lib/whatsapp/boragerir-chat"
import { format, parseISO } from "date-fns"
import { ptBR } from "date-fns/locale"

export async function POST(req: NextRequest) {
  try {
    const { agendamento_id } = await req.json()

    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ erro: "Não autenticado" }, { status: 401 })

    const { data: empresa } = await supabase
      .from("empresas").select("nome, telefone").eq("user_id", user.id).single()

    const { data: agendamento } = await supabase
      .from("agendamentos")
      .select("*, clientes(nome_completo, email), produtos_servicos(nome)")
      .eq("id", agendamento_id)
      .single()

    if (!agendamento) return NextResponse.json({ erro: "Agendamento não encontrado" }, { status: 404 })

    const emailCliente = agendamento.clientes?.email
    const nomeCliente = agendamento.clientes?.nome_completo ?? agendamento.nome_cliente_avulso

    if (!emailCliente) {
      return NextResponse.json({ erro: "Cliente sem e-mail cadastrado" }, { status: 400 })
    }

    const dataFormatada = format(parseISO(agendamento.data_hora), "EEEE, d 'de' MMMM 'de' yyyy", { locale: ptBR })
    const horario = format(parseISO(agendamento.data_hora), "HH:mm")
    const protocolo = `AG-${agendamento.id.slice(-7).toUpperCase()}`

    const { sucesso, erro } = await enviarEmail({
      para: { email: emailCliente, nome: nomeCliente ?? "Cliente" },
      assunto: `✅ Agendamento confirmado — ${empresa?.nome ?? "Bora Gerir"}`,
      html: templateAgendamentoConfirmado({
        nomeCliente: nomeCliente ?? "Cliente",
        nomeEmpresa: empresa?.nome ?? "",
        servico: agendamento.produtos_servicos?.nome ?? "Serviço",
        data: dataFormatada,
        horario,
        telefone: empresa?.telefone ?? "",
        protocolo,
      }),
    })

    // ── WhatsApp via BoraGerir Chat ───
    const telefoneWhats = agendamento.telefone_cliente_avulso ?? agendamento.clientes?.telefone ?? ""
    if (telefoneWhats) {
      const dataWhats = format(parseISO(agendamento.data_hora), "d 'de' MMMM 'de' yyyy", { locale: ptBR })
      enviarWhatsAppTemplate({
        telefone: telefoneWhats,
        template: "confirmacao_agendamento",
        nomeCliente: nomeCliente ?? "Cliente",
        data: dataWhats,
        horario,
        nomeEmpresa: empresa?.nome ?? "",
        servico: agendamento.produtos_servicos?.nome ?? "Serviço",
      })
    }
    // ──────────────────────────────────

    return NextResponse.json({
      sucesso,
      mensagem: sucesso ? `Confirmação enviada para ${emailCliente}` : `Falha: ${erro}`,
    })
  } catch (err) {
    console.error("Erro ao enviar confirmação:", err)
    return NextResponse.json({ erro: "Erro interno" }, { status: 500 })
  }
}
