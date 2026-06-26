-- ============================================================
-- BeautyFlow — Schema completo do Supabase
-- Execute este script no SQL Editor do seu projeto Supabase
-- ============================================================

-- Habilitar extensão UUID
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================================
-- TABELAS
-- ============================================================

-- Tabela: empresas (multi-tenant — um registro por usuário)
CREATE TABLE IF NOT EXISTS public.empresas (
  id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id             UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  nome                TEXT NOT NULL,
  tipo_documento      TEXT NOT NULL DEFAULT 'cnpj' CHECK (tipo_documento IN ('cpf', 'cnpj')),
  documento           TEXT NOT NULL DEFAULT '',
  area_atuacao        TEXT NOT NULL,
  telefone            TEXT NOT NULL,
  email               TEXT NOT NULL,
  logo_url            TEXT,
  endereco_rua        TEXT NOT NULL DEFAULT '',
  endereco_numero     TEXT NOT NULL DEFAULT '',
  endereco_bairro     TEXT NOT NULL DEFAULT '',
  endereco_cidade     TEXT NOT NULL DEFAULT '',
  endereco_estado     TEXT NOT NULL DEFAULT '',
  endereco_cep        TEXT NOT NULL DEFAULT '',
  plano               TEXT NOT NULL DEFAULT 'gratuito' CHECK (plano IN ('gratuito', 'basico', 'profissional')),
  plano_ativo         BOOLEAN NOT NULL DEFAULT true,
  pontos_por_real     DECIMAL(10,2) NOT NULL DEFAULT 1,
  pontos_para_desconto DECIMAL(10,2) NOT NULL DEFAULT 100,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Tabela: clientes
CREATE TABLE IF NOT EXISTS public.clientes (
  id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  empresa_id          UUID NOT NULL REFERENCES public.empresas(id) ON DELETE CASCADE,
  nome_completo       TEXT NOT NULL,
  cpf                 TEXT NOT NULL,
  email               TEXT,
  telefone            TEXT NOT NULL,
  data_nascimento     DATE,
  observacoes         TEXT,
  pontos_fidelidade   INTEGER NOT NULL DEFAULT 0,
  ativo               BOOLEAN NOT NULL DEFAULT true,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (empresa_id, cpf)
);

-- Tabela: categorias
CREATE TABLE IF NOT EXISTS public.categorias (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  empresa_id  UUID NOT NULL REFERENCES public.empresas(id) ON DELETE CASCADE,
  nome        TEXT NOT NULL,
  tipo        TEXT NOT NULL CHECK (tipo IN ('produto', 'servico')),
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Tabela: produtos_servicos
CREATE TABLE IF NOT EXISTS public.produtos_servicos (
  id                   UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  empresa_id           UUID NOT NULL REFERENCES public.empresas(id) ON DELETE CASCADE,
  categoria_id         UUID REFERENCES public.categorias(id) ON DELETE SET NULL,
  nome                 TEXT NOT NULL,
  tipo                 TEXT NOT NULL CHECK (tipo IN ('produto', 'servico')),
  descricao            TEXT,
  preco                DECIMAL(10,2) NOT NULL,
  custo                DECIMAL(10,2),
  estoque_atual        INTEGER,
  estoque_minimo       INTEGER,
  comissao_percentual  DECIMAL(5,2),
  duracao_minutos      INTEGER,
  ativo                BOOLEAN NOT NULL DEFAULT true,
  created_at           TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Tabela: funcionarios
CREATE TABLE IF NOT EXISTS public.funcionarios (
  id                          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  empresa_id                  UUID NOT NULL REFERENCES public.empresas(id) ON DELETE CASCADE,
  nome                        TEXT NOT NULL,
  cargo                       TEXT NOT NULL,
  telefone                    TEXT,
  email                       TEXT,
  comissao_percentual_padrao  DECIMAL(5,2),
  ativo                       BOOLEAN NOT NULL DEFAULT true,
  created_at                  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Tabela: caixas
CREATE TABLE IF NOT EXISTS public.caixas (
  id                      UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  empresa_id              UUID NOT NULL REFERENCES public.empresas(id) ON DELETE CASCADE,
  data_abertura           TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  data_fechamento         TIMESTAMPTZ,
  valor_abertura          DECIMAL(10,2) NOT NULL DEFAULT 0,
  valor_fechamento        DECIMAL(10,2),
  valor_esperado          DECIMAL(10,2),
  diferenca               DECIMAL(10,2),
  observacoes_abertura    TEXT,
  observacoes_fechamento  TEXT,
  status                  TEXT NOT NULL DEFAULT 'aberto' CHECK (status IN ('aberto', 'fechado')),
  aberto_por              UUID NOT NULL REFERENCES auth.users(id),
  fechado_por             UUID REFERENCES auth.users(id),
  created_at              TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Sequência de número de venda por empresa (via trigger)
CREATE TABLE IF NOT EXISTS public.seq_venda (
  empresa_id  UUID PRIMARY KEY REFERENCES public.empresas(id) ON DELETE CASCADE,
  ultimo_num  INTEGER NOT NULL DEFAULT 0
);

-- Tabela: vendas
CREATE TABLE IF NOT EXISTS public.vendas (
  id               UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  empresa_id       UUID NOT NULL REFERENCES public.empresas(id) ON DELETE CASCADE,
  caixa_id         UUID REFERENCES public.caixas(id) ON DELETE SET NULL,
  cliente_id       UUID REFERENCES public.clientes(id) ON DELETE SET NULL,
  funcionario_id   UUID REFERENCES public.funcionarios(id) ON DELETE SET NULL,
  numero_venda     INTEGER NOT NULL,
  subtotal         DECIMAL(10,2) NOT NULL,
  desconto         DECIMAL(10,2) NOT NULL DEFAULT 0,
  total            DECIMAL(10,2) NOT NULL,
  forma_pagamento  TEXT NOT NULL CHECK (forma_pagamento IN ('dinheiro','cartao_credito','cartao_debito','pix','outro')),
  parcelas         INTEGER NOT NULL DEFAULT 1,
  status           TEXT NOT NULL DEFAULT 'concluida' CHECK (status IN ('concluida', 'cancelada')),
  observacoes      TEXT,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Tabela: itens_venda
CREATE TABLE IF NOT EXISTS public.itens_venda (
  id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  venda_id            UUID NOT NULL REFERENCES public.vendas(id) ON DELETE CASCADE,
  produto_servico_id  UUID NOT NULL REFERENCES public.produtos_servicos(id),
  empresa_id          UUID NOT NULL REFERENCES public.empresas(id) ON DELETE CASCADE,
  nome_item           TEXT NOT NULL,
  quantidade          INTEGER NOT NULL,
  preco_unitario      DECIMAL(10,2) NOT NULL,
  comissao_percentual DECIMAL(5,2),
  comissao_valor      DECIMAL(10,2),
  subtotal            DECIMAL(10,2) NOT NULL,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Sequência de número de orçamento por empresa
CREATE TABLE IF NOT EXISTS public.seq_orcamento (
  empresa_id  UUID PRIMARY KEY REFERENCES public.empresas(id) ON DELETE CASCADE,
  ultimo_num  INTEGER NOT NULL DEFAULT 0
);

-- Tabela: orcamentos
CREATE TABLE IF NOT EXISTS public.orcamentos (
  id               UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  empresa_id       UUID NOT NULL REFERENCES public.empresas(id) ON DELETE CASCADE,
  cliente_id       UUID REFERENCES public.clientes(id) ON DELETE SET NULL,
  numero_orcamento INTEGER NOT NULL,
  titulo           TEXT NOT NULL,
  subtotal         DECIMAL(10,2) NOT NULL,
  desconto         DECIMAL(10,2) NOT NULL DEFAULT 0,
  total            DECIMAL(10,2) NOT NULL,
  validade_dias    INTEGER NOT NULL DEFAULT 30,
  status           TEXT NOT NULL DEFAULT 'pendente' CHECK (status IN ('pendente','aprovado','recusado','expirado')),
  observacoes      TEXT,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Tabela: itens_orcamento
CREATE TABLE IF NOT EXISTS public.itens_orcamento (
  id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  orcamento_id        UUID NOT NULL REFERENCES public.orcamentos(id) ON DELETE CASCADE,
  empresa_id          UUID NOT NULL REFERENCES public.empresas(id) ON DELETE CASCADE,
  produto_servico_id  UUID REFERENCES public.produtos_servicos(id) ON DELETE SET NULL,
  nome_item           TEXT NOT NULL,
  quantidade          INTEGER NOT NULL,
  preco_unitario      DECIMAL(10,2) NOT NULL,
  subtotal            DECIMAL(10,2) NOT NULL,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Tabela: agendamentos
CREATE TABLE IF NOT EXISTS public.agendamentos (
  id                       UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  empresa_id               UUID NOT NULL REFERENCES public.empresas(id) ON DELETE CASCADE,
  cliente_id               UUID REFERENCES public.clientes(id) ON DELETE SET NULL,
  funcionario_id           UUID REFERENCES public.funcionarios(id) ON DELETE SET NULL,
  servico_id               UUID REFERENCES public.produtos_servicos(id) ON DELETE SET NULL,
  data_hora                TIMESTAMPTZ NOT NULL,
  duracao_minutos          INTEGER NOT NULL DEFAULT 60,
  status                   TEXT NOT NULL DEFAULT 'agendado' CHECK (status IN ('agendado','confirmado','concluido','cancelado','faltou')),
  observacoes              TEXT,
  nome_cliente_avulso      TEXT,
  telefone_cliente_avulso  TEXT,
  created_at               TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Tabela: movimentacoes_caixa
CREATE TABLE IF NOT EXISTS public.movimentacoes_caixa (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  empresa_id  UUID NOT NULL REFERENCES public.empresas(id) ON DELETE CASCADE,
  caixa_id    UUID NOT NULL REFERENCES public.caixas(id) ON DELETE CASCADE,
  tipo        TEXT NOT NULL CHECK (tipo IN ('entrada', 'saida')),
  categoria   TEXT NOT NULL CHECK (categoria IN ('venda','sangria','suprimento','despesa','outro')),
  descricao   TEXT NOT NULL,
  valor       DECIMAL(10,2) NOT NULL,
  venda_id    UUID REFERENCES public.vendas(id) ON DELETE SET NULL,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- TRIGGERS — Auto-incremento de número de venda por empresa
-- ============================================================

CREATE OR REPLACE FUNCTION public.set_numero_venda()
RETURNS TRIGGER AS $$
DECLARE
  novo_num INTEGER;
BEGIN
  INSERT INTO public.seq_venda (empresa_id, ultimo_num)
  VALUES (NEW.empresa_id, 1)
  ON CONFLICT (empresa_id) DO UPDATE
    SET ultimo_num = seq_venda.ultimo_num + 1
  RETURNING ultimo_num INTO novo_num;

  NEW.numero_venda := novo_num;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trigger_numero_venda ON public.vendas;
CREATE TRIGGER trigger_numero_venda
  BEFORE INSERT ON public.vendas
  FOR EACH ROW EXECUTE FUNCTION public.set_numero_venda();

-- Auto-incremento de número de orçamento por empresa
CREATE OR REPLACE FUNCTION public.set_numero_orcamento()
RETURNS TRIGGER AS $$
DECLARE
  novo_num INTEGER;
BEGIN
  INSERT INTO public.seq_orcamento (empresa_id, ultimo_num)
  VALUES (NEW.empresa_id, 1)
  ON CONFLICT (empresa_id) DO UPDATE
    SET ultimo_num = seq_orcamento.ultimo_num + 1
  RETURNING ultimo_num INTO novo_num;

  NEW.numero_orcamento := novo_num;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trigger_numero_orcamento ON public.orcamentos;
CREATE TRIGGER trigger_numero_orcamento
  BEFORE INSERT ON public.orcamentos
  FOR EACH ROW EXECUTE FUNCTION public.set_numero_orcamento();

-- ============================================================
-- ROW LEVEL SECURITY (RLS)
-- ============================================================

-- Habilitar RLS em todas as tabelas
ALTER TABLE public.empresas            ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.clientes            ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.categorias          ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.produtos_servicos   ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.funcionarios        ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.caixas              ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.vendas              ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.itens_venda         ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.orcamentos          ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.itens_orcamento     ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.agendamentos        ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.movimentacoes_caixa ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.seq_venda           ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.seq_orcamento       ENABLE ROW LEVEL SECURITY;

-- Função auxiliar: retorna o empresa_id do usuário logado
CREATE OR REPLACE FUNCTION public.get_empresa_id()
RETURNS UUID AS $$
  SELECT id FROM public.empresas WHERE user_id = auth.uid() LIMIT 1;
$$ LANGUAGE sql STABLE SECURITY DEFINER;

-- ---- Políticas: empresas ----
DROP POLICY IF EXISTS "usuarios_podem_ver_propria_empresa" ON public.empresas;
CREATE POLICY "usuarios_podem_ver_propria_empresa" ON public.empresas
  FOR SELECT USING (user_id = auth.uid());

DROP POLICY IF EXISTS "usuarios_podem_criar_empresa" ON public.empresas;
CREATE POLICY "usuarios_podem_criar_empresa" ON public.empresas
  FOR INSERT WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "usuarios_podem_atualizar_propria_empresa" ON public.empresas;
CREATE POLICY "usuarios_podem_atualizar_propria_empresa" ON public.empresas
  FOR UPDATE USING (user_id = auth.uid());

-- Macro para criar políticas CRUD completas para tabelas vinculadas a empresa_id
-- (repete o padrão para cada tabela)

-- ---- Políticas: clientes ----
DO $$ BEGIN
  DROP POLICY IF EXISTS "clientes_select" ON public.clientes;
  DROP POLICY IF EXISTS "clientes_insert" ON public.clientes;
  DROP POLICY IF EXISTS "clientes_update" ON public.clientes;
  DROP POLICY IF EXISTS "clientes_delete" ON public.clientes;
END $$;
CREATE POLICY "clientes_select" ON public.clientes FOR SELECT USING (empresa_id = public.get_empresa_id());
CREATE POLICY "clientes_insert" ON public.clientes FOR INSERT WITH CHECK (empresa_id = public.get_empresa_id());
CREATE POLICY "clientes_update" ON public.clientes FOR UPDATE USING (empresa_id = public.get_empresa_id());
CREATE POLICY "clientes_delete" ON public.clientes FOR DELETE USING (empresa_id = public.get_empresa_id());

-- ---- Políticas: categorias ----
DO $$ BEGIN
  DROP POLICY IF EXISTS "categorias_select" ON public.categorias;
  DROP POLICY IF EXISTS "categorias_insert" ON public.categorias;
  DROP POLICY IF EXISTS "categorias_update" ON public.categorias;
  DROP POLICY IF EXISTS "categorias_delete" ON public.categorias;
END $$;
CREATE POLICY "categorias_select" ON public.categorias FOR SELECT USING (empresa_id = public.get_empresa_id());
CREATE POLICY "categorias_insert" ON public.categorias FOR INSERT WITH CHECK (empresa_id = public.get_empresa_id());
CREATE POLICY "categorias_update" ON public.categorias FOR UPDATE USING (empresa_id = public.get_empresa_id());
CREATE POLICY "categorias_delete" ON public.categorias FOR DELETE USING (empresa_id = public.get_empresa_id());

-- ---- Políticas: produtos_servicos ----
DO $$ BEGIN
  DROP POLICY IF EXISTS "produtos_select" ON public.produtos_servicos;
  DROP POLICY IF EXISTS "produtos_insert" ON public.produtos_servicos;
  DROP POLICY IF EXISTS "produtos_update" ON public.produtos_servicos;
  DROP POLICY IF EXISTS "produtos_delete" ON public.produtos_servicos;
END $$;
CREATE POLICY "produtos_select" ON public.produtos_servicos FOR SELECT USING (empresa_id = public.get_empresa_id());
CREATE POLICY "produtos_insert" ON public.produtos_servicos FOR INSERT WITH CHECK (empresa_id = public.get_empresa_id());
CREATE POLICY "produtos_update" ON public.produtos_servicos FOR UPDATE USING (empresa_id = public.get_empresa_id());
CREATE POLICY "produtos_delete" ON public.produtos_servicos FOR DELETE USING (empresa_id = public.get_empresa_id());

-- ---- Políticas: funcionarios ----
DO $$ BEGIN
  DROP POLICY IF EXISTS "funcionarios_select" ON public.funcionarios;
  DROP POLICY IF EXISTS "funcionarios_insert" ON public.funcionarios;
  DROP POLICY IF EXISTS "funcionarios_update" ON public.funcionarios;
  DROP POLICY IF EXISTS "funcionarios_delete" ON public.funcionarios;
END $$;
CREATE POLICY "funcionarios_select" ON public.funcionarios FOR SELECT USING (empresa_id = public.get_empresa_id());
CREATE POLICY "funcionarios_insert" ON public.funcionarios FOR INSERT WITH CHECK (empresa_id = public.get_empresa_id());
CREATE POLICY "funcionarios_update" ON public.funcionarios FOR UPDATE USING (empresa_id = public.get_empresa_id());
CREATE POLICY "funcionarios_delete" ON public.funcionarios FOR DELETE USING (empresa_id = public.get_empresa_id());

-- ---- Políticas: caixas ----
DO $$ BEGIN
  DROP POLICY IF EXISTS "caixas_select" ON public.caixas;
  DROP POLICY IF EXISTS "caixas_insert" ON public.caixas;
  DROP POLICY IF EXISTS "caixas_update" ON public.caixas;
END $$;
CREATE POLICY "caixas_select" ON public.caixas FOR SELECT USING (empresa_id = public.get_empresa_id());
CREATE POLICY "caixas_insert" ON public.caixas FOR INSERT WITH CHECK (empresa_id = public.get_empresa_id());
CREATE POLICY "caixas_update" ON public.caixas FOR UPDATE USING (empresa_id = public.get_empresa_id());

-- ---- Políticas: vendas ----
DO $$ BEGIN
  DROP POLICY IF EXISTS "vendas_select" ON public.vendas;
  DROP POLICY IF EXISTS "vendas_insert" ON public.vendas;
  DROP POLICY IF EXISTS "vendas_update" ON public.vendas;
END $$;
CREATE POLICY "vendas_select" ON public.vendas FOR SELECT USING (empresa_id = public.get_empresa_id());
CREATE POLICY "vendas_insert" ON public.vendas FOR INSERT WITH CHECK (empresa_id = public.get_empresa_id());
CREATE POLICY "vendas_update" ON public.vendas FOR UPDATE USING (empresa_id = public.get_empresa_id());

-- ---- Políticas: itens_venda ----
DO $$ BEGIN
  DROP POLICY IF EXISTS "itens_venda_select" ON public.itens_venda;
  DROP POLICY IF EXISTS "itens_venda_insert" ON public.itens_venda;
END $$;
CREATE POLICY "itens_venda_select" ON public.itens_venda FOR SELECT USING (empresa_id = public.get_empresa_id());
CREATE POLICY "itens_venda_insert" ON public.itens_venda FOR INSERT WITH CHECK (empresa_id = public.get_empresa_id());

-- ---- Políticas: orcamentos ----
DO $$ BEGIN
  DROP POLICY IF EXISTS "orcamentos_select" ON public.orcamentos;
  DROP POLICY IF EXISTS "orcamentos_insert" ON public.orcamentos;
  DROP POLICY IF EXISTS "orcamentos_update" ON public.orcamentos;
END $$;
CREATE POLICY "orcamentos_select" ON public.orcamentos FOR SELECT USING (empresa_id = public.get_empresa_id());
CREATE POLICY "orcamentos_insert" ON public.orcamentos FOR INSERT WITH CHECK (empresa_id = public.get_empresa_id());
CREATE POLICY "orcamentos_update" ON public.orcamentos FOR UPDATE USING (empresa_id = public.get_empresa_id());

-- ---- Políticas: itens_orcamento ----
DO $$ BEGIN
  DROP POLICY IF EXISTS "itens_orcamento_select" ON public.itens_orcamento;
  DROP POLICY IF EXISTS "itens_orcamento_insert" ON public.itens_orcamento;
END $$;
CREATE POLICY "itens_orcamento_select" ON public.itens_orcamento FOR SELECT USING (empresa_id = public.get_empresa_id());
CREATE POLICY "itens_orcamento_insert" ON public.itens_orcamento FOR INSERT WITH CHECK (empresa_id = public.get_empresa_id());

-- ---- Políticas: agendamentos ----
DO $$ BEGIN
  DROP POLICY IF EXISTS "agendamentos_select" ON public.agendamentos;
  DROP POLICY IF EXISTS "agendamentos_insert" ON public.agendamentos;
  DROP POLICY IF EXISTS "agendamentos_update" ON public.agendamentos;
END $$;
CREATE POLICY "agendamentos_select" ON public.agendamentos FOR SELECT USING (empresa_id = public.get_empresa_id());
CREATE POLICY "agendamentos_insert" ON public.agendamentos FOR INSERT WITH CHECK (empresa_id = public.get_empresa_id());
CREATE POLICY "agendamentos_update" ON public.agendamentos FOR UPDATE USING (empresa_id = public.get_empresa_id());

-- ---- Políticas: movimentacoes_caixa ----
DO $$ BEGIN
  DROP POLICY IF EXISTS "movimentacoes_select" ON public.movimentacoes_caixa;
  DROP POLICY IF EXISTS "movimentacoes_insert" ON public.movimentacoes_caixa;
END $$;
CREATE POLICY "movimentacoes_select" ON public.movimentacoes_caixa FOR SELECT USING (empresa_id = public.get_empresa_id());
CREATE POLICY "movimentacoes_insert" ON public.movimentacoes_caixa FOR INSERT WITH CHECK (empresa_id = public.get_empresa_id());

-- ---- Políticas: seq_venda e seq_orcamento (acesso via SECURITY DEFINER) ----
DROP POLICY IF EXISTS "seq_venda_all" ON public.seq_venda;
CREATE POLICY "seq_venda_all" ON public.seq_venda FOR ALL USING (empresa_id = public.get_empresa_id());

DROP POLICY IF EXISTS "seq_orcamento_all" ON public.seq_orcamento;
CREATE POLICY "seq_orcamento_all" ON public.seq_orcamento FOR ALL USING (empresa_id = public.get_empresa_id());

-- ============================================================
-- ÍNDICES para performance
-- ============================================================
CREATE INDEX IF NOT EXISTS idx_clientes_empresa ON public.clientes(empresa_id);
CREATE INDEX IF NOT EXISTS idx_clientes_cpf ON public.clientes(empresa_id, cpf);
CREATE INDEX IF NOT EXISTS idx_vendas_empresa ON public.vendas(empresa_id);
CREATE INDEX IF NOT EXISTS idx_vendas_created ON public.vendas(empresa_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_agendamentos_empresa ON public.agendamentos(empresa_id);
CREATE INDEX IF NOT EXISTS idx_agendamentos_data ON public.agendamentos(empresa_id, data_hora);
CREATE INDEX IF NOT EXISTS idx_movimentacoes_caixa ON public.movimentacoes_caixa(caixa_id);
CREATE INDEX IF NOT EXISTS idx_produtos_empresa ON public.produtos_servicos(empresa_id);

-- ============================================================
-- STORAGE — Bucket para logos das empresas
-- ============================================================
INSERT INTO storage.buckets (id, name, public)
VALUES ('logos', 'logos', true)
ON CONFLICT DO NOTHING;

CREATE POLICY "logos_upload" ON storage.objects
  FOR INSERT WITH CHECK (bucket_id = 'logos' AND auth.role() = 'authenticated');

CREATE POLICY "logos_select" ON storage.objects
  FOR SELECT USING (bucket_id = 'logos');

-- ============================================================
-- FIM DO SCHEMA
-- ============================================================
