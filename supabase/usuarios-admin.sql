-- Tabela de usuários do painel administrativo interno
CREATE TABLE IF NOT EXISTS public.usuarios_admin (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id     UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  nome        TEXT NOT NULL,
  email       TEXT NOT NULL UNIQUE,
  perfil      TEXT NOT NULL DEFAULT 'atendimento' CHECK (perfil IN ('super_admin', 'quase_admin', 'vendas', 'atendimento')),
  ativo       BOOLEAN NOT NULL DEFAULT true,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Índice para busca por email
CREATE INDEX IF NOT EXISTS idx_usuarios_admin_email ON public.usuarios_admin(email);

-- RLS desabilitado — somente service role acessa
ALTER TABLE public.usuarios_admin ENABLE ROW LEVEL SECURITY;

-- Apenas service role pode ler/escrever
CREATE POLICY "usuarios_admin_service_only" ON public.usuarios_admin
  FOR ALL USING (false);

-- Inserir super admin padrão (substitua pelo seu email)
-- INSERT INTO public.usuarios_admin (nome, email, perfil)
-- VALUES ('Admin', 'seu@email.com', 'super_admin');
