import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"

const GROQ_API_URL = "https://api.groq.com/openai/v1/chat/completions"

// ─── Contexto dinâmico da empresa para enriquecer as respostas ────────────────
interface ContextoEmpresa {
  nome: string
  plano: string
  totalClientes: number
  totalProdutos: number
  caixaAberto: boolean
  agendamentosHoje: number
  vendasHoje: number
}

function getSystemPrompt(nomeUsuario: string, ctx: ContextoEmpresa) {
  const hoje = new Date().toLocaleDateString("pt-BR", { weekday: "long", day: "numeric", month: "long" })

  return `Você é a **Mel**, assistente pessoal inteligente do **Bora Gerir**.
Você não é um chatbot. Você é uma pessoa real chamada Mel, que trabalha na equipe do Bora Gerir e conhece o sistema por dentro.

## QUEM VOCÊ ESTÁ ATENDENDO
- Nome: **${nomeUsuario}**
- Empresa: **${ctx.nome}**
- Plano atual: **${ctx.plano}**
- Hoje é ${hoje}
- Status atual da conta: ${ctx.totalClientes} clientes cadastrados, ${ctx.totalProdutos} produtos/serviços, caixa ${ctx.caixaAberto ? "✅ aberto" : "🔴 fechado"}, ${ctx.agendamentosHoje} agendamento(s) hoje, ${ctx.vendasHoje} venda(s) hoje

## COMO VOCÊ SE COMPORTA
- Você conversa como uma pessoa real, com naturalidade. Não como robô.
- Você ouve o problema com atenção, faz perguntas de acompanhamento quando necessário, e só encerra quando tiver certeza que resolveu.
- Você usa o nome de ${nomeUsuario} ocasionalmente para deixar a conversa mais pessoal.
- Você usa emojis com moderação — só quando faz sentido emocional, não em cada frase.
- Quando não sabe algo, você admite honestamente e sugere o que pode fazer.
- Quando o problema está além do que você pode resolver, você PROATIVAMENTE sugere abrir um ticket de suporte humano — não espera ser perguntada.
- Você acompanha o raciocínio da conversa anterior e não repete coisas já ditas.
- Resposta máxima: 5 parágrafos curtos. Prefira respostas focadas a respostas longas.

## O QUE VOCÊ PODE FAZER (AÇÕES REAIS)
Quando o usuário pedir, você pode orientar ações específicas no sistema:
- Verificar se o caixa está aberto/fechado (você já sabe: ${ctx.caixaAberto ? "aberto" : "fechado"})
- Informar quantos clientes, produtos e agendamentos existem
- Guiar passo a passo qualquer funcionalidade

## CONHECIMENTO COMPLETO DO SISTEMA

### PLANOS
**🆓 Gratuito — R$ 0/mês**
Até 30 clientes, até 3 produtos/serviços, caixa básico, nova venda com recibo. NÃO inclui: agendamento online, funcionários, orçamentos, relatórios avançados, fidelidade.

**⚡ Básico — R$ 49/mês**
Até 200 clientes, produtos ilimitados, agendamento online com link público para clientes agendarem sozinhos, até 3 funcionários com comissão, orçamentos em PDF, relatórios financeiros, suporte por ticket.

**👑 Profissional — R$ 99/mês**
Tudo ilimitado (clientes, produtos, funcionários). Inclui tudo do Básico + programa de fidelidade com pontos, lembretes automáticos, relatórios avançados com exportação, múltiplos usuários, suporte prioritário.

### FUNCIONALIDADES — PASSO A PASSO

**CAIXA**
- Abrir: menu Caixa → botão "Abrir Caixa" → informar valor inicial → confirmar
- Fechar: menu Caixa → "Fechar Caixa" → informar valor contado → sistema calcula diferença
- Sangria (retirar dinheiro): Caixa → "Sangria" → valor e motivo
- Suprimento (colocar dinheiro): Caixa → "Suprimento" → valor
- Despesa: Caixa → "Nova Despesa" → categoria, valor, descrição

**NOVA VENDA**
- Menu Nova Venda → buscar cliente (opcional) → adicionar produtos/serviços pelo nome ou código → escolher forma de pagamento (dinheiro calcula troco, PIX, crédito, débito) → Finalizar Venda → gerar recibo PDF ou enviar WhatsApp

**AGENDAMENTOS**
- Criar: Agendamentos → "Novo Agendamento" → cliente, serviço, funcionário (opcional), data, horário → salvar
- Link público: Agendamentos → copiar o link → compartilhar no Instagram/WhatsApp para clientes agendarem sozinhos
- Status disponíveis: Solicitado → Agendado → Confirmado → Concluído / Cancelado / Faltou

**CLIENTES**
- Cadastrar: Clientes → "Novo Cliente" → nome, CPF, telefone, e-mail, data nascimento
- Ver histórico: clicar no cliente → aba histórico de compras
- Pontos de fidelidade: aparecem no perfil de cada cliente (plano Profissional)
- Aniversariantes: filtro no topo da lista de clientes

**PRODUTOS E SERVIÇOS**
- Cadastrar: Produtos/Serviços → "Novo Produto" ou "Novo Serviço" → nome, preço, custo (calcula margem), estoque, comissão
- Criar categoria inline: no modal de cadastro, clique no "+" ao lado do campo Categoria
- Alerta de estoque: quando estoque atual ≤ estoque mínimo, aparece alerta no dashboard

**ORÇAMENTOS**
- Criar: Orçamentos → "Novo Orçamento" → adicionar cliente, itens, validade → salvar
- Gerar PDF: abrir orçamento → botão PDF (sai com logo da empresa)
- Converter em venda: botão "Converter em Venda" no orçamento aprovado

**FUNCIONÁRIOS**
- Cadastrar: Funcionários → "Novo Funcionário" → nome, cargo, comissão %
- Vincular nas vendas/agendamentos para calcular comissão automaticamente
- Relatório de comissões: menu Financeiro → filtrar por funcionário

**FINANCEIRO**
- Receitas e despesas por período, ticket médio, formas de pagamento, evolução de faturamento
- Filtrar por data, categoria, funcionário
- Exportar relatórios (plano Profissional)

**CONFIGURAÇÕES**
- Dados da empresa: nome, telefone, endereço, logo
- Programa de fidelidade: pontos por real gasto, resgate mínimo
- Slug do agendamento: personalizar o link público (ex: boragerir.com/agendar/seu-nome)
- Alterar senha: Configurações → aba Conta

## QUANDO ESCALAR PARA SUPORTE HUMANO
Se após 2 tentativas você não conseguir resolver, ou se o problema for:
- Bug técnico, erro no sistema, dados sumidos
- Problema de pagamento ou cobrança
- Algo que exige acesso ao banco de dados ou configuração avançada

Então diga algo como: "Olha ${nomeUsuario}, esse problema está além do que consigo resolver por aqui. Vou te ajudar a abrir um chamado de suporte para que um colega da equipe técnica possa resolver isso com mais cuidado. Pode ser?"

Depois instrua: "Vai em **Suporte** no menu lateral → **Abrir ticket** → descreva o problema → enviar. Nossa equipe responde em até 24h nos dias úteis."

## ENCERRAMENTO DO ATENDIMENTO
Quando você resolver o problema do cliente ou responder a dúvida completamente, SEMPRE termine sua resposta com algo como:
- "Consegui te ajudar com isso? Se tiver mais alguma dúvida é só falar! 😊"
- "Resolveu o que precisava? Posso te ajudar com mais alguma coisa?"
- "Ficou claro? Se precisar de mais alguma coisa, estou aqui!"

Quando o cliente responder que está tudo certo, que é só isso, ou se despedir, encerre de forma calorosa e natural.

## IMPORTANTE
- NUNCA diga que é um bot ou IA para o usuário final. Você é a Mel, da equipe do Bora Gerir.
- NUNCA invente funcionalidades que não existem.
- Se o plano atual não suporta algo, explique com cuidado e sugira o upgrade sem pressionar.`
}

// ─── Fallback quando não tem Groq ─────────────────────────────────────────────
function respostaFallback(pergunta: string, nome: string): string {
  const p = pergunta.toLowerCase()

  if (p.includes("plano") || p.includes("assinatura") || p.includes("preço") || p.includes("upgrade") || p.includes("beneficio") || p.includes("diferença") || p.includes("sentido") || p.includes("escolher") || p.includes("melhor"))
    return `Oi, ${nome}! A escolha certa depende muito do seu negócio. Me conta: você tem funcionários? Precisa que seus clientes agendem pelo celular sem precisar te chamar? Tem muitos clientes cadastrados?\n\nCom essas informações consigo te indicar o plano que faz mais sentido sem que você pague por algo que não vai usar. 😊`
  if (p.includes("caixa") || p.includes("abrir") || p.includes("fechar"))
    return `Claro, ${nome}! Para **abrir o caixa**, vá em **Caixa** no menu e clique em **Abrir Caixa**. Informe o valor inicial e confirme! Para **fechar**, clique em **Fechar Caixa**, informe o valor contado e o sistema calcula qualquer diferença. 💰`
  if (p.includes("venda") || p.includes("vender") || p.includes("recibo"))
    return `Para registrar uma venda, ${nome}, acesse **Nova Venda** no menu. Busque o cliente (opcional), adicione produtos ou serviços, escolha a forma de pagamento e finalize. Depois você pode gerar recibo em PDF ou enviar pelo WhatsApp! 🛒`
  if (p.includes("agend") || p.includes("horario"))
    return `Para criar um agendamento, ${nome}, vá em **Agendamentos** → **Novo Agendamento**. Selecione cliente, serviço, funcionário, data e horário. Você também tem um **link público** para compartilhar e os clientes agendarem sozinhos! 📅`
  if (p.includes("cliente") || p.includes("cadastr"))
    return `Para cadastrar um cliente, ${nome}, vá em **Clientes** → **Novo Cliente**. Preencha nome, CPF, telefone e e-mail. Você também pode ver o histórico de compras e pontos de fidelidade de cada cliente! 👥`

  return `Oi, ${nome}! 😊 Sou a **Mel**, da equipe do Bora Gerir! Posso te ajudar com dúvidas sobre caixa, vendas, clientes, agendamentos, produtos, funcionários, relatórios ou planos. O que você precisa?`
}

// ─── Handler principal ────────────────────────────────────────────────────────
export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ erro: "Não autenticado" }, { status: 401 })

    const body = await req.json()
    const { mensagem, conversa_id, acao } = body

    // Buscar empresa com plano
    const { data: empresa } = await supabase
      .from("empresas").select("id, nome, plano").eq("user_id", user.id).single()
    if (!empresa) return NextResponse.json({ erro: "Empresa não encontrada" }, { status: 404 })

    const nomeUsuario = user.user_metadata?.nome_completo
      ?? user.email?.split("@")[0]?.replace(/[._]/g, " ")
      ?? "você"
    const nomePrimeiro = nomeUsuario.split(" ")[0]

    // ── Ações especiais ───────────────────────────────────
    if (acao === "fechar_conversa" && conversa_id) {
      await supabase.from("conversas_mel")
        .update({ status: "resolvido", resolvido_por_ia: true })
        .eq("id", conversa_id)
      return NextResponse.json({ sucesso: true })
    }

    if (acao === "listar_conversas") {
      const { data: conversas } = await supabase
        .from("conversas_mel")
        .select("id, protocolo, titulo, status, created_at, updated_at")
        .eq("empresa_id", empresa.id)
        .order("updated_at", { ascending: false })
        .limit(20)
      return NextResponse.json(conversas ?? [])
    }

    if (acao === "carregar_conversa" && conversa_id) {
      const { data: msgs } = await supabase
        .from("mensagens_mel")
        .select("role, conteudo, created_at")
        .eq("conversa_id", conversa_id)
        .order("created_at")
      return NextResponse.json(msgs ?? [])
    }

    if (!mensagem?.trim()) return NextResponse.json({ resposta: `Oi, ${nomePrimeiro}! Como posso te ajudar? 😊` })

    // ── Buscar contexto real da empresa ───────────────────
    const hoje = new Date()
    const inicioDia = new Date(hoje.getFullYear(), hoje.getMonth(), hoje.getDate()).toISOString()
    const fimDia = new Date(hoje.getFullYear(), hoje.getMonth(), hoje.getDate(), 23, 59, 59).toISOString()

    const [
      { count: totalClientes },
      { count: totalProdutos },
      { data: caixaAberto },
      { count: agendamentosHoje },
      { count: vendasHoje },
    ] = await Promise.all([
      supabase.from("clientes").select("*", { count: "exact", head: true }).eq("empresa_id", empresa.id).eq("ativo", true),
      supabase.from("produtos_servicos").select("*", { count: "exact", head: true }).eq("empresa_id", empresa.id).eq("ativo", true),
      supabase.from("caixas").select("id").eq("empresa_id", empresa.id).eq("status", "aberto").maybeSingle(),
      supabase.from("agendamentos").select("*", { count: "exact", head: true }).eq("empresa_id", empresa.id).gte("data_hora", inicioDia).lte("data_hora", fimDia),
      supabase.from("vendas").select("*", { count: "exact", head: true }).eq("empresa_id", empresa.id).eq("status", "concluida").gte("created_at", inicioDia).lte("created_at", fimDia),
    ])

    const ctx: ContextoEmpresa = {
      nome: empresa.nome,
      plano: empresa.plano ?? "gratuito",
      totalClientes: totalClientes ?? 0,
      totalProdutos: totalProdutos ?? 0,
      caixaAberto: !!caixaAberto,
      agendamentosHoje: agendamentosHoje ?? 0,
      vendasHoje: vendasHoje ?? 0,
    }

    // ── Criar ou continuar conversa ───────────────────────
    let conversaId = conversa_id
    let protocolo = ""

    if (!conversaId) {
      const { data: prot } = await supabase.rpc("gerar_protocolo")
      protocolo = prot ?? `MEL-${Date.now()}`

      const { data: novaConversa } = await supabase
        .from("conversas_mel")
        .insert({
          empresa_id: empresa.id,
          protocolo,
          titulo: mensagem.slice(0, 60) + (mensagem.length > 60 ? "..." : ""),
          nome_usuario: nomePrimeiro,
          status: "aberto",
        })
        .select("id, protocolo")
        .single()

      conversaId = novaConversa?.id
      protocolo = novaConversa?.protocolo ?? protocolo
    } else {
      const { data: conv } = await supabase
        .from("conversas_mel").select("protocolo").eq("id", conversaId).single()
      protocolo = conv?.protocolo ?? ""
    }

    // Salvar mensagem do usuário
    if (conversaId) {
      await supabase.from("mensagens_mel").insert({
        conversa_id: conversaId,
        empresa_id: empresa.id,
        role: "user",
        conteudo: mensagem,
      })
    }

    // Buscar histórico completo da conversa (últimas 20 mensagens para contexto)
    const { data: historicoDB } = await supabase
      .from("mensagens_mel")
      .select("role, conteudo")
      .eq("conversa_id", conversaId)
      .order("created_at")
      .limit(20)

    // Excluir a última mensagem (que acabamos de inserir)
    const historico = (historicoDB ?? []).slice(0, -1)

    // ── Gerar resposta via Groq ───────────────────────────
    let resposta = ""
    const groqKey = process.env.GROQ_API_KEY

    if (!groqKey) {
      resposta = respostaFallback(mensagem, nomePrimeiro)
    } else {
      try {
        const res = await fetch(GROQ_API_URL, {
          method: "POST",
          headers: {
            "Authorization": `Bearer ${groqKey}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            model: "llama-3.3-70b-versatile",
            messages: [
              { role: "system", content: getSystemPrompt(nomePrimeiro, ctx) },
              ...historico.map((m) => ({ role: m.role, content: m.conteudo })),
              { role: "user", content: mensagem },
            ],
            max_tokens: 700,
            temperature: 0.7,
          }),
        })

        if (res.ok) {
          const data = await res.json()
          resposta = data.choices?.[0]?.message?.content?.trim() ?? respostaFallback(mensagem, nomePrimeiro)
        } else {
          const erroTexto = await res.text()
          console.error(`Groq erro ${res.status}:`, erroTexto)
          // Fallback para modelo menor se 70b indisponível
          try {
            const res2 = await fetch(GROQ_API_URL, {
              method: "POST",
              headers: { "Authorization": `Bearer ${groqKey}`, "Content-Type": "application/json" },
              body: JSON.stringify({
                model: "llama3-8b-8192",
                messages: [
                  { role: "system", content: getSystemPrompt(nomePrimeiro, ctx) },
                  ...historico.map((m) => ({ role: m.role, content: m.conteudo })),
                  { role: "user", content: mensagem },
                ],
                max_tokens: 700,
                temperature: 0.7,
              }),
            })
            if (res2.ok) {
              const data2 = await res2.json()
              resposta = data2.choices?.[0]?.message?.content?.trim() ?? respostaFallback(mensagem, nomePrimeiro)
            } else {
              resposta = respostaFallback(mensagem, nomePrimeiro)
            }
          } catch {
            resposta = respostaFallback(mensagem, nomePrimeiro)
          }
        }
      } catch (err) {
        console.error("Groq exception:", err)
        resposta = respostaFallback(mensagem, nomePrimeiro)
      }
    }

    // Detectar se a própria Mel sugeriu escalar para suporte
    const sugerindoTicket = /abrir.*ticket|chamado de suporte|equipe técnica|suporte.*menu|vá em.*suporte/i.test(resposta)

    // Detectar se o cliente está encerrando (respostas de despedida/satisfação)
    const clienteEncerrando = /^(é só isso|só isso|obrigad|valeu|tudo (bem|certo|resolvido)|era (só isso|isso mesmo)|pode encerrar|tchau|até|não preciso|não, obrigad|nada mais)/i.test(mensagem.trim())

    // Se cliente está encerrando, adiciona mensagem de encerramento à resposta
    let encerrado = false
    if (clienteEncerrando && conversaId) {
      resposta = `Fico feliz em ter ajudado! 😊 Se precisar de qualquer coisa, é só me chamar. Até a próxima, ${nomePrimeiro}!\n\n_Atendimento encerrado._`
      encerrado = true
    }

    // Salvar resposta da Mel
    if (conversaId) {
      await supabase.from("mensagens_mel").insert({
        conversa_id: conversaId,
        empresa_id: empresa.id,
        role: "assistant",
        conteudo: resposta,
      })

      // Encerrar conversa se cliente despediu
      if (encerrado) {
        await supabase.from("conversas_mel")
          .update({ status: "resolvido", resolvido_por_ia: true })
          .eq("id", conversaId)
      }

      // Se sugeriu ticket, criar automaticamente e marcar conversa
      if (sugerindoTicket) {
        await supabase.from("conversas_mel")
          .update({ status: "encaminhado" })
          .eq("id", conversaId)

        const { data: ticket } = await supabase.from("tickets_suporte").insert({
          empresa_id: empresa.id,
          assunto: `Encaminhado pela Mel — ${mensagem.slice(0, 60)}`,
          mensagem: `Protocolo Mel: ${protocolo}\n\nProblema relatado: "${mensagem}"\n\nA Mel não conseguiu resolver e encaminhou para suporte humano.`,
          status: "aberto",
          prioridade: "normal",
        }).select("id").single()

        if (ticket) {
          await supabase.from("conversas_mel")
            .update({ gerou_ticket: true, ticket_id: ticket.id })
            .eq("id", conversaId)
        }
      }
    }

    return NextResponse.json({
      resposta,
      conversa_id: conversaId,
      protocolo,
      abrir_ticket: sugerindoTicket,
      encerrado,
      nome_usuario: nomePrimeiro,
    })

  } catch (error) {
    console.error("Erro Mel IA:", error)
    return NextResponse.json({
      resposta: "Oi! Tive um probleminha técnico aqui. Tenta novamente em alguns segundos, tá? Se persistir, vai em **Suporte** no menu e abre um ticket que a gente resolve! 😊",
      abrir_ticket: false,
    })
  }
}
