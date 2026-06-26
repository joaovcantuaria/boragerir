import { createClient } from "@/lib/supabase/server"
import { AgendamentosClient } from "@/components/agendamentos/agendamentos-client"
import { redirect } from "next/navigation"

export const dynamic = "force-dynamic"
export const metadata = { title: "Agendamentos" }

export default async function AgendamentosPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect("/login")

  const { data: empresaData } = await supabase
    .from("empresas").select("*").eq("user_id", user.id).single()
  if (!empresaData) redirect("/onboarding")
  const empresa = empresaData!

  // Queries separadas para evitar problema de inferência de tipo com joins
  const { data: agendamentosRaw } = await supabase
    .from("agendamentos")
    .select("id, data_hora, status, duracao_minutos, observacoes, nome_cliente_avulso, telefone_cliente_avulso, cliente_id, funcionario_id, servico_id")
    .eq("empresa_id", empresa.id)
    .gte("data_hora", new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString())
    .order("data_hora", { ascending: true })

  const { data: clientes } = await supabase
    .from("clientes")
    .select("id, nome_completo, telefone")
    .eq("empresa_id", empresa.id)
    .eq("ativo", true)
    .order("nome_completo")

  const { data: servicos } = await supabase
    .from("produtos_servicos")
    .select("id, nome, duracao_minutos")
    .eq("empresa_id", empresa.id)
    .eq("tipo", "servico")
    .eq("ativo", true)
    .order("nome")

  const { data: funcionarios } = await supabase
    .from("funcionarios")
    .select("id, nome")
    .eq("empresa_id", empresa.id)
    .eq("ativo", true)
    .order("nome")

  // Enriquecer agendamentos com dados relacionados
  const clientesMap = Object.fromEntries((clientes ?? []).map((c) => [c.id, c]))
  const servicosMap = Object.fromEntries((servicos ?? []).map((s) => [s.id, s]))
  const funcionariosMap = Object.fromEntries((funcionarios ?? []).map((f) => [f.id, f]))

  const agendamentos = (agendamentosRaw ?? []).map((ag) => ({
    ...ag,
    clientes: ag.cliente_id ? (clientesMap[ag.cliente_id] ?? null) : null,
    funcionarios: ag.funcionario_id ? ({ nome: funcionariosMap[ag.funcionario_id]?.nome ?? null }) : null,
    produtos_servicos: ag.servico_id ? ({ nome: servicosMap[ag.servico_id]?.nome ?? null }) : null,
  }))

  return (
    <AgendamentosClient
      empresaId={empresa.id}
      plano={empresa.plano}
      agendamentos={agendamentos}
      clientes={clientes ?? []}
      servicos={servicos ?? []}
      funcionarios={funcionarios ?? []}
    />
  )
}
