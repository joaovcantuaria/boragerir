# Design Document: Integração Cora Pagamentos

## Overview

Esta integração conecta o sistema Bora Gerir à API da Cora Pagamentos, permitindo que empresas do plano Profissional emitam boletos registrados, carnês, cobranças Pix e realizem transferências diretamente pelo sistema. A arquitetura segue o padrão OAuth2 Authorization Code Flow para vinculação de contas, com tokens armazenados criptografados (AES-256) e renovação automática. Webhooks da Cora notificam o sistema em tempo real sobre pagamentos e mudanças de status.

**Stack**: Next.js (App Router) + Supabase (PostgreSQL) + Vercel  
**API da Cora**: https://api.cora.com.br/v2 (produção) | https://api.stage.cora.com.br/v2 (sandbox)

---

## Architecture

### Diagrama de Componentes

```mermaid
graph TB
    subgraph "Frontend (Next.js Client)"
        UI[Componentes React]
        PDV[PDV / Venda]
        CONTRATOS[Contratos]
    end

    subgraph "Backend (Next.js API Routes)"
        AUTH[/api/cora/auth]
        CALLBACK[/api/cora/callback]
        BOLETOS_API[/api/cora/boletos]
        PIX_API[/api/cora/pix]
        EXTRATO_API[/api/cora/extrato]
        TRANSFER_API[/api/cora/transferencias]
        WEBHOOK[/api/cora/webhook]
        DISCONNECT[/api/cora/disconnect]
    end

    subgraph "Lib Layer (lib/cora/)"
        CLIENT[CoraClient]
        CRYPTO[crypto.ts]
        TOKENS[tokens.ts]
        TYPES[types.ts]
    end

    subgraph "External"
        CORA_API[Cora API v2]
        CORA_AUTH[Cora OAuth Server]
    end

    subgraph "Database (Supabase)"
        DB_CONTAS[cora_contas]
        DB_BOLETOS[cora_boletos]
        DB_TRANSACOES[cora_transacoes]
    end

    UI --> AUTH
    UI --> BOLETOS_API
    UI --> PIX_API
    UI --> EXTRATO_API
    UI --> TRANSFER_API
    PDV --> BOLETOS_API
    PDV --> PIX_API
    CONTRATOS --> BOLETOS_API

    AUTH --> CORA_AUTH
    CALLBACK --> CORA_AUTH
    CALLBACK --> CRYPTO
    CALLBACK --> DB_CONTAS

    BOLETOS_API --> CLIENT
    PIX_API --> CLIENT
    EXTRATO_API --> CLIENT
    TRANSFER_API --> CLIENT
    DISCONNECT --> CLIENT

    CLIENT --> TOKENS
    TOKENS --> CRYPTO
    TOKENS --> DB_CONTAS
    CLIENT --> CORA_API

    WEBHOOK --> DB_BOLETOS
    WEBHOOK --> DB_TRANSACOES
end
```


### Fluxo OAuth2 (Authorization Code)

```mermaid
sequenceDiagram
    participant U as Usuário
    participant F as Frontend
    participant API as API Route
    participant CORA as Cora OAuth
    participant DB as Supabase

    U->>F: Clica "Conectar Cora"
    F->>API: GET /api/cora/auth
    API->>API: Valida plano Profissional
    API->>U: Redirect → Cora OAuth authorize
    U->>CORA: Login + Autoriza escopos
    CORA->>API: Redirect → /api/cora/callback?code=XXX
    API->>CORA: POST /oauth/token (code → tokens)
    CORA->>API: { access_token, refresh_token, expires_in }
    API->>API: Encrypt tokens (AES-256)
    API->>DB: INSERT cora_contas (tokens encrypted)
    API->>API: Registra webhooks na Cora
    API->>F: Redirect → /configuracoes (sucesso)
end
```

### Fluxo de Renovação Automática de Token

```mermaid
sequenceDiagram
    participant API as API Route
    participant TOKENS as tokens.ts
    participant CRYPTO as crypto.ts
    participant DB as Supabase
    participant CORA as Cora API

    API->>TOKENS: getValidToken(empresa_id)
    TOKENS->>DB: SELECT cora_contas WHERE empresa_id
    TOKENS->>TOKENS: Check token_expires_at
    alt Token válido
        TOKENS->>CRYPTO: decrypt(access_token_encrypted)
        CRYPTO->>TOKENS: access_token
    else Token expirado
        TOKENS->>CRYPTO: decrypt(refresh_token_encrypted)
        TOKENS->>CORA: POST /oauth/token (grant_type=refresh_token)
        CORA->>TOKENS: { new_access_token, new_refresh_token }
        TOKENS->>CRYPTO: encrypt(new tokens)
        TOKENS->>DB: UPDATE cora_contas (new encrypted tokens)
    end
    TOKENS->>API: access_token
end
```


### Fluxo de Webhook

```mermaid
sequenceDiagram
    participant CORA as Cora
    participant WH as /api/cora/webhook
    participant DB as Supabase

    CORA->>WH: POST (event payload + auth token)
    WH->>WH: Valida CORA_WEBHOOK_SECRET
    alt Token inválido
        WH->>CORA: 401 Unauthorized
    else Token válido
        WH->>WH: Parse event (resource + trigger)
        WH->>DB: Check idempotência (já processou?)
        alt Já processado
            WH->>CORA: 200 OK (noop)
        else Novo evento
            WH->>DB: UPDATE status (boleto/transferência)
            WH->>DB: Baixa em venda/parcela se vinculado
            WH->>CORA: 200 OK
        end
    end
end
```

---

## Components and Interfaces

### lib/cora/types.ts

```typescript
// === Request Types ===

export interface CoraInvoiceRequest {
  code: string; // ID interno para referência
  buyer: CoraBuyer;
  services: CoraService[];
  paymentTerms: CoraPaymentTerms;
  fine?: CoraFine;
  discount?: CoraDiscount;
  notification?: CoraNotification;
}

export interface CoraBuyer {
  name: string; // max 60 chars
  document: string; // CPF ou CNPJ
  email: string;
  type: 'PERSON' | 'BUSINESS';
  address: CoraAddress;
}

export interface CoraAddress {
  street: string;
  number: string;
  complement?: string;
  district: string;
  city: string;
  state: string;
  zipCode: string;
}

export interface CoraService {
  name: string;
  amount: number; // valor em centavos
}

export interface CoraPaymentTerms {
  dueDate: string; // YYYY-MM-DD
}

export interface CoraFine {
  startDate: string;
  amount: number;
  percentage: number;
}

export interface CoraDiscount {
  type: 'FIXED' | 'PERCENTAGE';
  value: number;
  limitDate: string;
}

export interface CoraNotification {
  emails: string[];
}

// === Response Types ===

export interface CoraInvoiceResponse {
  id: string;
  amountTotal: number; // centavos
  status: CoraInvoiceStatus;
  documentUrl: string;
  buyer: CoraBuyer;
  bankslip: CoraBankslip;
  pix?: CoraPix;
  services: CoraService[];
  paymentTerms: CoraPaymentTerms;
  payments: CoraPayment[];
  createdAt: string;
}

export type CoraInvoiceStatus = 'DRAFT' | 'OPEN' | 'PAID' | 'LATE' | 'CANCELED';

export interface CoraBankslip {
  barcode: string;
  digitableLine: string;
}

export interface CoraPix {
  qrCode: string; // base64 image
  copyAndPaste: string; // código copia-e-cola
}

export interface CoraPayment {
  id: string;
  amount: number;
  paidAt: string;
  paymentForm: 'BARCODE' | 'PIX';
}

// === Transfer Types ===

export interface CoraTransferRequest {
  amount: number; // centavos
  description: string;
  destination: CoraTransferDestination;
}

export interface CoraTransferDestination {
  bankCode: string;
  branchNumber: string;
  accountNumber: string;
  accountType: 'CHECKING' | 'SAVINGS';
  document: string;
  name: string;
}

export interface CoraTransferResponse {
  id: string;
  amount: number;
  status: CoraTransferStatus;
  description: string;
  destination: CoraTransferDestination;
  createdAt: string;
}

export type CoraTransferStatus = 'INITIATED' | 'APPROVED' | 'COMPLETED' | 'CANCELED' | 'REFUNDED';

// === Webhook Types ===

export interface CoraWebhookPayload {
  id: string;
  resource: 'invoice' | 'transfer' | 'payment';
  trigger: string;
  data: Record<string, unknown>;
}

export interface CoraWebhookEndpointRequest {
  url: string;
  resource: string;
  trigger: string;
}

export interface CoraWebhookEndpointResponse {
  id: string;
  url: string;
  resource: string;
  trigger: string;
  active: boolean;
}

// === Statement Types ===

export interface CoraStatementEntry {
  id: string;
  date: string;
  type: 'CREDIT' | 'DEBIT';
  description: string;
  amount: number;
  balance: number;
}

export interface CoraStatementResponse {
  entries: CoraStatementEntry[];
  balance: number;
}

// === OAuth Types ===

export interface CoraTokenResponse {
  access_token: string;
  expires_in: number;
  refresh_token: string;
  token_type: string;
  scope: string;
}
```


### lib/cora/crypto.ts

```typescript
import crypto from 'crypto';

const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 16;
const TAG_LENGTH = 16;

export function encrypt(plaintext: string, key: string): string {
  // key deve ter 32 bytes (256 bits)
  const keyBuffer = Buffer.from(key, 'hex');
  const iv = crypto.randomBytes(IV_LENGTH);
  const cipher = crypto.createCipheriv(ALGORITHM, keyBuffer, iv);
  
  let encrypted = cipher.update(plaintext, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  const tag = cipher.getAuthTag();
  
  // Formato: iv:tag:ciphertext (tudo em hex)
  return `${iv.toString('hex')}:${tag.toString('hex')}:${encrypted}`;
}

export function decrypt(ciphertext: string, key: string): string {
  const keyBuffer = Buffer.from(key, 'hex');
  const [ivHex, tagHex, encrypted] = ciphertext.split(':');
  
  const iv = Buffer.from(ivHex, 'hex');
  const tag = Buffer.from(tagHex, 'hex');
  const decipher = crypto.createDecipheriv(ALGORITHM, keyBuffer, iv);
  decipher.setAuthTag(tag);
  
  let decrypted = decipher.update(encrypted, 'hex', 'utf8');
  decrypted += decipher.final('utf8');
  
  return decrypted;
}
```

### lib/cora/tokens.ts

```typescript
import { createAdminClient } from '@/lib/supabase/admin';
import { encrypt, decrypt } from './crypto';
import { CoraTokenResponse } from './types';

const CORA_API_URL = process.env.CORA_API_URL!;
const CORA_CLIENT_ID = process.env.CORA_CLIENT_ID!;
const CORA_CLIENT_SECRET = process.env.CORA_CLIENT_SECRET!;
const CORA_ENCRYPTION_KEY = process.env.CORA_ENCRYPTION_KEY!;

export interface TokenResult {
  accessToken: string;
  coraAccountId: string;
}

export async function getValidToken(empresaId: string): Promise<TokenResult> {
  const supabase = createAdminClient();
  
  const { data: conta, error } = await supabase
    .from('cora_contas')
    .select('*')
    .eq('empresa_id', empresaId)
    .eq('status', 'ativo')
    .single();
    
  if (error || !conta) {
    throw new Error('Conta Cora não encontrada ou inativa');
  }
  
  // Verifica se token ainda é válido (com margem de 5 min)
  const expiresAt = new Date(conta.token_expires_at);
  const now = new Date();
  const marginMs = 5 * 60 * 1000;
  
  if (expiresAt.getTime() - marginMs > now.getTime()) {
    // Token válido
    return {
      accessToken: decrypt(conta.access_token_encrypted, CORA_ENCRYPTION_KEY),
      coraAccountId: conta.cora_account_id
    };
  }
  
  // Token expirado — renovar
  return await refreshToken(conta);
}

async function refreshToken(conta: any): Promise<TokenResult> {
  const supabase = createAdminClient();
  const refreshTokenDecrypted = decrypt(conta.refresh_token_encrypted, CORA_ENCRYPTION_KEY);
  
  const credentials = Buffer.from(`${CORA_CLIENT_ID}:${CORA_CLIENT_SECRET}`).toString('base64');
  
  const response = await fetch(`${CORA_API_URL}/oauth/token`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      'Authorization': `Basic ${credentials}`
    },
    body: new URLSearchParams({
      grant_type: 'refresh_token',
      refresh_token: refreshTokenDecrypted
    })
  });
  
  if (!response.ok) {
    // Refresh falhou — marcar conta como erro
    await supabase
      .from('cora_contas')
      .update({ status: 'erro', updated_at: new Date().toISOString() })
      .eq('id', conta.id);
    throw new Error('Token refresh falhou. Reconexão necessária.');
  }
  
  const tokens: CoraTokenResponse = await response.json();
  
  // Salvar novos tokens criptografados
  const newExpiresAt = new Date(Date.now() + tokens.expires_in * 1000).toISOString();
  
  await supabase
    .from('cora_contas')
    .update({
      access_token_encrypted: encrypt(tokens.access_token, CORA_ENCRYPTION_KEY),
      refresh_token_encrypted: encrypt(tokens.refresh_token, CORA_ENCRYPTION_KEY),
      token_expires_at: newExpiresAt,
      updated_at: new Date().toISOString()
    })
    .eq('id', conta.id);
  
  return {
    accessToken: tokens.access_token,
    coraAccountId: conta.cora_account_id
  };
}

export async function storeTokens(
  empresaId: string,
  tokens: CoraTokenResponse,
  coraAccountId: string
): Promise<void> {
  const supabase = createAdminClient();
  const expiresAt = new Date(Date.now() + tokens.expires_in * 1000).toISOString();
  
  await supabase.from('cora_contas').upsert({
    empresa_id: empresaId,
    cora_account_id: coraAccountId,
    access_token_encrypted: encrypt(tokens.access_token, CORA_ENCRYPTION_KEY),
    refresh_token_encrypted: encrypt(tokens.refresh_token, CORA_ENCRYPTION_KEY),
    token_expires_at: expiresAt,
    status: 'ativo',
    updated_at: new Date().toISOString()
  }, { onConflict: 'empresa_id' });
}

export async function revokeTokens(empresaId: string): Promise<void> {
  const supabase = createAdminClient();
  
  await supabase
    .from('cora_contas')
    .update({
      access_token_encrypted: null,
      refresh_token_encrypted: null,
      token_expires_at: null,
      status: 'desconectado',
      updated_at: new Date().toISOString()
    })
    .eq('empresa_id', empresaId);
}
```


### lib/cora/client.ts

```typescript
import { getValidToken } from './tokens';
import type {
  CoraInvoiceRequest, CoraInvoiceResponse,
  CoraTransferRequest, CoraTransferResponse,
  CoraStatementResponse,
  CoraWebhookEndpointRequest, CoraWebhookEndpointResponse
} from './types';

const CORA_API_URL = process.env.CORA_API_URL!;

export class CoraClient {
  private empresaId: string;

  constructor(empresaId: string) {
    this.empresaId = empresaId;
  }

  private async request<T>(
    path: string,
    options: RequestInit = {}
  ): Promise<T> {
    const { accessToken } = await getValidToken(this.empresaId);

    const response = await fetch(`${CORA_API_URL}${path}`, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${accessToken}`,
        'Idempotency-Key': crypto.randomUUID(),
        ...options.headers
      }
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({}));
      throw new CoraApiError(response.status, error.code, error.message);
    }

    return response.json();
  }

  // === Invoices (Boletos) ===

  async createInvoice(data: CoraInvoiceRequest): Promise<CoraInvoiceResponse> {
    return this.request<CoraInvoiceResponse>('/invoices', {
      method: 'POST',
      body: JSON.stringify(data)
    });
  }

  async getInvoice(invoiceId: string): Promise<CoraInvoiceResponse> {
    return this.request<CoraInvoiceResponse>(`/invoices/${invoiceId}`);
  }

  async cancelInvoice(invoiceId: string): Promise<void> {
    await this.request(`/invoices/${invoiceId}`, { method: 'DELETE' });
  }

  // === Transfers ===

  async createTransfer(data: CoraTransferRequest): Promise<CoraTransferResponse> {
    return this.request<CoraTransferResponse>('/transfers', {
      method: 'POST',
      body: JSON.stringify(data)
    });
  }

  async listTransfers(params?: { page?: number; size?: number }): Promise<CoraTransferResponse[]> {
    const query = new URLSearchParams();
    if (params?.page) query.set('page', String(params.page));
    if (params?.size) query.set('size', String(params.size));
    return this.request<CoraTransferResponse[]>(`/transfers?${query}`);
  }

  // === Statement ===

  async getStatement(startDate: string, endDate: string): Promise<CoraStatementResponse> {
    const query = new URLSearchParams({ startDate, endDate });
    return this.request<CoraStatementResponse>(`/statements?${query}`);
  }

  // === Webhooks ===

  async registerWebhook(data: CoraWebhookEndpointRequest): Promise<CoraWebhookEndpointResponse> {
    return this.request<CoraWebhookEndpointResponse>('/endpoints', {
      method: 'POST',
      body: JSON.stringify(data)
    });
  }

  async deleteWebhook(endpointId: string): Promise<void> {
    await this.request(`/endpoints/${endpointId}`, { method: 'DELETE' });
  }
}

export class CoraApiError extends Error {
  constructor(
    public statusCode: number,
    public code: string | undefined,
    message: string | undefined
  ) {
    super(message || `Cora API error: ${statusCode}`);
    this.name = 'CoraApiError';
  }
}
```


### API Routes

| Route | Method | Descrição | Auth |
|-------|--------|-----------|------|
| `/api/cora/auth` | GET | Inicia OAuth2 → redirect para Cora | Supabase session |
| `/api/cora/callback` | GET | Recebe code, troca tokens, salva | Supabase session |
| `/api/cora/disconnect` | POST | Revoga tokens, desconecta | Supabase session |
| `/api/cora/boletos` | POST | Emitir boleto | Supabase session |
| `/api/cora/boletos` | GET | Listar boletos | Supabase session |
| `/api/cora/boletos/[id]` | GET | Detalhe do boleto | Supabase session |
| `/api/cora/boletos/[id]/cancelar` | POST | Cancelar boleto | Supabase session |
| `/api/cora/boletos/carne` | POST | Emitir carnê | Supabase session |
| `/api/cora/pix` | POST | Gerar cobrança Pix | Supabase session |
| `/api/cora/extrato` | GET | Consultar extrato | Supabase session |
| `/api/cora/transferencias` | POST | Solicitar transferência | Supabase session |
| `/api/cora/transferencias` | GET | Listar transferências | Supabase session |
| `/api/cora/webhook` | POST | Receber notificações Cora | CORA_WEBHOOK_SECRET |

### Middleware de Validação de Plano

Todas as API routes (exceto webhook) passam por um middleware que:
1. Valida sessão Supabase do usuário
2. Obtém a empresa do usuário logado
3. Verifica se o plano da empresa é "profissional"
4. Se não for, retorna 403 com mensagem de upgrade necessário

```typescript
// lib/cora/middleware.ts
export async function validateCoraAccess(request: Request): Promise<{
  empresaId: string;
  userId: string;
} | Response> {
  const supabase = createServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  
  if (!user) {
    return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
  }

  const { data: empresa } = await supabase
    .from('empresas')
    .select('id, plano')
    .eq('user_id', user.id)
    .single();

  if (!empresa || empresa.plano !== 'profissional') {
    return NextResponse.json(
      { error: 'Funcionalidade disponível apenas no plano Profissional', upgradeUrl: '/planos' },
      { status: 403 }
    );
  }

  return { empresaId: empresa.id, userId: user.id };
}
```


### Frontend Components

| Componente | Descrição | Localização |
|-----------|-----------|-------------|
| `cora-config.tsx` | Aba de config (conectar/desconectar Cora) | Configurações |
| `cora-cobrancas-tab.tsx` | Sub-aba "Cobranças" com listagem e filtros | Financeiro |
| `cora-extrato.tsx` | Visualização de extrato com saldo | Financeiro |
| `cora-transferir.tsx` | Modal de transferência | Financeiro |
| `cora-emitir-boleto.tsx` | Formulário de emissão de boleto | Financeiro / PDV |
| `cora-emitir-carne.tsx` | Formulário de emissão de carnê | Financeiro / Contratos |
| `cora-status-badge.tsx` | Badge colorido de status | Compartilhado |

---

## Data Models

### Tabela: cora_contas

```sql
CREATE TABLE cora_contas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_id UUID NOT NULL UNIQUE REFERENCES empresas(id) ON DELETE CASCADE,
  cora_account_id TEXT,
  access_token_encrypted TEXT,
  refresh_token_encrypted TEXT,
  token_expires_at TIMESTAMPTZ,
  status TEXT NOT NULL DEFAULT 'ativo' CHECK (status IN ('ativo', 'desconectado', 'erro')),
  webhook_id TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- RLS: empresa só acessa sua própria conta
ALTER TABLE cora_contas ENABLE ROW LEVEL SECURITY;

CREATE POLICY "empresa_own_cora_conta" ON cora_contas
  FOR ALL USING (empresa_id IN (
    SELECT id FROM empresas WHERE user_id = auth.uid()
  ));
```


### Tabela: cora_boletos

```sql
CREATE TABLE cora_boletos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_id UUID NOT NULL REFERENCES empresas(id) ON DELETE CASCADE,
  cora_conta_id UUID NOT NULL REFERENCES cora_contas(id),
  cliente_id UUID REFERENCES clientes(id),
  venda_id UUID REFERENCES vendas(id),
  contrato_id UUID REFERENCES contratos(id),
  parcela_id UUID REFERENCES contratos_parcelas(id),
  cora_invoice_id TEXT NOT NULL,
  tipo TEXT NOT NULL CHECK (tipo IN ('boleto', 'pix', 'carne')),
  carne_id TEXT,
  numero_parcela INT,
  valor DECIMAL(10,2) NOT NULL,
  data_vencimento DATE NOT NULL,
  status TEXT NOT NULL DEFAULT 'aberto' CHECK (status IN ('aberto', 'pago', 'vencido', 'cancelado')),
  codigo_barras TEXT,
  linha_digitavel TEXT,
  qr_code_pix TEXT,
  url_pdf TEXT,
  data_pagamento TIMESTAMPTZ,
  data_cancelamento TIMESTAMPTZ,
  motivo_cancelamento TEXT,
  payload_cora JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Índices para consultas frequentes
CREATE INDEX idx_cora_boletos_empresa ON cora_boletos(empresa_id);
CREATE INDEX idx_cora_boletos_status ON cora_boletos(empresa_id, status);
CREATE INDEX idx_cora_boletos_cora_id ON cora_boletos(cora_invoice_id);
CREATE INDEX idx_cora_boletos_venda ON cora_boletos(venda_id);
CREATE INDEX idx_cora_boletos_contrato ON cora_boletos(contrato_id);
CREATE INDEX idx_cora_boletos_carne ON cora_boletos(carne_id);

-- RLS
ALTER TABLE cora_boletos ENABLE ROW LEVEL SECURITY;

CREATE POLICY "empresa_own_cora_boletos" ON cora_boletos
  FOR ALL USING (empresa_id IN (
    SELECT id FROM empresas WHERE user_id = auth.uid()
  ));
```

### Tabela: cora_transacoes

```sql
CREATE TABLE cora_transacoes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_id UUID NOT NULL REFERENCES empresas(id) ON DELETE CASCADE,
  cora_conta_id UUID NOT NULL REFERENCES cora_contas(id),
  cora_transfer_id TEXT NOT NULL,
  tipo TEXT NOT NULL CHECK (tipo IN ('transferencia', 'recebimento')),
  valor DECIMAL(10,2) NOT NULL,
  descricao TEXT,
  conta_destino JSONB,
  status TEXT NOT NULL DEFAULT 'iniciada' CHECK (status IN ('iniciada', 'aprovada', 'concluida', 'cancelada', 'estornada')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_cora_transacoes_empresa ON cora_transacoes(empresa_id);
CREATE INDEX idx_cora_transacoes_cora_id ON cora_transacoes(cora_transfer_id);

-- RLS
ALTER TABLE cora_transacoes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "empresa_own_cora_transacoes" ON cora_transacoes
  FOR ALL USING (empresa_id IN (
    SELECT id FROM empresas WHERE user_id = auth.uid()
  ));
```


### Tabela: cora_audit_log

```sql
CREATE TABLE cora_audit_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_id UUID NOT NULL REFERENCES empresas(id),
  user_id UUID NOT NULL,
  operacao TEXT NOT NULL,
  detalhes JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_cora_audit_empresa ON cora_audit_log(empresa_id, created_at DESC);
```

---

## Correctness Properties

*A property is a characteristic or behavior that should hold true across all valid executions of a system — essentially, a formal statement about what the system should do. Properties serve as the bridge between human-readable specifications and machine-verifiable correctness guarantees.*

### Property 1: Encryption Round-Trip

*For any* arbitrary string (representing a token), encrypting it with a valid AES-256 key and then decrypting the result with the same key SHALL produce the original string.

**Validates: Requirements 1.7, 12.1**

### Property 2: Carnê Value Splitting Invariant

*For any* total value (in centavos, > 0) and number of parcelas (2-48), the sum of all calculated parcela values SHALL equal the original total value exactly (handling rounding by adding remainder cents to the first parcela).

**Validates: Requirements 3.1**

### Property 3: Carnê Date Sequence

*For any* valid start date and number of parcelas (2-48), the generated due dates SHALL form a strictly increasing monthly sequence where each date is exactly one calendar month after the previous.

**Validates: Requirements 3.4**


### Property 4: Boleto Filter Correctness

*For any* set of boletos and any combination of filter criteria (status, período, nome do cliente), all returned results SHALL match every applied filter criterion, and no matching boleto SHALL be excluded from the results.

**Validates: Requirements 4.3**

### Property 5: Contract Cancellation Cascade

*For any* contract with N associated boletos in mixed statuses, when the contract is cancelled, all and only boletos with status "aberto" or "vencido" SHALL be cancelled, while boletos with status "pago" SHALL remain unchanged.

**Validates: Requirements 10.4**

### Property 6: Webhook Idempotence

*For any* valid webhook payload, processing the same payload N times (N >= 1) SHALL produce the same final database state as processing it exactly once.

**Validates: Requirements 11.8**

### Property 7: Webhook Authentication Rejection

*For any* HTTP request to the webhook endpoint that does not contain the valid CORA_WEBHOOK_SECRET in the authorization header, the system SHALL respond with HTTP 401 without modifying any database state.

**Validates: Requirements 11.6**

### Property 8: Boleto Validation Rejects Incomplete Data

*For any* boleto emission request where at least one required field (nome, documento, endereço) of the payer is missing or empty, the system SHALL reject the request and the response SHALL enumerate all missing required fields.

**Validates: Requirements 2.3**


### Property 9: Plan Access Control Gate

*For any* Cora API operation attempted by a company that does not have the "profissional" plan, the system SHALL reject the operation with HTTP 403 without executing any business logic or external API calls.

**Validates: Requirements 13.1**

### Property 10: Webhook State Transitions

*For any* valid webhook event with resource "invoice" and trigger in {paid, overdue, canceled}, the corresponding boleto's status SHALL be updated to the mapped status ("pago", "vencido", "cancelado" respectively), and for trigger "paid" the data_pagamento SHALL be set.

**Validates: Requirements 11.2, 11.3, 11.4**

### Property 11: Extrato Date Range Filter

*For any* date range filter applied to statement entries, all returned entries SHALL have dates within the specified range (inclusive), and no entry within the range SHALL be excluded.

**Validates: Requirements 7.3**

### Property 12: Audit Logging Completeness

*For any* financial operation (boleto emission, boleto cancellation, Pix generation, transfer request), an audit log entry SHALL be created containing the empresa_id, user_id, operation type, and timestamp.

**Validates: Requirements 12.4**

---

## Error Handling

### Estratégia de Erros por Camada

| Camada | Tipo de Erro | Tratamento |
|--------|-------------|------------|
| API Route | Validação de input | 400 + campos inválidos |
| API Route | Sem autenticação | 401 |
| API Route | Plano não permite | 403 + link upgrade |
| API Route | Recurso não encontrado | 404 |
| Lib/CoraClient | Cora API error | Traduzir código → mensagem PT-BR |
| Lib/tokens | Token refresh falha | Marcar conta como "erro", notificar |
| Webhook | Auth inválida | 401 (sem processar) |
| Webhook | Erro de processamento | 500 (Cora reenvia) + log |


### Mapeamento de Erros da Cora

```typescript
// lib/cora/errors.ts
const CORA_ERROR_MAP: Record<string, string> = {
  'INV-0001': 'Dados do pagador incompletos',
  'INV-0002': 'Data de vencimento inválida',
  'INV-0003': 'Valor inválido',
  'INV-0004': 'Boleto não encontrado',
  'INV-0005': 'Boleto já cancelado',
  'TRF-0001': 'Saldo insuficiente',
  'TRF-0002': 'Dados da conta destino inválidos',
  'REC-0007': 'Não é possível pagar boleto próprio',
  'AUTH-0001': 'Token de acesso expirado',
  'AUTH-0002': 'Permissão negada',
};

export function translateCoraError(code: string, fallback: string): string {
  return CORA_ERROR_MAP[code] || fallback || 'Erro na comunicação com a Cora. Tente novamente.';
}
```

### Retry e Resiliência

- **Token refresh**: tentativa automática 1x antes de falhar
- **Webhook processing**: retorna 500 para que Cora reenvie (retry nativo da Cora)
- **Carnê rollback**: se boleto N falha, cancela boletos 1..N-1 já emitidos
- **Timeout**: requests para Cora API com timeout de 30s via AbortController

### Tratamento de Sessão Expirada (60 dias inatividade)

Quando a Cora invalida a sessão por 60 dias de inatividade:
1. Refresh token retorna 401
2. Sistema marca `cora_contas.status = 'erro'`
3. Frontend detecta status "erro" e exibe banner: "Sua conexão com a Cora expirou. Reconecte para continuar usando."
4. Botão "Reconectar" reinicia fluxo OAuth

---

## Testing Strategy

### Abordagem de Testes

**Property-Based Tests (fast-check)**:
- Biblioteca: `fast-check` (TypeScript)
- Mínimo 100 iterações por property test
- Foco: lógica pura (crypto, cálculos, validação, filtros, idempotência)
- Tag format: `Feature: integracao-cora-pagamentos, Property N: [title]`

**Unit Tests (Vitest)**:
- Exemplos específicos e edge cases
- Mocks para Cora API (fetch mockado)
- Testes de cada API route isolada
- Validação de request/response shapes


**Integration Tests**:
- Testes com Supabase local (via docker)
- Fluxo completo: emissão → webhook → baixa
- OAuth flow com mocks do authorization server

### Cobertura por Área

| Área | Unit | Property | Integration |
|------|------|----------|-------------|
| crypto.ts | - | Round-trip (P1) | - |
| Cálculo carnê | - | Splitting (P2), Dates (P3) | - |
| Filtro boletos | - | Filter correctness (P4) | - |
| Webhook handler | State transitions | Idempotence (P6), Auth (P7) | Full flow |
| Validação boleto | Edge cases | Incomplete data (P8) | - |
| Middleware plano | - | Access control (P9) | - |
| Cancelamento contrato | - | Cascade (P5) | Full flow |
| Extrato filtro | - | Date range (P11) | - |
| Audit log | - | Completeness (P12) | - |
| OAuth flow | Token storage | - | Full flow |
| CoraClient | Request shape | - | Mocked API |

### Configuração de Testes

```typescript
// vitest.config.ts (relevante)
export default defineConfig({
  test: {
    environment: 'node',
    include: ['**/*.test.ts'],
    coverage: {
      include: ['lib/cora/**', 'app/api/cora/**']
    }
  }
});
```

### Variáveis de Ambiente para Testes

```env
CORA_CLIENT_ID=test-client-id
CORA_CLIENT_SECRET=test-client-secret
CORA_REDIRECT_URI=http://localhost:3000/api/cora/callback
CORA_API_URL=http://localhost:3001/mock-cora
CORA_ENCRYPTION_KEY=0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef
CORA_WEBHOOK_SECRET=test-webhook-secret
```

---

## Decisões de Design

### D1: AES-256-GCM para criptografia de tokens
- **Decisão**: Usar AES-256-GCM (authenticated encryption) ao invés de AES-256-CBC
- **Razão**: GCM fornece autenticação e integridade além da confidencialidade, prevenindo ataques de padding oracle

### D2: Tokens armazenados no banco ao invés de variáveis de ambiente por empresa
- **Decisão**: Tokens no Supabase (criptografados) com chave mestre em env var
- **Razão**: Cada empresa tem seus próprios tokens (multi-tenant), impossível usar env vars individuais

### D3: Webhook público (sem auth Supabase)
- **Decisão**: Endpoint `/api/cora/webhook` não requer sessão Supabase
- **Razão**: A Cora chama diretamente; autenticação via CORA_WEBHOOK_SECRET no header

### D4: Idempotência de webhook via cora_invoice_id + status
- **Decisão**: Verificar se o boleto já está no status target antes de atualizar
- **Razão**: Cora pode reenviar webhooks; processar duplicatas não deve alterar estado

### D5: Carnê como múltiplas chamadas (não batch)
- **Decisão**: Emitir cada boleto do carnê em chamadas individuais à API da Cora
- **Razão**: A API da Cora não oferece endpoint batch nativo; controle granular de erros por parcela

### D6: Valores em centavos na comunicação com Cora, DECIMAL(10,2) no banco local
- **Decisão**: Converter BRL (reais) → centavos ao enviar para Cora, e centavos → BRL ao receber
- **Razão**: API da Cora trabalha com centavos (integer), banco local armazena em formato monetário legível
