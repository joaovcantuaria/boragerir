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

/**
 * Obtém um token de acesso válido para a empresa.
 * Busca a conta no banco, verifica expiração com margem de 5 minutos,
 * e renova automaticamente se necessário.
 */
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
    // Token válido — descriptografar e retornar
    return {
      accessToken: decrypt(conta.access_token_encrypted, CORA_ENCRYPTION_KEY),
      coraAccountId: conta.cora_account_id,
    };
  }

  // Token expirado ou próximo de expirar — renovar
  return await refreshToken(conta);
}

/**
 * Renova o token usando o refresh_token via POST /oauth/token da Cora.
 * Atualiza tokens criptografados no banco. Marca conta como erro se falhar.
 */
async function refreshToken(conta: any): Promise<TokenResult> {
  const supabase = createAdminClient();
  const refreshTokenDecrypted = decrypt(conta.refresh_token_encrypted, CORA_ENCRYPTION_KEY);

  const credentials = Buffer.from(`${CORA_CLIENT_ID}:${CORA_CLIENT_SECRET}`).toString('base64');

  // OAuth endpoint is at the base URL, not under /v2
  const baseUrl = CORA_API_URL.replace(/\/v2\/?$/, '');
  const response = await fetch(`${baseUrl}/oauth/token`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      'Authorization': `Basic ${credentials}`,
    },
    body: new URLSearchParams({
      grant_type: 'refresh_token',
      refresh_token: refreshTokenDecrypted,
    }),
  });

  if (!response.ok) {
    // Refresh falhou — marcar conta como erro para exigir reconexão
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
      updated_at: new Date().toISOString(),
    })
    .eq('id', conta.id);

  return {
    accessToken: tokens.access_token,
    coraAccountId: conta.cora_account_id,
  };
}

/**
 * Armazena tokens da Cora criptografados no banco (upsert por empresa_id).
 * Usado após o fluxo OAuth callback ao receber tokens pela primeira vez.
 */
export async function storeTokens(
  empresaId: string,
  tokens: CoraTokenResponse,
  coraAccountId: string
): Promise<void> {
  const supabase = createAdminClient();
  const expiresAt = new Date(Date.now() + tokens.expires_in * 1000).toISOString();

  await supabase.from('cora_contas').upsert(
    {
      empresa_id: empresaId,
      cora_account_id: coraAccountId,
      access_token_encrypted: encrypt(tokens.access_token, CORA_ENCRYPTION_KEY),
      refresh_token_encrypted: encrypt(tokens.refresh_token, CORA_ENCRYPTION_KEY),
      token_expires_at: expiresAt,
      status: 'ativo',
      updated_at: new Date().toISOString(),
    },
    { onConflict: 'empresa_id' }
  );
}

/**
 * Revoga tokens da empresa: limpa credenciais e marca status como 'desconectado'.
 */
export async function revokeTokens(empresaId: string): Promise<void> {
  const supabase = createAdminClient();

  await supabase
    .from('cora_contas')
    .update({
      access_token_encrypted: null,
      refresh_token_encrypted: null,
      token_expires_at: null,
      status: 'desconectado',
      updated_at: new Date().toISOString(),
    })
    .eq('empresa_id', empresaId);
}
