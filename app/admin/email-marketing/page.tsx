import { createAdminClient } from "@/lib/supabase/admin"
import { AdminEmailMarketing } from "@/components/admin/admin-email-marketing"

export const dynamic = "force-dynamic"
export const metadata = { title: "Email Marketing — Admin" }

export default async function AdminEmailMarketingPage() {
  const supabase = createAdminClient()

  const { data: empresas } = await supabase
    .from("empresas")
    .select("id, nome, email, plano, endereco_estado, user_id")
    .order("nome", { ascending: true })

  return <AdminEmailMarketing empresas={empresas ?? []} />
}
