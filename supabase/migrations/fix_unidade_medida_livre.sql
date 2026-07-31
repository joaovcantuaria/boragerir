-- Remove constraint que restringe unidade_medida a valores fixos
-- Permite texto livre para unidade de medida personalizada (ex: "Parte", "Peça", "Dose")
ALTER TABLE produtos_servicos DROP CONSTRAINT IF EXISTS produtos_servicos_unidade_medida_check;
ALTER TABLE produtos_servicos ALTER COLUMN unidade_medida TYPE TEXT;
