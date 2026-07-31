import { createClient } from "@/lib/supabase/server"
import { PlanosClient } from "@/components/planos/planos-client"
import { redirect } from "next/navigation"

export const dynamic = "force-dynamic"
export const metadata = { title: "Planos" }

export default async function PlanosPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect("/login")

  const { data: empresas } = await supabase
    .from("empresas").select("*").eq("user_id", user.id).order("created_at", { ascending: true })
  const empresa = empresas?.[0] ?? null
  if (!empresa) redirect("/onboarding")

  const { data: assinaturaAtiva } = await supabase
    .from("assinaturas")
    .select("*")
    .eq("empresa_id", empresa.id)
    .eq("status", "ativa")
    .order("created_at", { ascending: false })
    .limit(1)
    .single()

  return (
    <PlanosClient
      empresa={empresa}
      assinaturaAtiva={assinaturaAtiva ?? null}
    />
  )
}
