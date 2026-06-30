import { createClient } from "@/lib/supabase/server"
import { ContratosClient } from "@/components/contratos/contratos-client"
import { redirect } from "next/navigation"

export const dynamic = "force-dynamic"
export const metadata = { title: "Contratos" }

export default async function ContratosPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect("/login")

  const { data: empresa } = await supabase
    .from("empresas").select("id, plano").eq("user_id", user.id).single()
  if (!empresa) redirect("/onboarding")

  const [
    { data: contratos },
    { data: parcelas },
    { data: clientes },
    { data: servicos },
    { data: funcionarios },
  ] = await Promise.all([
    supabase.from("contratos").select("*").eq("empresa_id", empresa.id).order("created_at", { ascending: false }),
    supabase.from("contratos_parcelas").select("*").eq("empresa_id", empresa.id).order("data_vencimento", { ascending: true }),
    supabase.from("clientes").select("id, nome_completo, telefone").eq("empresa_id", empresa.id).eq("ativo", true).order("nome_completo"),
    supabase.from("produtos_servicos").select("id, nome, preco").eq("empresa_id", empresa.id).eq("tipo", "servico").eq("ativo", true).order("nome"),
    supabase.from("funcionarios").select("id, nome").eq("empresa_id", empresa.id).eq("ativo", true).order("nome"),
  ])

  return (
    <ContratosClient
      empresaId={empresa.id}
      contratosInit={contratos ?? []}
      parcelasInit={parcelas ?? []}
      clientes={clientes ?? []}
      servicos={servicos ?? []}
      funcionarios={funcionarios ?? []}
    />
  )
}
