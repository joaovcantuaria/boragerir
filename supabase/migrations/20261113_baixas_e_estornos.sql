-- ============================================================
-- Baixas parciais em Contas a Pagar + editar/cancelar lançamentos do caixa
--   • contas_pagar.valor_pago  (em aberto = valor - valor_pago)
--   • pagar_conta_parcial()     soma um pagamento de forma atômica
--   • movimentacoes_caixa ganha vínculo com o valor a receber / conta a pagar
--     que gerou o lançamento → cancelar ou editar ajusta a conta automaticamente
--   • movimentacoes_canceladas  histórico de tudo que foi cancelado (com motivo)
-- Requer a migration 20261112_receber_parcial.sql. Pode rodar mais de uma vez.
-- ============================================================

-- ── 1. Contas a pagar: valor já pago ──────────────────────────
ALTER TABLE public.contas_pagar
  ADD COLUMN IF NOT EXISTS valor_pago DECIMAL(10,2) NOT NULL DEFAULT 0;

UPDATE public.contas_pagar
   SET valor_pago = valor
 WHERE status = 'pago' AND valor_pago <> valor;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'contas_pagar_valor_pago_chk') THEN
    ALTER TABLE public.contas_pagar
      ADD CONSTRAINT contas_pagar_valor_pago_chk CHECK (valor_pago >= 0);
  END IF;
END $$;

-- Coerência automática (mesma regra do A Receber):
--   virou 'pago'                       → valor_pago = valor
--   saiu de 'pago' (estorno antigo)     → zera valor_pago
--   valor_pago alcançou o valor         → 'pago'
CREATE OR REPLACE FUNCTION public.contas_pagar_coerencia()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  IF NEW.status = 'pago'
     AND (TG_OP = 'INSERT' OR OLD.status IS DISTINCT FROM 'pago') THEN
    NEW.valor_pago := NEW.valor;
    NEW.data_pagamento := COALESCE(NEW.data_pagamento, now());
  ELSIF TG_OP = 'UPDATE' AND OLD.status = 'pago' AND NEW.status <> 'pago'
        AND NEW.valor_pago >= NEW.valor THEN
    NEW.valor_pago := 0;
  ELSIF NEW.status <> 'pago' AND NEW.valor > 0 AND NEW.valor_pago >= NEW.valor THEN
    NEW.status := 'pago';
    NEW.data_pagamento := COALESCE(NEW.data_pagamento, now());
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_contas_pagar_coerencia ON public.contas_pagar;
CREATE TRIGGER trg_contas_pagar_coerencia
  BEFORE INSERT OR UPDATE ON public.contas_pagar
  FOR EACH ROW EXECUTE FUNCTION public.contas_pagar_coerencia();

-- A Receber ganha a mesma regra de estorno (saiu de 'recebido' → zera)
CREATE OR REPLACE FUNCTION public.valores_receber_coerencia()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  IF NEW.status = 'recebido'
     AND (TG_OP = 'INSERT' OR OLD.status IS DISTINCT FROM 'recebido') THEN
    NEW.valor_recebido := NEW.valor;
  ELSIF TG_OP = 'UPDATE' AND OLD.status = 'recebido' AND NEW.status <> 'recebido'
        AND NEW.valor_recebido >= NEW.valor THEN
    NEW.valor_recebido := 0;
  ELSIF NEW.status <> 'recebido' AND NEW.valor > 0 AND NEW.valor_recebido >= NEW.valor THEN
    NEW.status := 'recebido';
  END IF;
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.pagar_conta_parcial(p_id UUID, p_valor NUMERIC)
RETURNS public.contas_pagar
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
DECLARE
  v_linha public.contas_pagar;
  v_valor NUMERIC := round(p_valor, 2);
BEGIN
  IF v_valor IS NULL OR v_valor <= 0 THEN
    RAISE EXCEPTION 'Informe um valor maior que zero';
  END IF;
  SELECT * INTO v_linha FROM public.contas_pagar WHERE id = p_id FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Conta a pagar não encontrada';
  END IF;
  IF v_linha.status = 'pago' THEN
    RAISE EXCEPTION 'Esta conta já foi paga por completo';
  END IF;
  IF v_valor > v_linha.valor - v_linha.valor_pago THEN
    RAISE EXCEPTION 'Valor maior que o saldo em aberto (%)', v_linha.valor - v_linha.valor_pago;
  END IF;

  UPDATE public.contas_pagar
     SET valor_pago = valor_pago + v_valor
   WHERE id = p_id
  RETURNING * INTO v_linha;
  RETURN v_linha;
END;
$$;

GRANT EXECUTE ON FUNCTION public.pagar_conta_parcial(UUID, NUMERIC) TO authenticated;

-- ── 2. Vínculo do lançamento do caixa com a conta que o gerou ──
ALTER TABLE public.movimentacoes_caixa
  ADD COLUMN IF NOT EXISTS valor_receber_id UUID REFERENCES public.valores_receber(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS conta_pagar_id   UUID REFERENCES public.contas_pagar(id)    ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_mov_caixa_valor_receber ON public.movimentacoes_caixa(valor_receber_id) WHERE valor_receber_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_mov_caixa_conta_pagar   ON public.movimentacoes_caixa(conta_pagar_id)   WHERE conta_pagar_id IS NOT NULL;

-- ── 3. Histórico de lançamentos cancelados ─────────────────────
CREATE TABLE IF NOT EXISTS public.movimentacoes_canceladas (
  id               UUID PRIMARY KEY,               -- mesmo id do lançamento original
  empresa_id       UUID NOT NULL REFERENCES public.empresas(id) ON DELETE CASCADE,
  caixa_id         UUID,
  codigo_rastreio  TEXT,
  tipo             TEXT NOT NULL,
  categoria        TEXT,
  descricao        TEXT,
  valor            DECIMAL(10,2) NOT NULL,
  lancado_em       TIMESTAMPTZ,
  valor_receber_id UUID,
  conta_pagar_id   UUID,
  motivo           TEXT,
  cancelado_por    UUID,
  cancelado_em     TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.movimentacoes_canceladas ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "mov_canceladas_select" ON public.movimentacoes_canceladas;
DROP POLICY IF EXISTS "mov_canceladas_insert" ON public.movimentacoes_canceladas;
CREATE POLICY "mov_canceladas_select" ON public.movimentacoes_canceladas FOR SELECT USING (public.empresa_pertence_ao_usuario(empresa_id));
CREATE POLICY "mov_canceladas_insert" ON public.movimentacoes_canceladas FOR INSERT WITH CHECK (public.empresa_pertence_ao_usuario(empresa_id));
CREATE INDEX IF NOT EXISTS idx_mov_canceladas_empresa ON public.movimentacoes_canceladas(empresa_id, cancelado_em DESC);
CREATE INDEX IF NOT EXISTS idx_mov_canceladas_codigo  ON public.movimentacoes_canceladas(codigo_rastreio);

-- ── 4. Cancelar lançamento (estorna a conta vinculada, guarda histórico) ──
CREATE OR REPLACE FUNCTION public.cancelar_movimentacao(p_id UUID, p_motivo TEXT DEFAULT NULL)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
DECLARE
  m public.movimentacoes_caixa;
  v_revertido TEXT := NULL;
BEGIN
  SELECT * INTO m FROM public.movimentacoes_caixa WHERE id = p_id FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Lançamento não encontrado';
  END IF;
  IF m.venda_id IS NOT NULL THEN
    RAISE EXCEPTION 'Este lançamento é de uma venda. Cancele pela venda (Financeiro → Vendas).';
  END IF;

  IF m.valor_receber_id IS NOT NULL THEN
    UPDATE public.valores_receber
       SET valor_recebido = GREATEST(0, valor_recebido - m.valor),
           status = 'pendente'
     WHERE id = m.valor_receber_id;
    IF FOUND THEN v_revertido := 'receber'; END IF;
  END IF;

  IF m.conta_pagar_id IS NOT NULL THEN
    UPDATE public.contas_pagar
       SET valor_pago = GREATEST(0, valor_pago - m.valor),
           status = 'pendente',
           data_pagamento = NULL
     WHERE id = m.conta_pagar_id;
    IF FOUND THEN v_revertido := 'pagar'; END IF;
  END IF;

  INSERT INTO public.movimentacoes_canceladas
    (id, empresa_id, caixa_id, codigo_rastreio, tipo, categoria, descricao, valor, lancado_em,
     valor_receber_id, conta_pagar_id, motivo, cancelado_por)
  VALUES
    (m.id, m.empresa_id, m.caixa_id, m.codigo_rastreio, m.tipo, m.categoria, m.descricao, m.valor, m.created_at,
     m.valor_receber_id, m.conta_pagar_id, NULLIF(trim(p_motivo), ''), auth.uid())
  ON CONFLICT (id) DO NOTHING;

  DELETE FROM public.movimentacoes_caixa WHERE id = p_id;

  RETURN jsonb_build_object('revertido', v_revertido);
END;
$$;

GRANT EXECUTE ON FUNCTION public.cancelar_movimentacao(UUID, TEXT) TO authenticated;

-- ── 5. Alterar valor de um lançamento (ajusta a conta vinculada) ──
CREATE OR REPLACE FUNCTION public.alterar_valor_movimentacao(p_id UUID, p_valor NUMERIC)
RETURNS public.movimentacoes_caixa
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
DECLARE
  m public.movimentacoes_caixa;
  v_valor NUMERIC := round(p_valor, 2);
  v_dif NUMERIC;
  r public.valores_receber;
  c public.contas_pagar;
BEGIN
  IF v_valor IS NULL OR v_valor <= 0 THEN
    RAISE EXCEPTION 'Informe um valor maior que zero';
  END IF;
  SELECT * INTO m FROM public.movimentacoes_caixa WHERE id = p_id FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Lançamento não encontrado';
  END IF;
  v_dif := v_valor - m.valor;
  IF v_dif = 0 THEN
    RETURN m;
  END IF;
  IF m.venda_id IS NOT NULL THEN
    RAISE EXCEPTION 'O valor de um lançamento de venda não pode ser alterado aqui. Edite ou cancele a venda.';
  END IF;

  IF m.valor_receber_id IS NOT NULL THEN
    SELECT * INTO r FROM public.valores_receber WHERE id = m.valor_receber_id FOR UPDATE;
    IF FOUND THEN
      IF r.valor_recebido + v_dif > r.valor THEN
        RAISE EXCEPTION 'Com esse valor o recebido passaria do total da conta (%)', r.valor;
      END IF;
      UPDATE public.valores_receber
         SET valor_recebido = GREATEST(0, valor_recebido + v_dif),
             status = CASE WHEN valor_recebido + v_dif >= valor THEN 'recebido' ELSE 'pendente' END
       WHERE id = r.id;
    END IF;
  END IF;

  IF m.conta_pagar_id IS NOT NULL THEN
    SELECT * INTO c FROM public.contas_pagar WHERE id = m.conta_pagar_id FOR UPDATE;
    IF FOUND THEN
      IF c.valor_pago + v_dif > c.valor THEN
        RAISE EXCEPTION 'Com esse valor o pago passaria do total da conta (%)', c.valor;
      END IF;
      UPDATE public.contas_pagar
         SET valor_pago = GREATEST(0, valor_pago + v_dif),
             status = CASE WHEN valor_pago + v_dif >= valor THEN 'pago' ELSE 'pendente' END,
             data_pagamento = CASE WHEN valor_pago + v_dif >= valor THEN COALESCE(data_pagamento, now()) ELSE NULL END
       WHERE id = c.id;
    END IF;
  END IF;

  UPDATE public.movimentacoes_caixa SET valor = v_valor WHERE id = p_id RETURNING * INTO m;
  RETURN m;
END;
$$;

GRANT EXECUTE ON FUNCTION public.alterar_valor_movimentacao(UUID, NUMERIC) TO authenticated;
