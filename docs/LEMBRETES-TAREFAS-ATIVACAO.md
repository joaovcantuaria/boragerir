# Lembretes de tarefas pelo WhatsApp do Bora Gerir — como ativar

Recurso do plano **Profissional**: o dono ativa em **Tarefas → Lembretes no WhatsApp** e recebe, do número do Bora Gerir:
- **Resumo da manhã** (horário escolhido): tarefas de hoje + atrasadas, por prioridade
- **Véspera** (18h): o que vence amanhã
- **Cobrança** (14h): atrasadas — urgente todo dia, alta a cada 2 dias (máx. 3 por dia), com botões **✅ Concluí** e **⏰ Adiar 1 dia**

## 1. Migration (Supabase do App)
`supabase/migrations/20261109_lembretes_tarefas.sql`

## 2. Templates na conta Meta do Bora Gerir (categoria **Utilidade**, idioma pt_BR)
| Nome | Texto sugerido | Botões |
|---|---|---|
| `tarefas_resumo_diario` | Olá, {{1}}. Este é o lembrete diário das tarefas cadastradas na sua conta Bora Gerir. Para hoje: {{2}}. Atrasadas: {{3}}. Para desativar, acesse Tarefas > Lembretes no WhatsApp. | — |
| `tarefas_vespera` | Olá, {{1}}. Lembrete da sua conta Bora Gerir: estas tarefas vencem amanhã: {{2}}. | — |
| `tarefas_atraso` | Olá, {{1}}. A tarefa "{{2}}" (prioridade {{3}}) da sua conta Bora Gerir está com o prazo vencido há {{4}} dia(s). Atualize o status pelos botões abaixo. | 2 botões de **resposta rápida**: `Concluí` e `Adiar 1 dia` (nessa ordem) |

> Evite no texto fixo: "Responda SAIR", emojis, "Bom dia!"/tom de convite — a Meta tende a classificar como Marketing. Sem cabeçalho e sem Flow.

Crie pela tela **Templates** do BoraGerir Chat, logado na empresa do número do Bora Gerir.

## 3. Agendador a cada 15 minutos (Supabase do **App**)
1. Vercel do **App**: criar `CRON_SECRET` (senha aleatória; pode ser diferente da do Chat) e fazer Redeploy.
2. Supabase do App → Database → Extensions: ativar **pg_cron** e **pg_net**.
3. SQL Editor (troque a senha):
```sql
SELECT cron.schedule(
  'boragerir-lembretes-tarefas',
  '*/15 * * * *',
  $$
  SELECT net.http_post(
    url := 'https://app.boragerir.com/api/cron/lembretes-tarefas',
    headers := jsonb_build_object('Authorization', 'Bearer SEU_CRON_SECRET_DO_APP', 'Content-Type', 'application/json'),
    body := '{}'::jsonb,
    timeout_milliseconds := 60000
  );
  $$
);
```

## 4. Conferir
Em **Tarefas → Lembretes no WhatsApp**: ative, crie uma tarefa com prazo para hoje e clique em **Enviar teste**.

## Regras de segurança
- Os botões levam código assinado (HMAC com a `INTEGRACOES_ENCRYPTION_KEY`): só valem para a tarefa certa e para o telefone cadastrado.
- Quem responde **SAIR** ao número do Bora Gerir é descadastrado no Chat; o App desliga os lembretes daquela empresa no próximo envio.
- Cada aviso sai no máximo uma vez (resumo por dia; cobrança por tarefa por dia).
