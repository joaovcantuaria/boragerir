import { createClient } from "@/lib/supabase/server"
import { EmpresasGestaoClient } from "@/components/empresas/empresas-gestao-client"
import { redirect } from "next/navigation"

export const dynamic = "force-dynamic"
export const metadata = { title: "Minhas Empresas" }

export default async function EmpresasPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect("/login")

  // Carregar todas as empresas do usuário
  const { data: empresas } = await supabase
    .from("empresas")
    .select("*")
    .eq("user_id", user.id)
    .order("created_at", { ascending: true })

  if (!empresas || empresas.length === 0) redirect("/onboarding")

  // O max_empresas vem da primeira empresa (principal)
  const maxEmpresas = (empresas[0] as any).max_empresas ?? 1

  return (
    <EmpresasGestaoClient
      empresas={empresas}
      maxEmpresas={maxEmpresas}
      userId={user.id}
    />
  )
}
