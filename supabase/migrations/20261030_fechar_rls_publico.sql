-- ============================================================
-- Fecha leitura pública (sem login) de tabelas sensíveis
-- ============================================================
-- Problema: políticas "USING (true)" deixavam qualquer pessoa com a chave anon
-- (que é pública) ler TODAS as linhas e colunas de:
--   empresas (email, CPF/CNPJ, telefone, endereço, pin_gerente, senha_admin)
--   funcionarios (usuario, senha_hash), produtos_servicos (custo, comissão),
--   cupons (todos os códigos), configuracoes_sistema
-- e cora_audit_log estava SEM RLS (leitura e escrita livres).
--
-- Quem precisava disso:
--   - /agendar/[slug] → agora busca no servidor com service role (só colunas públicas)
--   - cupons, configuracoes_sistema, cora_audit_log → já eram acessados só via service role
-- O dono continua vendo os próprios dados pelas políticas por empresa_id/user_id,
-- que NÃO são alteradas aqui.
--
-- ⚠️ Faça o deploy do código (página /agendar com createAdminClient) ANTES
--    de rodar este SQL, senão o link público de agendamento para de carregar.
-- ============================================================

BEGIN;

-- empresas: remove leitura pública (dono continua com "usuarios_podem_ver_propria_empresa")
DROP POLICY IF EXISTS "empresa_slug_publico" ON public.empresas;

-- produtos_servicos e funcionarios: remove leitura pública
DROP POLICY IF EXISTS "produtos_select_publico" ON public.produtos_servicos;
DROP POLICY IF EXISTS "funcionarios_select_publico" ON public.funcionarios;

-- cupons: validação já é feita no servidor (/api/pagamentos/validar-cupom)
DROP POLICY IF EXISTS "cupons_select" ON public.cupons;

-- configuracoes_sistema: lida só por rotas com service role
DROP POLICY IF EXISTS "config_select_public" ON public.configuracoes_sistema;

-- cora_audit_log: liga RLS sem políticas → só service role lê/escreve
ALTER TABLE public.cora_audit_log ENABLE ROW LEVEL SECURITY;

COMMIT;

-- ============================================================
-- Conferência: deve listar apenas políticas que você reconhece.
-- Qualquer SELECT com qual = 'true' em tabela sensível merece atenção
-- (políticas criadas pelo painel do Supabase não aparecem nos arquivos .sql).
-- ============================================================
SELECT tablename, policyname, cmd, roles, qual
FROM pg_policies
WHERE schemaname = 'public'
  AND (qual = 'true' OR with_check = 'true')
ORDER BY tablename, cmd;

-- Tabelas do schema public ainda sem RLS (devem ser só sequências/tabelas auxiliares):
SELECT c.relname AS tabela_sem_rls
FROM pg_class c
JOIN pg_namespace n ON n.oid = c.relnamespace
WHERE n.nspname = 'public' AND c.relkind = 'r' AND NOT c.relrowsecurity
ORDER BY 1;
