-- ============================================================
-- Cupons de desconto para os CLIENTES da empresa (resgatados no PDV)
-- Diferente de "cupons", que são os cupons dos planos do Bora Gerir.
-- Criados pelo BoraGerir Chat (aniversário, reativação) ou manualmente.
-- Acesso só pelas rotas do servidor (service role): RLS ligado e sem políticas.
-- ============================================================

CREATE TABLE IF NOT EXISTS public.cupons_cliente (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_id  UUID NOT NULL REFERENCES public.empresas(id) ON DELETE CASCADE,
  cliente_id  UUID REFERENCES public.clientes(id) ON DELETE CASCADE,
  codigo      TEXT NOT NULL,
  tipo        TEXT NOT NULL CHECK (tipo IN ('percentual', 'fixo')),
  valor       NUMERIC(10,2) NOT NULL CHECK (valor > 0),
  validade    DATE NOT NULL,
  origem      TEXT NOT NULL DEFAULT 'manual' CHECK (origem IN ('aniversario', 'reativacao', 'manual')),
  usado_em    TIMESTAMPTZ,
  venda_id    UUID REFERENCES public.vendas(id) ON DELETE SET NULL,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (empresa_id, codigo)
);

CREATE INDEX IF NOT EXISTS idx_cupons_cliente_cliente ON public.cupons_cliente(empresa_id, cliente_id, origem);

ALTER TABLE public.cupons_cliente ENABLE ROW LEVEL SECURITY;
