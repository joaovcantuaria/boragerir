// ============================================================
// Bora Gerir — Serviço de E-mail via Brevo (Sendinblue)
// API gratuita: 300 e-mails/dia, sem restrição de destinatário
// ============================================================

const BREVO_API_URL = "https://api.brevo.com/v3/smtp/email"

interface EmailParams {
  para: { email: string; nome?: string }
  assunto: string
  html: string
  anexos?: { nome: string; conteudo: string; tipo: string }[] // base64
}

export async function enviarEmail({ para, assunto, html, anexos }: EmailParams): Promise<{ sucesso: boolean; erro?: string }> {
  const apiKey = process.env.BREVO_API_KEY
  if (!apiKey) {
    console.warn("⚠️ BREVO_API_KEY não configurada. E-mail não enviado.")
    return { sucesso: false, erro: "BREVO_API_KEY não configurada" }
  }

  const payload: Record<string, unknown> = {
    sender: {
      name: "Bora Gerir",
      email: "noreply@boragerir.com",
    },
    to: [{ email: para.email, name: para.nome ?? para.email }],
    subject: assunto,
    htmlContent: html,
  }

  if (anexos && anexos.length > 0) {
    payload.attachment = anexos.map((a) => ({
      name: a.nome,
      content: a.conteudo,
      type: a.tipo,
    }))
  }

  try {
    const response = await fetch(BREVO_API_URL, {
      method: "POST",
      headers: {
        "api-key": apiKey,
        "Content-Type": "application/json",
        "Accept": "application/json",
      },
      body: JSON.stringify(payload),
    })

    if (!response.ok) {
      const erro = await response.text()
      console.error("Erro Brevo:", response.status, erro)
      return { sucesso: false, erro: `Brevo retornou ${response.status}: ${erro}` }
    }

    console.log(`✅ E-mail enviado via Brevo para ${para.email}`)
    return { sucesso: true }
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    console.error("Erro ao enviar via Brevo:", msg)
    return { sucesso: false, erro: msg }
  }
}

// ── Templates HTML ──────────────────────────────────────────

export function templateBase(conteudo: string, rodape = "© Bora Gerir — app.boragerir.com"): string {
  return `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <style>
    body { font-family: Arial, sans-serif; background: #f5f5f5; margin: 0; padding: 20px; }
    .container { max-width: 560px; margin: 0 auto; background: #fff; border-radius: 12px; overflow: hidden; border: 1px solid #eee; }
    .header { background: #F26E1D; padding: 28px 24px; text-align: center; }
    .header h1 { color: white; margin: 0; font-size: 22px; font-weight: 900; }
    .header p { color: rgba(255,255,255,0.85); margin: 6px 0 0; font-size: 12px; }
    .body { padding: 28px 24px; }
    .footer { background: #f9f9f9; padding: 14px; text-align: center; border-top: 1px solid #eee; }
    .footer p { color: #bbb; font-size: 11px; margin: 0; }
    .btn { display: inline-block; background: #F26E1D; color: white !important; padding: 12px 28px; border-radius: 8px; text-decoration: none; font-weight: 700; font-size: 14px; }
    p { color: #555; line-height: 1.7; margin: 0 0 16px; }
    strong { color: #1a1a1a; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>Bora Gerir</h1>
      <p>Gestão simples. Resultado de verdade.</p>
    </div>
    <div class="body">${conteudo}</div>
    <div class="footer"><p>${rodape}</p></div>
  </div>
</body>
</html>`
}

export function templateAlertaVencimento(params: {
  nomeEmpresa: string
  plano: string
  periodicidade: string
  valor: string
  vencimento: string
}): string {
  return templateBase(`
    <h2 style="color:#1a1a1a;font-size:18px;margin:0 0 16px;">⚠️ Sua assinatura está vencendo</h2>
    <p>Olá, <strong>${params.nomeEmpresa}</strong>!</p>
    <p>Identificamos que sua assinatura do plano <strong>${params.plano}</strong> vence em <strong>${params.vencimento}</strong>.</p>
    <p>Para continuar com acesso completo ao Bora Gerir, renove antes do vencimento.</p>
    <div style="background:#fff8f5;border:1px solid #F26E1D;border-radius:8px;padding:14px 16px;margin:20px 0;">
      <p style="margin:0;color:#F26E1D;font-weight:700;font-size:14px;">Detalhes:</p>
      <p style="margin:6px 0 0;font-size:13px;">Plano: <strong>${params.plano}</strong> (${params.periodicidade})</p>
      <p style="margin:4px 0 0;font-size:13px;">Valor: <strong>${params.valor}</strong></p>
      <p style="margin:4px 0 0;font-size:13px;">Vencimento: <strong>${params.vencimento}</strong></p>
    </div>
    <div style="text-align:center;margin:24px 0;">
      <a href="https://app.boragerir.com/planos" class="btn">Renovar assinatura agora</a>
    </div>
    <p style="color:#999;font-size:11px;text-align:center;">Se já renovou, ignore este e-mail.</p>
  `)
}

export function templateOrcamento(params: {
  nomeEmpresa: string
  nomeCliente: string
  numeroOrcamento: number
  titulo: string
  total: string
  validade: string
  observacoes?: string
}): string {
  return templateBase(`
    <h2 style="color:#1a1a1a;font-size:18px;margin:0 0 16px;">📋 Seu orçamento está pronto!</h2>
    <p>Olá, <strong>${params.nomeCliente}</strong>!</p>
    <p>A empresa <strong>${params.nomeEmpresa}</strong> preparou um orçamento especialmente para você. Confira os detalhes em anexo.</p>
    <div style="background:#fff8f5;border:1px solid #F26E1D;border-radius:8px;padding:14px 16px;margin:20px 0;">
      <p style="margin:0;color:#F26E1D;font-weight:700;font-size:14px;">Orçamento #${String(params.numeroOrcamento).padStart(4, "0")}</p>
      <p style="margin:6px 0 0;font-size:13px;"><strong>${params.titulo}</strong></p>
      <p style="margin:4px 0 0;font-size:13px;">Valor total: <strong>${params.total}</strong></p>
      <p style="margin:4px 0 0;font-size:13px;">Válido até: <strong>${params.validade}</strong></p>
      ${params.observacoes ? `<p style="margin:8px 0 0;font-size:12px;color:#777;">${params.observacoes}</p>` : ""}
    </div>
    <p>O orçamento completo está em anexo neste e-mail (PDF). Para dúvidas, entre em contato com a empresa.</p>
    <p style="color:#888;font-size:12px;">Agradecemos seu interesse! 🙏</p>
  `)
}

export function templateAgendamentoConfirmado(params: {
  nomeCliente: string
  nomeEmpresa: string
  servico: string
  data: string
  horario: string
  telefone: string
  protocolo: string
}): string {
  return templateBase(`
    <h2 style="color:#1a1a1a;font-size:18px;margin:0 0 16px;">✅ Agendamento confirmado!</h2>
    <p>Olá, <strong>${params.nomeCliente}</strong>!</p>
    <p>Seu agendamento em <strong>${params.nomeEmpresa}</strong> foi confirmado com sucesso.</p>
    <div style="background:#f0fdf4;border:1px solid #22c55e;border-radius:8px;padding:14px 16px;margin:20px 0;">
      <p style="margin:0;color:#16a34a;font-weight:700;font-size:14px;">Detalhes do agendamento:</p>
      <p style="margin:6px 0 0;font-size:13px;">📋 Serviço: <strong>${params.servico}</strong></p>
      <p style="margin:4px 0 0;font-size:13px;">📅 Data: <strong>${params.data}</strong></p>
      <p style="margin:4px 0 0;font-size:13px;">🕐 Horário: <strong>${params.horario}</strong></p>
      <p style="margin:4px 0 0;font-size:13px;">🔖 Protocolo: <strong>${params.protocolo}</strong></p>
    </div>
    <p>Em caso de dúvidas ou para cancelar, entre em contato pelo telefone <strong>${params.telefone}</strong>.</p>
    <p style="color:#888;font-size:12px;">Até breve! 😊</p>
  `)
}

export function templateTesteGratis(params: {
  nomeEmpresa: string
  plano: string
  diasTeste: number
  dataVencimento: string
}): string {
  return templateBase(`
    <h2 style="color:#1a1a1a;font-size:18px;margin:0 0 16px;">🎉 Parabéns! Você foi selecionado(a)!</h2>
    <p>Olá, <strong>${params.nomeEmpresa}</strong>!</p>
    <p>Temos uma ótima notícia: sua empresa foi selecionada para testar o <strong>plano ${params.plano}</strong> do Bora Gerir gratuitamente!</p>
    <div style="background:#f0fdf4;border:2px solid #22c55e;border-radius:12px;padding:20px;margin:20px 0;text-align:center;">
      <p style="margin:0;color:#16a34a;font-size:14px;font-weight:700;">✅ Plano ${params.plano} ativado!</p>
      <p style="margin:8px 0 0;color:#333;font-size:13px;"><strong>${params.diasTeste} dias</strong> de teste gratuito</p>
      <p style="margin:4px 0 0;color:#666;font-size:12px;">Válido até <strong>${params.dataVencimento}</strong></p>
    </div>
    <p>Durante este período, você terá acesso completo a todas as funcionalidades do plano. Aproveite para explorar tudo!</p>
    <div style="text-align:center;margin:24px 0;">
      <a href="https://app.boragerir.com/dashboard" class="btn">Acessar meu painel agora →</a>
    </div>
    <p style="color:#666;font-size:12px;">Ao final do período de teste, seu plano retornará ao gratuito automaticamente. Você pode assinar a qualquer momento.</p>
    <p style="color:#888;font-size:12px;">Boas vendas! 🚀</p>
  `)
}

export function templateAssinaturaConfirmada(params: {
  nomeEmpresa: string
  plano: string
  valor: string
  periodicidade: string
  dataVencimento: string
}): string {
  return templateBase(`
    <h2 style="color:#1a1a1a;font-size:18px;margin:0 0 16px;">✅ Assinatura confirmada!</h2>
    <p>Olá, <strong>${params.nomeEmpresa}</strong>!</p>
    <p>Seu pagamento foi confirmado e sua assinatura está ativa. Bem-vindo(a) ao plano <strong>${params.plano}</strong>!</p>
    <div style="background:#fff8f5;border:2px solid #F26E1D;border-radius:12px;padding:20px;margin:20px 0;">
      <p style="margin:0;color:#F26E1D;font-weight:700;font-size:14px;">Detalhes da assinatura:</p>
      <p style="margin:8px 0 0;font-size:13px;">📋 Plano: <strong>${params.plano}</strong></p>
      <p style="margin:4px 0 0;font-size:13px;">💰 Valor: <strong>${params.valor}</strong></p>
      <p style="margin:4px 0 0;font-size:13px;">🔄 Periodicidade: <strong>${params.periodicidade}</strong></p>
      <p style="margin:4px 0 0;font-size:13px;">📅 Próximo vencimento: <strong>${params.dataVencimento}</strong></p>
    </div>
    <p>Todas as funcionalidades do seu plano já estão disponíveis. Aproveite!</p>
    <div style="text-align:center;margin:24px 0;">
      <a href="https://app.boragerir.com/dashboard" class="btn">Acessar meu painel →</a>
    </div>
    <p style="color:#888;font-size:12px;">Obrigado por confiar no Bora Gerir! 🙏</p>
  `)
}
