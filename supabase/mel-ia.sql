-- ============================================================
-- Bora Gerir — Mel IA (versão corrigida — idempotente)
-- Execute no SQL Editor do Supabase
-- ============================================================

-- Tabela de conversas da Mel
CREATE TABLE IF NOT EXISTS public.conversas_mel (
  id                UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  empresa_id        UUID NOT NULL REFERENCES public.empresas(id) ON DELETE CASCADE,
  protocolo         TEXT NOT NULL UNIQUE,
  titulo            TEXT,
  nome_usuario      TEXT,
  status            TEXT NOT NULL DEFAULT 'aberto' CHECK (status IN ('aberto', 'resolvido', 'encaminhado')),
  resolvido_por_ia  BOOLEAN DEFAULT false,
  gerou_ticket      BOOLEAN DEFAULT false,
  ticket_id         UUID REFERENCES public.tickets_suporte(id) ON DELETE SET NULL,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Tabela de mensagens de cada conversa
CREATE TABLE IF NOT EXISTS public.mensagens_mel (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  conversa_id   UUID NOT NULL REFERENCES public.conversas_mel(id) ON DELETE CASCADE,
  empresa_id    UUID NOT NULL REFERENCES public.empresas(id) ON DELETE CASCADE,
  role          TEXT NOT NULL CHECK (role IN ('user', 'assistant')),
  conteudo      TEXT NOT NULL,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- RLS
ALTER TABLE public.conversas_mel ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.mensagens_mel ENABLE ROW LEVEL SECURITY;

-- Remover políticas existentes antes de recriar
DROP POLICY IF EXISTS "conversas_mel_select" ON public.conversas_mel;
DROP POLICY IF EXISTS "conversas_mel_insert" ON public.conversas_mel;
DROP POLICY IF EXISTS "conversas_mel_update" ON public.conversas_mel;
DROP POLICY IF EXISTS "mensagens_mel_select" ON public.mensagens_mel;
DROP POLICY IF EXISTS "mensagens_mel_insert" ON public.mensagens_mel;

-- Recriar políticas
CREATE POLICY "conversas_mel_select" ON public.conversas_mel
  FOR SELECT USING (empresa_id = public.get_empresa_id());
CREATE POLICY "conversas_mel_insert" ON public.conversas_mel
  FOR INSERT WITH CHECK (empresa_id = public.get_empresa_id());
CREATE POLICY "conversas_mel_update" ON public.conversas_mel
  FOR UPDATE USING (empresa_id = public.get_empresa_id());

CREATE POLICY "mensagens_mel_select" ON public.mensagens_mel
  FOR SELECT USING (empresa_id = public.get_empresa_id());
CREATE POLICY "mensagens_mel_insert" ON public.mensagens_mel
  FOR INSERT WITH CHECK (empresa_id = public.get_empresa_id());

-- Índices
CREATE INDEX IF NOT EXISTS idx_conversas_empresa  ON public.conversas_mel(empresa_id);
CREATE INDEX IF NOT EXISTS idx_conversas_status   ON public.conversas_mel(status);
CREATE INDEX IF NOT EXISTS idx_mensagens_conversa ON public.mensagens_mel(conversa_id);

-- Trigger: atualizar updated_at da conversa quando nova mensagem
CREATE OR REPLACE FUNCTION public.atualizar_conversa_mel()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE public.conversas_mel
  SET updated_at = NOW()
  WHERE id = NEW.conversa_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trigger_atualizar_conversa ON public.mensagens_mel;
CREATE TRIGGER trigger_atualizar_conversa
  AFTER INSERT ON public.mensagens_mel
  FOR EACH ROW EXECUTE FUNCTION public.atualizar_conversa_mel();

-- Função para gerar protocolo único
CREATE OR REPLACE FUNCTION public.gerar_protocolo()
RETURNS TEXT AS $$
BEGIN
  RETURN 'MEL-' || TO_CHAR(NOW(), 'YYYYMMDD') || '-' || LPAD(FLOOR(RANDOM() * 99999)::TEXT, 5, '0');
END;
$$ LANGUAGE plpgsql;
