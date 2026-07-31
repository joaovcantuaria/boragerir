import { NextRequest, NextResponse } from "next/server"
import { validateCoraAccess, isCoraAccessError } from "@/lib/cora/middleware"
import { revokeTokens } from "@/lib/cora/tokens"
import { CoraClient } from "@/lib/cora/client"
import { createAdminClient } from "@/lib/supabase/admin"
import { logCoraAudit } from "@/lib/cora/audit"

export async function POST(request: NextRequest) {
  const access = await validateCoraAccess()
  if (isCoraAccessError(access)) {
    return access
  }

  const { empresaId, userId } = access

  try {
    // Best effort: tentar deletar webhook registrado na Cora
    const supabase = createAdminClient()
    const { data: conta } = await supabase
      .from("cora_contas")
      .select("webhook_id")
      .eq("empresa_id", empresaId)
      .single()

    if (conta?.webhook_id) {
      try {
        const client = new CoraClient(empresaId)
        await client.deleteWebhook(conta.webhook_id)
      } catch {
        // Best effort — ignora erros ao deletar webhook
      }
    }

    // Revogar tokens e marcar como desconectado
    await revokeTokens(empresaId)

    // Registrar operação no audit log
    await logCoraAudit(empresaId, userId, "desconexao", {
      motivo: "Desconexão manual pelo usuário",
    })

    return NextResponse.json({ ok: true })
  } catch (error) {
    console.error("[Cora Disconnect] Erro:", error)
    return NextResponse.json(
      { error: "Erro ao desconectar conta Cora" },
      { status: 500 }
    )
  }
}
