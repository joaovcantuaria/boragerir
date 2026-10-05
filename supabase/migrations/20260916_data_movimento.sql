-- Adicionar coluna data_movimento em movimentacoes_caixa
-- para armazenar a data real da movimentação (suporta lançamentos retroativos)
ALTER TABLE movimentacoes_caixa 
ADD COLUMN IF NOT EXISTS data_movimento DATE;

-- Preencher data_movimento com a data do created_at para registros existentes
UPDATE movimentacoes_caixa 
SET data_movimento = created_at::date 
WHERE data_movimento IS NULL;

-- Índice para consultas por data
CREATE INDEX IF NOT EXISTS idx_movimentacoes_data_movimento 
ON movimentacoes_caixa(empresa_id, data_movimento);
