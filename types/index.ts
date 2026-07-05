import type { Database } from "./database"

// Tipos derivados das tabelas do banco
export type Empresa = Database["public"]["Tables"]["empresas"]["Row"]
export type Cliente = Database["public"]["Tables"]["clientes"]["Row"]
export type Categoria = Database["public"]["Tables"]["categorias"]["Row"]
export type ProdutoServico = Database["public"]["Tables"]["produtos_servicos"]["Row"]
export type Funcionario = Database["public"]["Tables"]["funcionarios"]["Row"]
export type Caixa = Database["public"]["Tables"]["caixas"]["Row"]
export type Venda = Database["public"]["Tables"]["vendas"]["Row"]
export type ItemVenda = Database["public"]["Tables"]["itens_venda"]["Row"]
export type Orcamento = Database["public"]["Tables"]["orcamentos"]["Row"]
export type ItemOrcamento = Database["public"]["Tables"]["itens_orcamento"]["Row"]
export type Agendamento = Database["public"]["Tables"]["agendamentos"]["Row"]
export type MovimentacaoCaixa = Database["public"]["Tables"]["movimentacoes_caixa"]["Row"]

// Tipos de inserção
export type NovaEmpresa = Database["public"]["Tables"]["empresas"]["Insert"]
export type NovoCliente = Database["public"]["Tables"]["clientes"]["Insert"]
export type NovaCategoria = Database["public"]["Tables"]["categorias"]["Insert"]
export type NovoProdutoServico = Database["public"]["Tables"]["produtos_servicos"]["Insert"]
export type NovoFuncionario = Database["public"]["Tables"]["funcionarios"]["Insert"]
export type NovoCaixa = Database["public"]["Tables"]["caixas"]["Insert"]
export type NovaVenda = Database["public"]["Tables"]["vendas"]["Insert"]
export type NovoItemVenda = Database["public"]["Tables"]["itens_venda"]["Insert"]
export type NovoOrcamento = Database["public"]["Tables"]["orcamentos"]["Insert"]
export type NovoItemOrcamento = Database["public"]["Tables"]["itens_orcamento"]["Insert"]
export type NovoAgendamento = Database["public"]["Tables"]["agendamentos"]["Insert"]
export type NovaMovimentacaoCaixa = Database["public"]["Tables"]["movimentacoes_caixa"]["Insert"]

// Tipos extendidos (com joins)
export type VendaComItens = Venda & {
  itens: ItemVenda[]
  cliente?: Cliente | null
  funcionario?: Funcionario | null
}

export type OrcamentoComItens = Orcamento & {
  itens: ItemOrcamento[]
  cliente?: Cliente | null
}

export type AgendamentoCompleto = Agendamento & {
  cliente?: Cliente | null
  funcionario?: Funcionario | null
  servico?: ProdutoServico | null
}

export type CaixaComMovimentacoes = Caixa & {
  movimentacoes: MovimentacaoCaixa[]
}

export type ClienteComHistorico = Cliente & {
  vendas?: VendaComItens[]
  agendamentos?: AgendamentoCompleto[]
  totalGasto?: number
}

export type ItemVendaForm = {
  produto_servico_id: string
  nome_item: string
  quantidade: number
  preco_unitario: number
  comissao_percentual?: number
  subtotal: number
}

// Planos
export type Plano = "gratuito" | "basico" | "profissional" | "agenda" | "gestao"

// Plano "agenda" — módulo simplificado de agendamento online
// Acesso restrito a: /agendamentos e /configuracoes
export const PLANO_AGENDA_ROTAS = ["/agendamentos", "/configuracoes"]

// Plano "gestao" — gestão financeira simplificada
// Acesso restrito a: /dashboard, /caixa, /financeiro e /configuracoes
export const PLANO_GESTAO_ROTAS = ["/dashboard", "/caixa", "/financeiro", "/configuracoes"]

export type InfoPlano = {
  nome: string
  preco: number
  limiteClientes: number | null
  limiteProdutos: number | null
  limiteFuncionarios: number | null
  agendamentoOnline: boolean      // link público de agendamento (agenda e profissional)
  gestaoAgendaInterna: boolean    // gestão de agenda interna (basico, profissional, agenda)
  lembretesAutomaticos: boolean
  marcaDagua: boolean
  fidelidade: boolean
  relatoriosAvancados: boolean
  exportacaoExcel: boolean
  tarefas: boolean                // módulo tarefas (agenda, basico, profissional)
  contratos: boolean              // gestão de contratos (basico, profissional)
  debito: boolean                 // deixar em débito (basico, profissional)
  caixasAnteriores: boolean       // acesso a caixas anteriores (basico, profissional)
}

export const planosInfo: Record<Plano, InfoPlano> = {
  gratuito: {
    nome: "Gratuito",
    preco: 0,
    limiteClientes: 15,
    limiteProdutos: 10,
    limiteFuncionarios: 0,
    agendamentoOnline: false,
    gestaoAgendaInterna: false,
    lembretesAutomaticos: false,
    marcaDagua: true,
    fidelidade: false,
    relatoriosAvancados: false,
    exportacaoExcel: false,
    tarefas: false,
    contratos: false,
    debito: false,
    caixasAnteriores: false,
  },
  basico: {
    nome: "Básico",
    preco: 49,
    limiteClientes: 200,
    limiteProdutos: null,
    limiteFuncionarios: 3,
    agendamentoOnline: false,       // apenas gestão interna, sem link público
    gestaoAgendaInterna: true,
    lembretesAutomaticos: false,
    marcaDagua: false,
    fidelidade: false,
    relatoriosAvancados: true,
    exportacaoExcel: false,
    tarefas: true,
    contratos: true,
    debito: true,
    caixasAnteriores: true,
  },
  profissional: {
    nome: "Profissional",
    preco: 99,
    limiteClientes: null,
    limiteProdutos: null,
    limiteFuncionarios: null,
    agendamentoOnline: true,
    gestaoAgendaInterna: true,
    lembretesAutomaticos: true,
    marcaDagua: false,
    fidelidade: true,
    relatoriosAvancados: true,
    exportacaoExcel: true,
    tarefas: true,
    contratos: true,
    debito: true,
    caixasAnteriores: true,
  },
  agenda: {
    nome: "Agenda",
    preco: 29,
    limiteClientes: null,
    limiteProdutos: null,
    limiteFuncionarios: 3,
    agendamentoOnline: true,
    gestaoAgendaInterna: true,
    lembretesAutomaticos: false,
    marcaDagua: false,
    fidelidade: false,
    relatoriosAvancados: false,
    exportacaoExcel: false,
    tarefas: true,
    contratos: false,
    debito: false,
    caixasAnteriores: false,
  },
  gestao: {
    nome: "Gestão",
    preco: 29.9,
    limiteClientes: null,
    limiteProdutos: null,
    limiteFuncionarios: null,
    agendamentoOnline: false,
    gestaoAgendaInterna: false,
    lembretesAutomaticos: false,
    marcaDagua: false,
    fidelidade: false,
    relatoriosAvancados: true,
    exportacaoExcel: true,
    tarefas: false,
    contratos: false,
    debito: true,
    caixasAnteriores: true,
  },
}

// Configurações do app — importar de @/lib/utils
// export { APP_CONFIG } from "@/lib/utils"
