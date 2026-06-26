-- ============================================================
-- Bora Gerir — Tabelas extras
-- Execute no SQL Editor do Supabase
-- ============================================================

-- 1. Vendedores (sem dependências)
CREATE TABLE IF NOT EXISTS public.vendedores (
  id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  nome                TEXT NOT NULL,
  email               TEXT NOT NULL UNIQUE,
  telefone            TEXT,
  comissao_percentual DECIMAL(5,2) NOT NULL DEFAULT 30,
  codigo_indicacao    TEXT NOT NULL UNIQUE,
  total_vendas        INTEGER NOT NULL DEFAULT 0,
  total_comissao      DECIMAL(10,2) NOT NULL DEFAULT 0,
  ativo               BOOLEAN NOT NULL DEFAULT true,
  observacoes         TEXT,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 2. Cupons (depende de vendedores)
CREATE TABLE IF NOT EXISTS public.cupons (
  id             UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  codigo         TEXT NOT NULL UNIQUE,
  descricao      TEXT,
  tipo           TEXT NOT NULL DEFAULT 'percentual' CHECK (tipo IN ('percentual', 'fixo')),
  valor          DECIMAL(10,2) NOT NULL,
  planos_validos TEXT[] DEFAULT ARRAY['basico','profissional'],
  uso_maximo     INTEGER,
  uso_atual      INTEGER NOT NULL DEFAULT 0,
  ativo          BOOLEAN NOT NULL DEFAULT true,
  validade       TIMESTAMPTZ,
  vendedor_id    UUID REFERENCES public.vendedores(id) ON DELETE SET NULL,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 3. Notificações admin
CREATE TABLE IF NOT EXISTS public.notificacoes_admin (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tipo        TEXT NOT NULL CHECK (tipo IN ('nova_empresa','novo_pagamento','ticket_aberto','cancelamento','erro')),
  titulo      TEXT NOT NULL,
  mensagem    TEXT NOT NULL,
  lida        BOOLEAN NOT NULL DEFAULT false,
  dados       JSONB,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 4. Chat IA
CREATE TABLE IF NOT EXISTS public.chat_ia (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  empresa_id  UUID NOT NULL REFERENCES public.empresas(id) ON DELETE CASCADE,
  role        TEXT NOT NULL CHECK (role IN ('user', 'assistant')),
  conteudo    TEXT NOT NULL,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- RLS
ALTER TABLE public.vendedores          ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cupons              ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notificacoes_admin  ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chat_ia             ENABLE ROW LEVEL SECURITY;

-- Políticas
CREATE POLICY "cupons_select"     ON public.cupons    FOR SELECT USING (true);
CREATE POLICY "chat_ia_select"    ON public.chat_ia   FOR SELECT USING (empresa_id = public.get_empresa_id());
CREATE POLICY "chat_ia_insert"    ON public.chat_ia   FOR INSERT WITH CHECK (empresa_id = public.get_empresa_id());

-- Índices
CREATE INDEX IF NOT EXISTS idx_cupons_codigo    ON public.cupons(codigo);
CREATE INDEX IF NOT EXISTS idx_vendedores_email ON public.vendedores(email);
CREATE INDEX IF NOT EXISTS idx_chat_ia_empresa  ON public.chat_ia(empresa_id);
CREATE INDEX IF NOT EXISTS idx_notif_lida       ON public.notificacoes_admin(lida);

-- Trigger: notificar nova empresa
CREATE OR REPLACE FUNCTION public.notificar_nova_empresa()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.notificacoes_admin (tipo, titulo, mensagem, dados)
  VALUES (
    'nova_empresa',
    'Nova empresa cadastrada',
    'A empresa "' || NEW.nome || '" se cadastrou no plano ' || NEW.plano,
    jsonb_build_object('empresa_id', NEW.id, 'nome', NEW.nome, 'plano', NEW.plano)
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trigger_notif_empresa ON public.empresas;
CREATE TRIGGER trigger_notif_empresa
  AFTER INSERT ON public.empresas
  FOR EACH ROW EXECUTE FUNCTION public.notificar_nova_empresa();

-- Trigger: notificar novo pagamento
CREATE OR REPLACE FUNCTION public.notificar_novo_pagamento()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.status = 'ativa' AND (OLD IS NULL OR OLD.status != 'ativa') THEN
    INSERT INTO public.notificacoes_admin (tipo, titulo, mensagem, dados)
    VALUES (
      'novo_pagamento',
      'Novo pagamento recebido',
      'Plano ' || NEW.plano || ' (' || NEW.periodicidade || ') — R$ ' || NEW.valor_total,
      jsonb_build_object('empresa_id', NEW.empresa_id, 'plano', NEW.plano, 'valor', NEW.valor_total)
    );
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trigger_notif_pagamento ON public.assinaturas;
CREATE TRIGGER trigger_notif_pagamento
  AFTER INSERT OR UPDATE ON public.assinaturas
  FOR EACH ROW EXECUTE FUNCTION public.notificar_novo_pagamento();
