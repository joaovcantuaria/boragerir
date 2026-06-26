// ============================================================
// Dados de demonstração — BeautyFlow
// Simula um salão de beleza chamado "Salão da Ana"
// ============================================================

import { subDays, subHours, addDays, format, startOfDay, addHours } from "date-fns"

const hoje = new Date()

export const empresaDemo = {
  id: "demo-empresa-001",
  user_id: "demo-user-001",
  nome: "Salão da Ana",
  area_atuacao: "Salão de Beleza",
  telefone: "(11) 98765-4321",
  email: "contato@salaodaana.com.br",
  logo_url: null,
  endereco_rua: "Rua das Flores",
  endereco_numero: "245",
  endereco_bairro: "Centro",
  endereco_cidade: "São Paulo",
  endereco_estado: "SP",
  endereco_cep: "01310-100",
  plano: "profissional" as const,
  plano_ativo: true,
  pontos_por_real: 1,
  pontos_para_desconto: 100,
  created_at: subDays(hoje, 90).toISOString(),
}

export const clientesDemo = [
  {
    id: "cli-001", empresa_id: "demo-empresa-001",
    nome_completo: "Maria Silva", cpf: "123.456.789-00",
    email: "maria@email.com", telefone: "(11) 99111-2222",
    data_nascimento: "1990-03-15", observacoes: "Prefere produtos naturais",
    pontos_fidelidade: 320, ativo: true,
    created_at: subDays(hoje, 60).toISOString(),
  },
  {
    id: "cli-002", empresa_id: "demo-empresa-001",
    nome_completo: "Juliana Costa", cpf: "987.654.321-00",
    email: "juliana@email.com", telefone: "(11) 99222-3333",
    data_nascimento: format(addDays(hoje, 2), "yyyy-MM-dd"), // aniversário em 2 dias
    observacoes: "Alergia a amônia",
    pontos_fidelidade: 150, ativo: true,
    created_at: subDays(hoje, 45).toISOString(),
  },
  {
    id: "cli-003", empresa_id: "demo-empresa-001",
    nome_completo: "Fernanda Oliveira", cpf: "456.789.123-00",
    email: "fernanda@email.com", telefone: "(11) 99333-4444",
    data_nascimento: "1985-11-20", observacoes: null,
    pontos_fidelidade: 80, ativo: true,
    created_at: subDays(hoje, 30).toISOString(),
  },
  {
    id: "cli-004", empresa_id: "demo-empresa-001",
    nome_completo: "Patricia Souza", cpf: "789.123.456-00",
    email: null, telefone: "(11) 99444-5555",
    data_nascimento: "1995-07-08", observacoes: "Cliente VIP",
    pontos_fidelidade: 510, ativo: true,
    created_at: subDays(hoje, 20).toISOString(),
  },
  {
    id: "cli-005", empresa_id: "demo-empresa-001",
    nome_completo: "Camila Santos", cpf: "321.654.987-00",
    email: "camila@email.com", telefone: "(11) 99555-6666",
    data_nascimento: "1992-12-25", observacoes: null,
    pontos_fidelidade: 45, ativo: true,
    created_at: subDays(hoje, 15).toISOString(),
  },
  {
    id: "cli-006", empresa_id: "demo-empresa-001",
    nome_completo: "Ana Beatriz Lima", cpf: "654.321.098-00",
    email: "ana@email.com", telefone: "(11) 99666-7777",
    data_nascimento: format(hoje, "yyyy-MM-dd"), // aniversário hoje!
    observacoes: "Aniversariante do dia",
    pontos_fidelidade: 200, ativo: true,
    created_at: subDays(hoje, 10).toISOString(),
  },
  {
    id: "cli-007", empresa_id: "demo-empresa-001",
    nome_completo: "Renata Ferreira", cpf: "111.222.333-00",
    email: null, telefone: "(11) 99777-8888",
    data_nascimento: "1988-04-30", observacoes: null,
    pontos_fidelidade: 0, ativo: true,
    created_at: subDays(hoje, 5).toISOString(),
  },
  {
    id: "cli-008", empresa_id: "demo-empresa-001",
    nome_completo: "Bruna Martins", cpf: "444.555.666-00",
    email: "bruna@email.com", telefone: "(11) 99888-9999",
    data_nascimento: "1997-09-12", observacoes: null,
    pontos_fidelidade: 95, ativo: true,
    created_at: subDays(hoje, 3).toISOString(),
  },
]

export const funcionariosDemo = [
  {
    id: "func-001", empresa_id: "demo-empresa-001",
    nome: "Ana Paula", cargo: "Cabeleireira",
    telefone: "(11) 91111-1111", email: "ana@salaodaana.com.br",
    comissao_percentual_padrao: 40, ativo: true,
    created_at: subDays(hoje, 90).toISOString(),
  },
  {
    id: "func-002", empresa_id: "demo-empresa-001",
    nome: "Larissa Melo", cargo: "Manicure",
    telefone: "(11) 92222-2222", email: null,
    comissao_percentual_padrao: 50, ativo: true,
    created_at: subDays(hoje, 60).toISOString(),
  },
  {
    id: "func-003", empresa_id: "demo-empresa-001",
    nome: "Roberto Silva", cargo: "Colorista",
    telefone: "(11) 93333-3333", email: null,
    comissao_percentual_padrao: 45, ativo: true,
    created_at: subDays(hoje, 30).toISOString(),
  },
]

export const categoriasDemo = [
  { id: "cat-001", empresa_id: "demo-empresa-001", nome: "Cabelo", tipo: "servico" as const, created_at: subDays(hoje, 90).toISOString() },
  { id: "cat-002", empresa_id: "demo-empresa-001", nome: "Unhas", tipo: "servico" as const, created_at: subDays(hoje, 90).toISOString() },
  { id: "cat-003", empresa_id: "demo-empresa-001", nome: "Estética", tipo: "servico" as const, created_at: subDays(hoje, 90).toISOString() },
  { id: "cat-004", empresa_id: "demo-empresa-001", nome: "Produtos Capilares", tipo: "produto" as const, created_at: subDays(hoje, 90).toISOString() },
]

export const produtosServicosDemo = [
  // Serviços
  {
    id: "ps-001", empresa_id: "demo-empresa-001", categoria_id: "cat-001",
    nome: "Corte Feminino", tipo: "servico" as const,
    descricao: "Corte lavagem e escova", preco: 85, custo: 15,
    estoque_atual: null, estoque_minimo: null,
    comissao_percentual: 40, duracao_minutos: 60, ativo: true,
    created_at: subDays(hoje, 90).toISOString(),
  },
  {
    id: "ps-002", empresa_id: "demo-empresa-001", categoria_id: "cat-001",
    nome: "Coloração", tipo: "servico" as const,
    descricao: "Coloração completa com tintura profissional", preco: 180, custo: 45,
    estoque_atual: null, estoque_minimo: null,
    comissao_percentual: 45, duracao_minutos: 120, ativo: true,
    created_at: subDays(hoje, 90).toISOString(),
  },
  {
    id: "ps-003", empresa_id: "demo-empresa-001", categoria_id: "cat-001",
    nome: "Escova Progressiva", tipo: "servico" as const,
    descricao: "Progressiva com formol zero", preco: 250, custo: 60,
    estoque_atual: null, estoque_minimo: null,
    comissao_percentual: 40, duracao_minutos: 180, ativo: true,
    created_at: subDays(hoje, 90).toISOString(),
  },
  {
    id: "ps-004", empresa_id: "demo-empresa-001", categoria_id: "cat-002",
    nome: "Manicure", tipo: "servico" as const,
    descricao: "Manicure com esmaltação", preco: 45, custo: 8,
    estoque_atual: null, estoque_minimo: null,
    comissao_percentual: 50, duracao_minutos: 45, ativo: true,
    created_at: subDays(hoje, 90).toISOString(),
  },
  {
    id: "ps-005", empresa_id: "demo-empresa-001", categoria_id: "cat-002",
    nome: "Pedicure", tipo: "servico" as const,
    descricao: "Pedicure completo", preco: 55, custo: 10,
    estoque_atual: null, estoque_minimo: null,
    comissao_percentual: 50, duracao_minutos: 60, ativo: true,
    created_at: subDays(hoje, 90).toISOString(),
  },
  {
    id: "ps-006", empresa_id: "demo-empresa-001", categoria_id: "cat-003",
    nome: "Sobrancelha Design", tipo: "servico" as const,
    descricao: "Design completo com henna", preco: 60, custo: 12,
    estoque_atual: null, estoque_minimo: null,
    comissao_percentual: 40, duracao_minutos: 30, ativo: true,
    created_at: subDays(hoje, 90).toISOString(),
  },
  // Produtos
  {
    id: "ps-007", empresa_id: "demo-empresa-001", categoria_id: "cat-004",
    nome: "Shampoo Profissional 300ml", tipo: "produto" as const,
    descricao: "Shampoo hidratante profissional", preco: 89, custo: 42,
    estoque_atual: 12, estoque_minimo: 5,
    comissao_percentual: null, duracao_minutos: null, ativo: true,
    created_at: subDays(hoje, 90).toISOString(),
  },
  {
    id: "ps-008", empresa_id: "demo-empresa-001", categoria_id: "cat-004",
    nome: "Máscara Capilar 500g", tipo: "produto" as const,
    descricao: "Máscara de hidratação intensa", preco: 120, custo: 55,
    estoque_atual: 3, estoque_minimo: 5, // estoque baixo!
    comissao_percentual: null, duracao_minutos: null, ativo: true,
    created_at: subDays(hoje, 90).toISOString(),
  },
  {
    id: "ps-009", empresa_id: "demo-empresa-001", categoria_id: "cat-004",
    nome: "Condicionador 300ml", tipo: "produto" as const,
    descricao: "Condicionador nutrição profunda", preco: 79, custo: 35,
    estoque_atual: 2, estoque_minimo: 5, // estoque baixo!
    comissao_percentual: null, duracao_minutos: null, ativo: true,
    created_at: subDays(hoje, 90).toISOString(),
  },
]

// Gerar vendas dos últimos 30 dias
function gerarVendasDemo() {
  const vendas = []
  let numeroVenda = 1

  const servicos = [
    { id: "ps-001", nome: "Corte Feminino", preco: 85, comissao: 40 },
    { id: "ps-002", nome: "Coloração", preco: 180, comissao: 45 },
    { id: "ps-003", nome: "Escova Progressiva", preco: 250, comissao: 40 },
    { id: "ps-004", nome: "Manicure", preco: 45, comissao: 50 },
    { id: "ps-005", nome: "Pedicure", preco: 55, comissao: 50 },
    { id: "ps-006", nome: "Sobrancelha Design", preco: 60, comissao: 40 },
  ]

  const formasPagamento = ["dinheiro", "pix", "cartao_debito", "cartao_credito", "pix", "pix"]
  const clientes = ["cli-001", "cli-002", "cli-003", "cli-004", "cli-005"]
  const funcionarios = ["func-001", "func-002", "func-003"]

  for (let dia = 29; dia >= 0; dia--) {
    const atendimentosDia = Math.floor(Math.random() * 6) + 2 // 2-7 por dia
    for (let i = 0; i < atendimentosDia; i++) {
      const servico = servicos[Math.floor(Math.random() * servicos.length)]
      const desconto = Math.random() > 0.8 ? Math.round(servico.preco * 0.1) : 0
      const dataVenda = subDays(hoje, dia)
      dataVenda.setHours(9 + Math.floor(Math.random() * 9), Math.floor(Math.random() * 60))

      vendas.push({
        id: `venda-${numeroVenda.toString().padStart(4, "0")}`,
        empresa_id: "demo-empresa-001",
        caixa_id: `caixa-dia-${dia}`,
        cliente_id: clientes[Math.floor(Math.random() * clientes.length)],
        funcionario_id: funcionarios[Math.floor(Math.random() * funcionarios.length)],
        numero_venda: numeroVenda,
        subtotal: servico.preco,
        desconto,
        total: servico.preco - desconto,
        forma_pagamento: formasPagamento[Math.floor(Math.random() * formasPagamento.length)],
        parcelas: 1,
        status: "concluida" as const,
        observacoes: null,
        created_at: dataVenda.toISOString(),
        _servico: servico, // campo auxiliar para itens
      })
      numeroVenda++
    }
  }

  return vendas
}

export const vendasDemo = gerarVendasDemo()

// Vendas de hoje
export const vendasHoje = vendasDemo.filter((v) => {
  const dataVenda = new Date(v.created_at)
  const inicioHoje = startOfDay(hoje)
  return dataVenda >= inicioHoje
})

// Agendamentos de hoje e próximos dias
export const agendamentosDemo = [
  {
    id: "ag-001", empresa_id: "demo-empresa-001",
    cliente_id: "cli-001", funcionario_id: "func-001", servico_id: "ps-001",
    data_hora: addHours(startOfDay(hoje), 9).toISOString(),
    duracao_minutos: 60, status: "concluido",
    observacoes: null, nome_cliente_avulso: null, telefone_cliente_avulso: null,
    clientes: { nome_completo: "Maria Silva", telefone: "(11) 99111-2222" },
    funcionarios: { nome: "Ana Paula" },
    produtos_servicos: { nome: "Corte Feminino" },
    created_at: subDays(hoje, 1).toISOString(),
  },
  {
    id: "ag-002", empresa_id: "demo-empresa-001",
    cliente_id: "cli-002", funcionario_id: "func-003", servico_id: "ps-002",
    data_hora: addHours(startOfDay(hoje), 10).toISOString(),
    duracao_minutos: 120, status: "confirmado",
    observacoes: "Trazer foto de referência", nome_cliente_avulso: null, telefone_cliente_avulso: null,
    clientes: { nome_completo: "Juliana Costa", telefone: "(11) 99222-3333" },
    funcionarios: { nome: "Roberto Silva" },
    produtos_servicos: { nome: "Coloração" },
    created_at: subDays(hoje, 2).toISOString(),
  },
  {
    id: "ag-003", empresa_id: "demo-empresa-001",
    cliente_id: "cli-004", funcionario_id: "func-002", servico_id: "ps-004",
    data_hora: addHours(startOfDay(hoje), 14).toISOString(),
    duracao_minutos: 45, status: "agendado",
    observacoes: null, nome_cliente_avulso: null, telefone_cliente_avulso: null,
    clientes: { nome_completo: "Patricia Souza", telefone: "(11) 99444-5555" },
    funcionarios: { nome: "Larissa Melo" },
    produtos_servicos: { nome: "Manicure" },
    created_at: subDays(hoje, 1).toISOString(),
  },
  {
    id: "ag-004", empresa_id: "demo-empresa-001",
    cliente_id: null, funcionario_id: "func-001", servico_id: "ps-006",
    data_hora: addHours(startOfDay(hoje), 15).toISOString(),
    duracao_minutos: 30, status: "agendado",
    observacoes: null, nome_cliente_avulso: "Fernanda Lima", telefone_cliente_avulso: "(11) 97777-8888",
    clientes: null,
    funcionarios: { nome: "Ana Paula" },
    produtos_servicos: { nome: "Sobrancelha Design" },
    created_at: subDays(hoje, 1).toISOString(),
  },
  {
    id: "ag-005", empresa_id: "demo-empresa-001",
    cliente_id: "cli-005", funcionario_id: "func-001", servico_id: "ps-003",
    data_hora: addHours(startOfDay(hoje), 16).toISOString(),
    duracao_minutos: 180, status: "agendado",
    observacoes: "Primeira progressiva", nome_cliente_avulso: null, telefone_cliente_avulso: null,
    clientes: { nome_completo: "Camila Santos", telefone: "(11) 99555-6666" },
    funcionarios: { nome: "Ana Paula" },
    produtos_servicos: { nome: "Escova Progressiva" },
    created_at: subDays(hoje, 1).toISOString(),
  },
  // Amanhã
  {
    id: "ag-006", empresa_id: "demo-empresa-001",
    cliente_id: "cli-006", funcionario_id: "func-002", servico_id: "ps-005",
    data_hora: addHours(addDays(startOfDay(hoje), 1), 10).toISOString(),
    duracao_minutos: 60, status: "agendado",
    observacoes: "Aniversariante — oferecer desconto", nome_cliente_avulso: null, telefone_cliente_avulso: null,
    clientes: { nome_completo: "Ana Beatriz Lima", telefone: "(11) 99666-7777" },
    funcionarios: { nome: "Larissa Melo" },
    produtos_servicos: { nome: "Pedicure" },
    created_at: subDays(hoje, 1).toISOString(),
  },
]

export const caixaAbertoDemo = {
  id: "caixa-hoje",
  empresa_id: "demo-empresa-001",
  data_abertura: startOfDay(hoje).toISOString(),
  data_fechamento: null,
  valor_abertura: 200,
  valor_fechamento: null,
  valor_esperado: null,
  diferenca: null,
  observacoes_abertura: "Abertura do dia",
  observacoes_fechamento: null,
  status: "aberto" as const,
  aberto_por: "demo-user-001",
  fechado_por: null,
  created_at: startOfDay(hoje).toISOString(),
}

export const movimentacoesDemo = [
  {
    id: "mov-001", empresa_id: "demo-empresa-001", caixa_id: "caixa-hoje",
    tipo: "entrada", categoria: "venda", descricao: "Venda #0187 - Maria Silva",
    valor: 85, venda_id: "venda-0187",
    created_at: addHours(startOfDay(hoje), 9.5).toISOString(),
  },
  {
    id: "mov-002", empresa_id: "demo-empresa-001", caixa_id: "caixa-hoje",
    tipo: "entrada", categoria: "venda", descricao: "Venda #0188 - Juliana Costa",
    valor: 180, venda_id: "venda-0188",
    created_at: addHours(startOfDay(hoje), 11).toISOString(),
  },
  {
    id: "mov-003", empresa_id: "demo-empresa-001", caixa_id: "caixa-hoje",
    tipo: "saida", categoria: "despesa", descricao: "Compra de materiais",
    valor: 120, venda_id: null,
    created_at: addHours(startOfDay(hoje), 12).toISOString(),
  },
  {
    id: "mov-004", empresa_id: "demo-empresa-001", caixa_id: "caixa-hoje",
    tipo: "entrada", categoria: "venda", descricao: "Venda #0189 - Patricia Souza",
    valor: 250, venda_id: "venda-0189",
    created_at: addHours(startOfDay(hoje), 14.5).toISOString(),
  },
]

// Calcular resumo financeiro do mês
export function calcularResumoMes() {
  const inicioMes = new Date(hoje.getFullYear(), hoje.getMonth(), 1)
  const vendasMes = vendasDemo.filter((v) => new Date(v.created_at) >= inicioMes)
  const totalReceitas = vendasMes.reduce((s, v) => s + v.total, 0)
  const totalDespesas = 1850 // fixo demo
  return {
    totalReceitas,
    totalDespesas,
    lucroLiquido: totalReceitas - totalDespesas,
    ticketMedio: vendasMes.length > 0 ? totalReceitas / vendasMes.length : 0,
    qtdVendas: vendasMes.length,
  }
}

// Vendas dos últimos 7 dias para o gráfico
export function vendasUltimos7Dias() {
  return Array.from({ length: 7 }, (_, i) => {
    const dia = subDays(hoje, 6 - i)
    const diaStr = format(dia, "yyyy-MM-dd")
    const total = vendasDemo
      .filter((v) => v.created_at.startsWith(diaStr))
      .reduce((s, v) => s + v.total, 0)
    return { dia: format(dia, "EEE", { locale: { code: "pt-BR" } }), diaStr, total }
  })
}

// Distribuição de pagamentos de hoje
export function pagamentosHoje() {
  const map: Record<string, number> = {}
  vendasHoje.forEach((v) => {
    const label = v.forma_pagamento === "cartao_credito" ? "Crédito"
      : v.forma_pagamento === "cartao_debito" ? "Débito"
      : v.forma_pagamento === "dinheiro" ? "Dinheiro"
      : v.forma_pagamento === "pix" ? "Pix" : "Outro"
    map[label] = (map[label] ?? 0) + v.total
  })
  return Object.entries(map).map(([name, value]) => ({ name, value }))
}

export const orcamentosDemo = [
  {
    id: "orc-001", empresa_id: "demo-empresa-001",
    cliente_id: "cli-003", numero_orcamento: 12,
    titulo: "Pacote Noiva Completo",
    subtotal: 580, desconto: 30, total: 550,
    validade_dias: 30, status: "pendente",
    observacoes: "Inclui penteado, maquiagem e manicure",
    created_at: subDays(hoje, 5).toISOString(),
    clientes: { nome_completo: "Fernanda Oliveira", telefone: "(11) 99333-4444" },
    itens_orcamento: [
      { id: "io-001", orcamento_id: "orc-001", empresa_id: "demo-empresa-001", produto_servico_id: "ps-001", nome_item: "Corte Feminino", quantidade: 1, preco_unitario: 85, subtotal: 85, created_at: subDays(hoje, 5).toISOString() },
      { id: "io-002", orcamento_id: "orc-001", empresa_id: "demo-empresa-001", produto_servico_id: "ps-002", nome_item: "Coloração", quantidade: 1, preco_unitario: 180, subtotal: 180, created_at: subDays(hoje, 5).toISOString() },
      { id: "io-003", orcamento_id: "orc-001", empresa_id: "demo-empresa-001", produto_servico_id: "ps-003", nome_item: "Escova Progressiva", quantidade: 1, preco_unitario: 250, subtotal: 250, created_at: subDays(hoje, 5).toISOString() },
      { id: "io-004", orcamento_id: "orc-001", empresa_id: "demo-empresa-001", produto_servico_id: "ps-006", nome_item: "Sobrancelha Design", quantidade: 1, preco_unitario: 60, subtotal: 60, created_at: subDays(hoje, 5).toISOString() },
    ],
  },
  {
    id: "orc-002", empresa_id: "demo-empresa-001",
    cliente_id: "cli-001", numero_orcamento: 13,
    titulo: "Tratamento Capilar Mensal",
    subtotal: 265, desconto: 0, total: 265,
    validade_dias: 15, status: "aprovado",
    observacoes: null,
    created_at: subDays(hoje, 10).toISOString(),
    clientes: { nome_completo: "Maria Silva", telefone: "(11) 99111-2222" },
    itens_orcamento: [
      { id: "io-005", orcamento_id: "orc-002", empresa_id: "demo-empresa-001", produto_servico_id: "ps-001", nome_item: "Corte Feminino", quantidade: 1, preco_unitario: 85, subtotal: 85, created_at: subDays(hoje, 10).toISOString() },
      { id: "io-006", orcamento_id: "orc-002", empresa_id: "demo-empresa-001", produto_servico_id: "ps-007", nome_item: "Shampoo Profissional", quantidade: 2, preco_unitario: 89, subtotal: 178, created_at: subDays(hoje, 10).toISOString() },
    ],
  },
  {
    id: "orc-003", empresa_id: "demo-empresa-001",
    cliente_id: "cli-005", numero_orcamento: 14,
    titulo: "Manicure e Pedicure",
    subtotal: 100, desconto: 0, total: 100,
    validade_dias: 7, status: "expirado",
    observacoes: null,
    created_at: subDays(hoje, 15).toISOString(),
    clientes: { nome_completo: "Camila Santos", telefone: "(11) 99555-6666" },
    itens_orcamento: [],
  },
]
