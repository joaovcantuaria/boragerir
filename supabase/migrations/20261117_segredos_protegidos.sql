-- ============================================================
-- PIN de gerente e senhas locais fora do alcance do navegador
--   Antes: o hash do PIN (empresas.pin_gerente), da senha de administrador
--   local (empresas.senha_admin) e das senhas de colaborador
--   (funcionarios.senha_hash) podiam ser lidos pela sessão logada — quem
--   abrisse o DevTools no computador da loja descobria um PIN de 4–6 dígitos.
--   Agora os hashes ficam em tabelas que SÓ o servidor lê; nas colunas antigas
--   fica apenas um marcador ("configurado"/"configurada"/"definida").
--   O servidor passa a usar scrypt com sal; hashes antigos (SHA-256) continuam
--   funcionando e são trocados automaticamente no próximo uso.
--
-- ORDEM: publique o código primeiro e depois rode esta migration
-- (o código novo funciona antes e depois dela). Pode rodar mais de uma vez.
-- ============================================================

CREATE TABLE IF NOT EXISTS public.empresa_segredos (
  empresa_id        UUID PRIMARY KEY REFERENCES public.empresas(id) ON DELETE CASCADE,
  pin_hash          TEXT,
  senha_admin_hash  TEXT,
  reset_pin_hash    TEXT,
  reset_pin_expira  TIMESTAMPTZ,
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.empresa_segredos ENABLE ROW LEVEL SECURITY;   -- sem políticas: só service role

CREATE TABLE IF NOT EXISTS public.funcionario_senhas (
  funcionario_id  UUID PRIMARY KEY REFERENCES public.funcionarios(id) ON DELETE CASCADE,
  empresa_id      UUID NOT NULL REFERENCES public.empresas(id) ON DELETE CASCADE,
  senha_hash      TEXT NOT NULL,
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.funcionario_senhas ENABLE ROW LEVEL SECURITY; -- sem políticas: só service role

-- Move os hashes existentes (só os que ainda não viraram marcador)
INSERT INTO public.empresa_segredos (empresa_id, pin_hash, senha_admin_hash)
SELECT id,
       CASE WHEN pin_gerente IS NOT NULL AND pin_gerente <> 'configurado' THEN pin_gerente END,
       CASE WHEN senha_admin IS NOT NULL AND senha_admin <> 'configurada' THEN senha_admin END
  FROM public.empresas
 WHERE (pin_gerente IS NOT NULL AND pin_gerente <> 'configurado')
    OR (senha_admin IS NOT NULL AND senha_admin <> 'configurada')
ON CONFLICT (empresa_id) DO UPDATE SET
  pin_hash         = COALESCE(EXCLUDED.pin_hash, public.empresa_segredos.pin_hash),
  senha_admin_hash = COALESCE(EXCLUDED.senha_admin_hash, public.empresa_segredos.senha_admin_hash),
  updated_at       = now();

UPDATE public.empresas SET pin_gerente = 'configurado'
 WHERE pin_gerente IS NOT NULL AND pin_gerente <> 'configurado';
UPDATE public.empresas SET senha_admin = 'configurada'
 WHERE senha_admin IS NOT NULL AND senha_admin <> 'configurada';

-- Código de reset de PIN pendente (antigo, dentro de restricoes_acesso): descarta — basta pedir outro
UPDATE public.empresas SET restricoes_acesso = restricoes_acesso - '_reset_pin'
 WHERE restricoes_acesso ? '_reset_pin';

INSERT INTO public.funcionario_senhas (funcionario_id, empresa_id, senha_hash)
SELECT id, empresa_id, senha_hash
  FROM public.funcionarios
 WHERE senha_hash IS NOT NULL AND senha_hash <> 'definida'
ON CONFLICT (funcionario_id) DO UPDATE SET senha_hash = EXCLUDED.senha_hash, updated_at = now();

UPDATE public.funcionarios SET senha_hash = 'definida'
 WHERE senha_hash IS NOT NULL AND senha_hash <> 'definida';
