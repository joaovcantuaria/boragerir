-- Adicionar status "solicitado" e "espera" para agendamentos online
-- e campo para identificar origem (online vs manual)
ALTER TABLE public.agendamentos
  ADD COLUMN IF NOT EXISTS origem TEXT DEFAULT 'manual' CHECK (origem IN ('manual', 'online')),
  ADD COLUMN IF NOT EXISTS email_cliente TEXT;

-- Atualizar o check constraint do status para incluir novos status
ALTER TABLE public.agendamentos
  DROP CONSTRAINT IF EXISTS agendamentos_status_check;

ALTER TABLE public.agendamentos
  ADD CONSTRAINT agendamentos_status_check
  CHECK (status IN ('solicitado', 'agendado', 'confirmado', 'espera', 'concluido', 'cancelado', 'faltou'));

-- Agendamentos online entram como "solicitado" por padrão
-- Agendamentos manuais entram como "agendado"
