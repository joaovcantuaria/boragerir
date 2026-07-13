-- Migration: Sistema de Login Local de Colaboradores
-- Cada empresa pode ter múltiplos colaboradores com login próprio dentro do sistema

-- ─── Adicionar colunas de autenticação na tabela funcionarios ───
ALTER TABLE funcionarios
ADD COLUMN IF NOT EXISTS usuario TEXT DEFAULT NULL,
ADD COLUMN IF NOT EXISTS senha_hash TEXT DEFAULT NULL,
ADD COLUMN IF NOT EXISTS perfil TEXT NOT NULL DEFAULT 'colaborador' CHECK (perfil IN ('admin', 'gerente', 'colaborador')),
ADD COLUMN IF NOT EXISTS permissoes JSONB DEFAULT '{}',
ADD COLUMN IF NOT EXISTS ultimo_login TIMESTAMPTZ DEFAULT NULL;

-- Índice único para usuario dentro da mesma empresa
CREATE UNIQUE INDEX IF NOT EXISTS idx_funcionarios_usuario_empresa 
ON funcionarios(empresa_id, usuario) 
WHERE usuario IS NOT NULL;

-- Comentários
COMMENT ON COLUMN funcionarios.usuario IS 'Nome de usuário para login local (único por empresa)';
COMMENT ON COLUMN funcionarios.senha_hash IS 'Hash bcrypt da senha do colaborador';
COMMENT ON COLUMN funcionarios.perfil IS 'Nível de acesso: admin (dono), gerente (acesso quase total), colaborador (acesso limitado)';
COMMENT ON COLUMN funcionarios.permissoes IS 'Permissões granulares do colaborador (JSON com áreas e ações permitidas)';
COMMENT ON COLUMN funcionarios.ultimo_login IS 'Data/hora do último login local';

-- ─── Tabela de log de sessões ───
CREATE TABLE IF NOT EXISTS sessoes_colaboradores (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_id UUID NOT NULL REFERENCES empresas(id) ON DELETE CASCADE,
  funcionario_id UUID NOT NULL REFERENCES funcionarios(id) ON DELETE CASCADE,
  acao TEXT NOT NULL CHECK (acao IN ('login', 'logout')),
  ip TEXT,
  user_agent TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_sessoes_colaboradores_empresa ON sessoes_colaboradores(empresa_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_sessoes_colaboradores_func ON sessoes_colaboradores(funcionario_id, created_at DESC);

COMMENT ON TABLE sessoes_colaboradores IS 'Log de login/logout de colaboradores para rastreabilidade';
