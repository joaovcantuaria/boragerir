"use client"

import { useEffect, useMemo, useState } from "react"
import { Loader2, Search } from "lucide-react"
import { format, subDays } from "date-fns"
import { Input } from "@/components/ui/input"
import { createClient } from "@/lib/supabase/client"
import { formatarMoeda } from "@/lib/utils"

export type LancamentoCaixa = {
  id: string
  descricao: string
  valor: number
  created_at: string
  data_movimento: string | null
  codigo_rastreio: string | null
}

function normalizar(s: string) {
  return s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase()
}

/** Escolhe um lançamento que já está no caixa (ex.: importado do extrato) para usar na baixa. */
export function VincularLancamento({
  empresaId, tipo, saldo, nome, permitirMaior = false, selecionado, onSelecionar,
}: {
  empresaId: string
  /** entrada para A Receber, saída para Contas a Pagar */
  tipo: "entrada" | "saida"
  /** valor em aberto da conta */
  saldo: number
  /** devedor / descrição da conta — usado para sugerir o lançamento certo */
  nome: string
  /** contas a pagar aceitam valor maior (juros/multa) */
  permitirMaior?: boolean
  selecionado: LancamentoCaixa | null
  onSelecionar: (l: LancamentoCaixa | null) => void
}) {
  const [carregando, setCarregando] = useState(true)
  const [lancamentos, setLancamentos] = useState<LancamentoCaixa[]>([])
  const [busca, setBusca] = useState("")

  useEffect(() => {
    let ativo = true
    const supabase = createClient()
    supabase
      .from("movimentacoes_caixa")
      .select("id, descricao, valor, created_at, data_movimento, codigo_rastreio")
      .eq("empresa_id", empresaId)
      .eq("tipo", tipo)
      .is("venda_id", null)
      .is("valor_receber_id", null)
      .is("conta_pagar_id", null)
      .gte("created_at", subDays(new Date(), 180).toISOString())
      .order("created_at", { ascending: false })
      .limit(300)
      .then(({ data }) => {
        if (!ativo) return
        setLancamentos((data ?? []) as LancamentoCaixa[])
        setCarregando(false)
      })
    return () => { ativo = false }
  }, [empresaId, tipo])

  const ordenados = useMemo(() => {
    const palavras = normalizar(nome).split(/[^a-z0-9]+/).filter((p) => p.length >= 3)
    const termo = normalizar(busca.trim())
    return lancamentos
      .filter((l) => !termo || normalizar(l.descricao).includes(termo) || String(l.valor).includes(termo.replace(",", ".")))
      .map((l) => {
        const desc = normalizar(l.descricao)
        let pontos = 0
        if (Math.abs(Number(l.valor) - saldo) < 0.01) pontos += 100
        else if (Number(l.valor) <= saldo) pontos += 10
        pontos += palavras.filter((p) => desc.includes(p)).length * 25
        return { l, pontos }
      })
      .sort((a, b) => b.pontos - a.pontos || b.l.created_at.localeCompare(a.l.created_at))
      .map((x) => x.l)
  }, [lancamentos, nome, saldo, busca])

  if (carregando) {
    return <div className="py-6 flex justify-center"><Loader2 className="w-5 h-5 animate-spin text-muted-foreground" /></div>
  }
  if (lancamentos.length === 0) {
    return (
      <p className="text-xs text-muted-foreground py-4 text-center">
        Nenhum{tipo === "entrada" ? "a entrada" : "a saída"} sem vínculo nos últimos 6 meses do caixa. Use &quot;Novo lançamento&quot;.
      </p>
    )
  }

  return (
    <div className="space-y-2">
      <div className="relative">
        <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
        <Input value={busca} onChange={(e) => setBusca(e.target.value)} placeholder="Buscar no caixa por nome ou valor..." className="pl-8 h-8 text-xs" />
      </div>
      <div className="max-h-56 overflow-y-auto rounded-xl border border-border divide-y divide-border">
        {ordenados.slice(0, 80).map((l) => {
          const grande = Number(l.valor) > saldo + 0.001
          const bloqueado = grande && !permitirMaior
          const ativo = selecionado?.id === l.id
          const dia = l.data_movimento ? format(new Date(`${l.data_movimento}T12:00:00`), "dd/MM") : format(new Date(l.created_at), "dd/MM")
          return (
            <button
              key={l.id}
              type="button"
              disabled={bloqueado}
              onClick={() => onSelecionar(ativo ? null : l)}
              className={`w-full flex items-center gap-2 px-3 py-2 text-left text-xs transition-colors ${
                ativo ? "bg-[#F26E1D]/10" : "hover:bg-muted/60"
              } ${bloqueado ? "opacity-40 cursor-not-allowed" : ""}`}
            >
              <span className={`h-3.5 w-3.5 shrink-0 rounded-full border ${ativo ? "border-[#F26E1D] bg-[#F26E1D]" : "border-muted-foreground/40"}`} />
              <span className="w-10 shrink-0 text-muted-foreground">{dia}</span>
              <span className="flex-1 min-w-0 truncate" title={l.descricao}>{l.descricao.replace(/\s*\[.*?\]\s*$/, "")}</span>
              <span className={`shrink-0 font-semibold ${tipo === "entrada" ? "text-emerald-500" : "text-red-500"}`}>{formatarMoeda(Number(l.valor))}</span>
            </button>
          )
        })}
      </div>
      {selecionado && (
        <p className="text-[11px]">
          {Number(selecionado.valor) < saldo - 0.001
            ? <span className="text-amber-600">Baixa parcial de {formatarMoeda(Number(selecionado.valor))}: continuam em aberto {formatarMoeda(Math.round((saldo - Number(selecionado.valor)) * 100) / 100)}.</span>
            : Number(selecionado.valor) > saldo + 0.001
              ? <span className="text-blue-600">Inclui juros/multa de {formatarMoeda(Math.round((Number(selecionado.valor) - saldo) * 100) / 100)} e quita a conta.</span>
              : <span className="text-emerald-600">Quita o valor por completo.</span>}
          {" "}Nenhum lançamento novo será criado.
        </p>
      )}
      {!permitirMaior && ordenados.some((l) => Number(l.valor) > saldo + 0.001) && (
        <p className="text-[10px] text-muted-foreground">Lançamentos maiores que o valor em aberto aparecem desativados.</p>
      )}
    </div>
  )
}

/** Escolha entre lançar no caixa agora ou usar um lançamento que já está lá. */
export function EscolhaModoBaixa({ modo, onMudar }: { modo: "novo" | "existente"; onMudar: (m: "novo" | "existente") => void }) {
  const opcoes: { id: "novo" | "existente"; titulo: string; desc: string }[] = [
    { id: "novo", titulo: "Novo lançamento", desc: "Lança agora no caixa" },
    { id: "existente", titulo: "Já está no caixa", desc: "Ex.: veio do extrato" },
  ]
  return (
    <div className="grid grid-cols-2 gap-2">
      {opcoes.map((o) => (
        <button
          key={o.id}
          type="button"
          onClick={() => onMudar(o.id)}
          className={`rounded-xl border-2 px-3 py-2 text-left transition-all ${
            modo === o.id ? "border-[#F26E1D] bg-[#F26E1D]/10" : "border-border hover:border-primary/50"
          }`}
        >
          <span className={`block text-xs font-bold ${modo === o.id ? "text-[#F26E1D]" : "text-foreground"}`}>{o.titulo}</span>
          <span className="block text-[10px] text-muted-foreground">{o.desc}</span>
        </button>
      ))}
    </div>
  )
}
