"use client"

import { useState } from "react"
import { format, parseISO } from "date-fns"
import { CheckCircle, Clock, XCircle, CreditCard, QrCode, TrendingUp } from "lucide-react"
import { formatarMoeda } from "@/lib/utils"

interface Assinatura {
  id: string; plano: string; periodicidade: string; status: string
  valor_total: number; forma_pagamento: string | null; created_at: string
  data_fim: string | null; mp_preapproval_id: string | null; mp_pix_payment_id: string | null
  empresas?: { nome: string; email: string; logo_url: string | null } | null
}

const badgeStatus: Record<string, { cor: string; bg: string; Icon: typeof CheckCircle }> = {
  ativa:     { cor: "text-emerald-400", bg: "bg-emerald-500/10 border-emerald-500/20", Icon: CheckCircle },
  pendente:  { cor: "text-yellow-400",  bg: "bg-yellow-500/10 border-yellow-500/20",   Icon: Clock },
  cancelada: { cor: "text-red-400",     bg: "bg-red-500/10 border-red-500/20",         Icon: XCircle },
  pausada:   { cor: "text-gray-400",    bg: "bg-gray-500/10 border-gray-500/20",       Icon: Clock },
}

export function AdminAssinaturasClient({ assinaturas, totais }: {
  assinaturas: Assinatura[]
  totais: { ativas: number; pendentes: number; canceladas: number; receitaTotal: number }
}) {
  const [filtro, setFiltro] = useState("todos")
  const [busca, setBusca] = useState("")

  const filtradas = assinaturas.filter((a) => {
    const bate = (a.empresas?.nome ?? "").toLowerCase().includes(busca.toLowerCase())
    const statusBate = filtro === "todos" || a.status === filtro
    return bate && statusBate
  })

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-black text-white">Assinaturas</h1>
        <p className="text-white/40 text-sm">{assinaturas.length} assinaturas no total</p>
      </div>

      {/* Cards resumo */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: "Ativas", valor: totais.ativas, cor: "text-emerald-400", bg: "bg-emerald-500/10" },
          { label: "Pendentes", valor: totais.pendentes, cor: "text-yellow-400", bg: "bg-yellow-500/10" },
          { label: "Canceladas", valor: totais.canceladas, cor: "text-red-400", bg: "bg-red-500/10" },
          { label: "Receita ativa", valor: formatarMoeda(totais.receitaTotal), cor: "text-primary", bg: "bg-primary/10" },
        ].map((c) => (
          <div key={c.label} className="bg-[#1a1a1a] border border-white/10 rounded-2xl p-4">
            <p className="text-xs text-white/40">{c.label}</p>
            <p className={`text-xl font-black mt-1 ${c.cor}`}>{c.valor}</p>
          </div>
        ))}
      </div>

      {/* Filtros */}
      <div className="flex gap-3 flex-wrap">
        <input
          className="bg-[#1a1a1a] border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white placeholder:text-white/30 focus:outline-none focus:border-primary flex-1 min-w-52"
          placeholder="Buscar por empresa..."
          value={busca}
          onChange={(e) => setBusca(e.target.value)}
        />
        {["todos", "ativa", "pendente", "cancelada"].map((f) => (
          <button key={f} onClick={() => setFiltro(f)}
            className={`px-3 py-2 rounded-xl text-xs font-bold transition-all capitalize ${
              filtro === f ? "bg-primary text-white" : "bg-white/5 text-white/50 hover:bg-white/10"
            }`}>
            {f}
          </button>
        ))}
      </div>

      {/* Lista */}
      <div className="bg-[#1a1a1a] border border-white/10 rounded-2xl overflow-hidden">
        <div className="grid grid-cols-[1fr_1fr_auto_auto_auto] gap-4 px-5 py-3 border-b border-white/10 text-xs font-bold text-white/30 uppercase tracking-wider">
          <span>Empresa</span><span>Plano</span><span>Pagamento</span><span>Valor</span><span>Status</span>
        </div>

        {filtradas.length > 0 ? filtradas.map((a) => {
          const badge = badgeStatus[a.status] ?? badgeStatus.pendente
          const Icon = badge.Icon
          return (
            <div key={a.id} className="grid grid-cols-[1fr_1fr_auto_auto_auto] gap-4 px-5 py-4 border-b border-white/5 last:border-0 items-center hover:bg-white/[0.02] transition-colors">
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-8 h-8 rounded-lg bg-primary/20 flex items-center justify-center shrink-0 overflow-hidden">
                  {a.empresas?.logo_url
                    ? <img src={a.empresas.logo_url} alt="" className="w-full h-full object-cover" />
                    : <span className="text-xs font-black text-primary">{(a.empresas?.nome ?? "?").charAt(0)}</span>}
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-white truncate">{a.empresas?.nome ?? "—"}</p>
                  <p className="text-xs text-white/30">{format(parseISO(a.created_at), "dd/MM/yyyy")}</p>
                </div>
              </div>
              <div>
                <p className="text-sm font-semibold text-white capitalize">{a.plano}</p>
                <p className="text-xs text-white/40 capitalize">{a.periodicidade}</p>
              </div>
              <div className="flex items-center gap-1 text-white/50">
                {a.forma_pagamento === "pix"
                  ? <><QrCode className="w-3.5 h-3.5" /><span className="text-xs">Pix</span></>
                  : <><CreditCard className="w-3.5 h-3.5" /><span className="text-xs">Cartão</span></>
                }
              </div>
              <span className="text-sm font-bold text-emerald-400">{formatarMoeda(a.valor_total)}</span>
              <span className={`text-xs px-2 py-0.5 rounded-full border capitalize flex items-center gap-1 ${badge.bg}`}>
                <Icon className={`w-3 h-3 ${badge.cor}`} />
                {a.status}
              </span>
            </div>
          )
        }) : (
          <div className="py-12 text-center text-white/30">
            <CreditCard className="w-8 h-8 mx-auto mb-2 opacity-40" />
            <p>Nenhuma assinatura encontrada</p>
          </div>
        )}
      </div>
    </div>
  )
}
