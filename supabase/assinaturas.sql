-- ============================================================
-- Bora Gerir — Tabela de Assinaturas (Mercado Pago)
-- Execute após o schema.sql principal
-- ============================================================

CREATE TABLE IF NOT EXISTS public.assinaturas (
  id                    UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  empresa_id            UUID NOT NULL REFERENCES public.empresas(id) ON DELETE CASCADE,
  plano                 TEXT NOT NULL CHECK (plano IN ('basico', 'profissional')),
  periodicidade         TEXT NOT NULL CHECK (periodicidade IN ('mensal', 'anual')),
  status                TEXT NOT NULL DEFAULT 'pendente'
                        CHECK (status IN ('pendente', 'ativa', 'pausada', 'cancelada', 'expirada')),
  -- Mercado Pago
  mp_subscription_id    TEXT,          -- ID da assinatura recorrente no MP
  mp_payment_id         TEXT,          -- ID do último pagamento
  mp_preapproval_id     TEXT,          -- ID do pre-approval (cartão)
  mp_pix_qr_code        TEXT,          -- QR code Pix (base64)
  mp_pix_qr_code_text   TEXT,          -- Código Pix copia e cola
  mp_pix_payment_id     TEXT,          -- ID do pagamento Pix
  -- Datas
  data_inicio           TIMESTAMPTZ,
  data_fim              TIMESTAMPTZ,
  proximo_vencimento    TIMESTAMPTZ,
  -- Valores
  valor_mensal          DECIMAL(10,2) NOT NULL,
  valor_total           DECIMAL(10,2) NOT NULL,
  -- Forma de pagamento
  forma_pagamento       TEXT CHECK (forma_pagamento IN ('cartao', 'pix')),
  created_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at            TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Índices
CREATE INDEX IF NOT EXISTS idx_assinaturas_empresa ON public.assinaturas(empresa_id);
CREATE INDEX IF NOT EXISTS idx_assinaturas_status  ON public.assinaturas(status);
CREATE INDEX IF NOT EXISTS idx_assinaturas_mp_sub  ON public.assinaturas(mp_subscription_id);

-- RLS
ALTER TABLE public.assinaturas ENABLE ROW LEVEL SECURITY;

CREATE POLICY "assinaturas_select" ON public.assinaturas
  FOR SELECT USING (empresa_id = public.get_empresa_id());

CREATE POLICY "assinaturas_insert" ON public.assinaturas
  FOR INSERT WITH CHECK (empresa_id = public.get_empresa_id());

CREATE POLICY "assinaturas_update" ON public.assinaturas
  FOR UPDATE USING (empresa_id = public.get_empresa_id());

-- Trigger updated_at
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_assinaturas_updated_at ON public.assinaturas;
CREATE TRIGGER trigger_assinaturas_updated_at
  BEFORE UPDATE ON public.assinaturas
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
