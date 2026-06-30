import { createClient } from "@/lib/supabase/server"
import { TarefasClient } from "@/components/tarefas/tarefas-client"
import { redirect } from "next/navigation"

export const dynamic = "force-dynamic"
export const metadata = { title: "Tarefas" }

export default async function TarefasPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect("/login")

  const { data: empresa } = await supabase
    .from("empresas").select("id").eq("user_id", user.id).single()
  if (!empresa) redirect("/onboarding")

  const [{ data: blocos }, { data: tarefas }] = await Promise.all([
    supabase
      .from("blocos_tarefas")
      .select("*")
      .eq("empresa_id", empresa.id)
      .order("posicao", { ascending: true }),
    supabase
      .from("tarefas")
      .select("*")
      .eq("empresa_id", empresa.id)
      .order("posicao", { ascending: true }),
  ])

  return (
    <TarefasClient
      empresaId={empresa.id}
      blocosInit={blocos ?? []}
      tarefasInit={tarefas ?? []}
    />
  )
}
