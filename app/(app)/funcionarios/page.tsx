import { createClient } from "@/lib/supabase/server"
import { FuncionariosClient } from "@/components/funcionarios/funcionarios-client"
import { redirect } from "next/navigation"

export const dynamic = "force-dynamic"
export const metadata = { title: "Colaboradores" }

export default async function FuncionariosPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect("/login")

  const { data: empresa } = await supabase
    .from("empresas").select("*").eq("user_id", user.id).single()
  if (!empresa) redirect("/onboarding")

  const { data: funcionarios } = await supabase
    .from("funcionarios")
    .select("*")
    .eq("empresa_id", empresa.id)
    .order("nome")

  return (
    <FuncionariosClient
      empresaId={empresa.id}
      plano={empresa.plano}
      funcionarios={funcionarios ?? []}
    />
  )
}
