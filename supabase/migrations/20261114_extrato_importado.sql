-- ============================================================
-- Importação de extrato (OFX/CSV) no Caixa
--   movimentacoes_caixa.extrato_id = identificador da transação no banco
--   (FITID do OFX / Identificador do CSV do Nubank). Com a restrição única,
--   a mesma linha do extrato nunca entra duas vezes no caixa da empresa.
--   Lançamentos manuais ficam com extrato_id NULL (não conflitam).
-- Pode rodar mais de uma vez.
-- ============================================================

ALTER TABLE public.movimentacoes_caixa
  ADD COLUMN IF NOT EXISTS extrato_id TEXT;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'movimentacoes_caixa_extrato_unico') THEN
    ALTER TABLE public.movimentacoes_caixa
      ADD CONSTRAINT movimentacoes_caixa_extrato_unico UNIQUE (empresa_id, extrato_id);
  END IF;
END $$;
