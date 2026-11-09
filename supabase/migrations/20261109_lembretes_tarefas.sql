-- ============================================================
-- Lembretes de tarefas pelo WhatsApp do Bora Gerir (plano Profissional)
-- O dono ativa em Tarefas → "Lembretes no WhatsApp" e recebe resumo da manhã,
-- aviso de véspera e cobrança de atrasadas (insistência conforme a prioridade).
-- Acesso só pelas rotas do servidor (service role): RLS ligado e sem políticas.
-- ============================================================

CREATE TABLE IF NOT EXISTS public.lembretes_tarefas_config (
  empresa_id    UUID PRIMARY KEY REFERENCES public.empresas(id) ON DELETE CASCADE,
  ativo         BOOLEAN NOT NULL DEFAULT false,
  telefone      TEXT NOT NULL,                         -- 55 + DDD + número
  nome          TEXT NOT NULL,                         -- como chamar a pessoa na mensagem
  hora_resumo   TEXT NOT NULL DEFAULT '08:00',         -- HH:MM (Brasília)
  resumo        BOOLEAN NOT NULL DEFAULT true,
  vespera       BOOLEAN NOT NULL DEFAULT true,
  atraso        BOOLEAN NOT NULL DEFAULT true,
  aceite_em     TIMESTAMPTZ,                           -- quando a pessoa aceitou receber
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Cada envio fica registrado; a chave única impede repetir o mesmo aviso
CREATE TABLE IF NOT EXISTS public.lembretes_tarefas_envios (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_id  UUID NOT NULL REFERENCES public.empresas(id) ON DELETE CASCADE,
  tipo        TEXT NOT NULL CHECK (tipo IN ('resumo', 'vespera', 'atraso', 'teste')),
  referencia  TEXT NOT NULL,                           -- resumo: data | véspera/atraso: tarefa + data
  status      TEXT NOT NULL CHECK (status IN ('enviando', 'enviado', 'falhou')),
  detalhe     TEXT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (empresa_id, tipo, referencia)
);
CREATE INDEX IF NOT EXISTS idx_lembretes_tarefas_envios_recentes ON public.lembretes_tarefas_envios(empresa_id, created_at DESC);

ALTER TABLE public.lembretes_tarefas_config ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lembretes_tarefas_envios ENABLE ROW LEVEL SECURITY;
