import { getValidToken } from './tokens';
import type {
  CoraInvoiceRequest,
  CoraInvoiceResponse,
  CoraTransferRequest,
  CoraTransferResponse,
  CoraStatementResponse,
  CoraWebhookEndpointRequest,
  CoraWebhookEndpointResponse,
} from './types';

const CORA_API_URL = process.env.CORA_API_URL!;

/**
 * Erro tipado para respostas de erro da API da Cora.
 */
export class CoraApiError extends Error {
  public statusCode: number;
  public code: string | undefined;

  constructor(statusCode: number, code: string | undefined, message: string | undefined) {
    super(message || `Cora API error: ${statusCode}`);
    this.name = 'CoraApiError';
    this.statusCode = statusCode;
    this.code = code;
  }
}

/**
 * Cliente HTTP para a API da Cora.
 * Gerencia autenticação automática (token refresh) e idempotência.
 */
export class CoraClient {
  private empresaId: string;

  constructor(empresaId: string) {
    this.empresaId = empresaId;
  }

  /**
   * Faz uma requisição autenticada para a API da Cora.
   * - Obtém token válido via getValidToken (com refresh automático)
   * - Inclui Idempotency-Key (crypto.randomUUID) em toda requisição
   * - Lança CoraApiError em caso de resposta não-ok
   */
  private async request<T>(path: string, options: RequestInit = {}): Promise<T> {
    const { accessToken } = await getValidToken(this.empresaId);

    const response = await fetch(`${CORA_API_URL}${path}`, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${accessToken}`,
        'Idempotency-Key': crypto.randomUUID(),
        ...options.headers,
      },
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({}));
      throw new CoraApiError(response.status, error.code, error.message);
    }

    // Para respostas 204 (No Content), retorna undefined como T
    if (response.status === 204) {
      return undefined as T;
    }

    return response.json();
  }

  // === Invoices (Boletos) ===

  /**
   * Emite uma nova cobrança (boleto/Pix) na Cora.
   */
  async createInvoice(data: CoraInvoiceRequest): Promise<CoraInvoiceResponse> {
    return this.request<CoraInvoiceResponse>('/invoices', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  /**
   * Consulta os detalhes de uma cobrança pelo ID.
   */
  async getInvoice(invoiceId: string): Promise<CoraInvoiceResponse> {
    return this.request<CoraInvoiceResponse>(`/invoices/${invoiceId}`);
  }

  /**
   * Cancela uma cobrança existente.
   */
  async cancelInvoice(invoiceId: string): Promise<void> {
    await this.request(`/invoices/${invoiceId}`, { method: 'DELETE' });
  }

  // === Transfers ===

  /**
   * Solicita uma transferência bancária via Cora.
   */
  async createTransfer(data: CoraTransferRequest): Promise<CoraTransferResponse> {
    return this.request<CoraTransferResponse>('/transfers', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  /**
   * Lista transferências da conta com paginação opcional.
   */
  async listTransfers(params?: { page?: number; size?: number }): Promise<CoraTransferResponse[]> {
    const query = new URLSearchParams();
    if (params?.page) query.set('page', String(params.page));
    if (params?.size) query.set('size', String(params.size));
    const queryString = query.toString();
    return this.request<CoraTransferResponse[]>(
      `/transfers${queryString ? `?${queryString}` : ''}`
    );
  }

  // === Statement (Extrato) ===

  /**
   * Consulta o extrato bancário no período especificado.
   */
  async getStatement(startDate: string, endDate: string): Promise<CoraStatementResponse> {
    const query = new URLSearchParams({ startDate, endDate });
    return this.request<CoraStatementResponse>(`/statements?${query}`);
  }

  // === Webhooks ===

  /**
   * Registra um endpoint de webhook na Cora para receber notificações.
   */
  async registerWebhook(data: CoraWebhookEndpointRequest): Promise<CoraWebhookEndpointResponse> {
    return this.request<CoraWebhookEndpointResponse>('/endpoints', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  /**
   * Remove um endpoint de webhook registrado na Cora.
   */
  async deleteWebhook(endpointId: string): Promise<void> {
    await this.request(`/endpoints/${endpointId}`, { method: 'DELETE' });
  }
}
