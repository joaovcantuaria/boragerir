import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { createAdminClient } from "@/lib/supabase/admin"

export interface CoraAccessResult {
  empresaId: string
  userId: string
}

/**
 * Valida acesso às funcionalidades Cora:
 * 1. Verifica sessão Supabase (autenticação)
 * 2. Obtém a empresa do usuário logado
 * 3. Verifica se o plano da empresa é "profissional"
 *
 * Retorna { empresaId, userId } se autorizado,
 * ou NextResponse com erro 401/403 caso contrário.
 */
export async function validateCoraAccess(): Promise<CoraAccessResult | NextResponse> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json(
      { error: "Não autorizado" },
      { status: 401 }
    )
  }

  const { data: empresa } = await supabase
    .from("empresas")
    .select("id, plano")
    .eq("user_id", user.id)
    .single()

  if (!empresa) {
    return NextResponse.json(
      { error: "Empresa não encontrada" },
      { status: 403 }
    )
  }

  if (empresa.plano !== "profissional") {
    return NextResponse.json(
      { error: "Funcionalidade disponível apenas no plano Profissional", upgradeUrl: "/planos" },
      { status: 403 }
    )
  }

  return { empresaId: empresa.id, userId: user.id }
}

/**
 * Helper para verificar se o resultado de validateCoraAccess é um erro (NextResponse)
 */
export function isCoraAccessError(result: CoraAccessResult | NextResponse): result is NextResponse {
  return result instanceof NextResponse
}

/**
 * Valida acesso Cora E verifica se existe uma conta Cora ativa para a empresa.
 * Use em rotas que precisam confirmar a conectividade com a Cora antes de prosseguir.
 *
 * Retorna { empresaId, userId, coraContaId } se autorizado e com conta ativa,
 * ou NextResponse com erro 401/403 caso contrário.
 */
export async function validateCoraAccessWithAccount(): Promise<(CoraAccessResult & { coraContaId: string }) | NextResponse> {
  const baseResult = await validateCoraAccess()
  if (isCoraAccessError(baseResult)) return baseResult

  const supabase = createAdminClient()
  const { data: conta } = await supabase
    .from("cora_contas")
    .select("id")
    .eq("empresa_id", baseResult.empresaId)
    .eq("status", "ativo")
    .maybeSingle()

  if (!conta) {
    return NextResponse.json(
      { error: "Conta Cora não conectada. Conecte sua conta em Configurações.", coraSetupUrl: "/configuracoes" },
      { status: 403 }
    )
  }

  return { ...baseResult, coraContaId: conta.id }
}
