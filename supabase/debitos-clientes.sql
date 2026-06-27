-- Tabela de débitos dos clientes (valores em aberto)
CREATE TABLE IF NOT EXISTS public.debitos_clientes (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  empresa_id    UUID NOT NULL REFERENCES public.empresas(id) ON DELETE CASCADE,
  cliente_id    UUID NOT NULL REFERENCES public.clientes(id) ON DELETE CASCADE,
  venda_id      UUID REFERENCES public.vendas(id) ON DELETE SET NULL,
  valor_total   DECIMAL(10,2) NOT NULL,
  valor_pago    DECIMAL(10,2) NOT NULL DEFAULT 0,
  valor_aberto  DECIMAL(10,2) NOT NULL,
  descricao     TEXT,
  status        TEXT NOT NULL DEFAULT 'aberto' CHECK (status IN ('aberto', 'pago', 'parcial')),
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- RLS
ALTER TABLE public.debitos_clientes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "debitos_select" ON public.debitos_clientes FOR SELECT USING (empresa_id = public.get_empresa_id());
CREATE POLICY "debitos_insert" ON public.debitos_clientes FOR INSERT WITH CHECK (empresa_id = public.get_empresa_id());
CREATE POLICY "debitos_update" ON public.debitos_clientes FOR UPDATE USING (empresa_id = public.get_empresa_id());

-- Índice
CREATE INDEX IF NOT EXISTS idx_debitos_cliente ON public.debitos_clientes(cliente_id);
CREATE INDEX IF NOT EXISTS idx_debitos_empresa ON public.debitos_clientes(empresa_id, status);
