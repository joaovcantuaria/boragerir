# BeautyFlow — Sistema de Gestão para Beleza

Sistema SaaS multi-tenant completo para salões de beleza, barbearias, estúdios de estética e negócios similares.

## Stack Tecnológica

- **Frontend**: Next.js 15, React 19, TypeScript, Tailwind CSS v4
- **Backend/DB**: Supabase (PostgreSQL + Auth + RLS + Storage)
- **UI**: Radix UI + componentes customizados
- **Gráficos**: Recharts
- **PDF**: jsPDF + jsPDF-AutoTable
- **Formulários**: React Hook Form + Zod
- **Animações**: Framer Motion
- **Notificações**: Sonner
- **Ícones**: Lucide React
- **Temas**: next-themes (dark/light)

---

## Pré-requisitos

- Node.js 18.17 ou superior
- npm 9+
- Conta no [Supabase](https://supabase.com) (gratuita)

---

## Instalação

### 1. Clone o repositório

```bash
git clone https://github.com/seu-usuario/beautyflow.git
cd beautyflow
```

### 2. Instale as dependências

```bash
npm install
```

### 3. Configure as variáveis de ambiente

```bash
cp .env.local.example .env.local
```

Edite o `.env.local` com as suas credenciais do Supabase.

---

## Configuração do Supabase

### 1. Crie um projeto no Supabase

Acesse [supabase.com](https://supabase.com) e crie um novo projeto.

### 2. Execute o script SQL

No painel do Supabase, vá em **SQL Editor** e execute o conteúdo do arquivo:

```
supabase/schema.sql
```

Este script cria:
- Todas as tabelas com relacionamentos
- Triggers de auto-incremento de número de venda e orçamento
- Políticas RLS (Row Level Security) completas
- Índices de performance
- Bucket de storage para logos

### 3. Configure a autenticação

Em **Authentication → Settings**:
- Habilite "Email/Password" como provider
- Configure o **Site URL** para `http://localhost:3000` (dev) ou sua URL de produção
- Em **Redirect URLs**, adicione: `http://localhost:3000/**`

### 4. Copie as chaves da API

Em **Settings → API**:
- Copie a **Project URL** → `NEXT_PUBLIC_SUPABASE_URL`
- Copie a **anon public key** → `NEXT_PUBLIC_SUPABASE_ANON_KEY`

---

## Rodando Localmente

```bash
npm run dev
```

Acesse [http://localhost:3000](http://localhost:3000)

---

## Deploy no Vercel

### 1. Faça push para o GitHub

```bash
git init
git add .
git commit -m "feat: BeautyFlow SaaS inicial"
git remote add origin https://github.com/seu-usuario/beautyflow.git
git push -u origin main
```

### 2. Importe no Vercel

1. Acesse [vercel.com](https://vercel.com)
2. Clique em **New Project** → importe do GitHub
3. Em **Environment Variables**, adicione:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
4. Clique em **Deploy**

### 3. Configure o Supabase para produção

Em **Authentication → Settings** do Supabase:
- Adicione a URL do Vercel em **Site URL** e **Redirect URLs**
- Ex: `https://beautyflow-xxx.vercel.app/**`

---

## Estrutura do Projeto

```
beautyflow/
├── app/
│   ├── (auth)/             # Páginas de login e cadastro
│   ├── (app)/              # Páginas autenticadas
│   │   ├── dashboard/
│   │   ├── caixa/
│   │   ├── clientes/
│   │   ├── produtos-servicos/
│   │   ├── venda/
│   │   ├── orcamentos/
│   │   ├── agendamentos/
│   │   ├── funcionarios/
│   │   ├── financeiro/
│   │   └── configuracoes/
│   └── onboarding/         # Fluxo de cadastro da empresa
├── components/
│   ├── ui/                 # Componentes base (Button, Card, etc.)
│   ├── layout/             # Sidebar, Header, MobileNav
│   ├── dashboard/
│   ├── caixa/
│   ├── clientes/
│   ├── produtos/
│   ├── venda/
│   ├── orcamentos/
│   ├── agendamentos/
│   ├── funcionarios/
│   ├── financeiro/
│   └── configuracoes/
├── lib/
│   ├── supabase/           # Clientes browser, server e middleware
│   ├── pdf/                # Geração de recibos e orçamentos
│   └── utils.ts            # Funções utilitárias (CPF, moeda, etc.)
├── types/
│   ├── database.ts         # Tipos do Supabase
│   └── index.ts            # Tipos de domínio
├── hooks/
│   └── use-empresa.ts
├── public/
│   ├── manifest.json       # PWA manifest
│   └── sw.js               # Service Worker
├── supabase/
│   └── schema.sql          # Script SQL completo
├── middleware.ts            # Proteção de rotas
└── .env.local.example
```

---

## Planos

| Feature                  | Gratuito | Básico (R$49/mês) | Profissional (R$99/mês) |
|--------------------------|----------|-------------------|--------------------------|
| Clientes                 | 30       | 200               | Ilimitado                |
| Produtos/Serviços        | 3        | Ilimitado         | Ilimitado                |
| Funcionários             | —        | 3                 | Ilimitado                |
| Agendamentos             | —        | ✓                 | ✓                        |
| PDF sem marca d'água     | —        | ✓                 | ✓                        |
| Programa de fidelidade   | —        | —                 | ✓                        |
| Lembretes automáticos    | —        | —                 | ✓                        |
| Relatórios avançados     | —        | ✓                 | ✓                        |

> **Nota**: A integração com gateway de pagamento (Stripe/Mercado Pago) está marcada como TODO no código. Por ora, todos os planos funcionam para teste.

---

## Segurança

- **RLS**: Todas as tabelas têm Row Level Security ativado. Um usuário nunca acessa dados de outra empresa.
- **Middleware**: Todas as rotas autenticadas são protegidas pelo `middleware.ts`.
- **Validação**: CPF validado no frontend com algoritmo oficial. Inputs sanitizados com Zod.

---

## Personalização

Para trocar o nome/cor do app, edite `types/index.ts`:

```typescript
export const APP_CONFIG = {
  nome: "BeautyFlow",
  slogan: "Gestão inteligente para o seu negócio",
  site: "https://beautyflow.app",
  corPrimaria: "#10B981",
  corDestructive: "#EF4444",
}
```

E ajuste as variáveis CSS em `app/globals.css`:

```css
--primary: 160 84% 39%; /* verde #10B981 */
```

---

## Licença

MIT © BeautyFlow
