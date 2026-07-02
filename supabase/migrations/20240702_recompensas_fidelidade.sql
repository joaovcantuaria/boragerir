-- ============================================================
-- Recompensas/Brindes do Programa de Fidelidade
-- ============================================================

-- Tabela: recompensas_fidelidade (brindes cadastrados pela empresa)
CREATE TABLE IF NOT EXISTS public.recompensas_fidelidade (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  empresa_id  UUID NOT NULL REFERENCES public.empresas(id) ON DELETE CASCADE,
  nome        TEXT NOT NULL,
  descricao   TEXT,
  pontos_necessarios INTEGER NOT NULL CHECK (pontos_necessarios > 0),
  estoque     INTEGER, -- NULL = ilimitado
  ativo       BOOLEAN NOT NULL DEFAULT true,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Tabela: resgates_recompensas (histórico de resgates por cliente)
CREATE TABLE IF NOT EXISTS public.resgates_recompensas (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  empresa_id      UUID NOT NULL REFERENCES public.empresas(id) ON DELETE CASCADE,
  cliente_id      UUID NOT NULL REFERENCES public.clientes(id) ON DELETE CASCADE,
  recompensa_id   UUID NOT NULL REFERENCES public.recompensas_fidelidade(id) ON DELETE CASCADE,
  venda_id        UUID REFERENCES public.vendas(id) ON DELETE SET NULL,
  pontos_usados   INTEGER NOT NULL,
  nome_recompensa TEXT NOT NULL, -- snapshot do nome no momento do resgate
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- RLS
ALTER TABLE public.recompensas_fidelidade ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.resgates_recompensas   ENABLE ROW LEVEL SECURITY;

-- Políticas: recompensas_fidelidade
DO $$ BEGIN
  DROP POLICY IF EXISTS "recompensas_select" ON public.recompensas_fidelidade;
  DROP POLICY IF EXISTS "recompensas_insert" ON public.recompensas_fidelidade;
  DROP POLICY IF EXISTS "recompensas_update" ON public.recompensas_fidelidade;
  DROP POLICY IF EXISTS "recompensas_delete" ON public.recompensas_fidelidade;
END $$;
CREATE POLICY "recompensas_select" ON public.recompensas_fidelidade FOR SELECT USING (empresa_id = public.get_empresa_id());
CREATE POLICY "recompensas_insert" ON public.recompensas_fidelidade FOR INSERT WITH CHECK (empresa_id = public.get_empresa_id());
CREATE POLICY "recompensas_update" ON public.recompensas_fidelidade FOR UPDATE USING (empresa_id = public.get_empresa_id());
CREATE POLICY "recompensas_delete" ON public.recompensas_fidelidade FOR DELETE USING (empresa_id = public.get_empresa_id());

-- Políticas: resgates_recompensas
DO $$ BEGIN
  DROP POLICY IF EXISTS "resgates_select" ON public.resgates_recompensas;
  DROP POLICY IF EXISTS "resgates_insert" ON public.resgates_recompensas;
END $$;
CREATE POLICY "resgates_select" ON public.resgates_recompensas FOR SELECT USING (empresa_id = public.get_empresa_id());
CREATE POLICY "resgates_insert" ON public.resgates_recompensas FOR INSERT WITH CHECK (empresa_id = public.get_empresa_id());

-- Índices
CREATE INDEX IF NOT EXISTS idx_recompensas_empresa ON public.recompensas_fidelidade(empresa_id);
CREATE INDEX IF NOT EXISTS idx_resgates_empresa ON public.resgates_recompensas(empresa_id);
CREATE INDEX IF NOT EXISTS idx_resgates_cliente ON public.resgates_recompensas(cliente_id);
