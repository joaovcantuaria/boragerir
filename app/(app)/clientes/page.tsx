import { createClient } from "@/lib/supabase/server"
import { ClientesClient } from "@/components/clientes/clientes-client"
import { redirect } from "next/navigation"

export const dynamic = "force-dynamic"
export const metadata = { title: "Clientes" }

export default async function ClientesPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect("/login")

  const { data: empresa } = await supabase
    .from("empresas").select("*").eq("user_id", user.id).single()
  if (!empresa) redirect("/onboarding")

  const { data: clientes } = await supabase
    .from("clientes")
    .select("*")
    .eq("empresa_id", empresa.id)
    .eq("ativo", true)
    .order("nome_completo")

  return <ClientesClient empresaId={empresa.id} plano={empresa.plano} clientes={clientes ?? []} />
}
