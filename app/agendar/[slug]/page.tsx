import { createClient } from "@/lib/supabase/server"
import { AgendamentoPublicoClient } from "@/components/agendamento-publico/agendamento-publico-client"
import { notFound } from "next/navigation"

export const dynamic = "force-dynamic"

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const supabase = await createClient()
  const { data: empresa } = await supabase
    .from("empresas").select("nome, area_atuacao").eq("slug", slug).single()

  if (!empresa) return { title: "Agendamento Online" }

  return {
    title: `Agendar — ${empresa.nome}`,
    description: `Faça seu agendamento online em ${empresa.nome} — ${empresa.area_atuacao}`,
  }
}

export default async function AgendamentoPublicoPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const supabase = await createClient()

  // Buscar empresa pelo slug
  const { data: empresa } = await supabase
    .from("empresas")
    .select("id, nome, area_atuacao, telefone, logo_url, endereco_cidade, endereco_estado, plano")
    .eq("slug", slug)
    .single()

  if (!empresa) notFound()

  // Verificar se tem agendamento no plano
  if (empresa.plano === "gratuito") {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="text-center space-y-4 max-w-sm">
          <div className="text-5xl">📅</div>
          <h1 className="text-xl font-bold text-gray-800">{empresa.nome}</h1>
          <p className="text-gray-500">Este estabelecimento ainda não tem agendamento online ativo.</p>
          <p className="text-sm text-gray-400">Entre em contato pelo telefone: {empresa.telefone}</p>
        </div>
      </div>
    )
  }

  // Buscar serviços e funcionários
  const [{ data: servicos }, { data: funcionarios }] = await Promise.all([
    supabase.from("produtos_servicos")
      .select("id, nome, preco, duracao_minutos, descricao")
      .eq("empresa_id", empresa.id)
      .eq("tipo", "servico")
      .eq("ativo", true)
      .order("nome"),
    supabase.from("funcionarios")
      .select("id, nome, cargo")
      .eq("empresa_id", empresa.id)
      .eq("ativo", true)
      .order("nome"),
  ])

  return (
    <AgendamentoPublicoClient
      empresa={empresa}
      servicos={servicos ?? []}
      funcionarios={funcionarios ?? []}
    />
  )
}
