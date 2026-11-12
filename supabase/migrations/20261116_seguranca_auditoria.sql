-- ============================================================
-- Auditoria de segurança (12/11/2026)
--   1. Limite de tentativas (login, PIN, e-mails) guardado no banco —
--      funciona com várias instâncias da Vercel (o limite em memória não funcionava)
--   2. Storage "logos": cada usuário só lista/grava/apaga a própria pasta
--      (antes qualquer visitante listava as pastas de todas as empresas)
--   3. Agendamento público: visitante só cria SOLICITAÇÃO online
--      (antes conseguia criar agendamento já confirmado em qualquer empresa)
-- Pode rodar mais de uma vez.
-- ============================================================

-- ── 1. Limite de tentativas ─────────────────────────────────
CREATE TABLE IF NOT EXISTS public.limites_tentativas (
  chave          TEXT PRIMARY KEY,
  tentativas     INT NOT NULL DEFAULT 0,
  janela_inicio  TIMESTAMPTZ NOT NULL DEFAULT now(),
  bloqueado_ate  TIMESTAMPTZ
);
-- RLS ligado e sem políticas: só o servidor (service role) acessa
ALTER TABLE public.limites_tentativas ENABLE ROW LEVEL SECURITY;
CREATE INDEX IF NOT EXISTS idx_limites_tentativas_janela ON public.limites_tentativas(janela_inicio);

-- Conta mais uma tentativa. Passou de p_max dentro da janela → bloqueia por p_bloqueio_seg.
-- Retorna { permitido, restantes, bloqueado_ate }
CREATE OR REPLACE FUNCTION public.limite_consumir(p_chave TEXT, p_max INT, p_janela_seg INT, p_bloqueio_seg INT)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  r public.limites_tentativas;
BEGIN
  INSERT INTO public.limites_tentativas AS l (chave, tentativas, janela_inicio)
  VALUES (p_chave, 1, now())
  ON CONFLICT (chave) DO UPDATE SET
    tentativas    = CASE WHEN l.janela_inicio < now() - make_interval(secs => p_janela_seg)
                           AND (l.bloqueado_ate IS NULL OR l.bloqueado_ate < now())
                         THEN 1 ELSE l.tentativas + 1 END,
    janela_inicio = CASE WHEN l.janela_inicio < now() - make_interval(secs => p_janela_seg)
                           AND (l.bloqueado_ate IS NULL OR l.bloqueado_ate < now())
                         THEN now() ELSE l.janela_inicio END
  RETURNING * INTO r;

  IF r.tentativas > p_max THEN
    UPDATE public.limites_tentativas
       SET bloqueado_ate = GREATEST(COALESCE(bloqueado_ate, now()), now() + make_interval(secs => p_bloqueio_seg))
     WHERE chave = p_chave
    RETURNING * INTO r;
  END IF;

  RETURN jsonb_build_object(
    'permitido', r.tentativas <= p_max AND (r.bloqueado_ate IS NULL OR r.bloqueado_ate < now()),
    'restantes', GREATEST(p_max - r.tentativas, 0),
    'bloqueado_ate', r.bloqueado_ate
  );
END;
$$;

-- Está bloqueado agora? (não conta tentativa)
CREATE OR REPLACE FUNCTION public.limite_bloqueado_ate(p_chave TEXT)
RETURNS TIMESTAMPTZ
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT bloqueado_ate FROM public.limites_tentativas
   WHERE chave = p_chave AND bloqueado_ate > now()
$$;

-- Zera (ex.: login certo)
CREATE OR REPLACE FUNCTION public.limite_limpar(p_chave TEXT)
RETURNS VOID
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  DELETE FROM public.limites_tentativas WHERE chave = p_chave
$$;

-- Só o servidor chama essas funções
REVOKE ALL ON FUNCTION public.limite_consumir(TEXT, INT, INT, INT) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.limite_bloqueado_ate(TEXT) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.limite_limpar(TEXT) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.limite_consumir(TEXT, INT, INT, INT) TO service_role;
GRANT EXECUTE ON FUNCTION public.limite_bloqueado_ate(TEXT) TO service_role;
GRANT EXECUTE ON FUNCTION public.limite_limpar(TEXT) TO service_role;

-- ── 2. Storage: logos só na própria pasta ───────────────────
-- (o bucket continua público: as imagens das logos seguem abrindo pelo link)
DROP POLICY IF EXISTS "logos_upload" ON storage.objects;
DROP POLICY IF EXISTS "logos_select" ON storage.objects;
DROP POLICY IF EXISTS "logos_insert_propria_pasta" ON storage.objects;
DROP POLICY IF EXISTS "logos_select_propria_pasta" ON storage.objects;
DROP POLICY IF EXISTS "logos_update_propria_pasta" ON storage.objects;
DROP POLICY IF EXISTS "logos_delete_propria_pasta" ON storage.objects;

CREATE POLICY "logos_insert_propria_pasta" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'logos' AND (storage.foldername(name))[1] = auth.uid()::text);
CREATE POLICY "logos_select_propria_pasta" ON storage.objects
  FOR SELECT TO authenticated
  USING (bucket_id = 'logos' AND (storage.foldername(name))[1] = auth.uid()::text);
CREATE POLICY "logos_update_propria_pasta" ON storage.objects
  FOR UPDATE TO authenticated
  USING (bucket_id = 'logos' AND (storage.foldername(name))[1] = auth.uid()::text);
CREATE POLICY "logos_delete_propria_pasta" ON storage.objects
  FOR DELETE TO authenticated
  USING (bucket_id = 'logos' AND (storage.foldername(name))[1] = auth.uid()::text);

-- ── 3. Agendamento público: só solicitação online ────────────
DROP POLICY IF EXISTS "agendamentos_insert_publico" ON public.agendamentos;
CREATE POLICY "agendamentos_insert_publico" ON public.agendamentos
  FOR INSERT
  WITH CHECK (status = 'solicitado' AND origem = 'online' AND cliente_id IS NULL);
