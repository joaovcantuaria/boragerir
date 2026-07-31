-- ============================================================
-- Tipo de conta do caixa (especie/banco) para plano gestão
-- Permite múltiplos caixas abertos simultaneamente
-- ============================================================

ALTER TABLE public.caixas ADD COLUMN IF NOT EXISTS tipo_conta TEXT DEFAULT 'especie' CHECK (tipo_conta IN ('especie', 'banco'));
