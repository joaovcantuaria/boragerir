-- ============================================================
-- Código de rastreio em toda operação financeira
--
-- Formato:  PP-AAMMDD-NNNNN-D
--   PP     tipo: VD venda · EN entrada no caixa · SA saída do caixa · CX abertura de caixa
--               CP conta a pagar · CR valor a receber · DB débito de cliente · PC parcela de contrato
--   AAMMDD data da operação (horário de Brasília)
--   NNNNN  sequência da empresa naquele dia, por tipo (00001, 00002...)
--   D      dígito verificador (pega erro de digitação ao rastrear)
--
-- Gerado pelo banco (gatilho), então vale para qualquer tela/rota que grave a operação.
-- O código é único por empresa e não pode ser alterado depois de criado.
-- Os registros antigos também recebem código, na ordem e na data em que aconteceram.
-- ============================================================

-- Contador por empresa / tipo / dia (incremento atômico, sem colisão em vendas simultâneas)
CREATE TABLE IF NOT EXISTS public.rastreio_sequencias (
  empresa_id UUID NOT NULL REFERENCES public.empresas(id) ON DELETE CASCADE,
  prefixo    TEXT NOT NULL,
  dia        DATE NOT NULL,
  ultimo     INTEGER NOT NULL DEFAULT 0,
  PRIMARY KEY (empresa_id, prefixo, dia)
);
-- Só o banco mexe nela (funções SECURITY DEFINER): RLS ligado e sem políticas
ALTER TABLE public.rastreio_sequencias ENABLE ROW LEVEL SECURITY;

-- Dígito verificador: soma ponderada (pesos 2..9 da direita p/ esquerda), módulo 11
CREATE OR REPLACE FUNCTION public.rastreio_digito(numeros TEXT)
RETURNS TEXT LANGUAGE plpgsql IMMUTABLE AS $$
DECLARE
  soma INTEGER := 0;
  peso INTEGER := 2;
  i INTEGER;
  resto INTEGER;
BEGIN
  FOR i IN REVERSE length(numeros)..1 LOOP
    soma := soma + (substr(numeros, i, 1)::INTEGER * peso);
    peso := CASE WHEN peso = 9 THEN 2 ELSE peso + 1 END;
  END LOOP;
  resto := 11 - (soma % 11);
  RETURN CASE WHEN resto >= 10 THEN '0' ELSE resto::TEXT END;
END;
$$;

CREATE OR REPLACE FUNCTION public.rastreio_gerar(p_empresa UUID, p_prefixo TEXT, p_quando TIMESTAMPTZ)
RETURNS TEXT LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_dia DATE := (COALESCE(p_quando, now()) AT TIME ZONE 'America/Sao_Paulo')::DATE;
  v_seq INTEGER;
  v_numeros TEXT;
BEGIN
  INSERT INTO public.rastreio_sequencias AS s (empresa_id, prefixo, dia, ultimo)
  VALUES (p_empresa, p_prefixo, v_dia, 1)
  ON CONFLICT (empresa_id, prefixo, dia) DO UPDATE SET ultimo = s.ultimo + 1
  RETURNING ultimo INTO v_seq;

  v_numeros := to_char(v_dia, 'YYMMDD') || lpad(v_seq::TEXT, 5, '0');
  RETURN p_prefixo || '-' || to_char(v_dia, 'YYMMDD') || '-' || lpad(v_seq::TEXT, 5, '0') || '-' || public.rastreio_digito(v_numeros);
END;
$$;
REVOKE ALL ON FUNCTION public.rastreio_gerar(UUID, TEXT, TIMESTAMPTZ) FROM PUBLIC;

-- Gatilho único para todas as tabelas: escolhe o prefixo pela tabela (e pelo tipo, no caixa)
CREATE OR REPLACE FUNCTION public.rastreio_atribuir()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_prefixo TEXT;
BEGIN
  IF TG_OP = 'UPDATE' THEN
    -- Código é imutável: qualquer tentativa de troca mantém o original
    NEW.codigo_rastreio := OLD.codigo_rastreio;
    IF NEW.codigo_rastreio IS NOT NULL THEN RETURN NEW; END IF;
  END IF;

  v_prefixo := CASE TG_TABLE_NAME
    WHEN 'vendas'              THEN 'VD'
    -- só a tabela do caixa tem "tipo"; lido via jsonb para não quebrar nas outras tabelas
    WHEN 'movimentacoes_caixa' THEN CASE WHEN to_jsonb(NEW) ->> 'tipo' = 'saida' THEN 'SA' ELSE 'EN' END
    WHEN 'caixas'              THEN 'CX'
    WHEN 'contas_pagar'        THEN 'CP'
    WHEN 'valores_receber'     THEN 'CR'
    WHEN 'debitos_clientes'    THEN 'DB'
    WHEN 'contratos_parcelas'  THEN 'PC'
  END;

  -- Sempre gerado aqui (ignora qualquer valor enviado pela tela)
  NEW.codigo_rastreio := public.rastreio_gerar(NEW.empresa_id, v_prefixo, COALESCE(NEW.created_at, now()));
  RETURN NEW;
END;
$$;

DO $bloco$
DECLARE
  t TEXT;
  v_prefixo TEXT;
BEGIN
  FOREACH t IN ARRAY ARRAY['vendas', 'movimentacoes_caixa', 'caixas', 'contas_pagar', 'valores_receber', 'debitos_clientes', 'contratos_parcelas'] LOOP
    EXECUTE format('ALTER TABLE public.%I ADD COLUMN IF NOT EXISTS codigo_rastreio TEXT', t);

    v_prefixo := CASE t
      WHEN 'vendas'              THEN quote_literal('VD')
      WHEN 'movimentacoes_caixa' THEN 'CASE WHEN tipo = ' || quote_literal('saida') || ' THEN ' || quote_literal('SA') || ' ELSE ' || quote_literal('EN') || ' END'
      WHEN 'caixas'              THEN quote_literal('CX')
      WHEN 'contas_pagar'        THEN quote_literal('CP')
      WHEN 'valores_receber'     THEN quote_literal('CR')
      WHEN 'debitos_clientes'    THEN quote_literal('DB')
      WHEN 'contratos_parcelas'  THEN quote_literal('PC')
    END;

    -- Registros antigos: numerados de uma vez, na ordem em que aconteceram (data original).
    -- Feito ANTES de criar o gatilho, para não disparar nada nos registros existentes.
    EXECUTE format($f$
      UPDATE public.%1$I AS alvo
         SET codigo_rastreio = s.prefixo || '-' || to_char(s.dia, 'YYMMDD') || '-' || lpad(s.n::TEXT, 5, '0') || '-'
                               || public.rastreio_digito(to_char(s.dia, 'YYMMDD') || lpad(s.n::TEXT, 5, '0'))
        FROM (
          SELECT id, prefixo, dia,
                 row_number() OVER (PARTITION BY empresa_id, prefixo, dia ORDER BY criado, id) AS n
            FROM (
              SELECT id, empresa_id, %2$s AS prefixo, COALESCE(created_at, now()) AS criado,
                     (COALESCE(created_at, now()) AT TIME ZONE 'America/Sao_Paulo')::DATE AS dia
                FROM public.%1$I
               WHERE codigo_rastreio IS NULL
            ) base
        ) s
       WHERE alvo.id = s.id
    $f$, t, v_prefixo);

    -- Contadores continuam de onde os antigos pararam
    EXECUTE format($f$
      INSERT INTO public.rastreio_sequencias (empresa_id, prefixo, dia, ultimo)
      SELECT empresa_id, split_part(codigo_rastreio, '-', 1),
             to_date(split_part(codigo_rastreio, '-', 2), 'YYMMDD'),
             max(split_part(codigo_rastreio, '-', 3)::INTEGER)
        FROM public.%1$I
       WHERE codigo_rastreio IS NOT NULL
       GROUP BY 1, 2, 3
      ON CONFLICT (empresa_id, prefixo, dia)
        DO UPDATE SET ultimo = GREATEST(public.rastreio_sequencias.ultimo, EXCLUDED.ultimo)
    $f$, t);

    EXECUTE format('CREATE UNIQUE INDEX IF NOT EXISTS %I ON public.%I (empresa_id, codigo_rastreio)', 'uq_' || t || '_rastreio', t);
    EXECUTE format('CREATE INDEX IF NOT EXISTS %I ON public.%I (codigo_rastreio)', 'idx_' || t || '_rastreio', t);

    -- A partir daqui, toda operação nova ganha código automaticamente (e ninguém troca o código)
    EXECUTE format('DROP TRIGGER IF EXISTS trg_rastreio ON public.%I', t);
    EXECUTE format('CREATE TRIGGER trg_rastreio BEFORE INSERT OR UPDATE OF codigo_rastreio ON public.%I FOR EACH ROW EXECUTE FUNCTION public.rastreio_atribuir()', t);
  END LOOP;
END;
$bloco$;
