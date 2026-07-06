import { createClient } from "@/lib/supabase/server"
import { FinanceiroClient } from "@/components/financeiro/financeiro-client"
import { redirect } from "next/navigation"
import { getEmpresaAtiva } from "@/lib/get-empresa-ativa"

export const dynamic = "force-dynamic"
export const metadata = { title: "Financeiro" }

export default async function FinanceiroPage() {
  const { user, empresa } = await getEmpresaAtiva()
  if (!user) redirect("/login")
  if (!empresa) redirect("/onboarding")

  const supabase = await createClient()

  const inicioMes = new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString()
  const fimMes = new Date(new Date().getFullYear(), new Date().getMonth() + 1, 0, 23, 59, 59).toISOString()
  // Próximos 60 dias para projeção
  const hoje = new Date()
  hoje.setHours(0, 0, 0, 0)
  const proximos60 = new Date(hoje)
  proximos60.setDate(proximos60.getDate() + 60)

  const [
    { data: vendas },
    { data: movimentacoes },
    { data: funcionarios },
    { data: debitos },
    { data: caixaAtivo },
  ] = await Promise.all([
    supabase.from("vendas")
      .select("*, itens_venda(nome_item, subtotal, comissao_valor, funcionario_id:venda_id), clientes(nome_completo)")
      .eq("empresa_id", empresa.id)
      .gte("created_at", inicioMes)
      .lte("created_at", fimMes)
      .order("created_at", { ascending: false }),
    supabase.from("movimentacoes_caixa")
      .select("*")
      .eq("empresa_id", empresa.id)
      .gte("created_at", inicioMes)
      .lte("created_at", fimMes),
    supabase.from("funcionarios").select("id, nome").eq("empresa_id", empresa.id).eq("ativo", true),
    supabase.from("debitos_clientes")
      .select("id, cliente_id, valor_total, valor_pago, valor_aberto, status, created_at, descricao, clientes(nome_completo)")
      .eq("empresa_id", empresa.id)
      .in("status", ["aberto", "parcial"])
      .order("created_at", { ascending: false }),
    supabase.from("caixas")
      .select("id, valor_abertura, status, data_abertura")
      .eq("empresa_id", empresa.id)
      .eq("status", "aberto"),
  ])

  // Contas a pagar — tolerante se tabela ainda não existir
  let contasPagar: any[] = []
  try {
    const { data: cp } = await supabase
      .from("contas_pagar")
      .select("*")
      .eq("empresa_id", empresa.id)
      .or(`status.eq.pendente,status.eq.atrasado,data_vencimento.gte.${hoje.toISOString().substring(0, 10)}`)
      .order("data_vencimento", { ascending: true })
      .limit(200)
    contasPagar = cp ?? []
  } catch { /* tabela ainda não criada no banco */ }

  // Agendamentos futuros — tolerante a erro
  let agendamentosFuturos: any[] = []
  try {
    const { data: ag } = await supabase
      .from("agendamentos")
      .select("id, data_hora, status, servico_id, produtos_servicos(preco, nome)")
      .eq("empresa_id", empresa.id)
      .in("status", ["agendado", "confirmado"])
      .gte("data_hora", hoje.toISOString())
      .lte("data_hora", proximos60.toISOString())
      .order("data_hora", { ascending: true })
    agendamentosFuturos = ag ?? []
  } catch { /* erro silencioso */ }

  // Calcular saldo atual dos caixas abertos
  let saldoCaixa = 0
  const caixasAbertosArr = Array.isArray(caixaAtivo) ? caixaAtivo : (caixaAtivo ? [caixaAtivo] : [])
  for (const cx of caixasAbertosArr) {
    const { data: movsAtuais } = await supabase
      .from("movimentacoes_caixa")
      .select("tipo, valor, venda_id, vendas!movimentacoes_caixa_venda_id_fkey(status)")
      .eq("caixa_id", cx.id)
    const movsValidas = (movsAtuais ?? []).filter((m: any) => {
      if (!m.venda_id) return true
      if (m.vendas && m.vendas.status === "cancelada") return false
      return true
    })
    const entradas = movsValidas.filter((m: any) => m.tipo === "entrada").reduce((s: number, m: any) => s + m.valor, 0)
    const saidas = movsValidas.filter((m: any) => m.tipo === "saida").reduce((s: number, m: any) => s + m.valor, 0)
    saldoCaixa += (cx.valor_abertura ?? 0) + entradas - saidas
  }

  return (
    <FinanceiroClient
      empresaId={empresa.id}
      plano={empresa.plano}
      vendas={vendas ?? []}
      movimentacoes={movimentacoes ?? []}
      funcionarios={funcionarios ?? []}
      debitos={debitos ?? []}
      saldoCaixa={saldoCaixa}
      caixaAberto={caixasAbertosArr.length > 0}
      contasPagar={contasPagar ?? []}
      agendamentosFuturos={(agendamentosFuturos ?? []) as any[]}
    />
  )
}
