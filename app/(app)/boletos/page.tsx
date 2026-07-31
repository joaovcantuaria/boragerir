import { createClient } from "@/lib/supabase/server"
import { redirect } from "next/navigation"
import { BoletosPage } from "@/components/cora/boletos-page"

export default async function BoletosRoute() {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect("/auth/login")

  const { data: empresa } = await supabase
    .from("empresas")
    .select("id, plano, nome")
    .eq("user_id", user.id)
    .single()

  if (!empresa || empresa.plano !== "profissional") {
    redirect("/financeiro")
  }

  const { data: coraConta } = await supabase
    .from("cora_contas")
    .select("id, status")
    .eq("empresa_id", empresa.id)
    .eq("status", "ativo")
    .maybeSingle()

  if (!coraConta) {
    redirect("/configuracoes")
  }

  return <BoletosPage empresaId={empresa.id} />
}
