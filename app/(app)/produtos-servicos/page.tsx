import { createClient } from "@/lib/supabase/server"
import { ProdutosServicosClient } from "@/components/produtos/produtos-servicos-client"
import { redirect } from "next/navigation"

export const dynamic = "force-dynamic"
export const metadata = { title: "Produtos e Serviços" }

export default async function ProdutosServicosPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect("/login")

  const { data: empresa } = await supabase
    .from("empresas").select("*").eq("user_id", user.id).single()
  if (!empresa) redirect("/onboarding")

  const [{ data: produtos }, { data: categorias }] = await Promise.all([
    supabase.from("produtos_servicos").select("*").eq("empresa_id", empresa.id).order("nome"),
    supabase.from("categorias").select("*").eq("empresa_id", empresa.id).order("nome"),
  ])

  return (
    <ProdutosServicosClient
      empresaId={empresa.id}
      plano={empresa.plano}
      produtos={produtos ?? []}
      categorias={categorias ?? []}
    />
  )
}
