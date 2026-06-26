import { createAdminClient } from "@/lib/supabase/admin"
import { AdminVendedoresClient } from "@/components/admin/admin-vendedores-client"

export const dynamic = "force-dynamic"
export const metadata = { title: "Vendedores — Admin" }

export default async function AdminVendedoresPage() {
  const supabase = createAdminClient()
  let vendedores: unknown[] = []
  try {
    const { data } = await supabase.from("vendedores").select("*").order("created_at", { ascending: false })
    vendedores = data ?? []
  } catch {}
  return <AdminVendedoresClient vendedores={vendedores as Parameters<typeof AdminVendedoresClient>[0]["vendedores"]} />
}
