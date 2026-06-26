import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"

const GROQ_API_URL = "https://api.groq.com/openai/v1/chat/completions"

const SYSTEM_PROMPT = `Você é o Assistente do Bora Gerir, um sistema de gestão para pequenos negócios como salões de beleza, barbearias, estúdios de estética e outros prestadores de serviços.

Seu papel é ajudar os usuários a usar o sistema de forma eficiente. Você conhece todas as funcionalidades:

📊 **Dashboard** — Visão geral do dia: vendas, atendimentos, agendamentos, alertas de estoque.
💰 **Caixa** — Abrir/fechar caixa, registrar sangrias, suprimentos e despesas.
🛒 **Nova Venda** — Realizar vendas rápidas, selecionar produtos/serviços, formas de pagamento.
📅 **Agendamentos** — Calendário de agendamentos, confirmar, concluir ou cancelar.
👥 **Clientes** — Cadastrar clientes, ver histórico, pontos de fidelidade, aniversariantes.
🛍️ **Produtos/Serviços** — Cadastrar produtos com estoque e serviços com duração e comissão.
📄 **Orçamentos** — Criar orçamentos profissionais com PDF, aprovar ou recusar.
👤 **Funcionários** — Cadastrar equipe, definir comissões, ver relatório de vendas.
📈 **Financeiro** — Relatórios de receita, despesas, formas de pagamento por período.
💎 **Planos** — Gerir assinatura: Gratuito, Básico (R$49/mês) ou Profissional (R$99/mês).
⚙️ **Configurações** — Editar dados da empresa, logo, endereço, programa de fidelidade, senha.

**Regras:**
- Responda sempre em português do Brasil
- Seja direto, amigável e prático
- Se não souber responder algo específico do negócio do usuário, sugira abrir um ticket de suporte
- Máximo 3 parágrafos por resposta
- Use emojis com moderação para tornar a leitura mais agradável`

export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ erro: "Não autenticado" }, { status: 401 })

    const { mensagem, historico = [] } = await req.json()

    const groqKey = process.env.GROQ_API_KEY
    if (!groqKey) {
      // Fallback sem IA — resposta padrão
      return NextResponse.json({
        resposta: "Olá! Sou o assistente do Bora Gerir. No momento estou em manutenção. Para suporte imediato, abra um ticket clicando em 'Falar com suporte' abaixo.",
        abrir_ticket: true,
      })
    }

    const mensagens = [
      { role: "system", content: SYSTEM_PROMPT },
      ...historico.slice(-8), // últimas 8 mensagens para contexto
      { role: "user", content: mensagem },
    ]

    const response = await fetch(GROQ_API_URL, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${groqKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "llama3-8b-8192",
        messages: mensagens,
        max_tokens: 512,
        temperature: 0.7,
      }),
    })

    if (!response.ok) {
      const err = await response.text()
      console.error("Groq error:", err)
      return NextResponse.json({
        resposta: "Desculpe, não consegui processar sua pergunta agora. Tente novamente ou abra um ticket de suporte.",
        abrir_ticket: true,
      })
    }

    const data = await response.json()
    const resposta = data.choices?.[0]?.message?.content ?? "Não entendi sua pergunta. Pode reformular?"

    // Detectar se precisa de suporte humano
    const precisaSuporte = /não consigo|não sei|não tenho certeza|contate|suporte|atendente|problema técnico/i.test(resposta)

    // Salvar histórico no banco (opcional)
    try {
      const { data: empresa } = await supabase
        .from("empresas").select("id").eq("user_id", user.id).single()
      if (empresa) {
        await supabase.from("chat_ia").insert([
          { empresa_id: empresa.id, role: "user", conteudo: mensagem },
          { empresa_id: empresa.id, role: "assistant", conteudo: resposta },
        ])
      }
    } catch {}

    return NextResponse.json({ resposta, abrir_ticket: precisaSuporte })

  } catch (error) {
    console.error("Erro chat IA:", error)
    return NextResponse.json({
      resposta: "Ocorreu um erro inesperado. Por favor, tente novamente ou abra um ticket de suporte.",
      abrir_ticket: true,
    })
  }
}
