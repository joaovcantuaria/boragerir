import { createAdminClient } from "@/lib/supabase/admin"
import { AdminAssinaturasClient } from "@/components/admin/admin-assinaturas-client"

export const dynamic = "force-dynamic"
export const metadata = { title: "Assinaturas — Admin" }

export default async function AdminAssinaturasPage() {
  const supabase = createAdminClient()

  const { data: assinaturas } = await supabase
    .from("assinaturas")
    .select("*, empresas(nome, email, logo_url)")
    .order("created_at", { ascending: false })

  const totais = {
    ativas: assinaturas?.filter((a) => a.status === "ativa").length ?? 0,
    pendentes: assinaturas?.filter((a) => a.status === "pendente").length ?? 0,
    canceladas: assinaturas?.filter((a) => a.status === "cancelada").length ?? 0,
    receitaTotal: assinaturas?.filter((a) => a.status === "ativa")
      .reduce((s, a) => s + a.valor_total, 0) ?? 0,
  }

  return <AdminAssinaturasClient assinaturas={assinaturas ?? []} totais={totais} />
}
