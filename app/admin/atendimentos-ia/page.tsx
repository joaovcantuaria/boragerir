import { createAdminClient } from "@/lib/supabase/admin"
import { AdminAtendimentosIAClient } from "@/components/admin/admin-atendimentos-ia-client"

export const dynamic = "force-dynamic"
export const metadata = { title: "Atendimentos IA — Admin" }

export default async function AdminAtendimentosIAPage() {
  const supabase = createAdminClient()

  let atendimentos: unknown[] = []
  try {
    const { data } = await supabase
      .from("conversas_mel")
      .select("*, empresas(nome, logo_url), mensagens_mel(count)")
      .order("updated_at", { ascending: false })
      .limit(100)
    atendimentos = data ?? []
  } catch {}

  return <AdminAtendimentosIAClient atendimentos={atendimentos as Parameters<typeof AdminAtendimentosIAClient>[0]["atendimentos"]} />
}
