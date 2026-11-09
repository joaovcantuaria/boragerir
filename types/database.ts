// Gerado a partir do esquema real do Supabase (PostgREST OpenAPI) em 2026-10-30.
// Para regenerar com a CLI oficial: npx supabase gen types typescript --project-id <id> > types/database.ts
// (os tipos literais de plano/status/etc. foram preservados à mão — reaplique-os se regenerar)
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
      agenda_config: {
        Row: {
          id: string
          empresa_id: string
          dias_semana: number[]
          hora_inicio: string
          hora_fim: string
          intervalo_minutos: number
          duracao_padrao: number
          almoco_inicio: string | null
          almoco_fim: string | null
          updated_at: string | null
          created_at: string | null
        }
        Insert: {
          id?: string
          empresa_id: string
          dias_semana: number[]
          hora_inicio?: string
          hora_fim?: string
          intervalo_minutos?: number
          duracao_padrao?: number
          almoco_inicio?: string | null
          almoco_fim?: string | null
          updated_at?: string | null
          created_at?: string | null
        }
        Update: {
          id?: string
          empresa_id?: string
          dias_semana?: number[]
          hora_inicio?: string
          hora_fim?: string
          intervalo_minutos?: number
          duracao_padrao?: number
          almoco_inicio?: string | null
          almoco_fim?: string | null
          updated_at?: string | null
          created_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "agenda_config_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "empresas"
            referencedColumns: ["id"]
          },
        ]
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
          created_at: string
          origem: "manual" | "online" | null
          email_cliente: string | null
        }
        Insert: {
          id?: string
          empresa_id: string
          cliente_id?: string | null
          funcionario_id?: string | null
          servico_id?: string | null
          data_hora: string
          duracao_minutos?: number
          status?: "agendado" | "confirmado" | "concluido" | "cancelado" | "faltou" | "solicitado" | "espera"
          observacoes?: string | null
          nome_cliente_avulso?: string | null
          telefone_cliente_avulso?: string | null
          created_at?: string
          origem?: "manual" | "online" | null
          email_cliente?: string | null
        }
        Update: {
          id?: string
          empresa_id?: string
          cliente_id?: string | null
          funcionario_id?: string | null
          servico_id?: string | null
          data_hora?: string
          duracao_minutos?: number
          status?: "agendado" | "confirmado" | "concluido" | "cancelado" | "faltou" | "solicitado" | "espera"
          observacoes?: string | null
          nome_cliente_avulso?: string | null
          telefone_cliente_avulso?: string | null
          created_at?: string
          origem?: "manual" | "online" | null
          email_cliente?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "agendamentos_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "empresas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "agendamentos_cliente_id_fkey"
            columns: ["cliente_id"]
            isOneToOne: false
            referencedRelation: "clientes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "agendamentos_funcionario_id_fkey"
            columns: ["funcionario_id"]
            isOneToOne: false
            referencedRelation: "funcionarios"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "agendamentos_servico_id_fkey"
            columns: ["servico_id"]
            isOneToOne: false
            referencedRelation: "produtos_servicos"
            referencedColumns: ["id"]
          },
        ]
      }
      assinaturas: {
        Row: {
          id: string
          empresa_id: string
          plano: "gratuito" | "basico" | "profissional" | "agenda" | "gestao"
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
        Insert: {
          id?: string
          empresa_id: string
          plano: "gratuito" | "basico" | "profissional" | "agenda" | "gestao"
          periodicidade: "mensal" | "anual"
          status?: "pendente" | "ativa" | "pausada" | "cancelada" | "expirada"
          mp_subscription_id?: string | null
          mp_payment_id?: string | null
          mp_preapproval_id?: string | null
          mp_pix_qr_code?: string | null
          mp_pix_qr_code_text?: string | null
          mp_pix_payment_id?: string | null
          data_inicio?: string | null
          data_fim?: string | null
          proximo_vencimento?: string | null
          valor_mensal: number
          valor_total: number
          forma_pagamento?: "cartao" | "pix" | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          empresa_id?: string
          plano?: "gratuito" | "basico" | "profissional" | "agenda" | "gestao"
          periodicidade?: "mensal" | "anual"
          status?: "pendente" | "ativa" | "pausada" | "cancelada" | "expirada"
          mp_subscription_id?: string | null
          mp_payment_id?: string | null
          mp_preapproval_id?: string | null
          mp_pix_qr_code?: string | null
          mp_pix_qr_code_text?: string | null
          mp_pix_payment_id?: string | null
          data_inicio?: string | null
          data_fim?: string | null
          proximo_vencimento?: string | null
          valor_mensal?: number
          valor_total?: number
          forma_pagamento?: "cartao" | "pix" | null
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "assinaturas_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "empresas"
            referencedColumns: ["id"]
          },
        ]
      }
      audit_log: {
        Row: {
          id: string
          empresa_id: string
          acao: string
          detalhes: string | null
          usuario: string | null
          created_at: string
        }
        Insert: {
          id?: string
          empresa_id: string
          acao: string
          detalhes?: string | null
          usuario?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          empresa_id?: string
          acao?: string
          detalhes?: string | null
          usuario?: string | null
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "audit_log_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "empresas"
            referencedColumns: ["id"]
          },
        ]
      }
      blocos_tarefas: {
        Row: {
          id: string
          empresa_id: string
          nome: string
          cor: string
          posicao: number
          created_at: string | null
        }
        Insert: {
          id?: string
          empresa_id: string
          nome: string
          cor?: string
          posicao?: number
          created_at?: string | null
        }
        Update: {
          id?: string
          empresa_id?: string
          nome?: string
          cor?: string
          posicao?: number
          created_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "blocos_tarefas_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "empresas"
            referencedColumns: ["id"]
          },
        ]
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
          tipo_caixa: "diario" | "semanal" | "mensal" | null
          nome_caixa: string | null
          tipo_conta: string | null
          colaborador_id: string | null
          colaborador_fechou_id: string | null
          codigo_rastreio: string | null
        }
        Insert: {
          id?: string
          empresa_id: string
          data_abertura?: string
          data_fechamento?: string | null
          valor_abertura?: number
          valor_fechamento?: number | null
          valor_esperado?: number | null
          diferenca?: number | null
          observacoes_abertura?: string | null
          observacoes_fechamento?: string | null
          status?: "aberto" | "fechado"
          aberto_por: string
          fechado_por?: string | null
          created_at?: string
          tipo_caixa?: "diario" | "semanal" | "mensal" | null
          nome_caixa?: string | null
          tipo_conta?: string | null
          colaborador_id?: string | null
          colaborador_fechou_id?: string | null
          codigo_rastreio?: string | null
        }
        Update: {
          id?: string
          empresa_id?: string
          data_abertura?: string
          data_fechamento?: string | null
          valor_abertura?: number
          valor_fechamento?: number | null
          valor_esperado?: number | null
          diferenca?: number | null
          observacoes_abertura?: string | null
          observacoes_fechamento?: string | null
          status?: "aberto" | "fechado"
          aberto_por?: string
          fechado_por?: string | null
          created_at?: string
          tipo_caixa?: "diario" | "semanal" | "mensal" | null
          nome_caixa?: string | null
          tipo_conta?: string | null
          colaborador_id?: string | null
          colaborador_fechou_id?: string | null
          codigo_rastreio?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "caixas_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "empresas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "caixas_colaborador_id_fkey"
            columns: ["colaborador_id"]
            isOneToOne: false
            referencedRelation: "funcionarios"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "caixas_colaborador_fechou_id_fkey"
            columns: ["colaborador_fechou_id"]
            isOneToOne: false
            referencedRelation: "funcionarios"
            referencedColumns: ["id"]
          },
        ]
      }
      categorias: {
        Row: {
          id: string
          empresa_id: string
          nome: string
          tipo: "produto" | "servico"
          created_at: string
        }
        Insert: {
          id?: string
          empresa_id: string
          nome: string
          tipo: "produto" | "servico"
          created_at?: string
        }
        Update: {
          id?: string
          empresa_id?: string
          nome?: string
          tipo?: "produto" | "servico"
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "categorias_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "empresas"
            referencedColumns: ["id"]
          },
        ]
      }
      chat_ia: {
        Row: {
          id: string
          empresa_id: string
          role: string
          conteudo: string
          created_at: string
        }
        Insert: {
          id?: string
          empresa_id: string
          role: string
          conteudo: string
          created_at?: string
        }
        Update: {
          id?: string
          empresa_id?: string
          role?: string
          conteudo?: string
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "chat_ia_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "empresas"
            referencedColumns: ["id"]
          },
        ]
      }
      clientes: {
        Row: {
          id: string
          empresa_id: string
          nome_completo: string
          cpf: string | null
          email: string | null
          telefone: string
          data_nascimento: string | null
          observacoes: string | null
          pontos_fidelidade: number
          ativo: boolean
          created_at: string
          tipo_pessoa: string
          razao_social: string | null
          cnpj: string | null
        }
        Insert: {
          id?: string
          empresa_id: string
          nome_completo: string
          cpf?: string | null
          email?: string | null
          telefone: string
          data_nascimento?: string | null
          observacoes?: string | null
          pontos_fidelidade?: number
          ativo?: boolean
          created_at?: string
          tipo_pessoa?: string
          razao_social?: string | null
          cnpj?: string | null
        }
        Update: {
          id?: string
          empresa_id?: string
          nome_completo?: string
          cpf?: string | null
          email?: string | null
          telefone?: string
          data_nascimento?: string | null
          observacoes?: string | null
          pontos_fidelidade?: number
          ativo?: boolean
          created_at?: string
          tipo_pessoa?: string
          razao_social?: string | null
          cnpj?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "clientes_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "empresas"
            referencedColumns: ["id"]
          },
        ]
      }
      configuracoes_sistema: {
        Row: {
          id: string
          chave: string
          valor: Json
          descricao: string | null
          updated_at: string
        }
        Insert: {
          id?: string
          chave: string
          valor: Json
          descricao?: string | null
          updated_at?: string
        }
        Update: {
          id?: string
          chave?: string
          valor?: Json
          descricao?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      contas_pagar: {
        Row: {
          id: string
          empresa_id: string
          descricao: string
          valor: number
          data_vencimento: string
          categoria: string
          status: string
          recorrencia: string
          recorrencia_grupo: string | null
          fornecedor_id: string | null
          data_pagamento: string | null
          observacoes: string | null
          created_at: string
          codigo_rastreio: string | null
        }
        Insert: {
          id?: string
          empresa_id: string
          descricao: string
          valor: number
          data_vencimento: string
          categoria?: string
          status?: string
          recorrencia?: string
          recorrencia_grupo?: string | null
          fornecedor_id?: string | null
          data_pagamento?: string | null
          observacoes?: string | null
          created_at?: string
          codigo_rastreio?: string | null
        }
        Update: {
          id?: string
          empresa_id?: string
          descricao?: string
          valor?: number
          data_vencimento?: string
          categoria?: string
          status?: string
          recorrencia?: string
          recorrencia_grupo?: string | null
          fornecedor_id?: string | null
          data_pagamento?: string | null
          observacoes?: string | null
          created_at?: string
          codigo_rastreio?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "contas_pagar_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "empresas"
            referencedColumns: ["id"]
          },
        ]
      }
      contratos: {
        Row: {
          id: string
          empresa_id: string
          cliente_id: string | null
          servico_id: string | null
          funcionario_id: string | null
          titulo: string
          descricao: string | null
          valor_mensal: number
          duracao_meses: number
          dia_vencimento: number
          data_inicio: string
          data_fim: string
          status: "ativo" | "pausado" | "cancelado" | "concluido"
          observacoes: string | null
          created_at: string | null
          tipo_cobranca: string | null
          entrada_valor: number | null
          entrada_forma_pagamento: string | null
        }
        Insert: {
          id?: string
          empresa_id: string
          cliente_id?: string | null
          servico_id?: string | null
          funcionario_id?: string | null
          titulo: string
          descricao?: string | null
          valor_mensal: number
          duracao_meses: number
          dia_vencimento?: number
          data_inicio: string
          data_fim: string
          status?: "ativo" | "pausado" | "cancelado" | "concluido"
          observacoes?: string | null
          created_at?: string | null
          tipo_cobranca?: string | null
          entrada_valor?: number | null
          entrada_forma_pagamento?: string | null
        }
        Update: {
          id?: string
          empresa_id?: string
          cliente_id?: string | null
          servico_id?: string | null
          funcionario_id?: string | null
          titulo?: string
          descricao?: string | null
          valor_mensal?: number
          duracao_meses?: number
          dia_vencimento?: number
          data_inicio?: string
          data_fim?: string
          status?: "ativo" | "pausado" | "cancelado" | "concluido"
          observacoes?: string | null
          created_at?: string | null
          tipo_cobranca?: string | null
          entrada_valor?: number | null
          entrada_forma_pagamento?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "contratos_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "empresas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contratos_cliente_id_fkey"
            columns: ["cliente_id"]
            isOneToOne: false
            referencedRelation: "clientes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contratos_servico_id_fkey"
            columns: ["servico_id"]
            isOneToOne: false
            referencedRelation: "produtos_servicos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contratos_funcionario_id_fkey"
            columns: ["funcionario_id"]
            isOneToOne: false
            referencedRelation: "funcionarios"
            referencedColumns: ["id"]
          },
        ]
      }
      contratos_parcelas: {
        Row: {
          id: string
          empresa_id: string
          contrato_id: string
          numero_parcela: number
          data_vencimento: string
          valor: number
          status: "previsto" | "pago" | "atrasado" | "cancelado"
          data_pagamento: string | null
          venda_id: string | null
          observacoes: string | null
          created_at: string | null
          codigo_rastreio: string | null
        }
        Insert: {
          id?: string
          empresa_id: string
          contrato_id: string
          numero_parcela: number
          data_vencimento: string
          valor: number
          status?: "previsto" | "pago" | "atrasado" | "cancelado"
          data_pagamento?: string | null
          venda_id?: string | null
          observacoes?: string | null
          created_at?: string | null
          codigo_rastreio?: string | null
        }
        Update: {
          id?: string
          empresa_id?: string
          contrato_id?: string
          numero_parcela?: number
          data_vencimento?: string
          valor?: number
          status?: "previsto" | "pago" | "atrasado" | "cancelado"
          data_pagamento?: string | null
          venda_id?: string | null
          observacoes?: string | null
          created_at?: string | null
          codigo_rastreio?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "contratos_parcelas_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "empresas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contratos_parcelas_contrato_id_fkey"
            columns: ["contrato_id"]
            isOneToOne: false
            referencedRelation: "contratos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contratos_parcelas_venda_id_fkey"
            columns: ["venda_id"]
            isOneToOne: false
            referencedRelation: "vendas"
            referencedColumns: ["id"]
          },
        ]
      }
      conversas_mel: {
        Row: {
          id: string
          empresa_id: string
          protocolo: string
          titulo: string | null
          nome_usuario: string | null
          status: string
          resolvido_por_ia: boolean | null
          gerou_ticket: boolean | null
          ticket_id: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          empresa_id: string
          protocolo: string
          titulo?: string | null
          nome_usuario?: string | null
          status?: string
          resolvido_por_ia?: boolean | null
          gerou_ticket?: boolean | null
          ticket_id?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          empresa_id?: string
          protocolo?: string
          titulo?: string | null
          nome_usuario?: string | null
          status?: string
          resolvido_por_ia?: boolean | null
          gerou_ticket?: boolean | null
          ticket_id?: string | null
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "conversas_mel_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "empresas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "conversas_mel_ticket_id_fkey"
            columns: ["ticket_id"]
            isOneToOne: false
            referencedRelation: "tickets_suporte"
            referencedColumns: ["id"]
          },
        ]
      }
      cora_audit_log: {
        Row: {
          id: string
          empresa_id: string
          user_id: string
          operacao: string
          detalhes: Json | null
          created_at: string
        }
        Insert: {
          id?: string
          empresa_id: string
          user_id: string
          operacao: string
          detalhes?: Json | null
          created_at?: string
        }
        Update: {
          id?: string
          empresa_id?: string
          user_id?: string
          operacao?: string
          detalhes?: Json | null
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "cora_audit_log_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "empresas"
            referencedColumns: ["id"]
          },
        ]
      }
      cora_boletos: {
        Row: {
          id: string
          empresa_id: string
          cora_conta_id: string
          cliente_id: string | null
          venda_id: string | null
          contrato_id: string | null
          parcela_id: string | null
          cora_invoice_id: string
          tipo: string
          carne_id: string | null
          numero_parcela: number | null
          valor: number
          data_vencimento: string
          status: string
          codigo_barras: string | null
          linha_digitavel: string | null
          qr_code_pix: string | null
          url_pdf: string | null
          data_pagamento: string | null
          data_cancelamento: string | null
          motivo_cancelamento: string | null
          payload_cora: Json | null
          created_at: string
          updated_at: string
          valor_receber_id: string | null
        }
        Insert: {
          id?: string
          empresa_id: string
          cora_conta_id: string
          cliente_id?: string | null
          venda_id?: string | null
          contrato_id?: string | null
          parcela_id?: string | null
          cora_invoice_id: string
          tipo: string
          carne_id?: string | null
          numero_parcela?: number | null
          valor: number
          data_vencimento: string
          status?: string
          codigo_barras?: string | null
          linha_digitavel?: string | null
          qr_code_pix?: string | null
          url_pdf?: string | null
          data_pagamento?: string | null
          data_cancelamento?: string | null
          motivo_cancelamento?: string | null
          payload_cora?: Json | null
          created_at?: string
          updated_at?: string
          valor_receber_id?: string | null
        }
        Update: {
          id?: string
          empresa_id?: string
          cora_conta_id?: string
          cliente_id?: string | null
          venda_id?: string | null
          contrato_id?: string | null
          parcela_id?: string | null
          cora_invoice_id?: string
          tipo?: string
          carne_id?: string | null
          numero_parcela?: number | null
          valor?: number
          data_vencimento?: string
          status?: string
          codigo_barras?: string | null
          linha_digitavel?: string | null
          qr_code_pix?: string | null
          url_pdf?: string | null
          data_pagamento?: string | null
          data_cancelamento?: string | null
          motivo_cancelamento?: string | null
          payload_cora?: Json | null
          created_at?: string
          updated_at?: string
          valor_receber_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "cora_boletos_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "empresas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cora_boletos_cora_conta_id_fkey"
            columns: ["cora_conta_id"]
            isOneToOne: false
            referencedRelation: "cora_contas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cora_boletos_cliente_id_fkey"
            columns: ["cliente_id"]
            isOneToOne: false
            referencedRelation: "clientes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cora_boletos_venda_id_fkey"
            columns: ["venda_id"]
            isOneToOne: false
            referencedRelation: "vendas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cora_boletos_contrato_id_fkey"
            columns: ["contrato_id"]
            isOneToOne: false
            referencedRelation: "contratos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cora_boletos_parcela_id_fkey"
            columns: ["parcela_id"]
            isOneToOne: false
            referencedRelation: "contratos_parcelas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cora_boletos_valor_receber_id_fkey"
            columns: ["valor_receber_id"]
            isOneToOne: false
            referencedRelation: "valores_receber"
            referencedColumns: ["id"]
          },
        ]
      }
      cora_contas: {
        Row: {
          id: string
          empresa_id: string
          cora_account_id: string | null
          access_token_encrypted: string | null
          refresh_token_encrypted: string | null
          token_expires_at: string | null
          status: string
          webhook_id: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          empresa_id: string
          cora_account_id?: string | null
          access_token_encrypted?: string | null
          refresh_token_encrypted?: string | null
          token_expires_at?: string | null
          status?: string
          webhook_id?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          empresa_id?: string
          cora_account_id?: string | null
          access_token_encrypted?: string | null
          refresh_token_encrypted?: string | null
          token_expires_at?: string | null
          status?: string
          webhook_id?: string | null
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "cora_contas_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "empresas"
            referencedColumns: ["id"]
          },
        ]
      }
      cora_transacoes: {
        Row: {
          id: string
          empresa_id: string
          cora_conta_id: string
          cora_transfer_id: string
          tipo: string
          valor: number
          descricao: string | null
          conta_destino: Json | null
          status: string
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          empresa_id: string
          cora_conta_id: string
          cora_transfer_id: string
          tipo: string
          valor: number
          descricao?: string | null
          conta_destino?: Json | null
          status?: string
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          empresa_id?: string
          cora_conta_id?: string
          cora_transfer_id?: string
          tipo?: string
          valor?: number
          descricao?: string | null
          conta_destino?: Json | null
          status?: string
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "cora_transacoes_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "empresas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cora_transacoes_cora_conta_id_fkey"
            columns: ["cora_conta_id"]
            isOneToOne: false
            referencedRelation: "cora_contas"
            referencedColumns: ["id"]
          },
        ]
      }
      cupons: {
        Row: {
          id: string
          codigo: string
          descricao: string | null
          tipo: string
          valor: number
          planos_validos: string[] | null
          uso_maximo: number | null
          uso_atual: number
          ativo: boolean
          validade: string | null
          vendedor_id: string | null
          created_at: string
          periodicidades_validas: string[] | null
          apenas_primeiro_mes: boolean | null
        }
        Insert: {
          id?: string
          codigo: string
          descricao?: string | null
          tipo?: string
          valor: number
          planos_validos?: string[] | null
          uso_maximo?: number | null
          uso_atual?: number
          ativo?: boolean
          validade?: string | null
          vendedor_id?: string | null
          created_at?: string
          periodicidades_validas?: string[] | null
          apenas_primeiro_mes?: boolean | null
        }
        Update: {
          id?: string
          codigo?: string
          descricao?: string | null
          tipo?: string
          valor?: number
          planos_validos?: string[] | null
          uso_maximo?: number | null
          uso_atual?: number
          ativo?: boolean
          validade?: string | null
          vendedor_id?: string | null
          created_at?: string
          periodicidades_validas?: string[] | null
          apenas_primeiro_mes?: boolean | null
        }
        Relationships: [
          {
            foreignKeyName: "cupons_vendedor_id_fkey"
            columns: ["vendedor_id"]
            isOneToOne: false
            referencedRelation: "vendedores"
            referencedColumns: ["id"]
          },
        ]
      }
      fornecedores: {
        Row: {
          id: string
          empresa_id: string
          nome: string
          documento: string | null
          contato: string | null
          telefone: string | null
          email: string | null
          categoria: string
          chave_pix: string | null
          endereco: string | null
          observacoes: string | null
          ativo: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          empresa_id: string
          nome: string
          documento?: string | null
          contato?: string | null
          telefone?: string | null
          email?: string | null
          categoria?: string
          chave_pix?: string | null
          endereco?: string | null
          observacoes?: string | null
          ativo?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          empresa_id?: string
          nome?: string
          documento?: string | null
          contato?: string | null
          telefone?: string | null
          email?: string | null
          categoria?: string
          chave_pix?: string | null
          endereco?: string | null
          observacoes?: string | null
          ativo?: boolean
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }
      cupons_cliente: {
        Row: {
          id: string
          empresa_id: string
          cliente_id: string | null
          codigo: string
          tipo: "percentual" | "fixo"
          valor: number
          validade: string
          origem: "aniversario" | "reativacao" | "manual"
          usado_em: string | null
          venda_id: string | null
          created_at: string
        }
        Insert: {
          id?: string
          empresa_id: string
          cliente_id?: string | null
          codigo: string
          tipo: "percentual" | "fixo"
          valor: number
          validade: string
          origem?: "aniversario" | "reativacao" | "manual"
          usado_em?: string | null
          venda_id?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          empresa_id?: string
          cliente_id?: string | null
          codigo?: string
          tipo?: "percentual" | "fixo"
          valor?: number
          validade?: string
          origem?: "aniversario" | "reativacao" | "manual"
          usado_em?: string | null
          venda_id?: string | null
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "cupons_cliente_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "empresas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cupons_cliente_cliente_id_fkey"
            columns: ["cliente_id"]
            isOneToOne: false
            referencedRelation: "clientes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cupons_cliente_venda_id_fkey"
            columns: ["venda_id"]
            isOneToOne: false
            referencedRelation: "vendas"
            referencedColumns: ["id"]
          },
        ]
      }
      dashboard_layouts: {
        Row: {
          id: string
          empresa_id: string
          layout: Json
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          empresa_id: string
          layout: Json
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          empresa_id?: string
          layout?: Json
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "dashboard_layouts_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "empresas"
            referencedColumns: ["id"]
          },
        ]
      }
      debitos_clientes: {
        Row: {
          id: string
          empresa_id: string
          cliente_id: string
          venda_id: string | null
          valor_total: number
          valor_pago: number
          valor_aberto: number
          descricao: string | null
          status: string
          created_at: string
          updated_at: string
          codigo_rastreio: string | null
        }
        Insert: {
          id?: string
          empresa_id: string
          cliente_id: string
          venda_id?: string | null
          valor_total: number
          valor_pago?: number
          valor_aberto: number
          descricao?: string | null
          status?: string
          created_at?: string
          updated_at?: string
          codigo_rastreio?: string | null
        }
        Update: {
          id?: string
          empresa_id?: string
          cliente_id?: string
          venda_id?: string | null
          valor_total?: number
          valor_pago?: number
          valor_aberto?: number
          descricao?: string | null
          status?: string
          created_at?: string
          updated_at?: string
          codigo_rastreio?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "debitos_clientes_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "empresas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "debitos_clientes_cliente_id_fkey"
            columns: ["cliente_id"]
            isOneToOne: false
            referencedRelation: "clientes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "debitos_clientes_venda_id_fkey"
            columns: ["venda_id"]
            isOneToOne: false
            referencedRelation: "vendas"
            referencedColumns: ["id"]
          },
        ]
      }
      empresas: {
        Row: {
          id: string
          user_id: string
          nome: string
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
          plano: "gratuito" | "basico" | "profissional" | "agenda" | "gestao"
          plano_ativo: boolean
          pontos_por_real: number
          pontos_para_desconto: number
          created_at: string
          slug: string | null
          recibo_template: "padrao" | "moderno" | "minimalista" | "colorido" | null
          recibo_cor_primaria: string | null
          recibo_rodape: string | null
          doc_cor_primaria: string | null
          doc_mensagem_recibo: string | null
          doc_mensagem_orcamento: string | null
          doc_mostrar_cnpj: boolean | null
          doc_mostrar_endereco: boolean | null
          doc_mostrar_telefone: boolean | null
          doc_mostrar_logo: boolean | null
          max_empresas: number | null
          pin_gerente: string | null
          restricoes_acesso: { areas_protegidas?: string[]; limite_desconto_sem_pin?: number } | null
          senha_admin: string | null
        }
        Insert: {
          id?: string
          user_id: string
          nome: string
          tipo_documento?: "cpf" | "cnpj"
          documento?: string
          area_atuacao: string
          telefone: string
          email: string
          logo_url?: string | null
          endereco_rua?: string
          endereco_numero?: string
          endereco_bairro?: string
          endereco_cidade?: string
          endereco_estado?: string
          endereco_cep?: string
          plano?: "gratuito" | "basico" | "profissional" | "agenda" | "gestao"
          plano_ativo?: boolean
          pontos_por_real?: number
          pontos_para_desconto?: number
          created_at?: string
          slug?: string | null
          recibo_template?: "padrao" | "moderno" | "minimalista" | "colorido" | null
          recibo_cor_primaria?: string | null
          recibo_rodape?: string | null
          doc_cor_primaria?: string | null
          doc_mensagem_recibo?: string | null
          doc_mensagem_orcamento?: string | null
          doc_mostrar_cnpj?: boolean | null
          doc_mostrar_endereco?: boolean | null
          doc_mostrar_telefone?: boolean | null
          doc_mostrar_logo?: boolean | null
          max_empresas?: number | null
          pin_gerente?: string | null
          restricoes_acesso?: { areas_protegidas?: string[]; limite_desconto_sem_pin?: number } | null
          senha_admin?: string | null
        }
        Update: {
          id?: string
          user_id?: string
          nome?: string
          tipo_documento?: "cpf" | "cnpj"
          documento?: string
          area_atuacao?: string
          telefone?: string
          email?: string
          logo_url?: string | null
          endereco_rua?: string
          endereco_numero?: string
          endereco_bairro?: string
          endereco_cidade?: string
          endereco_estado?: string
          endereco_cep?: string
          plano?: "gratuito" | "basico" | "profissional" | "agenda" | "gestao"
          plano_ativo?: boolean
          pontos_por_real?: number
          pontos_para_desconto?: number
          created_at?: string
          slug?: string | null
          recibo_template?: "padrao" | "moderno" | "minimalista" | "colorido" | null
          recibo_cor_primaria?: string | null
          recibo_rodape?: string | null
          doc_cor_primaria?: string | null
          doc_mensagem_recibo?: string | null
          doc_mensagem_orcamento?: string | null
          doc_mostrar_cnpj?: boolean | null
          doc_mostrar_endereco?: boolean | null
          doc_mostrar_telefone?: boolean | null
          doc_mostrar_logo?: boolean | null
          max_empresas?: number | null
          pin_gerente?: string | null
          restricoes_acesso?: { areas_protegidas?: string[]; limite_desconto_sem_pin?: number } | null
          senha_admin?: string | null
        }
        Relationships: []
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
          usuario: string | null
          senha_hash: string | null
          perfil: string
          permissoes: Json | null
          ultimo_login: string | null
        }
        Insert: {
          id?: string
          empresa_id: string
          nome: string
          cargo: string
          telefone?: string | null
          email?: string | null
          comissao_percentual_padrao?: number | null
          ativo?: boolean
          created_at?: string
          usuario?: string | null
          senha_hash?: string | null
          perfil?: string
          permissoes?: Json | null
          ultimo_login?: string | null
        }
        Update: {
          id?: string
          empresa_id?: string
          nome?: string
          cargo?: string
          telefone?: string | null
          email?: string | null
          comissao_percentual_padrao?: number | null
          ativo?: boolean
          created_at?: string
          usuario?: string | null
          senha_hash?: string | null
          perfil?: string
          permissoes?: Json | null
          ultimo_login?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "funcionarios_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "empresas"
            referencedColumns: ["id"]
          },
        ]
      }
      integracoes_chat: {
        Row: {
          id: string
          empresa_id: string
          chat_api_key_enc: string
          chat_api_key_final: string
          app_token_hash: string
          ativo: boolean
          conectado_em: string
          ultimo_uso_em: string | null
          total_requisicoes: number
        }
        Insert: {
          id?: string
          empresa_id: string
          chat_api_key_enc: string
          chat_api_key_final: string
          app_token_hash: string
          ativo?: boolean
          conectado_em?: string
          ultimo_uso_em?: string | null
          total_requisicoes?: number
        }
        Update: {
          id?: string
          empresa_id?: string
          chat_api_key_enc?: string
          chat_api_key_final?: string
          app_token_hash?: string
          ativo?: boolean
          conectado_em?: string
          ultimo_uso_em?: string | null
          total_requisicoes?: number
        }
        Relationships: [
          {
            foreignKeyName: "integracoes_chat_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: true
            referencedRelation: "empresas"
            referencedColumns: ["id"]
          },
        ]
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
        Insert: {
          id?: string
          orcamento_id: string
          empresa_id: string
          produto_servico_id?: string | null
          nome_item: string
          quantidade: number
          preco_unitario: number
          subtotal: number
          created_at?: string
        }
        Update: {
          id?: string
          orcamento_id?: string
          empresa_id?: string
          produto_servico_id?: string | null
          nome_item?: string
          quantidade?: number
          preco_unitario?: number
          subtotal?: number
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "itens_orcamento_orcamento_id_fkey"
            columns: ["orcamento_id"]
            isOneToOne: false
            referencedRelation: "orcamentos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "itens_orcamento_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "empresas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "itens_orcamento_produto_servico_id_fkey"
            columns: ["produto_servico_id"]
            isOneToOne: false
            referencedRelation: "produtos_servicos"
            referencedColumns: ["id"]
          },
        ]
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
        Insert: {
          id?: string
          venda_id: string
          produto_servico_id: string
          empresa_id: string
          nome_item: string
          quantidade: number
          preco_unitario: number
          comissao_percentual?: number | null
          comissao_valor?: number | null
          subtotal: number
          created_at?: string
        }
        Update: {
          id?: string
          venda_id?: string
          produto_servico_id?: string
          empresa_id?: string
          nome_item?: string
          quantidade?: number
          preco_unitario?: number
          comissao_percentual?: number | null
          comissao_valor?: number | null
          subtotal?: number
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "itens_venda_venda_id_fkey"
            columns: ["venda_id"]
            isOneToOne: false
            referencedRelation: "vendas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "itens_venda_produto_servico_id_fkey"
            columns: ["produto_servico_id"]
            isOneToOne: false
            referencedRelation: "produtos_servicos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "itens_venda_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "empresas"
            referencedColumns: ["id"]
          },
        ]
      }
      lembretes_tarefas_config: {
        Row: {
          empresa_id: string
          ativo: boolean
          telefone: string
          nome: string
          hora_resumo: string
          resumo: boolean
          vespera: boolean
          atraso: boolean
          aceite_em: string | null
          updated_at: string
        }
        Insert: {
          empresa_id: string
          ativo?: boolean
          telefone: string
          nome: string
          hora_resumo?: string
          resumo?: boolean
          vespera?: boolean
          atraso?: boolean
          aceite_em?: string | null
          updated_at?: string
        }
        Update: {
          empresa_id?: string
          ativo?: boolean
          telefone?: string
          nome?: string
          hora_resumo?: string
          resumo?: boolean
          vespera?: boolean
          atraso?: boolean
          aceite_em?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "lembretes_tarefas_config_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: true
            referencedRelation: "empresas"
            referencedColumns: ["id"]
          },
        ]
      }
      lembretes_tarefas_envios: {
        Row: {
          id: string
          empresa_id: string
          tipo: "resumo" | "vespera" | "atraso" | "teste"
          referencia: string
          status: "enviando" | "enviado" | "falhou"
          detalhe: string | null
          created_at: string
        }
        Insert: {
          id?: string
          empresa_id: string
          tipo: "resumo" | "vespera" | "atraso" | "teste"
          referencia: string
          status: "enviando" | "enviado" | "falhou"
          detalhe?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          empresa_id?: string
          tipo?: "resumo" | "vespera" | "atraso" | "teste"
          referencia?: string
          status?: "enviando" | "enviado" | "falhou"
          detalhe?: string | null
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "lembretes_tarefas_envios_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "empresas"
            referencedColumns: ["id"]
          },
        ]
      }
      mensagens_mel: {
        Row: {
          id: string
          conversa_id: string
          empresa_id: string
          role: string
          conteudo: string
          created_at: string
        }
        Insert: {
          id?: string
          conversa_id: string
          empresa_id: string
          role: string
          conteudo: string
          created_at?: string
        }
        Update: {
          id?: string
          conversa_id?: string
          empresa_id?: string
          role?: string
          conteudo?: string
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "mensagens_mel_conversa_id_fkey"
            columns: ["conversa_id"]
            isOneToOne: false
            referencedRelation: "conversas_mel"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "mensagens_mel_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "empresas"
            referencedColumns: ["id"]
          },
        ]
      }
      movimentacoes_caixa: {
        Row: {
          id: string
          empresa_id: string
          caixa_id: string
          tipo: "entrada" | "saida"
          categoria: "venda" | "sangria" | "suprimento" | "despesa" | "outro" | "estorno"
          descricao: string
          valor: number
          venda_id: string | null
          created_at: string
          colaborador_id: string | null
          data_movimento: string | null
          codigo_rastreio: string | null
        }
        Insert: {
          id?: string
          empresa_id: string
          caixa_id: string
          tipo: "entrada" | "saida"
          categoria: "venda" | "sangria" | "suprimento" | "despesa" | "outro" | "estorno"
          descricao: string
          valor: number
          venda_id?: string | null
          created_at?: string
          colaborador_id?: string | null
          data_movimento?: string | null
          codigo_rastreio?: string | null
        }
        Update: {
          id?: string
          empresa_id?: string
          caixa_id?: string
          tipo?: "entrada" | "saida"
          categoria?: "venda" | "sangria" | "suprimento" | "despesa" | "outro" | "estorno"
          descricao?: string
          valor?: number
          venda_id?: string | null
          created_at?: string
          colaborador_id?: string | null
          data_movimento?: string | null
          codigo_rastreio?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "movimentacoes_caixa_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "empresas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "movimentacoes_caixa_caixa_id_fkey"
            columns: ["caixa_id"]
            isOneToOne: false
            referencedRelation: "caixas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "movimentacoes_caixa_venda_id_fkey"
            columns: ["venda_id"]
            isOneToOne: false
            referencedRelation: "vendas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "movimentacoes_caixa_colaborador_id_fkey"
            columns: ["colaborador_id"]
            isOneToOne: false
            referencedRelation: "funcionarios"
            referencedColumns: ["id"]
          },
        ]
      }
      notas_admin: {
        Row: {
          id: string
          empresa_id: string
          nota: string
          created_at: string
        }
        Insert: {
          id?: string
          empresa_id: string
          nota: string
          created_at?: string
        }
        Update: {
          id?: string
          empresa_id?: string
          nota?: string
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "notas_admin_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "empresas"
            referencedColumns: ["id"]
          },
        ]
      }
      notificacoes_admin: {
        Row: {
          id: string
          tipo: string
          titulo: string
          mensagem: string
          lida: boolean
          dados: Json | null
          created_at: string
        }
        Insert: {
          id?: string
          tipo: string
          titulo: string
          mensagem: string
          lida?: boolean
          dados?: Json | null
          created_at?: string
        }
        Update: {
          id?: string
          tipo?: string
          titulo?: string
          mensagem?: string
          lida?: boolean
          dados?: Json | null
          created_at?: string
        }
        Relationships: []
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
        Insert: {
          id?: string
          empresa_id: string
          cliente_id?: string | null
          numero_orcamento?: number
          titulo: string
          subtotal: number
          desconto?: number
          total: number
          validade_dias?: number
          status?: "pendente" | "aprovado" | "recusado" | "expirado"
          observacoes?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          empresa_id?: string
          cliente_id?: string | null
          numero_orcamento?: number
          titulo?: string
          subtotal?: number
          desconto?: number
          total?: number
          validade_dias?: number
          status?: "pendente" | "aprovado" | "recusado" | "expirado"
          observacoes?: string | null
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "orcamentos_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "empresas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "orcamentos_cliente_id_fkey"
            columns: ["cliente_id"]
            isOneToOne: false
            referencedRelation: "clientes"
            referencedColumns: ["id"]
          },
        ]
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
          ativo: boolean
          created_at: string
          codigo: string | null
          unidade_medida: "unidade" | "pacote" | "kilo" | "litro" | "hora" | "sessao" | "metro" | "caixa" | "par" | "outro" | null
          codigo_barras: string | null
        }
        Insert: {
          id?: string
          empresa_id: string
          categoria_id?: string | null
          nome: string
          tipo: "produto" | "servico"
          descricao?: string | null
          preco: number
          custo?: number | null
          estoque_atual?: number | null
          estoque_minimo?: number | null
          comissao_percentual?: number | null
          duracao_minutos?: number | null
          ativo?: boolean
          created_at?: string
          codigo?: string | null
          unidade_medida?: "unidade" | "pacote" | "kilo" | "litro" | "hora" | "sessao" | "metro" | "caixa" | "par" | "outro" | null
          codigo_barras?: string | null
        }
        Update: {
          id?: string
          empresa_id?: string
          categoria_id?: string | null
          nome?: string
          tipo?: "produto" | "servico"
          descricao?: string | null
          preco?: number
          custo?: number | null
          estoque_atual?: number | null
          estoque_minimo?: number | null
          comissao_percentual?: number | null
          duracao_minutos?: number | null
          ativo?: boolean
          created_at?: string
          codigo?: string | null
          unidade_medida?: "unidade" | "pacote" | "kilo" | "litro" | "hora" | "sessao" | "metro" | "caixa" | "par" | "outro" | null
          codigo_barras?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "produtos_servicos_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "empresas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "produtos_servicos_categoria_id_fkey"
            columns: ["categoria_id"]
            isOneToOne: false
            referencedRelation: "categorias"
            referencedColumns: ["id"]
          },
        ]
      }
      recompensas_fidelidade: {
        Row: {
          id: string
          empresa_id: string
          nome: string
          descricao: string | null
          pontos_necessarios: number
          estoque: number | null
          ativo: boolean
          created_at: string
        }
        Insert: {
          id?: string
          empresa_id: string
          nome: string
          descricao?: string | null
          pontos_necessarios: number
          estoque?: number | null
          ativo?: boolean
          created_at?: string
        }
        Update: {
          id?: string
          empresa_id?: string
          nome?: string
          descricao?: string | null
          pontos_necessarios?: number
          estoque?: number | null
          ativo?: boolean
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "recompensas_fidelidade_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "empresas"
            referencedColumns: ["id"]
          },
        ]
      }
      resgates_recompensas: {
        Row: {
          id: string
          empresa_id: string
          cliente_id: string
          recompensa_id: string
          venda_id: string | null
          pontos_usados: number
          nome_recompensa: string
          created_at: string
        }
        Insert: {
          id?: string
          empresa_id: string
          cliente_id: string
          recompensa_id: string
          venda_id?: string | null
          pontos_usados: number
          nome_recompensa: string
          created_at?: string
        }
        Update: {
          id?: string
          empresa_id?: string
          cliente_id?: string
          recompensa_id?: string
          venda_id?: string | null
          pontos_usados?: number
          nome_recompensa?: string
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "resgates_recompensas_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "empresas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "resgates_recompensas_cliente_id_fkey"
            columns: ["cliente_id"]
            isOneToOne: false
            referencedRelation: "clientes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "resgates_recompensas_recompensa_id_fkey"
            columns: ["recompensa_id"]
            isOneToOne: false
            referencedRelation: "recompensas_fidelidade"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "resgates_recompensas_venda_id_fkey"
            columns: ["venda_id"]
            isOneToOne: false
            referencedRelation: "vendas"
            referencedColumns: ["id"]
          },
        ]
      }
      seq_orcamento: {
        Row: {
          empresa_id: string
          ultimo_num: number
        }
        Insert: {
          empresa_id: string
          ultimo_num?: number
        }
        Update: {
          empresa_id?: string
          ultimo_num?: number
        }
        Relationships: [
          {
            foreignKeyName: "seq_orcamento_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "empresas"
            referencedColumns: ["id"]
          },
        ]
      }
      seq_venda: {
        Row: {
          empresa_id: string
          ultimo_num: number
        }
        Insert: {
          empresa_id: string
          ultimo_num?: number
        }
        Update: {
          empresa_id?: string
          ultimo_num?: number
        }
        Relationships: [
          {
            foreignKeyName: "seq_venda_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "empresas"
            referencedColumns: ["id"]
          },
        ]
      }
      sessoes_colaboradores: {
        Row: {
          id: string
          empresa_id: string
          funcionario_id: string
          acao: string
          ip: string | null
          user_agent: string | null
          created_at: string
        }
        Insert: {
          id?: string
          empresa_id: string
          funcionario_id: string
          acao: string
          ip?: string | null
          user_agent?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          empresa_id?: string
          funcionario_id?: string
          acao?: string
          ip?: string | null
          user_agent?: string | null
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "sessoes_colaboradores_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "empresas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sessoes_colaboradores_funcionario_id_fkey"
            columns: ["funcionario_id"]
            isOneToOne: false
            referencedRelation: "funcionarios"
            referencedColumns: ["id"]
          },
        ]
      }
      tarefa_anexos: {
        Row: {
          id: string
          tarefa_id: string
          empresa_id: string
          nome: string
          url: string
          tipo: string
          tamanho: number
          created_at: string
        }
        Insert: {
          id?: string
          tarefa_id: string
          empresa_id: string
          nome: string
          url: string
          tipo?: string
          tamanho?: number
          created_at?: string
        }
        Update: {
          id?: string
          tarefa_id?: string
          empresa_id?: string
          nome?: string
          url?: string
          tipo?: string
          tamanho?: number
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "tarefa_anexos_tarefa_id_fkey"
            columns: ["tarefa_id"]
            isOneToOne: false
            referencedRelation: "tarefas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tarefa_anexos_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "empresas"
            referencedColumns: ["id"]
          },
        ]
      }
      tarefas: {
        Row: {
          id: string
          empresa_id: string
          bloco_id: string | null
          titulo: string
          descricao: string | null
          status: "pendente" | "iniciado" | "concluido"
          prioridade: "baixa" | "media" | "alta" | "urgente"
          prazo: string | null
          posicao: number
          created_at: string | null
        }
        Insert: {
          id?: string
          empresa_id: string
          bloco_id?: string | null
          titulo: string
          descricao?: string | null
          status?: "pendente" | "iniciado" | "concluido"
          prioridade?: "baixa" | "media" | "alta" | "urgente"
          prazo?: string | null
          posicao?: number
          created_at?: string | null
        }
        Update: {
          id?: string
          empresa_id?: string
          bloco_id?: string | null
          titulo?: string
          descricao?: string | null
          status?: "pendente" | "iniciado" | "concluido"
          prioridade?: "baixa" | "media" | "alta" | "urgente"
          prazo?: string | null
          posicao?: number
          created_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "tarefas_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "empresas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tarefas_bloco_id_fkey"
            columns: ["bloco_id"]
            isOneToOne: false
            referencedRelation: "blocos_tarefas"
            referencedColumns: ["id"]
          },
        ]
      }
      tickets_suporte: {
        Row: {
          id: string
          empresa_id: string | null
          assunto: string
          mensagem: string
          status: string
          prioridade: string
          resposta_admin: string | null
          respondido_em: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          empresa_id?: string | null
          assunto: string
          mensagem: string
          status?: string
          prioridade?: string
          resposta_admin?: string | null
          respondido_em?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          empresa_id?: string | null
          assunto?: string
          mensagem?: string
          status?: string
          prioridade?: string
          resposta_admin?: string | null
          respondido_em?: string | null
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "tickets_suporte_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "empresas"
            referencedColumns: ["id"]
          },
        ]
      }
      usuarios_admin: {
        Row: {
          id: string
          user_id: string | null
          nome: string
          email: string
          perfil: string
          ativo: boolean
          created_at: string
        }
        Insert: {
          id?: string
          user_id?: string | null
          nome: string
          email: string
          perfil?: string
          ativo?: boolean
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string | null
          nome?: string
          email?: string
          perfil?: string
          ativo?: boolean
          created_at?: string
        }
        Relationships: []
      }
      valores_receber: {
        Row: {
          id: string
          empresa_id: string
          devedor: string
          valor: number
          data_vencimento: string
          observacoes: string | null
          status: string
          created_at: string
          cora_boleto_id: string | null
          codigo_rastreio: string | null
          valor_recebido: number
        }
        Insert: {
          id?: string
          empresa_id: string
          devedor: string
          valor: number
          data_vencimento: string
          observacoes?: string | null
          status?: string
          created_at?: string
          cora_boleto_id?: string | null
          codigo_rastreio?: string | null
          valor_recebido?: number
        }
        Update: {
          id?: string
          empresa_id?: string
          devedor?: string
          valor?: number
          data_vencimento?: string
          observacoes?: string | null
          status?: string
          created_at?: string
          cora_boleto_id?: string | null
          codigo_rastreio?: string | null
          valor_recebido?: number
        }
        Relationships: [
          {
            foreignKeyName: "valores_receber_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "empresas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "valores_receber_cora_boleto_id_fkey"
            columns: ["cora_boleto_id"]
            isOneToOne: false
            referencedRelation: "cora_boletos"
            referencedColumns: ["id"]
          },
        ]
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
          forma_pagamento: "dinheiro" | "cartao_credito" | "cartao_debito" | "pix" | "outro" | "boleto_cora" | "pix_cora"
          parcelas: number
          status: "concluida" | "cancelada" | "pendente_boleto"
          observacoes: string | null
          created_at: string
          colaborador_id: string | null
          codigo_rastreio: string | null
        }
        Insert: {
          id?: string
          empresa_id: string
          caixa_id?: string | null
          cliente_id?: string | null
          funcionario_id?: string | null
          numero_venda?: number
          subtotal: number
          desconto?: number
          total: number
          forma_pagamento: "dinheiro" | "cartao_credito" | "cartao_debito" | "pix" | "outro" | "boleto_cora" | "pix_cora"
          parcelas?: number
          status?: "concluida" | "cancelada" | "pendente_boleto"
          observacoes?: string | null
          created_at?: string
          colaborador_id?: string | null
          codigo_rastreio?: string | null
        }
        Update: {
          id?: string
          empresa_id?: string
          caixa_id?: string | null
          cliente_id?: string | null
          funcionario_id?: string | null
          numero_venda?: number
          subtotal?: number
          desconto?: number
          total?: number
          forma_pagamento?: "dinheiro" | "cartao_credito" | "cartao_debito" | "pix" | "outro" | "boleto_cora" | "pix_cora"
          parcelas?: number
          status?: "concluida" | "cancelada" | "pendente_boleto"
          observacoes?: string | null
          created_at?: string
          colaborador_id?: string | null
          codigo_rastreio?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "vendas_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "empresas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "vendas_caixa_id_fkey"
            columns: ["caixa_id"]
            isOneToOne: false
            referencedRelation: "caixas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "vendas_cliente_id_fkey"
            columns: ["cliente_id"]
            isOneToOne: false
            referencedRelation: "clientes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "vendas_funcionario_id_fkey"
            columns: ["funcionario_id"]
            isOneToOne: false
            referencedRelation: "funcionarios"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "vendas_colaborador_id_fkey"
            columns: ["colaborador_id"]
            isOneToOne: false
            referencedRelation: "funcionarios"
            referencedColumns: ["id"]
          },
        ]
      }
      vendedores: {
        Row: {
          id: string
          nome: string
          email: string
          telefone: string | null
          comissao_percentual: number
          codigo_indicacao: string
          total_vendas: number
          total_comissao: number
          ativo: boolean
          observacoes: string | null
          created_at: string
        }
        Insert: {
          id?: string
          nome: string
          email: string
          telefone?: string | null
          comissao_percentual?: number
          codigo_indicacao: string
          total_vendas?: number
          total_comissao?: number
          ativo?: boolean
          observacoes?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          nome?: string
          email?: string
          telefone?: string | null
          comissao_percentual?: number
          codigo_indicacao?: string
          total_vendas?: number
          total_comissao?: number
          ativo?: boolean
          observacoes?: string | null
          created_at?: string
        }
        Relationships: []
      }
      visitas_analytics: {
        Row: {
          id: string
          pagina: string
          user_agent: string | null
          created_at: string | null
        }
        Insert: {
          id?: string
          pagina: string
          user_agent?: string | null
          created_at?: string | null
        }
        Update: {
          id?: string
          pagina?: string
          user_agent?: string | null
          created_at?: string | null
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      empresa_pertence_ao_usuario: {
        Args: { emp_id: string }
        Returns: boolean
      }
      gerar_protocolo: {
        Args: Record<PropertyKey, never>
        Returns: string
      }
      get_empresa_id: {
        Args: Record<PropertyKey, never>
        Returns: string
      }
      receber_valor_parcial: {
        Args: { p_id: string; p_valor: number }
        Returns: Database["public"]["Tables"]["valores_receber"]["Row"]
      }
      verificar_usuario_admin: {
        Args: { p_email: string }
        Returns: { ativo: boolean; perfil: string }[]
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type PublicSchema = Database["public"]

export type Tables<T extends keyof PublicSchema["Tables"]> = PublicSchema["Tables"][T]["Row"]
export type TablesInsert<T extends keyof PublicSchema["Tables"]> = PublicSchema["Tables"][T]["Insert"]
export type TablesUpdate<T extends keyof PublicSchema["Tables"]> = PublicSchema["Tables"][T]["Update"]
