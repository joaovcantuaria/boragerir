import { createAdminClient } from "@/lib/supabase/admin"

export async function logCoraAudit(
  empresaId: string,
  userId: string,
  operacao: string,
  detalhes?: Record<string, unknown>
): Promise<void> {
  const supabase = createAdminClient()
  await supabase.from("cora_audit_log").insert({
    empresa_id: empresaId,
    user_id: userId,
    operacao,
    detalhes: detalhes ?? null,
  })
}
