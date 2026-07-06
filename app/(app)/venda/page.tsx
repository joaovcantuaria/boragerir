import { createClient } from "@/lib/supabase/server"
import { VendaClient } from "@/components/venda/venda-client"
import { redirect } from "next/navigation"

export const dynamic = "force-dynamic"
export const metadata = { title: "Nova Venda" }

export default async function VendaPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect("/login")

  const { data: empresas } = await supabase
    .from("empresas").select("*").eq("user_id", user.id).order("created_at", { ascending: true })
  const empresa = empresas?.[0] ?? null
  if (!empresa) redirect("/onboarding")

  const [
    { data: caixaAberto },
    { data: clientes },
    { data: produtos },
    { data: funcionarios },
  ] = await Promise.all([
    supabase.from("caixas").select("id").eq("empresa_id", empresa.id).eq("status", "aberto").single(),
    supabase.from("clientes").select("id, nome_completo, cpf, telefone, pontos_fidelidade").eq("empresa_id", empresa.id).eq("ativo", true).order("nome_completo"),
    supabase.from("produtos_servicos").select("id, nome, tipo, preco, comissao_percentual, estoque_atual").eq("empresa_id", empresa.id).eq("ativo", true).order("nome"),
    supabase.from("funcionarios").select("id, nome").eq("empresa_id", empresa.id).eq("ativo", true).order("nome"),
  ])

  return (
    <VendaClient
      empresa={empresa}
      caixaId={caixaAberto?.id ?? null}
      clientes={clientes ?? []}
      produtos={produtos ?? []}
      funcionarios={funcionarios ?? []}
    />
  )
}
