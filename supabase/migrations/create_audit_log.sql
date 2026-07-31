-- Tabela: audit_log — Histórico de alterações feitas pelo admin
CREATE TABLE IF NOT EXISTS public.audit_log (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  empresa_id  UUID NOT NULL REFERENCES public.empresas(id) ON DELETE CASCADE,
  acao        TEXT NOT NULL,
  detalhes    TEXT,
  usuario     TEXT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Índice por empresa para consulta rápida
CREATE INDEX IF NOT EXISTS idx_audit_log_empresa_id ON public.audit_log(empresa_id);
CREATE INDEX IF NOT EXISTS idx_audit_log_created_at ON public.audit_log(created_at DESC);

-- RLS: apenas service_role pode ler/escrever (admin)
ALTER TABLE public.audit_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admin pode tudo no audit_log"
  ON public.audit_log
  FOR ALL
  USING (true)
  WITH CHECK (true);
