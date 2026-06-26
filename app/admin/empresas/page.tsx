import { createAdminClient } from "@/lib/supabase/admin"
import { AdminEmpresasClient } from "@/components/admin/admin-empresas-client"

export const dynamic = "force-dynamic"
export const metadata = { title: "Empresas — Admin" }

export default async function AdminEmpresasPage() {
  const supabase = createAdminClient()

  const { data: empresas } = await supabase
    .from("empresas")
    .select("*, assinaturas(status, plano, periodicidade, valor_total, created_at)")
    .order("created_at", { ascending: false })

  return <AdminEmpresasClient empresas={empresas ?? []} />
}
