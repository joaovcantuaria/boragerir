-- Migration: Criar tabela tarefa_anexos para upload de documentos em tarefas
-- Executar no Supabase SQL Editor

-- Tabela de anexos
CREATE TABLE IF NOT EXISTS tarefa_anexos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tarefa_id UUID NOT NULL REFERENCES tarefas(id) ON DELETE CASCADE,
  empresa_id UUID NOT NULL REFERENCES empresas(id) ON DELETE CASCADE,
  nome TEXT NOT NULL,
  url TEXT NOT NULL,
  tipo TEXT NOT NULL DEFAULT 'application/octet-stream',
  tamanho BIGINT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Index para busca rápida por tarefa
CREATE INDEX IF NOT EXISTS idx_tarefa_anexos_tarefa_id ON tarefa_anexos(tarefa_id);
CREATE INDEX IF NOT EXISTS idx_tarefa_anexos_empresa_id ON tarefa_anexos(empresa_id);

-- RLS
ALTER TABLE tarefa_anexos ENABLE ROW LEVEL SECURITY;

-- Policy: usuários autenticados podem ver/inserir/deletar anexos da sua empresa
CREATE POLICY "Usuarios podem ver anexos da sua empresa" ON tarefa_anexos
  FOR SELECT USING (
    empresa_id IN (
      SELECT id FROM empresas WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Usuarios podem inserir anexos na sua empresa" ON tarefa_anexos
  FOR INSERT WITH CHECK (
    empresa_id IN (
      SELECT id FROM empresas WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Usuarios podem deletar anexos da sua empresa" ON tarefa_anexos
  FOR DELETE USING (
    empresa_id IN (
      SELECT id FROM empresas WHERE user_id = auth.uid()
    )
  );

-- Criar bucket de storage (executar separadamente se necessário)
-- INSERT INTO storage.buckets (id, name, public) VALUES ('tarefa-anexos', 'tarefa-anexos', true)
-- ON CONFLICT DO NOTHING;
