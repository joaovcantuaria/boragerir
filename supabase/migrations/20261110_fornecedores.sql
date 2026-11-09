-- ============================================================
-- Fornecedores: cadastro por empresa e vínculo opcional com contas a pagar
-- (conta sem fornecedor continua valendo: é o lançamento "avulso")
-- ============================================================

CREATE TABLE IF NOT EXISTS public.fornecedores (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_id   UUID NOT NULL REFERENCES public.empresas(id) ON DELETE CASCADE,
  nome         TEXT NOT NULL,                 -- razão social ou nome fantasia
  documento    TEXT,                          -- CPF ou CNPJ (só números)
  contato      TEXT,                          -- pessoa de contato
  telefone     TEXT,
  email        TEXT,
  categoria    TEXT NOT NULL DEFAULT 'fornecedor',  -- mesma lista das contas a pagar
  chave_pix    TEXT,
  endereco     TEXT,
  observacoes  TEXT,
  ativo        BOOLEAN NOT NULL DEFAULT true,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_fornecedores_empresa ON public.fornecedores(empresa_id, ativo, nome);

ALTER TABLE public.fornecedores ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "empresa_own_fornecedores" ON public.fornecedores;
CREATE POLICY "empresa_own_fornecedores" ON public.fornecedores
  FOR ALL
  USING (empresa_id IN (SELECT id FROM public.empresas WHERE user_id = auth.uid()))
  WITH CHECK (empresa_id IN (SELECT id FROM public.empresas WHERE user_id = auth.uid()));

-- Conta a pagar pode apontar para um fornecedor (ou ficar sem, como hoje)
ALTER TABLE public.contas_pagar
  ADD COLUMN IF NOT EXISTS fornecedor_id UUID REFERENCES public.fornecedores(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_contas_pagar_fornecedor ON public.contas_pagar(fornecedor_id) WHERE fornecedor_id IS NOT NULL;
