import { createAdminClient } from "@/lib/supabase/admin"
import { AdminSuporteClient } from "@/components/admin/admin-suporte-client"

export const dynamic = "force-dynamic"
export const metadata = { title: "Suporte — Admin" }

export default async function AdminSuportePage() {
  const supabase = createAdminClient()

  const { data: tickets } = await supabase
    .from("tickets_suporte")
    .select("*, empresas(nome, email, logo_url)")
    .order("created_at", { ascending: false })

  return <AdminSuporteClient tickets={tickets ?? []} />
}
