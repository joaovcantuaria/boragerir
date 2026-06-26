-- ============================================================
-- Bora Gerir — Tabelas do Painel Admin
-- Execute no SQL Editor do Supabase
-- ============================================================

-- Tabela de configurações do sistema (preços, benefícios, etc.)
CREATE TABLE IF NOT EXISTS public.configuracoes_sistema (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  chave       TEXT NOT NULL UNIQUE,
  valor       JSONB NOT NULL,
  descricao   TEXT,
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Inserir configurações padrão dos planos
INSERT INTO public.configuracoes_sistema (chave, valor, descricao) VALUES
(
  'planos',
  '{
    "gratuito": {
      "nome": "Gratuito",
      "preco_mensal": 0,
      "preco_anual": 0,
      "limite_clientes": 30,
      "limite_produtos": 3,
      "limite_funcionarios": 0,
      "agendamento": false,
      "fidelidade": false,
      "lembretes": false,
      "marca_dagua": true,
      "suporte": "comunidade",
      "recursos": ["Até 30 clientes", "Até 3 produtos/serviços", "1 usuário", "Relatórios básicos"]
    },
    "basico": {
      "nome": "Básico",
      "preco_mensal": 49,
      "preco_anual": 490,
      "limite_clientes": 200,
      "limite_produtos": -1,
      "limite_funcionarios": 3,
      "agendamento": true,
      "fidelidade": false,
      "lembretes": false,
      "marca_dagua": false,
      "suporte": "email",
      "recursos": ["Até 200 clientes", "Produtos ilimitados", "Até 3 funcionários", "Agendamentos", "Relatórios completos"]
    },
    "profissional": {
      "nome": "Profissional",
      "preco_mensal": 99,
      "preco_anual": 990,
      "limite_clientes": -1,
      "limite_produtos": -1,
      "limite_funcionarios": -1,
      "agendamento": true,
      "fidelidade": true,
      "lembretes": true,
      "marca_dagua": false,
      "suporte": "prioritario",
      "recursos": ["Clientes ilimitados", "Produtos ilimitados", "Equipe ilimitada", "Agendamentos", "Programa de fidelidade", "Lembretes automáticos", "Relatórios avançados"]
    }
  }',
  'Configurações e preços dos planos'
),
(
  'app_config',
  '{
    "nome": "Bora Gerir",
    "slogan": "Gestão simples. Resultado de verdade.",
    "site": "https://app.boragerir.com",
    "suporte_email": "contato@boragerir.com",
    "trial_dias": 14
  }',
  'Configurações gerais do app'
)
ON CONFLICT (chave) DO NOTHING;

-- Tabela de tickets de suporte
CREATE TABLE IF NOT EXISTS public.tickets_suporte (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  empresa_id    UUID REFERENCES public.empresas(id) ON DELETE CASCADE,
  assunto       TEXT NOT NULL,
  mensagem      TEXT NOT NULL,
  status        TEXT NOT NULL DEFAULT 'aberto' CHECK (status IN ('aberto', 'em_andamento', 'resolvido', 'fechado')),
  prioridade    TEXT NOT NULL DEFAULT 'normal' CHECK (prioridade IN ('baixa', 'normal', 'alta', 'urgente')),
  resposta_admin TEXT,
  respondido_em TIMESTAMPTZ,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Tabela de notas internas por empresa
CREATE TABLE IF NOT EXISTS public.notas_admin (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  empresa_id  UUID NOT NULL REFERENCES public.empresas(id) ON DELETE CASCADE,
  nota        TEXT NOT NULL,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- RLS — somente service role acessa (admin usa service role key)
ALTER TABLE public.configuracoes_sistema ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tickets_suporte       ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notas_admin           ENABLE ROW LEVEL SECURITY;

-- Configurações: leitura pública (para o app ler os preços)
CREATE POLICY "config_select_public" ON public.configuracoes_sistema
  FOR SELECT USING (true);

-- Tickets: empresa vê só os seus
CREATE POLICY "tickets_select" ON public.tickets_suporte
  FOR SELECT USING (empresa_id = public.get_empresa_id());
CREATE POLICY "tickets_insert" ON public.tickets_suporte
  FOR INSERT WITH CHECK (empresa_id = public.get_empresa_id());

-- Índices
CREATE INDEX IF NOT EXISTS idx_tickets_empresa ON public.tickets_suporte(empresa_id);
CREATE INDEX IF NOT EXISTS idx_tickets_status  ON public.tickets_suporte(status);
CREATE INDEX IF NOT EXISTS idx_notas_empresa   ON public.notas_admin(empresa_id);
