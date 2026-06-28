"use client"

import { useState } from "react"
import { format, parseISO } from "date-fns"
import { CheckCircle, Clock, XCircle, CreditCard, QrCode, TrendingUp, Ban, Trash2, Play } from "lucide-react"
import { toast } from "sonner"
import { formatarMoeda } from "@/lib/utils"
import { useAdminTema } from "@/components/admin/admin-tema-context"

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
  const t = useAdminTema()

  const filtradas = assinaturas.filter((a) => {
    const bate = (a.empresas?.nome ?? "").toLowerCase().includes(busca.toLowerCase())
    const statusBate = filtro === "todos" || a.status === filtro
    return bate && statusBate
  })

  async function acaoAssinatura(id: string, acao: "bloquear" | "desbloquear" | "cancelar" | "excluir") {
    const confirmar = acao === "excluir" || acao === "cancelar"
    if (confirmar && !confirm(`${acao === "excluir" ? "Excluir" : "Cancelar"} esta assinatura?`)) return

    const res = await fetch("/api/admin/assinaturas/bloquear", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ assinatura_id: id, acao }),
    })

    if (res.ok) {
      const data = await res.json()
      if (acao === "excluir") {
        window.location.reload()
      } else {
        toast.success(`Assinatura ${data.status}`)
        window.location.reload()
      }
    } else {
      toast.error("Erro ao processar ação.")
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className={`text-2xl font-black ${t.text}`}>Assinaturas</h1>
        <p className={`${t.textMuted} text-sm`}>{assinaturas.length} assinaturas no total</p>
      </div>

      {/* Cards resumo */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: "Ativas", valor: totais.ativas, cor: "text-emerald-400", bg: "bg-emerald-500/10" },
          { label: "Pendentes", valor: totais.pendentes, cor: "text-yellow-400", bg: "bg-yellow-500/10" },
          { label: "Canceladas", valor: totais.canceladas, cor: "text-red-400", bg: "bg-red-500/10" },
          { label: "Receita ativa", valor: formatarMoeda(totais.receitaTotal), cor: "text-primary", bg: "bg-primary/10" },
        ].map((c) => (
          <div key={c.label} className={`${t.cardBg} border ${t.border} rounded-2xl p-4`}>
            <p className={`text-xs ${t.textMuted}`}>{c.label}</p>
            <p className={`text-xl font-black mt-1 ${c.cor}`}>{c.valor}</p>
          </div>
        ))}
      </div>

      {/* Filtros */}
      <div className="flex gap-3 flex-wrap">
        <input
          className={`${t.inputBg} border ${t.inputBorder} rounded-xl px-4 py-2.5 text-sm ${t.inputText} focus:outline-none flex-1 min-w-52`}
          placeholder="Buscar por empresa..."
          value={busca}
          onChange={(e) => setBusca(e.target.value)}
        />
        {["todos", "ativa", "pendente", "cancelada"].map((f) => (
          <button key={f} onClick={() => setFiltro(f)}
            className={`px-3 py-2 rounded-xl text-xs font-bold transition-all capitalize ${
              filtro === f ? "bg-primary text-white" : t.filterInativo
            }`}>
            {f}
          </button>
        ))}
      </div>

      {/* Lista */}
      <div className={`${t.cardBg} border ${t.border} rounded-2xl overflow-hidden`}>
        <div className={`grid grid-cols-[1fr_1fr_auto_auto_auto] gap-4 px-5 py-3 border-b ${t.border} text-xs font-bold ${t.textMuted2} uppercase tracking-wider`}>
          <span>Empresa</span><span>Plano</span><span>Pagamento</span><span>Valor</span><span>Status</span>
        </div>

        {filtradas.length > 0 ? filtradas.map((a) => {
          const badge = badgeStatus[a.status] ?? badgeStatus.pendente
          const Icon = badge.Icon
          return (
            <div key={a.id} className={`grid grid-cols-[1fr_1fr_auto_auto_auto] gap-4 px-5 py-4 border-b ${t.borderLight} last:border-0 items-center ${t.rowHover} transition-colors`}>
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-8 h-8 rounded-lg bg-primary/20 flex items-center justify-center shrink-0 overflow-hidden">
                  {a.empresas?.logo_url
                    ? <img src={a.empresas.logo_url} alt="" className="w-full h-full object-cover" />
                    : <span className="text-xs font-black text-primary">{(a.empresas?.nome ?? "?").charAt(0)}</span>}
                </div>
                <div className="min-w-0">
                  <p className={`text-sm font-semibold ${t.text} truncate`}>{a.empresas?.nome ?? "—"}</p>
                  <p className={`text-xs ${t.textMuted2}`}>{format(parseISO(a.created_at), "dd/MM/yyyy")}</p>
                </div>
              </div>
              <div>
                <p className={`text-sm font-semibold ${t.text} capitalize`}>{a.plano}</p>
                <p className={`text-xs ${t.textMuted} capitalize`}>{a.periodicidade}</p>
              </div>
              <div className={`flex items-center gap-1 ${t.textMuted3}`}>
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
              {/* Ações */}
              <div className="flex items-center gap-1">
                {a.status === "ativa" && (
                  <button onClick={() => acaoAssinatura(a.id, "bloquear")} title="Bloquear"
                    className={`p-1 ${t.hoverBgBtn} rounded-lg text-yellow-400/60 hover:text-yellow-400 transition-colors`}>
                    <Ban className="w-3.5 h-3.5" />
                  </button>
                )}
                {a.status === "pausada" && (
                  <button onClick={() => acaoAssinatura(a.id, "desbloquear")} title="Desbloquear"
                    className={`p-1 ${t.hoverBgBtn} rounded-lg text-emerald-400/60 hover:text-emerald-400 transition-colors`}>
                    <Play className="w-3.5 h-3.5" />
                  </button>
                )}
                <button onClick={() => acaoAssinatura(a.id, "excluir")} title="Excluir"
                  className={`p-1 ${t.hoverBgBtn} rounded-lg text-red-400/60 hover:text-red-400 transition-colors`}>
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          )
        }) : (
          <div className={`py-12 text-center ${t.textMuted2}`}>
            <CreditCard className="w-8 h-8 mx-auto mb-2 opacity-40" />
            <p>Nenhuma assinatura encontrada</p>
          </div>
        )}
      </div>
    </div>
  )
}
