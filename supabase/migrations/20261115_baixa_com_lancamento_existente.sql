-- ============================================================
-- Dar baixa usando um lançamento que JÁ está no caixa
-- (ex.: importado do extrato), sem criar lançamento duplicado.
--   vincular_movimentacao_baixa(mov, valor_receber | conta_pagar)
--   • soma o valor do lançamento no recebido/pago da conta (baixa total ou parcial)
--   • grava o vínculo no lançamento (cancelar/editar o lançamento depois
--     já ajusta a conta — funções da migration 20261113)
-- Requer 20261112 e 20261113. Pode rodar mais de uma vez.
-- ============================================================

CREATE OR REPLACE FUNCTION public.vincular_movimentacao_baixa(
  p_mov_id UUID,
  p_valor_receber_id UUID DEFAULT NULL,
  p_conta_pagar_id UUID DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
DECLARE
  m public.movimentacoes_caixa;
  r public.valores_receber;
  c public.contas_pagar;
  v_saldo NUMERIC;
BEGIN
  IF (p_valor_receber_id IS NULL) = (p_conta_pagar_id IS NULL) THEN
    RAISE EXCEPTION 'Informe a conta a receber ou a conta a pagar';
  END IF;

  SELECT * INTO m FROM public.movimentacoes_caixa WHERE id = p_mov_id FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Lançamento do caixa não encontrado';
  END IF;
  IF m.venda_id IS NOT NULL OR m.valor_receber_id IS NOT NULL OR m.conta_pagar_id IS NOT NULL THEN
    RAISE EXCEPTION 'Este lançamento já está vinculado a uma venda ou a outra baixa';
  END IF;

  -- ── A Receber ──
  IF p_valor_receber_id IS NOT NULL THEN
    IF m.tipo <> 'entrada' THEN
      RAISE EXCEPTION 'Para dar baixa em um valor a receber, escolha uma ENTRADA do caixa';
    END IF;
    SELECT * INTO r FROM public.valores_receber WHERE id = p_valor_receber_id FOR UPDATE;
    IF NOT FOUND OR r.empresa_id <> m.empresa_id THEN
      RAISE EXCEPTION 'Valor a receber não encontrado';
    END IF;
    IF r.status = 'recebido' THEN
      RAISE EXCEPTION 'Este valor já foi recebido por completo';
    END IF;
    v_saldo := r.valor - r.valor_recebido;
    IF m.valor > v_saldo THEN
      RAISE EXCEPTION 'O lançamento (%) é maior que o valor em aberto (%)', m.valor, v_saldo;
    END IF;

    UPDATE public.valores_receber
       SET valor_recebido = valor_recebido + m.valor
     WHERE id = r.id
    RETURNING * INTO r;
    UPDATE public.movimentacoes_caixa SET valor_receber_id = r.id WHERE id = m.id;

    RETURN jsonb_build_object('status', r.status, 'valor', r.valor, 'valor_recebido', r.valor_recebido);
  END IF;

  -- ── Contas a Pagar ──
  IF m.tipo <> 'saida' THEN
    RAISE EXCEPTION 'Para dar baixa em uma conta a pagar, escolha uma SAÍDA do caixa';
  END IF;
  SELECT * INTO c FROM public.contas_pagar WHERE id = p_conta_pagar_id FOR UPDATE;
  IF NOT FOUND OR c.empresa_id <> m.empresa_id THEN
    RAISE EXCEPTION 'Conta a pagar não encontrada';
  END IF;
  IF c.status = 'pago' THEN
    RAISE EXCEPTION 'Esta conta já está paga';
  END IF;
  v_saldo := c.valor - c.valor_pago;
  IF m.valor > v_saldo THEN
    -- pagou com juros/multa: o valor da conta passa a ser o total efetivamente pago
    UPDATE public.contas_pagar SET valor = valor_pago + m.valor WHERE id = c.id;
  END IF;

  UPDATE public.contas_pagar
     SET valor_pago = valor_pago + m.valor,
         data_pagamento = CASE WHEN valor_pago + m.valor >= valor THEN COALESCE(data_pagamento, m.created_at) ELSE data_pagamento END
   WHERE id = c.id
  RETURNING * INTO c;
  UPDATE public.movimentacoes_caixa SET conta_pagar_id = c.id WHERE id = m.id;

  RETURN jsonb_build_object('status', c.status, 'valor', c.valor, 'valor_pago', c.valor_pago, 'data_pagamento', c.data_pagamento);
END;
$$;

GRANT EXECUTE ON FUNCTION public.vincular_movimentacao_baixa(UUID, UUID, UUID) TO authenticated;
