# RESUMO COMPLETO DO SISTEMA — BORA GERIR

> **Última atualização:** 19/07/2026
> **Projeto:** h:\APP GESTÃO\beautyflow
> **Domínio:** https://app.boragerir.com
> **Stack:** Next.js 16 + Supabase + Tailwind v4 + Vercel
> **Repositório:** https://github.com/joaovcantuaria/boragerir.git (branch: main)

---

## 1. VISÃO GERAL

O **Bora Gerir** é um sistema SaaS de gestão para pequenos negócios (salões, barbearias, clínicas, comércios, prestadores de serviço). Oferece PDV, caixa, agendamento, financeiro, fidelidade, orçamentos, contratos e tarefas. Modelo de receita por assinatura mensal/anual com pagamento via Pix (Mercado Pago).

---

## 2. STACK E INFRAESTRUTURA

| Camada | Tecnologia |
|--------|-----------|
| Frontend | Next.js 16 (App Router, Server Components + Client Components) |
| Estilização | Tailwind CSS v4, componentes UI próprios (shadcn-style) |
| Backend/API | Next.js Route Handlers (app/api/) |
| Banco de dados | Supabase (PostgreSQL) |
| Autenticação | Supabase Auth (email/senha) |
| Hospedagem | Vercel (deploy automático via push no main) |
| Emails | Brevo (Sendinblue) — API REST, 300/dia no free |
| Pagamentos | Mercado Pago — API /v1/orders (Pix) |
| Storage | Supabase Storage (logos, avatares) |

---

## 3. ESTRUTURA DE DIRETÓRIOS PRINCIPAL

```
app/
├── (app)/          → Área logada do cliente (dashboard, caixa, venda, etc.)
├── (auth)/         → Login e cadastro
├── admin/          → Painel administrativo (super_admin)
├── agendar/[slug]/ → Link público de agendamento
├── api/            → Endpoints da API
components/
├── admin/          → Componentes do painel admin
├── caixa/          → CaixaClient
├── clientes/       → ClientesClient
├── configuracoes/  → ConfiguracoesClient, ConfigAcessos
├── dashboard/      → DashboardClient
├── financeiro/     → FinanceiroClient
├── funcionarios/   → FuncionariosClient
├── layout/         → Topbar, MobileNav, SearchPalette
├── planos/         → PlanosClient (tela de assinatura)
├── produtos/       → ProdutosServicosClient
├── ui/             → Componentes reutilizáveis (Button, Input, PinModal, PinGuard, PinProtected, etc.)
├── venda/          → VendaClient (PDV)
hooks/              → use-empresa, use-pin-gerente, use-keyboard-shortcuts, etc.
lib/
├── email/          → brevo.ts (envio + templates)
├── supabase/       → client.ts, server.ts, admin.ts, middleware.ts
├── pdf/            → recibo.ts
├── utils.ts        → formatarMoeda, labelsFormaPagamento, areasAtuacao, etc.
types/
├── index.ts        → Tipos exportados (Empresa, Cliente, Venda, planosInfo, etc.)
├── database.ts     → Tipos gerados do Supabase (inclui pin_gerente, restricoes_acesso)
```

---

## 4. PAGAMENTOS — MERCADO PAGO (⚠️ NÃO ALTERAR)

### REGRAS ABSOLUTAS:
- Usa API `/v1/orders` (nova API de Orders) — **NÃO** usa `/v1/payments`
- Conta PJ: contatojoaovcantuaria@gmail.com, ID 685197576
- Aplicação: "Bora Gerir App" (ID 1362212706252454)
- Token começa com APP_USR-136221270625...
- `external_reference` na Order é **apenas** o empresa_id (UUID) — sem pipe nem caracteres especiais
- **NÃO** envia `notification_url` nem `metadata` no body (não suportados)
- `total_amount` e `amount` devem ser **string** com 2 casas decimais (ex: "49.00")
- Valor mínimo: R$1,00
- QR Code gerado inline na página (sem popup/Checkout Pro)
- Polling de status a cada 5s via `/api/pagamentos/status?payment_id={ORDER_ID}`
- Assinaturas inseridas com `createAdminClient()` (service role) para bypassar RLS

### ARQUIVOS CRÍTICOS (NÃO MODIFICAR SEM NECESSIDADE):
- `app/api/pagamentos/criar-assinatura/route.ts`
- `app/api/pagamentos/status/route.ts`
- `app/api/pagamentos/validar-cupom/route.ts`
- `app/api/pagamentos/webhook/route.ts`
- `components/planos/planos-client.tsx`
- `lib/planos/client.ts`

### VARIÁVEIS DE AMBIENTE (Vercel):
- `MERCADOPAGO_ACCESS_TOKEN` — Token de produção
- `NEXT_PUBLIC_MERCADOPAGO_PUBLIC_KEY` — Public Key
- `MERCADOPAGO_WEBHOOK_SECRET` — Secret do webhook
- `NEXT_PUBLIC_APP_URL` — https://app.boragerir.com
- `SUPABASE_SERVICE_ROLE_KEY` — Para adminClient
- `BREVO_API_KEY` — Para envio de emails

---

## 5. PLANOS E PREÇOS

| Plano | Preço | Clientes | Produtos | Funcionários | Rotas |
|-------|-------|----------|----------|--------------|-------|
| Gratuito | R$0 | 15 | 10 | 0 | Todas |
| Agenda | R$29/mês | ∞ | ∞ | 3 | /agendamentos, /configuracoes |
| Básico | R$49/mês | 200 | ∞ | 3 | Todas |
| Profissional | R$99/mês | ∞ | ∞ | ∞ | Todas |
| Gestão | R$29,90/mês | ∞ | ∞ | ∞ | /dashboard, /caixa, /financeiro, /funcionarios, /tarefas, /configuracoes, /empresas |

### Features por plano:
- **Gratuito:** Vendas, Caixa básico, Cadastro limitado. Marca d'água em documentos.
- **Agenda:** Agendamento online (link público), agenda interna, tarefas.
- **Básico:** Tudo do gratuito + agenda interna, relatórios, tarefas, contratos, débito, caixas anteriores.
- **Profissional:** Tudo + agendamento online, lembretes, fidelidade, exportação Excel.
- **Gestão:** Multi-caixa, financeiro avançado, multi-empresa, exportação, sem agendamento/fidelidade.

Constraint no banco: `assinaturas_plano_check` aceita: gratuito, agenda, basico, profissional, gestao.

---

## 6. AUTENTICAÇÃO E MIDDLEWARE

- Supabase Auth com email/senha
- Cadastro detecta email existente (identities?.length === 0)
- Middleware em `lib/supabase/middleware.ts`:
  - Rotas API passam direto
  - Plano agenda → só /agendamentos e /configuracoes
  - Plano gestão → rotas restritas a dashboard/caixa/financeiro/funcionarios/tarefas/configuracoes/empresas
  - Admin acessando rota normal → redireciona para /admin
- Admin email: contato@boragerir.com

---

## 7. PDV — TELA DE NOVA VENDA (/venda)

### Layout:
- Full-screen sem scroll da página (h-[calc(100vh-4rem)])
- Duas colunas: esquerda (busca + itens com scroll interno) / direita (pagamento + opções)
- Header compacto com nome empresa + barra de atalhos

### Atalhos de teclado:
- F2 — Buscar produto
- F3 — Buscar cliente
- F4 — Finalizar venda
- F5 — Nova venda
- F6 — Campo de desconto (muda pra %)
- F7 — Selecionar atendente
- F8 — Alternar forma de pagamento
- Enter — Navegação sequencial (qty → busca → seleciona → finaliza)
- ↑↓ — Navegar lista de produtos/clientes
- 1-5 — Seleção rápida de pagamento (fora de input)

### Scanner de código de barras:
- Detecção via Enter (scanner envia Enter no final)
- Sem auto-match no onChange (evita duplo disparo)
- Campo de quantidade à esquerda, reseta para 1 após adicionar

### Autoprint:
- Botão "🖨️ Auto ON/OFF" no header do PDV
- Salvo em localStorage
- Imprime via iframe oculto após venda

### Modal de sucesso — atalhos:
- F1 — Imprimir térmica
- F2 — Imprimir PDF
- F3 — WhatsApp
- Enter — Nova venda

### Recibo térmico:
- Formato monospace 48 chars/linha (bobina 80mm)
- Empresa, CNPJ, telefone, nº venda, data/hora, cliente, atendente, itens, descontos, total, pagamento, troco

---

## 8. PIN DE GERENTE — CONTROLE DE ACESSOS

### Conceito:
PIN numérico 4-6 dígitos que o dono configura em Configurações → Acessos. Protege áreas e ações específicas.

### Estrutura no banco:
- `empresas.pin_gerente` — SHA-256 hash do PIN
- `empresas.restricoes_acesso` — JSONB: `{ areas_protegidas: string[], limite_desconto_sem_pin: number }`

### Componentes:
- `PinModal` — Modal OTP 6 dígitos, shake on error, "Esqueci o PIN" (reset via email)
- `PinGuard` — Bloqueia página inteira (usado no layout)
- `PinProtected` — Bloqueia seção/aba específica dentro da página
- `ConfigAcessos` — UI de configuração (Configurações → Acessos)
- `executarComPin()` — Helper function nos client components para proteger botões

### Lógica de bloqueio (layout.tsx):
- Se APENAS a área raiz está marcada (sem sub-itens) → bloqueia página inteira
- Se tem sub-itens marcados → página abre normal, PIN pedido apenas na ação

### Áreas configuráveis (12 módulos, cada um com sub-opções):
Dashboard, Caixa, Nova Venda, Agendamentos, Clientes, Financeiro, Produtos/Serviços, Orçamentos, Contratos, Tarefas, Colaboradores, Configurações

### Páginas com integração granular completa:
- Caixa (sangria, suprimento, despesa, fechar, caixas anteriores)
- Financeiro (resumo, relatórios)
- Dashboard (KPIs, gráfico)
- Clientes (cadastrar, editar, débitos)
- Produtos (cadastrar, editar)
- Funcionários (cadastrar, editar, desativar)
- Venda (desconto acima do limite)

### Reset de PIN:
- "Esqueci o PIN" → envia código 6 dígitos via email (Brevo)
- Código salvo no banco (restricoes_acesso._reset_pin) — não em memória
- Expira em 10 minutos

---

## 9. CUPONS DE DESCONTO

- Cadastro no admin: /admin/cupons
- Campos: código, tipo (percentual/fixo), valor, uso máximo, validade, planos_validos, periodicidades_validas, apenas_primeiro_mes
- `planos_validos: []` = vale para todos
- `periodicidades_validas: []` = vale para qualquer periodicidade
- `apenas_primeiro_mes: true` = só para quem nunca teve assinatura ativa
- Validação em: `/api/pagamentos/validar-cupom`

---

## 10. EMAILS (BREVO)

### Templates existentes:
- `templateBase()` — Layout HTML padrão (header laranja, footer)
- `templateAlertaVencimento()` — Aviso de assinatura vencendo
- `templateOrcamento()` — Orçamento enviado ao cliente
- `templateAgendamentoConfirmado()` — Confirmação de agendamento
- `templateTesteGratis()` — Parabéns pelo teste grátis
- `templateAssinaturaConfirmada()` — Confirmação de assinatura paga

### Disparos automáticos:
- Teste grátis ativado (admin) → email parabenizando
- Pagamento Pix confirmado → email de assinatura confirmada
- Assinatura manual (admin) → email de confirmação
- Reset de PIN → código de verificação

### Email Marketing (admin):
- Rota: /admin/email-marketing
- 7 templates prontos (Promoção, Cupom Flash, Novidade, Vencimento, Boas-vindas, Upgrade, Livre)
- Filtros: todos, por plano, por região, individual
- Envio em batches de 10 com delay 1.5s
- Preview ao vivo antes de enviar

---

## 11. PAINEL ADMIN (/admin)

### Acesso: contato@boragerir.com (super_admin)

### Páginas:
- Dashboard — métricas gerais
- Empresas — listagem, detalhe, alterar plano
- Empresa detalhe — abas: Dados, Assinaturas, Empresas (gestão), Acessos (faturamento), Histórico, Notas, Email, Perigo
- Assinaturas — gerenciar
- Cupons — CRUD
- Email Marketing — disparos em massa
- Suporte — tickets
- Vendedores — afiliados
- Atendimentos IA — chatbot
- Configurações — sistema

### Ações no detalhe da empresa:
- Criar assinatura manual (teste ou pago)
- Alterar plano
- Enviar email
- Adicionar notas internas
- Zerar conta (remove vendas/caixas/agendamentos, preserva empresa/clientes/produtos)

---

## 12. BANCO DE DADOS (SUPABASE)

### Tabelas principais:
empresas, clientes, produtos_servicos, funcionarios, caixas, vendas, itens_venda, movimentacoes_caixa, agendamentos, orcamentos, itens_orcamento, categorias, assinaturas, cupons, notas_admin, tickets_suporte, recompensas_fidelidade, resgates_recompensas, debitos_clientes, tarefas, contratos

### Colunas adicionadas manualmente (migrations):
- `empresas.pin_gerente` TEXT DEFAULT NULL
- `empresas.restricoes_acesso` JSONB DEFAULT '{}'
- `cupons.periodicidades_validas` TEXT[] DEFAULT '{}'
- `cupons.apenas_primeiro_mes` BOOLEAN DEFAULT false

### Migration pendente (opcional):
- `audit_log` — tabela para histórico de alterações admin

### RLS:
- Tabelas com dados sensíveis usam RLS
- Inserções de assinatura usam `createAdminClient()` para bypassar RLS
- O admin client usa SUPABASE_SERVICE_ROLE_KEY

---

## 13. O QUE NÃO FUNCIONA / NÃO USAR

- Endpoint `/v1/payments` (API legacy) retorna 401 code 7 — NUNCA usar
- Checkout Pro (preferences) funciona mas foi removido do fluxo
- `notification_url` e `metadata` no body de `/v1/orders` — não suportados, causam erro 400
- O campo `created_at` das vendas usa `new Date(\`${dataVenda}T12:00:00\`).toISOString()` para vendas retroativas

---

## 14. O QUE PODE SER MELHORADO (BACKLOG)

1. **Página "Como Usar"** — Tutorial/ajuda com orientações práticas por módulo
2. **Integração PIN nas páginas restantes** — Orçamentos, Contratos, Tarefas, Agendamentos (proteção granular botão-a-botão)
3. **Audit Log real** — Registrar alterações feitas pelo admin nas APIs (tabela audit_log já criada, falta popular)
4. **Histórico de acessos real** — Tracking de logins com tabela dedicada
5. **Notificações push** — Lembretes de agendamento, vencimento
6. **App mobile (PWA)** — Já é responsivo, falta manifest + service worker
7. **Relatórios exportáveis** — Excel/PDF nos relatórios financeiros
8. **Dashboard do admin** — Gráficos de crescimento, churn, MRR
9. **Multi-idioma** — Suporte a outros idiomas
10. **Testes automatizados** — Zero testes atualmente
11. **Plano Brevo pago** — Para >300 emails/dia
12. **QZ Tray** — Impressão 100% silenciosa (sem diálogo do navegador)

---

## 15. PADRÕES DE CÓDIGO

- Componentes client: `"use client"` no topo
- Server components: sem "use client", async function
- API routes: `export async function POST/GET(req: NextRequest)`
- Supabase client-side: `import { createClient } from "@/lib/supabase/client"`
- Supabase server-side: `import { createClient } from "@/lib/supabase/server"`
- Supabase admin (bypass RLS): `import { createAdminClient } from "@/lib/supabase/admin"`
- Toast: `import { toast } from "sonner"`
- Formatação: `formatarMoeda()` de `@/lib/utils`
- Tipo Empresa: `import type { Empresa } from "@/types"`
- UI components: `@/components/ui/*` (Button, Input, Dialog, Select, Tabs, etc.)
- Ícones: lucide-react
- Datas: date-fns com locale ptBR
- Formulários: react-hook-form + zod

---

## 16. DEPLOY

- Push no `main` → deploy automático na Vercel
- Domínio: app.boragerir.com
- Sem CI/CD adicional
- Sem testes (build passa = deploy)

---

## 17. LIMITES ATUAIS DA INFRAESTRUTURA

| Recurso | Plano atual | Limite |
|---------|-------------|--------|
| Vercel | Hobby | ~100k requests/mês, 100 req/s |
| Supabase | Free | 500MB, 60 conexões simultâneas, 50k auth users |
| Brevo | Free | 300 emails/dia |

**Escalar quando:** Supabase Pro ($25/mês) ao passar de ~100 empresas ativas diárias.

---

## 18. CONTATOS E CREDENCIAIS

- Email admin: contato@boragerir.com
- Mercado Pago PJ: contatojoaovcantuaria@gmail.com (ID 685197576)
- Aplicação MP: "Bora Gerir App" (ID 1362212706252454)
- Supabase project: verificar dashboard
- Vercel project: verificar dashboard

---

*Este arquivo serve como contexto completo para continuidade de desenvolvimento em novos chats.*
