-- Migration: Adicionar senha de administrador para login local
ALTER TABLE empresas
ADD COLUMN IF NOT EXISTS senha_admin TEXT DEFAULT NULL;

COMMENT ON COLUMN empresas.senha_admin IS 'Hash SHA-256 da senha do administrador para login local';
