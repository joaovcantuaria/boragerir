-- ============================================================
-- Adicionar tipo e nome ao caixa
-- ============================================================

ALTER TABLE public.caixas ADD COLUMN IF NOT EXISTS tipo_caixa TEXT DEFAULT 'diario' CHECK (tipo_caixa IN ('diario', 'semanal', 'mensal'));
ALTER TABLE public.caixas ADD COLUMN IF NOT EXISTS nome_caixa TEXT DEFAULT NULL;
