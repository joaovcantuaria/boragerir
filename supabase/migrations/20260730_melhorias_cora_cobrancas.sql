-- Migration: Melhorias Cora Cobranças
-- Alterações no schema para suportar: Pix Online, Boleto no PDV (pendente_boleto),
-- Valores a Receber com boleto, e Contratos com entrada + toggle boleto/carnê

-- 1. Vendas: adicionar 'pendente_boleto' como status válido
-- Nota: se não houver constraint existente, adicionar nova
DO $$
BEGIN
  -- Tentar dropar constraint existente (se houver)
  ALTER TABLE vendas DROP CONSTRAINT IF EXISTS vendas_status_check;
EXCEPTION WHEN OTHERS THEN
  NULL;
END $$;

-- Não adicionar CHECK constraint pois o campo status é TEXT livre no Supabase
-- O valor 'pendente_boleto' será usado diretamente pelo código

-- 2. cora_boletos: adicionar coluna valor_receber_id
ALTER TABLE cora_boletos ADD COLUMN IF NOT EXISTS valor_receber_id UUID REFERENCES valores_receber(id);
CREATE INDEX IF NOT EXISTS idx_cora_boletos_valor_receber ON cora_boletos(valor_receber_id);

-- 3. valores_receber: adicionar coluna cora_boleto_id  
ALTER TABLE valores_receber ADD COLUMN IF NOT EXISTS cora_boleto_id UUID REFERENCES cora_boletos(id);

-- 4. contratos: adicionar colunas para tipo de cobrança e entrada
ALTER TABLE contratos ADD COLUMN IF NOT EXISTS tipo_cobranca TEXT DEFAULT 'manual';
ALTER TABLE contratos ADD COLUMN IF NOT EXISTS entrada_valor DECIMAL(10,2) DEFAULT 0;
ALTER TABLE contratos ADD COLUMN IF NOT EXISTS entrada_forma_pagamento TEXT;
