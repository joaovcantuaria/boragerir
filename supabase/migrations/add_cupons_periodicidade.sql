-- Adicionar campos de periodicidade e primeiro mês na tabela cupons
ALTER TABLE cupons ADD COLUMN IF NOT EXISTS periodicidades_validas TEXT[] DEFAULT '{}';
ALTER TABLE cupons ADD COLUMN IF NOT EXISTS apenas_primeiro_mes BOOLEAN DEFAULT false;

COMMENT ON COLUMN cupons.periodicidades_validas IS 'Array de periodicidades válidas (mensal, anual). Vazio = todas.';
COMMENT ON COLUMN cupons.apenas_primeiro_mes IS 'Se true, cupom só vale para quem nunca teve assinatura ativa.';
