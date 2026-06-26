import { createAdminClient } from "@/lib/supabase/admin"
import { AdminCuponsClient } from "@/components/admin/admin-cupons-client"

export const dynamic = "force-dynamic"
export const metadata = { title: "Cupons — Admin" }

export default async function AdminCuponsPage() {
  const supabase = createAdminClient()
  let cupons: unknown[] = []
  try {
    const { data } = await supabase.from("cupons").select("*").order("created_at", { ascending: false })
    cupons = data ?? []
  } catch {}
  return <AdminCuponsClient cupons={cupons as Parameters<typeof AdminCuponsClient>[0]["cupons"]} />
}
