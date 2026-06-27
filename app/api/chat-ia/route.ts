import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"

const GROQ_API_URL = "https://api.groq.com/openai/v1/chat/completions"

function getSystemPrompt(nomeUsuario: string, nomeEmpresa: string, planoAtual: string) {
  return `Você é a Mel, assistente virtual inteligente do **Bora Gerir** — sistema de gestão para pequenos negócios de beleza, estética e serviços.

Você está conversando com **${nomeUsuario}** da empresa **${nomeEmpresa}** (plano atual: **${planoAtual}**).

## SUA PERSONALIDADE
- Simpática, empolgada e genuinamente apaixonada por resolver problemas
- Usa o nome da pessoa para personalizar a conversa
- Emojis com moderação para dar leveza, nunca em excesso
- Direta e objetiva — nunca enrola
- Quando resolve um problema, fica feliz de verdade
- Fala português brasileiro natural, não robótico

## O QUE VOCÊ SABE SOBRE O BORA GERIR

### PLANOS (responda com TODOS os detalhes quando perguntarem)
**🆓 Plano Gratuito — R$ 0/mês**
- Até 30 clientes cadastrados
- Até 3 produtos/serviços
- Caixa (abrir/fechar, sangrias, despesas)
- Nova Venda com recibo
- Dashboard básico
- Sem agendamento online, sem funcionários, sem orçamentos, sem relatórios avançados, sem programa de fidelidade

**⚡ Plano Básico — R$ 49/mês**
- Até 200 clientes
- Produtos/serviços ilimitados
- Tudo do Gratuito +
- Agendamento online (link público para clientes agendarem sozinhos)
- Até 3 funcionários com comissão
- Orçamentos em PDF
- Relatórios financeiros básicos
- Suporte por ticket

**👑 Plano Profissional — R$ 99/mês**
- Tudo ilimitado (clientes, produtos, funcionários)
- Tudo do Básico +
- Programa de fidelidade com pontos
- Relatórios avançados com exportação
- Lembretes automáticos para clientes
- Múltiplos usuários/funcionários com acesso
- Suporte prioritário
- Relatório de comissões detalhado

### FUNCIONALIDADES DO SISTEMA
📊 **Dashboard** — visão geral do dia: vendas, agendamentos, alertas de estoque baixo, gráfico de faturamento semanal, formas de pagamento

💰 **Caixa** — abrir caixa (informar valor inicial), fechar caixa (informar valor contado, sistema calcula diferença), sangrias (retirada de dinheiro), suprimentos (entrada de dinheiro), registrar despesas

🛒 **Nova Venda** — buscar cliente (opcional), adicionar produtos/serviços por nome ou código, escolher forma de pagamento (dinheiro, PIX, crédito, débito, outro), finalizar, gerar recibo PDF ou enviar por WhatsApp, troco automático

📅 **Agendamentos** — calendário semanal e mensal, criar agendamento (cliente, serviço, funcionário, data, horário), confirmar/cancelar/remarcar, link público de agendamento para compartilhar no Instagram/WhatsApp, status: solicitado/agendado/confirmado/concluído/cancelado

👥 **Clientes** — cadastro completo (nome, CPF, telefone, e-mail, aniversário), histórico de compras, pontos de fidelidade, filtrar aniversariantes do dia/semana, buscar por nome/CPF/telefone

🛍️ **Produtos/Serviços** — cadastro com nome, código, preço de venda, custo (calcula margem automaticamente), estoque atual e mínimo (alerta quando baixo), comissão por item, duração (para serviços), categorias

📄 **Orçamentos** — criar orçamento com itens, valor total, validade, observações, gerar PDF profissional com logo da empresa, enviar por e-mail, aprovar orçamento e converter em venda com um clique

👤 **Funcionários** — cadastrar equipe com nome, cargo, comissão padrão, vincular nas vendas/agendamentos, relatório de desempenho e comissões

📈 **Financeiro** — relatório de receitas e despesas por período, formas de pagamento, ticket médio, evolução do faturamento, filtros por data

💎 **Planos** — ver plano atual, fazer upgrade, histórico de pagamentos

⚙️ **Configurações** — dados da empresa (nome, telefone, endereço, logo), programa de fidelidade (pontos por real gasto), slug do link de agendamento, alterar senha

## COMO RESPONDER
- Se perguntarem sobre planos: liste TODOS os três com preços e benefícios completos
- Se perguntarem sobre uma funcionalidade: explique passo a passo como usar
- Se a pergunta for sobre algo que o plano atual (${planoAtual}) não suporta: explique o que falta e sugira upgrade
- Se não souber algo específico: seja honesta, não invente
- Máximo 5 parágrafos por resposta
- Responda sempre em português brasileiro`
}

// Respostas de fallback por tema (quando não tem Groq)
const FALLBACKS: Record<string, string> = {
  caixa: "Claro, {nome}! 😊 Para **abrir o caixa**, vá em **Caixa** no menu e clique em **Abrir Caixa**. Informe o valor inicial e confirme!\n\nPara **fechar**, clique em **Fechar Caixa**, informe o valor contado e pronto. O sistema calcula qualquer diferença automaticamente. 💰",
  venda: "Boa pergunta, {nome}! 🛒 Acesse **Nova Venda** no menu. Busque o cliente (opcional), adicione produtos ou serviços pela busca, escolha a forma de pagamento e clique em **Finalizar Venda**.\n\nDepois você pode imprimir o recibo em PDF ou enviar direto pelo WhatsApp! 📱",
  cliente: "Para cadastrar um cliente, {nome}, vá em **Clientes** → **Novo Cliente**. 👥 Preencha nome, CPF, telefone e e-mail.\n\nVocê também pode ver o histórico de compras, total gasto e pontos de fidelidade de cada cliente clicando no nome dele na lista!",
  agendamento: "Olá, {nome}! 📅 Para criar um agendamento vá em **Agendamentos** → **Novo Agendamento**. Selecione cliente, serviço, funcionário, data e horário.\n\nVocê também tem um **link público de agendamento** na mesma tela — compartilhe no Instagram ou WhatsApp para os clientes agendarem sozinhos! 🔗",
  produto: "Para cadastrar produtos ou serviços, {nome}, vá em **Produtos/Serviços**. 🛍️ Clique em **Novo Produto** ou **Novo Serviço** e preencha nome, preço e custo (para calcular margem de lucro automaticamente).\n\nNão esqueça de definir o estoque mínimo para receber alertas quando estiver acabando!",
  plano: "Os planos do Bora Gerir são, {nome}:\n\n🆓 **Gratuito — R$ 0/mês**: até 30 clientes, 3 produtos/serviços, caixa e vendas básicas. Sem agendamento online, sem funcionários.\n\n⚡ **Básico — R$ 49/mês**: até 200 clientes, produtos ilimitados, agendamento online com link público, até 3 funcionários com comissão, orçamentos em PDF, relatórios financeiros.\n\n👑 **Profissional — R$ 99/mês**: tudo ilimitado + programa de fidelidade com pontos, lembretes automáticos para clientes, relatórios avançados com exportação, múltiplos usuários e suporte prioritário.\n\nPara fazer upgrade vá em **Planos** no menu! 🚀",
  pdf: "Para gerar recibos em PDF, {nome}, finalize uma venda normalmente e clique em **Imprimir Recibo (PDF)**. 🖨️\n\nEm **Orçamentos**, abra o orçamento desejado e clique no botão de PDF. Os documentos saem com o logo e dados da sua empresa automaticamente!",
  funcionario: "Para cadastrar sua equipe, {nome}, vá em **Funcionários** → **Novo Funcionário**. 👤 Informe nome, cargo e comissão padrão.\n\nNas vendas você vincula o funcionário e o sistema calcula a comissão automaticamente. Você também vê o relatório de desempenho de cada um!",
  financeiro: "Os relatórios ficam em **Financeiro**, {nome}! 📈 Você filtra por período, vê receitas, despesas, formas de pagamento e ticket médio.\n\nNo plano Profissional você tem acesso aos relatórios avançados com exportação. Quer saber mais sobre algum relatório específico?",
  senha: "Para alterar a senha, {nome}, vá em **Configurações** → aba **Conta** → **Alterar senha**. 🔒 Digite a nova senha, confirme e salva!\n\nSe esqueceu a senha atual, na tela de login clique em **Esqueci minha senha** para receber um link por e-mail.",
  fidelidade: "O programa de fidelidade é incrível, {nome}! ⭐ Configure em **Configurações** quantos pontos o cliente ganha por real gasto.\n\nOs pontos aparecem no perfil de cada cliente. No plano Profissional os clientes acumulam e trocam por descontos automaticamente!",
}

function respostaFallback(pergunta: string, nome: string): string {
  const p = pergunta.toLowerCase()
  let resposta = ""

  if (p.includes("caixa") || p.includes("abrir") || p.includes("fechar")) resposta = FALLBACKS.caixa
  else if (p.includes("venda") || p.includes("vender") || p.includes("recibo") || p.includes("pagamento")) resposta = FALLBACKS.venda
  else if (p.includes("cliente") || p.includes("cadastr")) resposta = FALLBACKS.cliente
  else if (p.includes("agend") || p.includes("horario") || p.includes("horário")) resposta = FALLBACKS.agendamento
  else if (p.includes("produto") || p.includes("servi") || p.includes("estoque")) resposta = FALLBACKS.produto
  else if (p.includes("plano") || p.includes("assinatura") || p.includes("preco") || p.includes("preço") || p.includes("upgrade")) resposta = FALLBACKS.plano
  else if (p.includes("pdf") || p.includes("imprimir") || p.includes("recibo")) resposta = FALLBACKS.pdf
  else if (p.includes("funcio") || p.includes("equipe") || p.includes("comiss")) resposta = FALLBACKS.funcionario
  else if (p.includes("relat") || p.includes("financ") || p.includes("receita") || p.includes("despesa")) resposta = FALLBACKS.financeiro
  else if (p.includes("senha") || p.includes("conta") || p.includes("login")) resposta = FALLBACKS.senha
  else if (p.includes("fidel") || p.includes("ponto") || p.includes("desconto")) resposta = FALLBACKS.fidelidade
  else {
    return `Oi, ${nome}! 😊 Sou a **Mel**, sua assistente do Bora Gerir!\n\nPosso te ajudar com dúvidas sobre: caixa, vendas, clientes, agendamentos, produtos, funcionários, relatórios, planos ou configurações do sistema.\n\nO que você precisa hoje?`
  }

  return resposta.replace(/{nome}/g, nome)
}

export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ erro: "Não autenticado" }, { status: 401 })

    const body = await req.json()
    const { mensagem, conversa_id, acao } = body

    // Buscar empresa e nome do usuário
    const { data: empresa } = await supabase
      .from("empresas").select("id, nome, plano").eq("user_id", user.id).single()
    if (!empresa) return NextResponse.json({ erro: "Empresa não encontrada" }, { status: 404 })

    // Nome do usuário (e-mail como fallback)
    const nomeUsuario = user.user_metadata?.nome_completo
      ?? user.email?.split("@")[0]?.replace(/[._]/g, " ")
      ?? "você"

    const nomePrimeiro = nomeUsuario.split(" ")[0]

    // ── Ação: fechar conversa ─────────────────────────────
    if (acao === "fechar_conversa" && conversa_id) {
      await supabase.from("conversas_mel")
        .update({ status: "resolvido", resolvido_por_ia: true })
        .eq("id", conversa_id)
      return NextResponse.json({ sucesso: true })
    }

    // ── Ação: buscar conversas anteriores ─────────────────
    if (acao === "listar_conversas") {
      const { data: conversas } = await supabase
        .from("conversas_mel")
        .select("id, protocolo, titulo, status, created_at, updated_at")
        .eq("empresa_id", empresa.id)
        .order("updated_at", { ascending: false })
        .limit(20)
      return NextResponse.json(conversas ?? [])
    }

    // ── Ação: buscar mensagens de uma conversa ────────────
    if (acao === "carregar_conversa" && conversa_id) {
      const { data: msgs } = await supabase
        .from("mensagens_mel")
        .select("role, conteudo, created_at")
        .eq("conversa_id", conversa_id)
        .order("created_at")
      return NextResponse.json(msgs ?? [])
    }

    // ── Nova mensagem ─────────────────────────────────────
    if (!mensagem?.trim()) return NextResponse.json({ resposta: `Oi, ${nomePrimeiro}! Como posso te ajudar? 😊` })

    // Criar ou usar conversa existente
    let conversaId = conversa_id
    let protocolo = ""

    if (!conversaId) {
      // Gerar protocolo único
      const { data: prot } = await supabase.rpc("gerar_protocolo")
      protocolo = prot ?? `MEL-${Date.now()}`

      // Criar nova conversa
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
      // Buscar protocolo da conversa existente
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

    // Buscar histórico da conversa
    const { data: historicoDB } = await supabase
      .from("mensagens_mel")
      .select("role, conteudo")
      .eq("conversa_id", conversaId)
      .order("created_at")
      .limit(12)

    const historico = (historicoDB ?? []).slice(0, -1) // excluir a última (que acabamos de inserir)

    // Gerar resposta
    let resposta = ""
    let abrirTicket = false

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
            model: "llama3-70b-8192",
            messages: [
              { role: "system", content: getSystemPrompt(nomePrimeiro, empresa.nome, empresa.plano ?? "gratuito") },
              ...historico.map((m) => ({ role: m.role, content: m.conteudo })),
              { role: "user", content: mensagem },
            ],
            max_tokens: 600,
            temperature: 0.65,
          }),
        })

        if (res.ok) {
          const data = await res.json()
          resposta = data.choices?.[0]?.message?.content ?? respostaFallback(mensagem, nomePrimeiro)
        } else {
          resposta = respostaFallback(mensagem, nomePrimeiro)
        }
      } catch {
        resposta = respostaFallback(mensagem, nomePrimeiro)
      }
    }

    // Detectar se precisa de suporte humano
    abrirTicket = /não (sei|consigo|tenho certeza)|problema técnico|bug|erro|não funciona|suporte humano|atendente/i.test(resposta)

    // Se encaminhou para suporte, atualizar status e CRIAR TICKET AUTOMÁTICO
    if (conversaId) {
      await supabase.from("mensagens_mel").insert({
        conversa_id: conversaId,
        empresa_id: empresa.id,
        role: "assistant",
        conteudo: resposta,
      })

      if (abrirTicket) {
        await supabase.from("conversas_mel")
          .update({ status: "encaminhado" })
          .eq("id", conversaId)

        // Criar ticket de suporte automaticamente
        const protoTicket = `SUP-${Date.now().toString().slice(-7)}`
        const { data: ticket } = await supabase.from("tickets_suporte").insert({
          empresa_id: empresa.id,
          assunto: `Encaminhado pela Mel — ${mensagem.slice(0, 60)}`,
          mensagem: `Conversa protocolo ${protocolo}.\n\nÚltima mensagem: "${mensagem}"\n\nA Mel não conseguiu resolver e encaminhou para suporte humano.`,
          status: "aberto",
          prioridade: "normal",
        }).select("id").single()

        if (ticket) {
          await supabase.from("conversas_mel")
            .update({ gerou_ticket: true, ticket_id: ticket.id })
            .eq("id", conversaId)
        }

        // Adicionar mensagem informando o cliente sobre o ticket
        const msgTicket = `Entendi! 😊 Abri um chamado de suporte para você com o protocolo **${protoTicket}**.\n\nAssim que um atendente humano estiver disponível, ele vai entrar em contato. Você receberá uma resposta em breve!\n\nAnote seu protocolo: **${protoTicket}**`

        await supabase.from("mensagens_mel").insert({
          conversa_id: conversaId,
          empresa_id: empresa.id,
          role: "assistant",
          conteudo: msgTicket,
        })

        return NextResponse.json({
          resposta: msgTicket,
          conversa_id: conversaId,
          protocolo,
          abrir_ticket: false, // já foi aberto automaticamente
          ticket_protocolo: protoTicket,
          nome_usuario: nomePrimeiro,
        })
      }
    }

    return NextResponse.json({
      resposta,
      conversa_id: conversaId,
      protocolo,
      abrir_ticket: abrirTicket,
      nome_usuario: nomePrimeiro,
    })

  } catch (error) {
    console.error("Erro Mel IA:", error)
    return NextResponse.json({
      resposta: "Oi! Tive um probleminha técnico aqui. 😅 Tente novamente ou abra um ticket de suporte que um atendente vai te ajudar!",
      abrir_ticket: true,
    })
  }
}
