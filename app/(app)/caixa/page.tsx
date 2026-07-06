import { createClient } from "@/lib/supabase/server"
import { CaixaClient } from "@/components/caixa/caixa-client"
import { redirect } from "next/navigation"
import { getEmpresaAtiva } from "@/lib/get-empresa-ativa"

export const dynamic = "force-dynamic"
export const metadata = { title: "Caixa" }

export default async function CaixaPage() {
  const { user, empresa } = await getEmpresaAtiva()
  if (!user) redirect("/login")
  if (!empresa) redirect("/onboarding")

  const supabase = await createClient()

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
      .select("*, vendas!movimentacoes_caixa_venda_id_fkey(status)")
      .eq("caixa_id", caixaAberto.id)
      .order("created_at")
    // Filtrar movimentações de vendas canceladas — só mostrar vendas ativas ou movimentações sem venda
    movimentacoes = (data ?? []).filter((m: any) => {
      if (!m.venda_id) return true // sangria, suprimento, despesa — sempre mostrar
      if (m.vendas && m.vendas.status === "cancelada") return false // venda cancelada — ocultar
      return true
    })
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
