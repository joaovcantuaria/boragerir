import { NextRequest, NextResponse } from "next/server"
import { enviarEmail, templateBase } from "@/lib/email/brevo"
import { enviarWhatsAppTemplate } from "@/lib/whatsapp/boragerir-chat"
import { format, parseISO } from "date-fns"
import { ptBR } from "date-fns/locale"

export async function POST(req: NextRequest) {
  try {
    const { nomeCliente, emailCliente, telefoneCliente, nomeEmpresa, telefoneEmpresa, servico, dataHora } = await req.json()

    const dataFormatada = format(parseISO(dataHora), "EEEE, d 'de' MMMM 'de' yyyy", { locale: ptBR })
    const horario = format(parseISO(dataHora), "HH:mm")
    const dataCurta = format(parseISO(dataHora), "dd/MM/yyyy", { locale: ptBR })

    // ─── Enviar WhatsApp via BoraGerir Chat (template aprovado) ───
    const telefoneParaWhats = telefoneCliente || ""
    if (telefoneParaWhats) {
      enviarWhatsAppTemplate({
        telefone: telefoneParaWhats,
        template: "solicitacao_agendamento",
        nomeCliente: nomeCliente || "Cliente",
        data: dataCurta,
        horario,
        nomeEmpresa,
      })
    }

    // ─── Enviar Email ───
    if (!emailCliente) {
      return NextResponse.json({ sucesso: true, motivo: "sem_email_mas_whatsapp_enviado" })
    }

    const html = templateBase(`
      <h2 style="color:#1a1a1a;font-size:18px;margin:0 0 16px;">📅 Solicitação de agendamento recebida!</h2>
      <p>Olá, <strong>${nomeCliente}</strong>!</p>
      <p>Sua solicitação de agendamento em <strong>${nomeEmpresa}</strong> foi recebida com sucesso.</p>
      <div style="background:#fff8f5;border:1px solid #F26E1D;border-radius:8px;padding:14px 16px;margin:20px 0;">
        <p style="margin:0;color:#F26E1D;font-weight:700;font-size:14px;">Detalhes da solicitação:</p>
        <p style="margin:6px 0 0;font-size:13px;">📋 Serviço: <strong>${servico}</strong></p>
        <p style="margin:4px 0 0;font-size:13px;">📅 Data: <strong>${dataFormatada}</strong></p>
        <p style="margin:4px 0 0;font-size:13px;">🕐 Horário: <strong>${horario}</strong></p>
        <p style="margin:4px 0 0;font-size:13px;">🏪 Estabelecimento: <strong>${nomeEmpresa}</strong></p>
      </div>
      <p style="background:#fef9c3;border:1px solid #fde047;border-radius:8px;padding:12px 14px;font-size:13px;color:#854d0e;">
        ⏳ Sua solicitação ainda <strong>aguarda confirmação</strong> do estabelecimento. Você receberá outro e-mail assim que for confirmada ou colocada na lista de espera.
      </p>
      <p>Em caso de dúvidas, entre em contato: <strong>${telefoneEmpresa}</strong></p>
    `)

    const { sucesso, erro } = await enviarEmail({
      para: { email: emailCliente, nome: nomeCliente },
      assunto: `📅 Solicitação recebida — ${nomeEmpresa}`,
      html,
    })

    return NextResponse.json({ sucesso, erro })
  } catch (err) {
    console.error("Erro ao notificar solicitação:", err)
    return NextResponse.json({ sucesso: false, erro: "Erro interno" }, { status: 500 })
  }
}
