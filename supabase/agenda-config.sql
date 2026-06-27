-- Configuração de disponibilidade da agenda por empresa
CREATE TABLE IF NOT EXISTS public.agenda_config (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  empresa_id      UUID NOT NULL REFERENCES public.empresas(id) ON DELETE CASCADE UNIQUE,
  -- Dias da semana disponíveis (0=Dom, 1=Seg, ..., 6=Sáb)
  dias_semana     INTEGER[] NOT NULL DEFAULT '{1,2,3,4,5}',
  -- Horário de início e fim (ex: "08:00", "18:00")
  hora_inicio     TEXT NOT NULL DEFAULT '08:00',
  hora_fim        TEXT NOT NULL DEFAULT '18:00',
  -- Intervalo entre slots em minutos
  intervalo_minutos INTEGER NOT NULL DEFAULT 30,
  -- Duração padrão de atendimento em minutos
  duracao_padrao  INTEGER NOT NULL DEFAULT 60,
  -- Horário de almoço (opcional)
  almoco_inicio   TEXT,
  almoco_fim      TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- RLS
ALTER TABLE public.agenda_config ENABLE ROW LEVEL SECURITY;

CREATE POLICY "agenda_config_select" ON public.agenda_config
  FOR SELECT USING (empresa_id = public.get_empresa_id());

CREATE POLICY "agenda_config_insert" ON public.agenda_config
  FOR INSERT WITH CHECK (empresa_id = public.get_empresa_id());

CREATE POLICY "agenda_config_update" ON public.agenda_config
  FOR UPDATE USING (empresa_id = public.get_empresa_id());

-- Política pública para leitura no agendamento online
CREATE POLICY "agenda_config_select_publico" ON public.agenda_config
  FOR SELECT USING (true);
