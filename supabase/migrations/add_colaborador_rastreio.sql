-- Migration: Rastreabilidade — vincular colaborador logado nas ações
-- Adiciona coluna colaborador_id em vendas, caixas e movimentacoes_caixa

-- ─── Vendas ───
ALTER TABLE vendas
ADD COLUMN IF NOT EXISTS colaborador_id UUID REFERENCES funcionarios(id) ON DELETE SET NULL;

COMMENT ON COLUMN vendas.colaborador_id IS 'Colaborador que realizou a venda (login local)';
CREATE INDEX IF NOT EXISTS idx_vendas_colaborador ON vendas(colaborador_id);

-- ─── Caixas ───
ALTER TABLE caixas
ADD COLUMN IF NOT EXISTS colaborador_id UUID REFERENCES funcionarios(id) ON DELETE SET NULL;

ALTER TABLE caixas
ADD COLUMN IF NOT EXISTS colaborador_fechou_id UUID REFERENCES funcionarios(id) ON DELETE SET NULL;

COMMENT ON COLUMN caixas.colaborador_id IS 'Colaborador que abriu o caixa (login local)';
COMMENT ON COLUMN caixas.colaborador_fechou_id IS 'Colaborador que fechou o caixa (login local)';
CREATE INDEX IF NOT EXISTS idx_caixas_colaborador ON caixas(colaborador_id);

-- ─── Movimentações de caixa ───
ALTER TABLE movimentacoes_caixa
ADD COLUMN IF NOT EXISTS colaborador_id UUID REFERENCES funcionarios(id) ON DELETE SET NULL;

COMMENT ON COLUMN movimentacoes_caixa.colaborador_id IS 'Colaborador que registrou a movimentação (login local)';
CREATE INDEX IF NOT EXISTS idx_movimentacoes_colaborador ON movimentacoes_caixa(colaborador_id);
