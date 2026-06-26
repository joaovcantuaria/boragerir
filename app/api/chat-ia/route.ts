import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"

const GROQ_API_URL = "https://api.groq.com/openai/v1/chat/completions"

const SYSTEM_PROMPT = `Você é o assistente virtual do Bora Gerir, um sistema de gestão para pequenos negócios.

Responda sempre em português brasileiro, de forma direta e amigável.

Funcionalidades do sistema que você conhece:
- Dashboard: visão geral do dia, vendas, agendamentos, alertas de estoque
- Caixa: abrir/fechar caixa, sangrias, suprimentos, despesas
- Nova Venda: vender produtos e serviços, múltiplas formas de pagamento, recibo PDF
- Agendamentos: calendário, confirmar/cancelar/concluir, link público de agendamento
- Clientes: cadastro, histórico de compras, pontos de fidelidade, aniversariantes
- Produtos/Serviços: cadastro com estoque, preço, custo, comissão, duração
- Orçamentos: criar orçamentos em PDF, aprovar, converter em venda
- Funcionários: cadastro da equipe, comissões, relatório de vendas
- Financeiro: relatórios por período, formas de pagamento, despesas
- Planos: Gratuito, Básico (R$49/mês), Profissional (R$99/mês)
- Configurações: editar empresa, logo, endereço, programa de fidelidade

Regras:
- Máximo 3 parágrafos por resposta
- Use emojis com moderação
- Se não souber, sugira abrir um ticket de suporte`

// Respostas de fallback quando não tem IA configurada
const RESPOSTAS_FALLBACK: Record<string, string> = {
  caixa: "Para abrir o caixa, vá em **Caixa** no menu lateral e clique em **Abrir Caixa**. Informe o valor inicial em dinheiro e confirme. 💰\n\nPara fechar, clique em **Fechar Caixa**, informe o valor contado e confirme o fechamento do dia.",
  venda: "Para realizar uma venda, vá em **Nova Venda** no menu. Busque o cliente (opcional), adicione produtos/serviços, escolha a forma de pagamento e clique em **Finalizar Venda**. 🛒\n\nAo finalizar, você pode imprimir o recibo em PDF ou enviar por WhatsApp.",
  cliente: "Para cadastrar um cliente, vá em **Clientes** e clique em **Novo Cliente**. Preencha nome, CPF, telefone e e-mail. 👥\n\nVocê pode ver o histórico de compras e pontos de fidelidade clicando no cliente.",
  agendamento: "Para criar um agendamento, vá em **Agendamentos** e clique em **Novo Agendamento**. Selecione o cliente, serviço, funcionário, data e horário. 📅\n\nSeu link público de agendamento também fica disponível nessa tela para compartilhar com clientes.",
  produto: "Para cadastrar produtos ou serviços, vá em **Produtos/Serviços** e clique em **Novo Produto** ou **Novo Serviço**. 🛍️\n\nInforme nome, preço, custo (opcional para calcular margem), estoque mínimo e comissão do funcionário.",
  plano: "O Bora Gerir tem 3 planos:\n\n💎 **Gratuito** — 30 clientes, 3 produtos, sem funcionários\n⚡ **Básico** — R$49/mês — 200 clientes, produtos ilimitados, 3 funcionários\n👑 **Profissional** — R$99/mês — tudo ilimitado + fidelidade + lembretes",
  pdf: "Os recibos e orçamentos são gerados em PDF automaticamente. Na tela de **Nova Venda**, após finalizar, clique em **Imprimir Recibo**. 🖨️\n\nEm **Orçamentos**, abra o orçamento e clique em PDF para baixar.",
  funcionario: "Para cadastrar funcionários, vá em **Funcionários** e clique em **Novo Funcionário**. Informe nome, cargo e comissão padrão. 👤\n\nNas vendas você pode vincular o funcionário para calcular comissões automaticamente.",
  relatorio: "Os relatórios ficam em **Financeiro**. Você pode filtrar por período, ver receitas, despesas, formas de pagamento e ticket médio. 📊\n\nNos planos Básico e Profissional você tem acesso aos relatórios completos.",
  senha: "Para alterar sua senha, vá em **Configurações** → aba **Conta** → **Alterar senha**. Digite a nova senha e confirme. 🔒",
}

function respostaFallback(pergunta: string): string {
  const p = pergunta.toLowerCase()
  if (p.includes("caixa") || p.includes("abrir") || p.includes("fechar")) return RESPOSTAS_FALLBACK.caixa
  if (p.includes("venda") || p.includes("vender") || p.includes("recibo")) return RESPOSTAS_FALLBACK.venda
  if (p.includes("cliente") || p.includes("cadastrar")) return RESPOSTAS_FALLBACK.cliente
  if (p.includes("agend")) return RESPOSTAS_FALLBACK.agendamento
  if (p.includes("produto") || p.includes("servi")) return RESPOSTAS_FALLBACK.produto
  if (p.includes("plano") || p.includes("assinatura") || p.includes("preco") || p.includes("preço")) return RESPOSTAS_FALLBACK.plano
  if (p.includes("pdf") || p.includes("recibo") || p.includes("imprimir")) return RESPOSTAS_FALLBACK.pdf
  if (p.includes("funcio") || p.includes("equipe") || p.includes("comiss")) return RESPOSTAS_FALLBACK.funcionario
  if (p.includes("relat") || p.includes("financ")) return RESPOSTAS_FALLBACK.relatorio
  if (p.includes("senha") || p.includes("conta")) return RESPOSTAS_FALLBACK.senha

  return "Olá! Posso te ajudar com dúvidas sobre o **Bora Gerir**. 😊\n\nPergunte sobre: caixa, vendas, clientes, agendamentos, produtos, funcionários, relatórios, planos ou configurações.\n\nSe precisar de suporte especializado, clique em **Falar com suporte** abaixo."
}

export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ erro: "Não autenticado" }, { status: 401 })

    const { mensagem, historico = [] } = await req.json()
    if (!mensagem?.trim()) return NextResponse.json({ resposta: "Por favor, digite sua pergunta.", abrir_ticket: false })

    const groqKey = process.env.GROQ_API_KEY

    // Sem chave do Groq — usar fallback inteligente
    if (!groqKey) {
      const resposta = respostaFallback(mensagem)
      const precisaSuporte = resposta.includes("suporte especializado")
      return NextResponse.json({ resposta, abrir_ticket: precisaSuporte })
    }

    // Com chave do Groq — usar IA real
    const response = await fetch(GROQ_API_URL, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${groqKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "llama3-8b-8192",
        messages: [
          { role: "system", content: SYSTEM_PROMPT },
          ...historico.slice(-6).map((m: { role: string; content: string }) => ({
            role: m.role,
            content: m.content,
          })),
          { role: "user", content: mensagem },
        ],
        max_tokens: 400,
        temperature: 0.65,
      }),
    })

    if (!response.ok) {
      console.error("Groq error:", response.status, await response.text())
      // Fallback se Groq falhar
      const resposta = respostaFallback(mensagem)
      return NextResponse.json({ resposta, abrir_ticket: false })
    }

    const data = await response.json()
    const resposta = data.choices?.[0]?.message?.content

    if (!resposta) {
      return NextResponse.json({ resposta: respostaFallback(mensagem), abrir_ticket: false })
    }

    const precisaSuporte = /não (sei|consigo|tenho certeza)|problema técnico|contate|suporte humano/i.test(resposta)

    return NextResponse.json({ resposta, abrir_ticket: precisaSuporte })

  } catch (error) {
    console.error("Erro chat IA:", error)
    // Nunca retornar erro genérico — sempre dar uma resposta útil
    return NextResponse.json({
      resposta: "Olá! Estou com dificuldades técnicas no momento. 😔\n\nEnquanto isso, posso te ajudar com informações básicas: use o menu lateral para navegar entre Caixa, Vendas, Clientes e Agendamentos.\n\nPara suporte direto, clique abaixo.",
      abrir_ticket: true,
    })
  }
}
