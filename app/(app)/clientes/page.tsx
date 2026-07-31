import { createClient } from "@/lib/supabase/server"
import { ClientesClient } from "@/components/clientes/clientes-client"
import { redirect } from "next/navigation"

export const dynamic = "force-dynamic"
export const metadata = { title: "Clientes" }

export default async function ClientesPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect("/login")

  const { data: empresas } = await supabase
    .from("empresas").select("*").eq("user_id", user.id).order("created_at", { ascending: true })
  const empresa = empresas?.[0] ?? null
  if (!empresa) redirect("/onboarding")

  const [{ data: clientes }, { data: debitos }] = await Promise.all([
    supabase
      .from("clientes")
      .select("*")
      .eq("empresa_id", empresa.id)
      .eq("ativo", true)
      .order("nome_completo"),
    supabase
      .from("debitos_clientes")
      .select("id, cliente_id, valor_aberto, status")
      .eq("empresa_id", empresa.id)
      .in("status", ["aberto", "parcial"]),
  ])

  return <ClientesClient empresaId={empresa.id} plano={empresa.plano} clientes={clientes ?? []} debitos={debitos ?? []} pinGerente={empresa.pin_gerente ?? null} restricoesAcesso={empresa.restricoes_acesso ?? null} />
}
