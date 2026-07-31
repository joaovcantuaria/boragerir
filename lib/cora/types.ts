// === Request Types ===

export interface CoraInvoiceRequest {
  code: string; // ID interno para referência
  customer: CoraBuyer;
  services: CoraService[];
  paymentTerms: CoraPaymentTerms;
  fine?: CoraFine;
  discount?: CoraDiscount;
  notification?: CoraNotification;
}

export interface CoraBuyer {
  name: string; // max 60 chars
  document: string; // CPF ou CNPJ
  email?: string;
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

// === Local DB Types (Supabase schema extensions) ===

/** Status de venda incluindo novo status de boleto pendente */
export type VendaStatus = 'concluida' | 'cancelada' | 'pendente_boleto';

/** Tipo de cobrança para contratos */
export type TipoCobrancaContrato = 'manual' | 'boleto' | 'carne';

/** Campos adicionais do contrato para Cora */
export interface ContratoCoraFields {
  tipo_cobranca: TipoCobrancaContrato;
  entrada_valor: number;
  entrada_forma_pagamento: string | null;
}

/** Resposta do endpoint de polling Pix status */
export interface PixStatusResponse {
  status: 'aberto' | 'pago' | 'vencido' | 'cancelado';
  dataPagamento?: string;
}

/** Request body para cancelar boleto */
export interface CancelarBoletoRequest {
  boletoId: string;
}
