-- Migration: Integração Cora Pagamentos
-- Tabelas para armazenar contas vinculadas, boletos, transações e log de auditoria

-- ============================================================
-- Tabela: cora_contas
-- Armazena credenciais OAuth2 criptografadas por empresa
-- ============================================================

CREATE TABLE IF NOT EXISTS cora_contas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_id UUID NOT NULL UNIQUE REFERENCES empresas(id) ON DELETE CASCADE,
  cora_account_id TEXT,
  access_token_encrypted TEXT,
  refresh_token_encrypted TEXT,
  token_expires_at TIMESTAMPTZ,
  status TEXT NOT NULL DEFAULT 'ativo' CHECK (status IN ('ativo', 'desconectado', 'erro')),
  webhook_id TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- RLS: empresa só acessa sua própria conta
ALTER TABLE cora_contas ENABLE ROW LEVEL SECURITY;

CREATE POLICY "empresa_own_cora_conta" ON cora_contas
  FOR ALL USING (empresa_id IN (
    SELECT id FROM empresas WHERE user_id = auth.uid()
  ));

-- ============================================================
-- Tabela: cora_boletos
-- Armazena boletos, Pix e carnês emitidos via Cora
-- ============================================================

CREATE TABLE IF NOT EXISTS cora_boletos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_id UUID NOT NULL REFERENCES empresas(id) ON DELETE CASCADE,
  cora_conta_id UUID NOT NULL REFERENCES cora_contas(id),
  cliente_id UUID REFERENCES clientes(id),
  venda_id UUID REFERENCES vendas(id),
  contrato_id UUID REFERENCES contratos(id),
  parcela_id UUID REFERENCES contratos_parcelas(id),
  cora_invoice_id TEXT NOT NULL,
  tipo TEXT NOT NULL CHECK (tipo IN ('boleto', 'pix', 'carne')),
  carne_id TEXT,
  numero_parcela INT,
  valor DECIMAL(10,2) NOT NULL,
  data_vencimento DATE NOT NULL,
  status TEXT NOT NULL DEFAULT 'aberto' CHECK (status IN ('aberto', 'pago', 'vencido', 'cancelado')),
  codigo_barras TEXT,
  linha_digitavel TEXT,
  qr_code_pix TEXT,
  url_pdf TEXT,
  data_pagamento TIMESTAMPTZ,
  data_cancelamento TIMESTAMPTZ,
  motivo_cancelamento TEXT,
  payload_cora JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Índices para consultas frequentes
CREATE INDEX idx_cora_boletos_empresa ON cora_boletos(empresa_id);
CREATE INDEX idx_cora_boletos_status ON cora_boletos(empresa_id, status);
CREATE INDEX idx_cora_boletos_cora_id ON cora_boletos(cora_invoice_id);
CREATE INDEX idx_cora_boletos_venda ON cora_boletos(venda_id);
CREATE INDEX idx_cora_boletos_contrato ON cora_boletos(contrato_id);
CREATE INDEX idx_cora_boletos_carne ON cora_boletos(carne_id);

-- RLS
ALTER TABLE cora_boletos ENABLE ROW LEVEL SECURITY;

CREATE POLICY "empresa_own_cora_boletos" ON cora_boletos
  FOR ALL USING (empresa_id IN (
    SELECT id FROM empresas WHERE user_id = auth.uid()
  ));

-- ============================================================
-- Tabela: cora_transacoes
-- Armazena transferências e recebimentos via Cora
-- ============================================================

CREATE TABLE IF NOT EXISTS cora_transacoes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_id UUID NOT NULL REFERENCES empresas(id) ON DELETE CASCADE,
  cora_conta_id UUID NOT NULL REFERENCES cora_contas(id),
  cora_transfer_id TEXT NOT NULL,
  tipo TEXT NOT NULL CHECK (tipo IN ('transferencia', 'recebimento')),
  valor DECIMAL(10,2) NOT NULL,
  descricao TEXT,
  conta_destino JSONB,
  status TEXT NOT NULL DEFAULT 'iniciada' CHECK (status IN ('iniciada', 'aprovada', 'concluida', 'cancelada', 'estornada')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Índices
CREATE INDEX idx_cora_transacoes_empresa ON cora_transacoes(empresa_id);
CREATE INDEX idx_cora_transacoes_cora_id ON cora_transacoes(cora_transfer_id);

-- RLS
ALTER TABLE cora_transacoes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "empresa_own_cora_transacoes" ON cora_transacoes
  FOR ALL USING (empresa_id IN (
    SELECT id FROM empresas WHERE user_id = auth.uid()
  ));

-- ============================================================
-- Tabela: cora_audit_log
-- Log de auditoria para todas operações financeiras Cora
-- ============================================================

CREATE TABLE IF NOT EXISTS cora_audit_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_id UUID NOT NULL REFERENCES empresas(id),
  user_id UUID NOT NULL,
  operacao TEXT NOT NULL,
  detalhes JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Índice para consulta por empresa em ordem cronológica
CREATE INDEX idx_cora_audit_empresa ON cora_audit_log(empresa_id, created_at DESC);
