import { createClient } from "@/lib/supabase/server"
import { OrcamentosClient } from "@/components/orcamentos/orcamentos-client"
import { redirect } from "next/navigation"

export const dynamic = "force-dynamic"
export const metadata = { title: "Orçamentos" }

export default async function OrcamentosPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect("/login")

  const { data: empresas } = await supabase
    .from("empresas").select("*").eq("user_id", user.id).order("created_at", { ascending: true })
  const empresa = empresas?.[0] ?? null
  if (!empresa) redirect("/onboarding")

  const [{ data: orcamentos }, { data: clientes }, { data: produtos }] = await Promise.all([
    supabase.from("orcamentos")
      .select("*, clientes(nome_completo, telefone, email), itens_orcamento(*)")
      .eq("empresa_id", empresa.id)
      .order("created_at", { ascending: false }),
    supabase.from("clientes").select("id, nome_completo, telefone").eq("empresa_id", empresa.id).eq("ativo", true).order("nome_completo"),
    supabase.from("produtos_servicos").select("id, nome, preco").eq("empresa_id", empresa.id).eq("ativo", true).order("nome"),
  ])

  return (
    <OrcamentosClient
      empresa={empresa}
      orcamentos={orcamentos ?? []}
      clientes={clientes ?? []}
      produtos={produtos ?? []}
    />
  )
}
