"use client"

import { useState } from "react"
import { format, parseISO } from "date-fns"
import { HeadphonesIcon, Send, Loader2, ChevronDown, ChevronUp } from "lucide-react"
import { toast } from "sonner"

interface Ticket {
  id: string; assunto: string; mensagem: string; status: string; prioridade: string
  resposta_admin: string | null; respondido_em: string | null; created_at: string
  empresa_id: string | null
  empresas?: { nome: string; email: string; logo_url: string | null } | null
}

const badgePrioridade: Record<string, string> = {
  baixa: "bg-gray-500/10 text-gray-400 border-gray-500/20",
  normal: "bg-blue-500/10 text-blue-400 border-blue-500/20",
  alta: "bg-orange-500/10 text-orange-400 border-orange-500/20",
  urgente: "bg-red-500/10 text-red-400 border-red-500/20",
}

const badgeStatus: Record<string, string> = {
  aberto: "bg-yellow-500/10 text-yellow-400 border-yellow-500/20",
  em_andamento: "bg-blue-500/10 text-blue-400 border-blue-500/20",
  resolvido: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
  fechado: "bg-gray-500/10 text-gray-400 border-gray-500/20",
}

export function AdminSuporteClient({ tickets: init }: { tickets: Ticket[] }) {
  const [tickets, setTickets] = useState(init)
  const [aberto, setAberto] = useState<string | null>(null)
  const [respostas, setRespostas] = useState<Record<string, string>>({})
  const [loading, setLoading] = useState<string | null>(null)
  const [filtro, setFiltro] = useState("todos")

  const filtrados = tickets.filter((t) => filtro === "todos" || t.status === filtro)

  async function responder(ticket: Ticket) {
    const resposta = respostas[ticket.id]
    if (!resposta?.trim()) { toast.error("Digite uma resposta."); return }

    setLoading(ticket.id)
    const res = await fetch("/api/admin/suporte/responder", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ticket_id: ticket.id,
        resposta,
        email: ticket.empresas?.email,
        empresa_nome: ticket.empresas?.nome,
        assunto: ticket.assunto,
      }),
    })

    if (res.ok) {
      setTickets((prev) => prev.map((t) =>
        t.id === ticket.id ? { ...t, resposta_admin: resposta, status: "resolvido", respondido_em: new Date().toISOString() } : t
      ))
      setRespostas((prev) => ({ ...prev, [ticket.id]: "" }))
      toast.success("Resposta enviada!")
    } else toast.error("Erro ao enviar resposta.")
    setLoading(null)
  }

  async function alterarStatus(ticket: Ticket, status: string) {
    const res = await fetch("/api/admin/suporte/status", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ticket_id: ticket.id, status }),
    })
    if (res.ok) {
      setTickets((prev) => prev.map((t) => t.id === ticket.id ? { ...t, status } : t))
      toast.success("Status atualizado!")
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-black text-gray-900 dark:text-white">Suporte</h1>
        <p className="text-gray-400 dark:text-white/40 text-sm">{tickets.filter((t) => t.status === "aberto").length} tickets abertos</p>
      </div>

      {/* Filtros */}
      <div className="flex gap-2 flex-wrap">
        {["todos", "aberto", "em_andamento", "resolvido", "fechado"].map((f) => (
          <button key={f} onClick={() => setFiltro(f)}
            className={`px-3 py-2 rounded-xl text-xs font-bold transition-all capitalize ${
              filtro === f ? "bg-primary text-white" : "bg-gray-100 dark:bg-white/5 text-gray-500 dark:text-white/50 hover:bg-gray-200 dark:hover:bg-white/10"
            }`}>
            {f.replace("_", " ")}
          </button>
        ))}
      </div>

      {/* Lista de tickets */}
      {filtrados.length > 0 ? (
        <div className="space-y-3">
          {filtrados.map((ticket) => (
            <div key={ticket.id} className="bg-white dark:bg-[#1a1a1a] border border-gray-100 dark:border-white/10 rounded-2xl overflow-hidden">
              {/* Header do ticket */}
              <div
                className="flex items-center justify-between px-5 py-4 cursor-pointer hover:bg-gray-50 dark:hover:bg-white/[0.02] transition-colors"
                onClick={() => setAberto(aberto === ticket.id ? null : ticket.id)}
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-8 h-8 rounded-lg bg-primary/20 flex items-center justify-center shrink-0">
                    <span className="text-xs font-black text-primary">{(ticket.empresas?.nome ?? "?").charAt(0)}</span>
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-gray-900 dark:text-white">{ticket.assunto}</p>
                    <p className="text-xs text-gray-400 dark:text-white/40">{ticket.empresas?.nome} · {format(parseISO(ticket.created_at), "dd/MM HH:mm")}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <span className={`text-xs px-2 py-0.5 rounded-full border capitalize ${badgePrioridade[ticket.prioridade] ?? ""}`}>{ticket.prioridade}</span>
                  <span className={`text-xs px-2 py-0.5 rounded-full border ${badgeStatus[ticket.status] ?? ""}`}>{ticket.status.replace("_", " ")}</span>
                  {aberto === ticket.id ? <ChevronUp className="w-4 h-4 text-gray-400 dark:text-white/40" /> : <ChevronDown className="w-4 h-4 text-gray-400 dark:text-white/40" />}
                </div>
              </div>

              {/* Detalhes */}
              {aberto === ticket.id && (
                <div className="px-5 pb-5 border-t border-gray-100 dark:border-white/10 space-y-4">
                  {/* Mensagem */}
                  <div className="bg-gray-50 dark:bg-white/5 rounded-xl p-4 mt-4">
                    <p className="text-xs text-gray-400 dark:text-white/40 mb-1">Mensagem do cliente</p>
                    <p className="text-sm text-gray-900 dark:text-white">{ticket.mensagem}</p>
                  </div>

                  {/* Resposta existente */}
                  {ticket.resposta_admin && (
                    <div className="bg-primary/10 border border-primary/20 rounded-xl p-4">
                      <p className="text-xs text-primary mb-1">Sua resposta — {ticket.respondido_em ? format(parseISO(ticket.respondido_em), "dd/MM HH:mm") : ""}</p>
                      <p className="text-sm text-gray-900 dark:text-white">{ticket.resposta_admin}</p>
                    </div>
                  )}

                  {/* Responder */}
                  {ticket.status !== "fechado" && (
                    <div className="space-y-3">
                      <textarea
                        value={respostas[ticket.id] ?? ""}
                        onChange={(e) => setRespostas((prev) => ({ ...prev, [ticket.id]: e.target.value }))}
                        placeholder="Digite sua resposta..."
                        rows={3}
                        className="w-full bg-gray-50 dark:bg-[#1a1a1a] border border-gray-200 dark:border-white/10 rounded-xl px-3 py-2.5 text-sm text-gray-900 dark:text-white placeholder:text-gray-400 dark:placeholder:text-white/30 focus:outline-none focus:border-[#F26E1D] resize-none"
                      />
                      <div className="flex items-center gap-2">
                        <button onClick={() => responder(ticket)} disabled={loading === ticket.id}
                          className="flex items-center gap-2 bg-primary text-white px-4 py-2 rounded-xl font-bold text-sm hover:bg-primary/90 disabled:opacity-50">
                          {loading === ticket.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                          Enviar resposta
                        </button>
                        <select
                          value={ticket.status}
                          onChange={(e) => alterarStatus(ticket, e.target.value)}
                          className="bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-xl px-3 py-2 text-sm text-gray-900 dark:text-white focus:outline-none focus:border-primary"
                        >
                          <option value="aberto">Aberto</option>
                          <option value="em_andamento">Em andamento</option>
                          <option value="resolvido">Resolvido</option>
                          <option value="fechado">Fechado</option>
                        </select>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      ) : (
        <div className="py-16 text-center text-gray-300 dark:text-white/30 bg-white dark:bg-[#1a1a1a] border border-gray-100 dark:border-white/10 rounded-2xl">
          <HeadphonesIcon className="w-10 h-10 mx-auto mb-3 opacity-40" />
          <p>Nenhum ticket encontrado</p>
        </div>
      )}
    </div>
  )
}
