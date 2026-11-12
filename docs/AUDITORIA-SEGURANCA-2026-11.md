# Auditoria de segurança — Bora Gerir App (12/11/2026)

Legenda: ✅ ok · 🔧 corrigido nesta auditoria · ⚠️ pendente (precisa de decisão ou ação sua)

| # | Item | Situação | O que foi visto / feito |
|---|------|----------|--------------------------|
| 1 | Proteção das chaves API | ✅ | Chaves só em variáveis de ambiente do servidor. No navegador vão apenas a URL do Supabase e a chave pública (anon), que é feita para isso. |
| 2 | .env nunca exposto | ✅ | `.env*` no `.gitignore`; nenhum `.env` no histórico do Git; mapas de código (`.map`) não ficam públicos (403). |
| 3 | Nenhuma senha no código | ✅ | Varredura sem senhas, tokens ou chaves no código. |
| 4 | Login seguro de verdade | ✅ / ⚠️ | Login pelo Supabase Auth (senha com hash, sessão em cookie). ⚠️ O login confirma automaticamente e-mails não verificados (quem cadastra com e-mail de outra pessoa entra sem confirmar). |
| 5 | Permissões do servidor | ✅ | 86 rotas revisadas; todas as privadas exigem login. Rotas públicas (agendamento online, documentos legais, cadastro, login) são públicas de propósito. |
| 6 | Não confiar no id da tela | 🔧 | Anexos de tarefa usavam o `empresa_id` enviado pela tela → agora vem da própria tarefa. Logout de colaborador e verificação/reset de PIN não conferiam a empresa → agora conferem. |
| 7 | Cada cliente só vê o que é seu | ✅ | Teste como estranho: as 51 tabelas devolvem **zero linhas** sem login (RLS ativo). |
| 8 | Banco travado contra invasões | 🔧 | Visitante conseguia **criar agendamento já confirmado** em qualquer empresa → agora só cria *solicitação online*. |
| 9 | Supabase / storage | 🔧 | Bucket `logos`: qualquer visitante listava as pastas de todas as empresas → agora cada usuário só vê/grava/apaga a própria pasta (as logos continuam abrindo pelo link). |
| 10 | Admin protegido | 🔧 / ⚠️ | Painel e APIs de admin exigem usuário em `usuarios_admin`. 🔧 Removida a rota antiga `/api/admin/setup` (criava admin com uma chave secreta, sem limite de tentativas). ⚠️ Recomendo ativar 2 fatores (MFA) nas contas de admin. |
| 11 | Debug desligado | 🔧 | Removidos logs de debug da Cora que gravavam CPF, nome e endereço dos clientes nos logs da Vercel. |
| 12 | Erros com detalhes | ⚠️ | Boa prática: **detalhe completo no log do servidor, mensagem simples para o usuário** (detalhe técnico na tela ajuda o atacante). 27 rotas ainda devolvem a mensagem crua do banco — ajustar aos poucos. |
| 13 | Validar tudo no servidor | 🔧 / ⚠️ | Valores, PIN, códigos, e-mail e tamanhos validados nas rotas críticas. ⚠️ Padronizar com validação por esquema nas demais rotas. |
| 14 | Limpar o que o usuário manda | 🔧 | Aviso de agendamento público colocava nome/serviço/empresa sem escapar no HTML do e-mail (dava para injetar links) → agora escapado e com tamanho limitado. |
| 15 | Upload protegido | 🔧 | Anexos: tipos permitidos (bloqueia HTML/SVG/scripts), nome do arquivo limpo, limite de 10 MB mantido. |
| 16 | Sem injeção de SQL | ✅ | Todo acesso via Supabase com parâmetros; funções SQL sem SQL dinâmico com dado do usuário. |
| 17 | Limite de tentativas de login | 🔧 | O limite antigo ficava na memória de cada servidor (não funciona na Vercel). Agora fica no banco: **login** 5 erros por e-mail/15 min e 30 por IP; **PIN** 5 erros/15 min; **código de reset do PIN** 5 erros; **login de colaborador** e **senha admin local** 5 erros; **esqueci a senha** 3 e-mails/hora; **aviso de agendamento público** 10/10 min por IP. |
| 18 | GitHub sem senhas vazadas | ✅ | Histórico inteiro varrido: nenhuma chave (Supabase service, Mercado Pago, Brevo, Resend, Anthropic, AWS, GitHub). |
| 19 | Headers e CORS | ✅ | HSTS, X-Frame-Options DENY, nosniff, Referrer-Policy, Permissions-Policy e frame-ancestors ativos. Sem CORS aberto (outro site não consegue chamar a API com a sessão do usuário). |
| 20 | Teste como estranho | ✅ | Leitura anônima das 51 tabelas → 0 linhas. Gravação anônima bloqueada (exceto agendamento público, agora restrito). Listagem anônima de storage fechada. |
| 21 | Auditoria completa | ✅ | Este documento. |

## Pendências recomendadas (em ordem)

1. **PIN de gerente e senhas de colaborador** — hoje usam SHA-256 sem "sal" e o hash do PIN chega ao navegador (quem tiver acesso ao computador logado e souber usar o DevTools descobre um PIN de 4–6 dígitos em segundos). Correção: trocar para bcrypt/scrypt e mandar para a tela só "tem PIN: sim/não".
2. **Supabase → Authentication**: ligar *Leaked password protection*, senha mínima de 8 caracteres e conferir os limites de taxa do Auth.
3. **MFA (2 fatores)** para as contas de admin.
4. **Login sem confirmar e-mail**: decidir se mantém a confirmação automática.
5. **Mensagens de erro**: trocar `error.message` cru por mensagem simples + log.
6. Itens anteriores ainda abertos: `DROP POLICY IF EXISTS "Admin pode tudo no audit_log" ON public.audit_log;`, trocar PINs/senha admin, mover o conteúdo de `Chaves.txt` para um gerenciador de senhas.

Migration desta auditoria: `supabase/migrations/20261116_seguranca_auditoria.sql`.
