import { createClient } from "@/lib/supabase/server"
import { SuporteClient } from "@/components/suporte/suporte-client"
import { redirect } from "next/navigation"

export const dynamic = "force-dynamic"
export const metadata = { title: "Suporte" }

export default async function SuportePage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect("/login")

  const { data: empresa } = await supabase
    .from("empresas").select("id, nome").eq("user_id", user.id).single()
  if (!empresa) redirect("/onboarding")

  const { data: tickets } = await supabase
    .from("tickets_suporte")
    .select("*")
    .eq("empresa_id", empresa.id)
    .order("created_at", { ascending: false })

  return <SuporteClient empresaId={empresa.id} tickets={tickets ?? []} />
}
