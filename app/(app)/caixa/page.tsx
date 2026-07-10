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
    .order("created_at", { ascending: true })

  // Para gestão: pode ter múltiplos caixas abertos
  const caixaPrincipal = caixaAberto?.[0] ?? null
  const caixasAbertos = caixaAberto ?? []

  let movimentacoes: {
    id: string; tipo: string; categoria: string; descricao: string; valor: number; created_at: string
  }[] = []

  if (caixaPrincipal) {
    // Carregar movimentações de todos os caixas abertos
    const caixaIds = caixasAbertos.map((c: any) => c.id)
    const { data } = await supabase
      .from("movimentacoes_caixa")
      .select("*, vendas!movimentacoes_caixa_venda_id_fkey(status)")
      .in("caixa_id", caixaIds)
      .order("created_at")
    movimentacoes = (data ?? []).filter((m: any) => {
      if (!m.venda_id) return true
      if (m.vendas && m.vendas.status === "cancelada") return false
      return true
    })
  }

  // Caixas anteriores disponíveis nos planos Básico, Profissional e Gestão
  const planosComCaixasAnteriores = ["basico", "profissional", "gestao"]
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
      caixaAberto={caixaPrincipal}
      caixasAbertos={caixasAbertos}
      movimentacoes={movimentacoes}
      caixasAnteriores={caixasAnteriores}
      pinGerente={empresa.pin_gerente ?? null}
      restricoesAcesso={empresa.restricoes_acesso ?? null}
    />
  )
}
