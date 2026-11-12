import { NextRequest, NextResponse } from "next/server"
import { enviarEmail, templateBase } from "@/lib/email/brevo"
import { enviarWhatsAppTemplate } from "@/lib/whatsapp/boragerir-chat"
import { format, parseISO } from "date-fns"
import { ptBR } from "date-fns/locale"
import { consumirLimite, ipDaRequisicao, escaparHtml } from "@/lib/security/limite-tentativas"

export async function POST(req: NextRequest) {
  try {
    // Rota pública: no máximo 10 avisos por IP a cada 10 minutos
    const lim = await consumirLimite(`notificar-solicitacao:${ipDaRequisicao(req)}`, 10, 600, 600)
    if (!lim.permitido) return NextResponse.json({ sucesso: false, erro: "Muitas solicitações" }, { status: 429 })

    const corpo = await req.json()
    const curto = (v: unknown, n: number) => String(v ?? "").trim().slice(0, n)
    const nomeCliente = curto(corpo.nomeCliente, 100)
    const emailCliente = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(curto(corpo.emailCliente, 200)) ? curto(corpo.emailCliente, 200) : ""
    const telefoneCliente = curto(corpo.telefoneCliente, 20).replace(/\D/g, "")
    const nomeEmpresa = curto(corpo.nomeEmpresa, 120)
    const telefoneEmpresa = curto(corpo.telefoneEmpresa, 30)
    const servico = curto(corpo.servico, 150)
    const dataHora = curto(corpo.dataHora, 40)
    // versões seguras para colocar dentro do HTML do e-mail
    const h = { nomeCliente: escaparHtml(nomeCliente), nomeEmpresa: escaparHtml(nomeEmpresa), servico: escaparHtml(servico), telefoneEmpresa: escaparHtml(telefoneEmpresa) }

    const dataFormatada = format(parseISO(dataHora), "EEEE, d 'de' MMMM 'de' yyyy", { locale: ptBR })
    const horario = format(parseISO(dataHora), "HH:mm")

    // ─── Enviar WhatsApp via BoraGerir Chat (template aprovado) ───
    const telefoneParaWhats = telefoneCliente || ""
    if (telefoneParaWhats) {
      const dataWhats = format(parseISO(dataHora), "d 'de' MMMM 'de' yyyy", { locale: ptBR })
      enviarWhatsAppTemplate({
        telefone: telefoneParaWhats,
        template: "solicitacao_agendamento",
        nomeCliente: nomeCliente || "Cliente",
        data: dataWhats,
        horario,
        nomeEmpresa,
        servico: servico || "Serviço",
      })
    }

    // ─── Enviar Email ───
    if (!emailCliente) {
      return NextResponse.json({ sucesso: true, motivo: "sem_email_mas_whatsapp_enviado" })
    }

    const html = templateBase(`
      <h2 style="color:#1a1a1a;font-size:18px;margin:0 0 16px;">📅 Solicitação de agendamento recebida!</h2>
      <p>Olá, <strong>${h.nomeCliente}</strong>!</p>
      <p>Sua solicitação de agendamento em <strong>${h.nomeEmpresa}</strong> foi recebida com sucesso.</p>
      <div style="background:#fff8f5;border:1px solid #F26E1D;border-radius:8px;padding:14px 16px;margin:20px 0;">
        <p style="margin:0;color:#F26E1D;font-weight:700;font-size:14px;">Detalhes da solicitação:</p>
        <p style="margin:6px 0 0;font-size:13px;">📋 Serviço: <strong>${h.servico}</strong></p>
        <p style="margin:4px 0 0;font-size:13px;">📅 Data: <strong>${dataFormatada}</strong></p>
        <p style="margin:4px 0 0;font-size:13px;">🕐 Horário: <strong>${horario}</strong></p>
        <p style="margin:4px 0 0;font-size:13px;">🏪 Estabelecimento: <strong>${h.nomeEmpresa}</strong></p>
      </div>
      <p style="background:#fef9c3;border:1px solid #fde047;border-radius:8px;padding:12px 14px;font-size:13px;color:#854d0e;">
        ⏳ Sua solicitação ainda <strong>aguarda confirmação</strong> do estabelecimento. Você receberá outro e-mail assim que for confirmada ou colocada na lista de espera.
      </p>
      <p>Em caso de dúvidas, entre em contato: <strong>${h.telefoneEmpresa}</strong></p>
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
