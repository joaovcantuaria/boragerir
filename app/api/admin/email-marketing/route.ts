import { NextRequest, NextResponse } from "next/server"
import { createAdminClient } from "@/lib/supabase/admin"
import { createClient } from "@/lib/supabase/server"
import { enviarEmail, templateBase } from "@/lib/email/brevo"

// Templates HTML para cada tipo de disparo
function gerarHtmlTemplate(template: string, dados: Record<string, string>, nome: string): string {
  switch (template) {
    case "promocao":
      return templateBase(`
        <h2>🔥 Promoção Especial!</h2>
        <p>Olá, ${nome}!</p>
        <p>${dados.mensagem || ""}</p>
        <div style="background:#fff8f5;border:2px solid #F26E1D;border-radius:12px;padding:20px;text-align:center;margin:20px 0;">
          <p style="font-size:32px;font-weight:900;color:#F26E1D;margin:0;">${dados.desconto || "0"}% OFF</p>
          <p style="color:#666;margin:4px 0 0;">${dados.detalhe || ""}</p>
        </div>
        <a href="https://app.boragerir.com/planos" class="btn">Aproveitar agora →</a>
      `)

    case "cupom":
      return templateBase(`
        <h2>🎫 Cupom Exclusivo!</h2>
        <p>Olá, ${nome}!</p>
        <p>${dados.mensagem || ""}</p>
        <div style="background:#f0fdf4;border:2px dashed #22c55e;border-radius:12px;padding:20px;text-align:center;margin:20px 0;">
          <p style="color:#666;font-size:12px;margin:0;">Seu código:</p>
          <p style="font-size:28px;font-weight:900;color:#16a34a;letter-spacing:4px;margin:8px 0;">${dados.codigo_cupom || ""}</p>
          <p style="color:#666;font-size:12px;margin:4px 0 0;">Válido até ${dados.validade || ""}</p>
        </div>
        <a href="https://app.boragerir.com/planos" class="btn">Usar cupom →</a>
      `)

    case "novidade":
      return templateBase(`
        <h2>🚀 Novidade no Bora Gerir!</h2>
        <p>Olá, ${nome}!</p>
        <p>${dados.mensagem || ""}</p>
        <a href="https://app.boragerir.com/dashboard" class="btn">Conferir agora →</a>
      `)

    case "vencimento":
      return templateBase(`
        <h2>⚠️ Sua assinatura está vencendo</h2>
        <p>Olá, ${nome}!</p>
        <p>Sua assinatura do plano ${dados.plano || ""} vence em breve. Renove para continuar com acesso completo.</p>
        <a href="https://app.boragerir.com/planos" class="btn">Renovar agora →</a>
      `)

    case "boas-vindas":
      return templateBase(`
        <h2>👋 Bem-vindo(a) ao Bora Gerir!</h2>
        <p>Olá, ${nome}!</p>
        <p>${dados.mensagem || ""}</p>
        <a href="https://app.boragerir.com/dashboard" class="btn">Acessar seu painel →</a>
      `)

    case "upgrade":
      return templateBase(`
        <h2>⭐ Hora de crescer!</h2>
        <p>Olá, ${nome}!</p>
        <p>${dados.mensagem || ""}</p>
        <a href="https://app.boragerir.com/planos" class="btn">Ver planos →</a>
      `)

    case "livre":
      return templateBase(`
        <p>Olá, ${nome}!</p>
        <p>${dados.mensagem || ""}</p>
      `)

    default:
      return templateBase(`<p>Olá, ${nome}!</p><p>${dados.mensagem || ""}</p>`)
  }
}

// Delay helper
function delay(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

export async function POST(req: NextRequest) {
  // Auth check
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (user?.email?.toLowerCase() !== "contato@boragerir.com") {
    return NextResponse.json({ erro: "Não autorizado" }, { status: 403 })
  }

  const body = await req.json()
  const { template, assunto, destinatarios, dados_template } = body as {
    template: string
    assunto: string
    destinatarios: { email: string; nome: string }[]
    dados_template: Record<string, string>
  }

  if (!template || !assunto || !destinatarios?.length) {
    return NextResponse.json({ erro: "Dados incompletos" }, { status: 400 })
  }

  let enviados = 0
  let erros = 0
  const BATCH_SIZE = 10
  const BATCH_DELAY = 1500 // 1.5s entre batches

  // Enviar em batches de 10
  for (let i = 0; i < destinatarios.length; i += BATCH_SIZE) {
    const batch = destinatarios.slice(i, i + BATCH_SIZE)

    const resultados = await Promise.all(
      batch.map(async (dest) => {
        const html = gerarHtmlTemplate(template, dados_template || {}, dest.nome || "")
        const resultado = await enviarEmail({
          para: { email: dest.email, nome: dest.nome },
          assunto,
          html,
        })
        return resultado.sucesso
      })
    )

    resultados.forEach((sucesso) => {
      if (sucesso) enviados++
      else erros++
    })

    // Delay entre batches (exceto no último)
    if (i + BATCH_SIZE < destinatarios.length) {
      await delay(BATCH_DELAY)
    }
  }

  return NextResponse.json({
    sucesso: true,
    enviados,
    erros,
    total: destinatarios.length,
  })
}
