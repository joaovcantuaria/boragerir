-- Migration: Adicionar PIN de Gerente e controle de acessos
-- Adiciona colunas para controle de acesso por PIN na tabela empresas

ALTER TABLE empresas
ADD COLUMN IF NOT EXISTS pin_gerente TEXT DEFAULT NULL;

ALTER TABLE empresas
ADD COLUMN IF NOT EXISTS restricoes_acesso JSONB DEFAULT '{}'::jsonb;

-- Comentários nas colunas
COMMENT ON COLUMN empresas.pin_gerente IS 'Hash SHA-256 do PIN de gerente (4-6 dígitos)';
COMMENT ON COLUMN empresas.restricoes_acesso IS 'Configurações de restrição de acesso: areas_protegidas (array) e limite_desconto_sem_pin (number)';

-- Exemplo de valor para restricoes_acesso:
-- {
--   "areas_protegidas": ["financeiro", "relatorios", "configuracoes", "produtos_precos", "comissoes", "excluir_vendas"],
--   "limite_desconto_sem_pin": 10
-- }
