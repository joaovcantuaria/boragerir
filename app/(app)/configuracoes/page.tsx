import { createClient } from "@/lib/supabase/server"
import { ConfiguracoesClient } from "@/components/configuracoes/configuracoes-client"
import { redirect } from "next/navigation"

export const dynamic = "force-dynamic"
export const metadata = { title: "Configurações" }

const ABAS = ["negocio", "fidelidade", "plano", "categorias", "documentos", "acessos", "conta", "backup", "cora", "chat"]

export default async function ConfiguracoesPage({ searchParams }: { searchParams: Promise<{ aba?: string }> }) {
  const { aba } = await searchParams
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect("/login")

  const { data: empresasArr } = await supabase.from("empresas").select("*").eq("user_id", user.id).order("created_at", { ascending: true })
  const empresa = empresasArr?.[0] ?? null

  const { data: categorias } = await supabase.from("categorias").select("*").eq("empresa_id", "").order("nome")

  if (!empresa) redirect("/onboarding")

  const { data: categoriasEmpresa } = await supabase
    .from("categorias")
    .select("*")
    .eq("empresa_id", empresa.id)
    .order("nome")

  return (
    <ConfiguracoesClient
      empresa={empresa}
      userEmail={user.email ?? ""}
      categorias={categoriasEmpresa ?? []}
      abaInicial={aba && ABAS.includes(aba) ? aba : "negocio"}
    />
  )
}
