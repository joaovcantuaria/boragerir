import { createClient } from "@/lib/supabase/server"
import { CaixaClient } from "@/components/caixa/caixa-client"
import { redirect } from "next/navigation"

export const dynamic = "force-dynamic"
export const metadata = { title: "Caixa" }

export default async function CaixaPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect("/login")

  const { data: empresa } = await supabase
    .from("empresas").select("*").eq("user_id", user.id).single()
  if (!empresa) redirect("/onboarding")

  const { data: caixaAberto } = await supabase
    .from("caixas")
    .select("*")
    .eq("empresa_id", empresa.id)
    .eq("status", "aberto")
    .single()

  let movimentacoes: {
    id: string; tipo: string; categoria: string; descricao: string; valor: number; created_at: string
  }[] = []

  if (caixaAberto) {
    const { data } = await supabase
      .from("movimentacoes_caixa")
      .select("*")
      .eq("caixa_id", caixaAberto.id)
      .order("created_at")
    movimentacoes = data ?? []
  }

  // Caixas anteriores disponíveis apenas nos planos Básico e Profissional
  const planosComCaixasAnteriores = ["basico", "profissional"]
  let caixasAnteriores: any[] = []
  if (planosComCaixasAnteriores.includes(empresa.plano)) {
    const { data } = await supabase
      .from("caixas")
      .select("*")
      .eq("empresa_id", empresa.id)
      .eq("status", "fechado")
      .order("data_abertura", { ascending: false })
      .limit(30)
    caixasAnteriores = data ?? []
  }

  return (
    <CaixaClient
      empresaId={empresa.id}
      userId={user.id}
      plano={empresa.plano}
      caixaAberto={caixaAberto ?? null}
      movimentacoes={movimentacoes}
      caixasAnteriores={caixasAnteriores}
    />
  )
}
