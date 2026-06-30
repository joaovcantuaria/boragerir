-- ============================================================
-- Função RPC: verificar se o usuário logado é admin
-- Permite que o middleware verifique sem service role key
-- ============================================================

CREATE OR REPLACE FUNCTION public.verificar_usuario_admin(p_email TEXT)
RETURNS TABLE (ativo BOOLEAN, perfil TEXT)
LANGUAGE sql
SECURITY DEFINER  -- executa como superuser, ignora RLS
STABLE
AS $$
  SELECT ativo, perfil
  FROM public.usuarios_admin
  WHERE email = p_email
  LIMIT 1;
$$;

-- Permissão: qualquer usuário autenticado pode chamar
GRANT EXECUTE ON FUNCTION public.verificar_usuario_admin(TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.verificar_usuario_admin(TEXT) TO anon;
