-- ============================================================
-- Valores a Receber (manual) — para plano gestão
-- ============================================================

CREATE TABLE IF NOT EXISTS public.valores_receber (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  empresa_id      UUID NOT NULL REFERENCES public.empresas(id) ON DELETE CASCADE,
  devedor         TEXT NOT NULL,
  valor           DECIMAL(10,2) NOT NULL,
  data_vencimento DATE NOT NULL,
  observacoes     TEXT,
  status          TEXT NOT NULL DEFAULT 'pendente' CHECK (status IN ('pendente', 'recebido', 'atrasado')),
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.valores_receber ENABLE ROW LEVEL SECURITY;

CREATE POLICY "valores_receber_select" ON public.valores_receber FOR SELECT USING (empresa_id = public.get_empresa_id());
CREATE POLICY "valores_receber_insert" ON public.valores_receber FOR INSERT WITH CHECK (empresa_id = public.get_empresa_id());
CREATE POLICY "valores_receber_update" ON public.valores_receber FOR UPDATE USING (empresa_id = public.get_empresa_id());
CREATE POLICY "valores_receber_delete" ON public.valores_receber FOR DELETE USING (empresa_id = public.get_empresa_id());

CREATE INDEX IF NOT EXISTS idx_valores_receber_empresa ON public.valores_receber(empresa_id);
