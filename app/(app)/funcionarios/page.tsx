import { createClient } from "@/lib/supabase/server"
import { FuncionariosClient } from "@/components/funcionarios/funcionarios-client"
import { redirect } from "next/navigation"
import { getEmpresaAtiva } from "@/lib/get-empresa-ativa"

export const dynamic = "force-dynamic"
export const metadata = { title: "Colaboradores" }

export default async function FuncionariosPage() {
  const { user, empresa } = await getEmpresaAtiva()
  if (!user) redirect("/login")
  if (!empresa) redirect("/onboarding")

  const supabase = await createClient()

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
      pinGerente={empresa.pin_gerente ?? null}
      restricoesAcesso={empresa.restricoes_acesso ?? null}
    />
  )
}
