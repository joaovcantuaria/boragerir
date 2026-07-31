-- Migration: Dashboard personalizável
-- Tabela para salvar layout da dashboard por empresa

CREATE TABLE IF NOT EXISTS dashboard_layouts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_id UUID NOT NULL REFERENCES empresas(id) ON DELETE CASCADE,
  layout JSONB NOT NULL DEFAULT '[]',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(empresa_id)
);

-- RLS
ALTER TABLE dashboard_layouts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Usuarios podem ver layout da sua empresa" ON dashboard_layouts
  FOR SELECT USING (
    empresa_id IN (SELECT id FROM empresas WHERE user_id = auth.uid())
  );

CREATE POLICY "Usuarios podem inserir layout da sua empresa" ON dashboard_layouts
  FOR INSERT WITH CHECK (
    empresa_id IN (SELECT id FROM empresas WHERE user_id = auth.uid())
  );

CREATE POLICY "Usuarios podem atualizar layout da sua empresa" ON dashboard_layouts
  FOR UPDATE USING (
    empresa_id IN (SELECT id FROM empresas WHERE user_id = auth.uid())
  );
