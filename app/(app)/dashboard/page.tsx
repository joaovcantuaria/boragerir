import { createClient } from "@/lib/supabase/server"
import { DashboardClient } from "@/components/dashboard/dashboard-client"
import { redirect } from "next/navigation"
import { getEmpresaAtiva } from "@/lib/get-empresa-ativa"

export const dynamic = "force-dynamic"
export const metadata = { title: "Dashboard" }

export default async function DashboardPage() {
  const { user, empresa } = await getEmpresaAtiva()
  if (!user) redirect("/login")
  if (!empresa) redirect("/onboarding")

  const supabase = await createClient()

  // Dados do dia
  const hoje = new Date()
  const inicioDia = new Date(hoje.getFullYear(), hoje.getMonth(), hoje.getDate()).toISOString()
  const fimDia = new Date(hoje.getFullYear(), hoje.getMonth(), hoje.getDate(), 23, 59, 59).toISOString()

  const [
    { data: vendasHoje },
    { data: caixaAberto },
    { data: agendamentosHoje },
    { data: estoqueBaixo },
    { data: vendasSemana },
    { data: tarefasPendentes },
  ] = await Promise.all([
    supabase.from("vendas").select("total, forma_pagamento").eq("empresa_id", empresa.id).eq("status", "concluida").gte("created_at", inicioDia).lte("created_at", fimDia),
    supabase.from("caixas").select("*").eq("empresa_id", empresa.id).eq("status", "aberto").maybeSingle(),
    supabase.from("agendamentos").select("*, clientes(nome_completo), funcionarios(nome), produtos_servicos(nome)").eq("empresa_id", empresa.id).gte("data_hora", inicioDia).lte("data_hora", fimDia).order("data_hora"),
    supabase.from("produtos_servicos").select("id, nome, estoque_atual, estoque_minimo").eq("empresa_id", empresa.id).eq("tipo", "produto").eq("ativo", true).not("estoque_minimo", "is", null),
    supabase.from("vendas").select("total, created_at").eq("empresa_id", empresa.id).eq("status", "concluida").gte("created_at", new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()).order("created_at"),
    supabase.from("tarefas").select("id, titulo, status, prioridade, prazo, bloco_id").eq("empresa_id", empresa.id).neq("status", "concluido").order("prazo", { ascending: true, nullsFirst: false }).limit(10),
  ])

  const totalVendasHoje = vendasHoje?.reduce((sum, v) => sum + v.total, 0) ?? 0
  const qtdAtendimentos = vendasHoje?.length ?? 0
  const ticketMedio = qtdAtendimentos > 0 ? totalVendasHoje / qtdAtendimentos : 0

  // Alertas de estoque baixo
  const alertasEstoque = (estoqueBaixo ?? []).filter(
    (p) => (p.estoque_atual ?? 0) <= (p.estoque_minimo ?? 0)
  )

  return (
    <DashboardClient
      empresa={empresa}
      totalVendasHoje={totalVendasHoje}
      qtdAtendimentos={qtdAtendimentos}
      ticketMedio={ticketMedio}
      caixaAberto={caixaAberto ?? null}
      agendamentosHoje={agendamentosHoje ?? []}
      alertasEstoque={alertasEstoque}
      vendasSemana={vendasSemana ?? []}
      vendasHoje={vendasHoje ?? []}
      tarefasPendentes={tarefasPendentes ?? []}
    />
  )
}
