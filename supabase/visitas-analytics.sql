-- ============================================================
-- Bora Gerir — Tabela de analytics de visitas
-- Execute no SQL Editor do Supabase
-- ============================================================

CREATE TABLE IF NOT EXISTS public.visitas_analytics (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  pagina      TEXT NOT NULL CHECK (pagina IN ('site', 'login', 'cadastro')),
  user_agent  TEXT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- RLS: somente service role acessa (admin usa service role key)
ALTER TABLE public.visitas_analytics ENABLE ROW LEVEL SECURITY;

-- Nenhuma política de acesso para usuários comuns — apenas service role via API route
-- A rota /api/analytics/visita usa o admin client para inserir

-- Índices para performance nas queries de contagem por período
CREATE INDEX IF NOT EXISTS idx_visitas_pagina     ON public.visitas_analytics(pagina);
CREATE INDEX IF NOT EXISTS idx_visitas_created_at ON public.visitas_analytics(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_visitas_pagina_data ON public.visitas_analytics(pagina, created_at DESC);
