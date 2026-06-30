-- ============================================================
-- Proteção do super_admin — nunca pode ser desativado ou removido
-- Execute no SQL Editor do Supabase
-- ============================================================

-- 1. Garantir que o registro existe e está ativo
INSERT INTO public.usuarios_admin (nome, email, perfil, ativo)
VALUES ('João Vitor', 'contato@boragerir.com', 'super_admin', true)
ON CONFLICT (email) DO UPDATE SET
  perfil = 'super_admin',
  ativo  = true;

-- 2. Função que protege o super_admin de UPDATE/DELETE
CREATE OR REPLACE FUNCTION public.proteger_super_admin()
RETURNS TRIGGER AS $$
BEGIN
  -- Bloquear desativação do super_admin
  IF OLD.email = 'contato@boragerir.com' THEN
    IF TG_OP = 'DELETE' THEN
      RAISE EXCEPTION 'O super admin não pode ser removido.';
    END IF;
    IF TG_OP = 'UPDATE' THEN
      -- Forçar sempre ativo e perfil super_admin
      NEW.ativo  := true;
      NEW.perfil := 'super_admin';
      RETURN NEW;
    END IF;
  END IF;
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 3. Trigger antes de UPDATE e DELETE
DROP TRIGGER IF EXISTS trigger_proteger_super_admin ON public.usuarios_admin;
CREATE TRIGGER trigger_proteger_super_admin
  BEFORE UPDATE OR DELETE ON public.usuarios_admin
  FOR EACH ROW
  EXECUTE FUNCTION public.proteger_super_admin();

-- ============================================================
-- Após rodar este script, o super_admin nunca poderá ser
-- desativado ou deletado — mesmo via SQL ou pelo painel admin.
-- ============================================================
