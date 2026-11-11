import { createClient } from "@/lib/supabase/server"
import { redirect } from "next/navigation"
import { BoletosPage } from "@/components/cora/boletos-page"
import { getEmpresaAtiva } from "@/lib/get-empresa-ativa"

export default async function BoletosRoute() {
  const supabase = await createClient()

  // Empresa ativa (funciona para quem tem mais de uma empresa)
  const { user, empresa } = await getEmpresaAtiva()
  if (!user) redirect("/auth/login")

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
