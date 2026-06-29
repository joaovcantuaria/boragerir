export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  public: {
    Tables: {
      empresas: {
        Row: {
          id: string
          user_id: string
          nome: string
          slug: string | null
          tipo_documento: "cpf" | "cnpj"
          documento: string
          area_atuacao: string
          telefone: string
          email: string
          logo_url: string | null
          endereco_rua: string
          endereco_numero: string
          endereco_bairro: string
          endereco_cidade: string
          endereco_estado: string
          endereco_cep: string
          plano: "gratuito" | "basico" | "profissional" | "agenda"
          plano_ativo: boolean
          pontos_por_real: number
          pontos_para_desconto: number
          recibo_template: "padrao" | "moderno" | "minimalista" | "colorido" | null
          recibo_cor_primaria: string | null
          recibo_rodape: string | null
          created_at: string
        }
        Insert: Omit<Database["public"]["Tables"]["empresas"]["Row"], "id" | "created_at"> & {
          id?: string
          created_at?: string
        }
        Update: Partial<Database["public"]["Tables"]["empresas"]["Insert"]>
      }
      clientes: {
        Row: {
          id: string
          empresa_id: string
          nome_completo: string
          cpf: string
          email: string | null
          telefone: string
          data_nascimento: string | null
          observacoes: string | null
          pontos_fidelidade: number
          ativo: boolean
          created_at: string
        }
        Insert: Omit<Database["public"]["Tables"]["clientes"]["Row"], "id" | "created_at"> & {
          id?: string
          created_at?: string
        }
        Update: Partial<Database["public"]["Tables"]["clientes"]["Insert"]>
      }
      categorias: {
        Row: {
          id: string
          empresa_id: string
          nome: string
          tipo: "produto" | "servico"
          created_at: string
        }
        Insert: Omit<Database["public"]["Tables"]["categorias"]["Row"], "id" | "created_at"> & {
          id?: string
          created_at?: string
        }
        Update: Partial<Database["public"]["Tables"]["categorias"]["Insert"]>
      }
      produtos_servicos: {
        Row: {
          id: string
          empresa_id: string
          categoria_id: string | null
          nome: string
          tipo: "produto" | "servico"
          descricao: string | null
          preco: number
          custo: number | null
          estoque_atual: number | null
          estoque_minimo: number | null
          comissao_percentual: number | null
          duracao_minutos: number | null
          codigo: string | null
          unidade_medida: "unidade" | "pacote" | "kilo" | "litro" | "hora" | "sessao" | "metro" | "caixa" | "par" | "outro" | null
          ativo: boolean
          created_at: string
        }
        Insert: Omit<Database["public"]["Tables"]["produtos_servicos"]["Row"], "id" | "created_at"> & {
          id?: string
          created_at?: string
        }
        Update: Partial<Database["public"]["Tables"]["produtos_servicos"]["Insert"]>
      }
      funcionarios: {
        Row: {
          id: string
          empresa_id: string
          nome: string
          cargo: string
          telefone: string | null
          email: string | null
          comissao_percentual_padrao: number | null
          ativo: boolean
          created_at: string
        }
        Insert: Omit<Database["public"]["Tables"]["funcionarios"]["Row"], "id" | "created_at"> & {
          id?: string
          created_at?: string
        }
        Update: Partial<Database["public"]["Tables"]["funcionarios"]["Insert"]>
      }
      caixas: {
        Row: {
          id: string
          empresa_id: string
          data_abertura: string
          data_fechamento: string | null
          valor_abertura: number
          valor_fechamento: number | null
          valor_esperado: number | null
          diferenca: number | null
          observacoes_abertura: string | null
          observacoes_fechamento: string | null
          status: "aberto" | "fechado"
          aberto_por: string
          fechado_por: string | null
          created_at: string
        }
        Insert: Omit<Database["public"]["Tables"]["caixas"]["Row"], "id" | "created_at"> & {
          id?: string
          created_at?: string
        }
        Update: Partial<Database["public"]["Tables"]["caixas"]["Insert"]>
      }
      vendas: {
        Row: {
          id: string
          empresa_id: string
          caixa_id: string | null
          cliente_id: string | null
          funcionario_id: string | null
          numero_venda: number
          subtotal: number
          desconto: number
          total: number
          forma_pagamento: "dinheiro" | "cartao_credito" | "cartao_debito" | "pix" | "outro"
          parcelas: number
          status: "concluida" | "cancelada"
          observacoes: string | null
          created_at: string
        }
        Insert: Omit<Database["public"]["Tables"]["vendas"]["Row"], "id" | "created_at" | "numero_venda"> & {
          id?: string
          created_at?: string
          numero_venda?: number
        }
        Update: Partial<Database["public"]["Tables"]["vendas"]["Insert"]>
      }
      itens_venda: {
        Row: {
          id: string
          venda_id: string
          produto_servico_id: string
          empresa_id: string
          nome_item: string
          quantidade: number
          preco_unitario: number
          comissao_percentual: number | null
          comissao_valor: number | null
          subtotal: number
          created_at: string
        }
        Insert: Omit<Database["public"]["Tables"]["itens_venda"]["Row"], "id" | "created_at"> & {
          id?: string
          created_at?: string
        }
        Update: Partial<Database["public"]["Tables"]["itens_venda"]["Insert"]>
      }
      orcamentos: {
        Row: {
          id: string
          empresa_id: string
          cliente_id: string | null
          numero_orcamento: number
          titulo: string
          subtotal: number
          desconto: number
          total: number
          validade_dias: number
          status: "pendente" | "aprovado" | "recusado" | "expirado"
          observacoes: string | null
          created_at: string
        }
        Insert: Omit<Database["public"]["Tables"]["orcamentos"]["Row"], "id" | "created_at" | "numero_orcamento"> & {
          id?: string
          created_at?: string
          numero_orcamento?: number
        }
        Update: Partial<Database["public"]["Tables"]["orcamentos"]["Insert"]>
      }
      itens_orcamento: {
        Row: {
          id: string
          orcamento_id: string
          empresa_id: string
          produto_servico_id: string | null
          nome_item: string
          quantidade: number
          preco_unitario: number
          subtotal: number
          created_at: string
        }
        Insert: Omit<Database["public"]["Tables"]["itens_orcamento"]["Row"], "id" | "created_at"> & {
          id?: string
          created_at?: string
        }
        Update: Partial<Database["public"]["Tables"]["itens_orcamento"]["Insert"]>
      }
      agendamentos: {
        Row: {
          id: string
          empresa_id: string
          cliente_id: string | null
          funcionario_id: string | null
          servico_id: string | null
          data_hora: string
          duracao_minutos: number
          status: "agendado" | "confirmado" | "concluido" | "cancelado" | "faltou" | "solicitado" | "espera"
          observacoes: string | null
          nome_cliente_avulso: string | null
          telefone_cliente_avulso: string | null
          email_cliente: string | null
          origem: "manual" | "online" | null
          created_at: string
        }
        Insert: Omit<Database["public"]["Tables"]["agendamentos"]["Row"], "id" | "created_at"> & {
          id?: string
          created_at?: string
        }
        Update: Partial<Database["public"]["Tables"]["agendamentos"]["Insert"]>
      }
      movimentacoes_caixa: {
        Row: {
          id: string
          empresa_id: string
          caixa_id: string
          tipo: "entrada" | "saida"
          categoria: "venda" | "sangria" | "suprimento" | "despesa" | "outro"
          descricao: string
          valor: number
          venda_id: string | null
          created_at: string
        }
        Insert: Omit<Database["public"]["Tables"]["movimentacoes_caixa"]["Row"], "id" | "created_at"> & {
          id?: string
          created_at?: string
        }
        Update: Partial<Database["public"]["Tables"]["movimentacoes_caixa"]["Insert"]>
      }
      assinaturas: {
        Row: {
          id: string
          empresa_id: string
          plano: "basico" | "profissional"
          periodicidade: "mensal" | "anual"
          status: "pendente" | "ativa" | "pausada" | "cancelada" | "expirada"
          mp_subscription_id: string | null
          mp_payment_id: string | null
          mp_preapproval_id: string | null
          mp_pix_qr_code: string | null
          mp_pix_qr_code_text: string | null
          mp_pix_payment_id: string | null
          data_inicio: string | null
          data_fim: string | null
          proximo_vencimento: string | null
          valor_mensal: number
          valor_total: number
          forma_pagamento: "cartao" | "pix" | null
          created_at: string
          updated_at: string
        }
        Insert: Omit<Database["public"]["Tables"]["assinaturas"]["Row"], "id" | "created_at" | "updated_at"> & {
          id?: string
          created_at?: string
          updated_at?: string
        }
        Update: Partial<Database["public"]["Tables"]["assinaturas"]["Insert"]>
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      [_ in never]: never
    }
  }
}
