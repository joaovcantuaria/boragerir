-- ============================================================
-- Integração Bora Gerir App ↔ BoraGerir Chat (por empresa)
-- ============================================================
-- Cada empresa conecta a própria conta do Chat:
--   - chat_api_key_enc: API key "bgc_..." do Chat, criptografada (AES-256-GCM,
--     chave INTEGRACOES_ENCRYPTION_KEY) — usada pelo App para chamar o Chat
--   - app_token_hash: SHA-256 do token "bga_..." que o Chat usa para ler dados
--     do App em /api/integracoes/chat/v1/* (o token em si nunca é salvo)
--
-- Acesso só via service role (rotas do servidor). RLS ligado e SEM políticas:
-- o cliente anon/authenticated não lê nem escreve nada aqui.
-- ============================================================

CREATE TABLE IF NOT EXISTS public.integracoes_chat (
  id                 UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_id         UUID NOT NULL UNIQUE REFERENCES public.empresas(id) ON DELETE CASCADE,
  chat_api_key_enc   TEXT NOT NULL,
  chat_api_key_final TEXT NOT NULL,
  app_token_hash     TEXT NOT NULL UNIQUE,
  ativo              BOOLEAN NOT NULL DEFAULT true,
  conectado_em       TIMESTAMPTZ NOT NULL DEFAULT now(),
  ultimo_uso_em      TIMESTAMPTZ,
  total_requisicoes  INTEGER NOT NULL DEFAULT 0
);

ALTER TABLE public.integracoes_chat ENABLE ROW LEVEL SECURITY;
