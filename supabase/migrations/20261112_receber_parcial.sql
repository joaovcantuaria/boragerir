-- ============================================================
-- A Receber: baixa parcial (cliente deve 1.500 e paga 750)
--   • valor_recebido guarda quanto já entrou; em aberto = valor - valor_recebido
--   • receber_valor_parcial() soma o pagamento de forma atômica
--   • trigger mantém tudo coerente com o código antigo que só muda status
-- Pode rodar mais de uma vez sem problema.
-- ============================================================

ALTER TABLE public.valores_receber
  ADD COLUMN IF NOT EXISTS valor_recebido DECIMAL(10,2) NOT NULL DEFAULT 0;

-- Quem já estava como recebido recebeu tudo
UPDATE public.valores_receber
   SET valor_recebido = valor
 WHERE status = 'recebido' AND valor_recebido <> valor;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'valores_receber_valor_recebido_chk') THEN
    ALTER TABLE public.valores_receber
      ADD CONSTRAINT valores_receber_valor_recebido_chk CHECK (valor_recebido >= 0);
  END IF;
END $$;

-- Coerência automática:
--   status virou 'recebido' (baixa total, contrato, boleto)  → valor_recebido = valor
--   valor_recebido alcançou o valor (último pagamento parcial) → status 'recebido'
CREATE OR REPLACE FUNCTION public.valores_receber_coerencia()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  IF NEW.status = 'recebido'
     AND (TG_OP = 'INSERT' OR OLD.status IS DISTINCT FROM 'recebido') THEN
    NEW.valor_recebido := NEW.valor;
  ELSIF NEW.status <> 'recebido' AND NEW.valor > 0 AND NEW.valor_recebido >= NEW.valor THEN
    NEW.status := 'recebido';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_valores_receber_coerencia ON public.valores_receber;
CREATE TRIGGER trg_valores_receber_coerencia
  BEFORE INSERT OR UPDATE ON public.valores_receber
  FOR EACH ROW EXECUTE FUNCTION public.valores_receber_coerencia();

-- Registra um pagamento (parcial ou o restante). Respeita o RLS (SECURITY INVOKER):
-- só funciona para valores da empresa do usuário.
CREATE OR REPLACE FUNCTION public.receber_valor_parcial(p_id UUID, p_valor NUMERIC)
RETURNS public.valores_receber
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
DECLARE
  v_linha public.valores_receber;
  v_valor NUMERIC := round(p_valor, 2);
BEGIN
  IF v_valor IS NULL OR v_valor <= 0 THEN
    RAISE EXCEPTION 'Informe um valor maior que zero';
  END IF;

  SELECT * INTO v_linha FROM public.valores_receber WHERE id = p_id FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Valor a receber não encontrado';
  END IF;
  IF v_linha.status = 'recebido' THEN
    RAISE EXCEPTION 'Este valor já foi recebido por completo';
  END IF;
  IF v_valor > v_linha.valor - v_linha.valor_recebido THEN
    RAISE EXCEPTION 'Valor maior que o saldo em aberto (%)', v_linha.valor - v_linha.valor_recebido;
  END IF;

  UPDATE public.valores_receber
     SET valor_recebido = valor_recebido + v_valor
   WHERE id = p_id
  RETURNING * INTO v_linha;

  RETURN v_linha;
END;
$$;

GRANT EXECUTE ON FUNCTION public.receber_valor_parcial(UUID, NUMERIC) TO authenticated;
