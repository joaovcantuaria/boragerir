-- ============================================================
-- Multi-empresa para plano Gestão
-- Adiciona campo max_empresas para controlar quantas empresas
-- um usuário do plano gestão pode gerenciar
-- ============================================================

-- Adicionar coluna max_empresas (NULL = 1 empresa, padrão atual)
ALTER TABLE public.empresas ADD COLUMN IF NOT EXISTS max_empresas INTEGER DEFAULT NULL;

-- Comentário: se max_empresas = 3, o usuário pode ter até 3 empresas vinculadas ao mesmo user_id
-- Apenas a empresa "principal" (primeira criada) precisa ter este campo preenchido
-- As demais empresas do mesmo user_id herdam o limite da principal
