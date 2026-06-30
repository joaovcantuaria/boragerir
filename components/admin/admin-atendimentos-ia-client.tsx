"use client"

import { useState } from "react"
import { format, parseISO } from "date-fns"
import { ptBR } from "date-fns/locale"
import { Bot, Hash, ChevronDown, ChevronUp, MessageSquare, Building2 } from "lucide-react"
import { useAdminTema } from "@/components/admin/admin-tema-context"

interface Atendimento {
  id: string
  protocolo: string
  titulo: string
  status: "aberto" | "resolvido" | "encaminhado"
  nome_usuario: string | null
  resolvido_por_ia: boolean
  gerou_ticket: boolean
  created_at: string
  updated_at: string
  empresas?: { nome: string; logo_url: string | null } | null
  mensagens_mel?: [{ count: number }]
}

const corStatus: Record<string, { bg: string; text: string; label: string }> = {
  aberto:       { bg: "bg-yellow-500/10",  text: "text-yellow-400",  label: "Em aberto" },
  resolvido:    { bg: "bg-emerald-500/10", text: "text-emerald-400", label: "Resolvido pela Mel" },
  encaminhado:  { bg: "bg-blue-500/10",    text: "text-blue-400",    label: "Encaminhado" },
}

export function AdminAtendimentosIAClient({ atendimentos: init }: { atendimentos: Atendimento[] }) {
  const [atendimentos] = useState(init)
  const [expandido, setExpandido] = useState<string | null>(null)
  const [mensagens, setMensagens] = useState<Record<string, { role: string; conteudo: string; created_at: string }[]>>({})
  const [carregando, setCarregando] = useState<string | null>(null)
  const [filtro, setFiltro] = useState("todos")
  const t = useAdminTema()

  const filtrados = atendimentos.filter((a) => filtro === "todos" || a.status === filtro)

  async function carregarMensagens(id: string) {
    if (mensagens[id]) { setExpandido(expandido === id ? null : id); return }
    setCarregando(id)
    try {
      const res = await fetch(`/api/admin/atendimentos-ia/mensagens?conversa_id=${id}`)
      const data = await res.json()
      if (Array.isArray(data)) setMensagens((prev) => ({ ...prev, [id]: data }))
      setExpandido(id)
    } catch {}
    setCarregando(null)
  }

  const totalResolvidos = atendimentos.filter((a) => a.status === "resolvido").length
  const totalEncaminhados = atendimentos.filter((a) => a.status === "encaminhado").length
  const taxaResolucao = atendimentos.length > 0
    ? Math.round((totalResolvidos / atendimentos.length) * 100)
    : 0

  return (
    <div className="space-y-6">
      <div>
        <h1 className={`text-2xl font-black ${t.text} flex items-center gap-2`}>
          <span className="text-2xl">🌟</span> Atendimentos da Mel
        </h1>
        <p className={`${t.textMuted} text-sm`}>{atendimentos.length} atendimento(s) registrado(s)</p>
      </div>

      {/* Cards resumo */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: "Total", valor: atendimentos.length, cor: t.text, bg: t.subBg },
          { label: "Resolvidos pela Mel", valor: totalResolvidos, cor: "text-emerald-400", bg: "bg-emerald-500/10" },
          { label: "Encaminhados", valor: totalEncaminhados, cor: "text-blue-400", bg: "bg-blue-500/10" },
          { label: "Taxa resolução IA", valor: `${taxaResolucao}%`, cor: "text-primary", bg: "bg-primary/10" },
        ].map((c) => (
          <div key={c.label} className={`${c.bg} border ${t.border} rounded-2xl p-4`}>
            <p className={`text-xs ${t.textMuted}`}>{c.label}</p>
            <p className={`text-xl font-black mt-1 ${c.cor}`}>{c.valor}</p>
          </div>
        ))}
      </div>

      {/* Filtros */}
      <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-none">
        {["todos", "aberto", "resolvido", "encaminhado"].map((f) => (
          <button key={f} onClick={() => setFiltro(f)}
            className={`px-3 py-2 rounded-xl text-xs font-bold transition-all capitalize shrink-0 ${
              filtro === f ? "bg-primary text-white" : "bg-white border border-gray-300 text-gray-700 hover:border-primary hover:text-primary"
            }`}>
            {f === "todos" ? "Todos" : corStatus[f]?.label ?? f}
          </button>
        ))}
      </div>

      {/* Lista */}
      {filtrados.length > 0 ? (
        <div className="space-y-2">
          {filtrados.map((a) => {
            const status = corStatus[a.status] ?? corStatus.aberto
            const isExpanded = expandido === a.id
            const msgs = mensagens[a.id] ?? []

            return (
              <div key={a.id} className={`${t.cardBg} border ${t.border} rounded-2xl overflow-hidden`}>
                {/* Header do atendimento */}
                <button
                  className={`w-full text-left px-5 py-4 ${t.rowHover} transition-colors`}
                  onClick={() => carregarMensagens(a.id)}
                >
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-8 h-8 rounded-xl bg-primary/20 flex items-center justify-center shrink-0 text-sm">
                        {a.empresas?.logo_url
                          ? <img src={a.empresas.logo_url} alt="" className="w-full h-full object-cover rounded-xl" />
                          : <Building2 className="w-4 h-4 text-primary" />
                        }
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <p className={`text-sm font-semibold ${t.text} truncate`}>
                            {a.titulo || "Atendimento"}
                          </p>
                          <span className={`text-xs px-2 py-0.5 rounded-full font-semibold ${status.bg} ${status.text}`}>
                            {status.label}
                          </span>
                        </div>
                        <div className={`flex items-center gap-3 mt-0.5 text-xs ${t.textMuted}`}>
                          <span className="flex items-center gap-1">
                            <Hash className="w-3 h-3" />{a.protocolo}
                          </span>
                          {a.empresas?.nome && (
                            <span>{a.empresas.nome}</span>
                          )}
                          {a.nome_usuario && (
                            <span>por {a.nome_usuario}</span>
                          )}
                          <span>{format(parseISO(a.created_at), "dd/MM HH:mm", { locale: ptBR })}</span>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      {carregando === a.id ? (
                        <div className="w-4 h-4 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                      ) : isExpanded ? (
                        <ChevronUp className={`w-4 h-4 ${t.textMuted2}`} />
                      ) : (
                        <ChevronDown className={`w-4 h-4 ${t.textMuted2}`} />
                      )}
                    </div>
                  </div>
                </button>

                {/* Mensagens expandidas */}
                {isExpanded && msgs.length > 0 && (
                  <div className={`border-t ${t.border} px-5 py-4 space-y-3 ${t.subBg2}`}>
                    {msgs.map((msg, i) => (
                      <div key={i} className={`flex gap-3 ${msg.role === "user" ? "flex-row-reverse" : ""}`}>
                        <div className={`w-6 h-6 rounded-full flex items-center justify-center shrink-0 text-xs ${
                          msg.role === "assistant" ? "bg-primary" : t.hoverBgBtn
                        }`}>
                          {msg.role === "assistant" ? "🌟" : "👤"}
                        </div>
                        <div className={`max-w-[75%] rounded-xl px-3 py-2 text-xs ${
                          msg.role === "user"
                            ? "bg-primary/20 text-primary"
                            : `${t.subBg} ${t.textMuted6}`
                        }`}>
                          {msg.conteudo}
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {isExpanded && msgs.length === 0 && !carregando && (
                  <div className={`border-t ${t.border} px-5 py-3 text-xs ${t.textMuted2} text-center`}>
                    Sem mensagens registradas
                  </div>
                )}
              </div>
            )
          })}
        </div>
      ) : (
        <div className={`py-16 text-center ${t.textMuted2} ${t.cardBg} border ${t.border} rounded-2xl`}>
          <Bot className="w-10 h-10 mx-auto mb-3 opacity-40" />
          <p className="font-semibold">Nenhum atendimento ainda</p>
          <p className="text-xs mt-1">Os atendimentos da Mel aparecerão aqui</p>
        </div>
      )}
    </div>
  )
}
