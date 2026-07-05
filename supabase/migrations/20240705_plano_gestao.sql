-- ============================================================
-- Adicionar plano "gestao" ao CHECK constraint da coluna plano
-- ============================================================

-- Remover constraint antigo
ALTER TABLE public.empresas DROP CONSTRAINT IF EXISTS empresas_plano_check;

-- Criar novo constraint com todos os planos
ALTER TABLE public.empresas ADD CONSTRAINT empresas_plano_check
  CHECK (plano IN ('gratuito', 'basico', 'profissional', 'agenda', 'gestao'));
