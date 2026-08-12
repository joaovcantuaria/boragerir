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
      const errorText = await response.text().catch(() => "");
      let errorBody: any = {};
      try { errorBody = JSON.parse(errorText); } catch {}
      console.error("[CoraClient] API Error:", response.status, response.statusText, "Body:", errorText, "URL:", `${CORA_API_URL}${path}`);
      throw new CoraApiError(response.status, errorBody.code || errorBody.error_code, errorBody.message || errorBody.error_description || errorText);
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
   * Converte os campos de camelCase (interno) para snake_case (API Cora v2).
   */
  async createInvoice(data: CoraInvoiceRequest): Promise<CoraInvoiceResponse> {
    // Transform to Cora's expected snake_case format
    const coraBody = {
      code: data.code,
      customer: {
        name: data.customer.name,
        email: data.customer.email || undefined,
        document: {
          identity: data.customer.document,
          type: data.customer.document.length === 14 ? "CNPJ" : "CPF"
        },
        address: {
          street: data.customer.address.street,
          number: data.customer.address.number,
          complement: data.customer.address.complement || undefined,
          district: data.customer.address.district,
          city: data.customer.address.city,
          state: data.customer.address.state,
          zip_code: data.customer.address.zipCode
        }
      },
      services: data.services.map(s => ({
        name: s.name,
        amount: s.amount
      })),
      payment_terms: {
        due_date: data.paymentTerms.dueDate
      },
      ...(data.notification ? { notification: { emails: data.notification.emails } } : {})
    };

    // Get raw response from Cora (snake_case format)
    const raw: any = await this.request<any>('/invoices', {
      method: 'POST',
      body: JSON.stringify(coraBody),
    });

    // Transform Cora's snake_case response to our camelCase types
    return this.mapInvoiceResponse(raw);
  }

  /**
   * Consulta os detalhes de uma cobrança pelo ID.
   */
  async getInvoice(invoiceId: string): Promise<CoraInvoiceResponse> {
    const raw: any = await this.request<any>(`/invoices/${invoiceId}`);
    return this.mapInvoiceResponse(raw);
  }

  /**
   * Mapeia a resposta snake_case da API Cora para o formato camelCase interno.
   */
  private mapInvoiceResponse(raw: any): CoraInvoiceResponse {
    return {
      id: raw.id,
      amountTotal: raw.total_amount ?? raw.amountTotal ?? 0,
      status: raw.status,
      documentUrl: raw.payment_options?.bank_slip?.url || raw.documentUrl || null,
      buyer: raw.customer || raw.buyer,
      bankslip: raw.payment_options?.bank_slip ? {
        barcode: raw.payment_options.bank_slip.barcode || "",
        digitableLine: raw.payment_options.bank_slip.digitable || "",
      } : (raw.bankslip || { barcode: "", digitableLine: "" }),
      pix: raw.pix ? {
        qrCode: raw.pix.qr_code || raw.pix.qrCode || raw.pix.encoded_image || "",
        copyAndPaste: raw.pix.copy_and_paste || raw.pix.emv || "",
      } : undefined,
      services: raw.services || [],
      paymentTerms: raw.payment_terms
        ? { dueDate: raw.payment_terms.due_date }
        : (raw.paymentTerms || { dueDate: "" }),
      payments: raw.payments || [],
      createdAt: raw.created_at || raw.createdAt || "",
    };
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
