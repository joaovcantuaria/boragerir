import { createClient } from "@/lib/supabase/server"
import { ContratosClient } from "@/components/contratos/contratos-client"
import { redirect } from "next/navigation"
import Link from "next/link"

export const dynamic = "force-dynamic"
export const metadata = { title: "Contratos" }

export default async function ContratosPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect("/login")

  const { data: empresas } = await supabase
    .from("empresas").select("id, plano, plano_ativo").eq("user_id", user.id).order("created_at", { ascending: true })
  const empresa = empresas?.[0] ?? null
  if (!empresa) redirect("/onboarding")

  // Contratos disponível apenas nos planos Básico e Profissional
  const planosComContratos = ["basico", "profissional"]
  if (!planosComContratos.includes(empresa.plano) || !empresa.plano_ativo) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-6 text-center px-4">
        <div className="w-16 h-16 rounded-2xl bg-muted flex items-center justify-center text-3xl">📄</div>
        <div>
          <h2 className="text-2xl font-black">Gestão de Contratos</h2>
          <p className="text-muted-foreground mt-2 max-w-sm">
            A gestão de contratos recorrentes está disponível nos planos <strong>Básico</strong> e <strong>Profissional</strong>.
          </p>
        </div>
        <Link href="/planos"
          className="px-6 py-3 rounded-xl font-bold text-white text-sm hover:opacity-90 transition-opacity"
          style={{ backgroundColor: "#F26E1D" }}>
          Ver planos →
        </Link>
      </div>
    )
  }

  const [
    { data: contratos },
    { data: parcelas },
    { data: clientes },
    { data: servicos },
    { data: funcionarios },
  ] = await Promise.all([
    supabase.from("contratos").select("*").eq("empresa_id", empresa.id).order("created_at", { ascending: false }),
    supabase.from("contratos_parcelas").select("*").eq("empresa_id", empresa.id).order("data_vencimento", { ascending: true }),
    supabase.from("clientes").select("id, nome_completo, telefone").eq("empresa_id", empresa.id).eq("ativo", true).order("nome_completo"),
    supabase.from("produtos_servicos").select("id, nome, preco").eq("empresa_id", empresa.id).eq("tipo", "servico").eq("ativo", true).order("nome"),
    supabase.from("funcionarios").select("id, nome").eq("empresa_id", empresa.id).eq("ativo", true).order("nome"),
  ])

  return (
    <ContratosClient
      empresaId={empresa.id}
      contratosInit={contratos ?? []}
      parcelasInit={parcelas ?? []}
      clientes={clientes ?? []}
      servicos={servicos ?? []}
      funcionarios={funcionarios ?? []}
    />
  )
}
