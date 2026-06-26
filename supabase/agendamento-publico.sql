-- Adicionar slug único para cada empresa (link de agendamento público)
ALTER TABLE public.empresas
  ADD COLUMN IF NOT EXISTS slug TEXT UNIQUE;

-- Gerar slugs para empresas existentes
UPDATE public.empresas
SET slug = LOWER(REGEXP_REPLACE(nome, '[^a-zA-Z0-9]', '-', 'g')) || '-' || SUBSTRING(id::text, 1, 6)
WHERE slug IS NULL;

-- Índice para busca rápida por slug
CREATE INDEX IF NOT EXISTS idx_empresas_slug ON public.empresas(slug);

-- Política: qualquer um pode buscar empresa pelo slug (para a página pública)
CREATE POLICY "empresa_slug_publico" ON public.empresas
  FOR SELECT USING (true);

-- Política: qualquer um pode inserir agendamento (página pública)
DROP POLICY IF EXISTS "agendamentos_insert_publico" ON public.agendamentos;
CREATE POLICY "agendamentos_insert_publico" ON public.agendamentos
  FOR INSERT WITH CHECK (true);

-- Política: produtos/serviços visíveis publicamente para o link de agendamento
DROP POLICY IF EXISTS "produtos_select_publico" ON public.produtos_servicos;
CREATE POLICY "produtos_select_publico" ON public.produtos_servicos
  FOR SELECT USING (ativo = true);

-- Política: funcionários visíveis publicamente
DROP POLICY IF EXISTS "funcionarios_select_publico" ON public.funcionarios;
CREATE POLICY "funcionarios_select_publico" ON public.funcionarios
  FOR SELECT USING (ativo = true);
