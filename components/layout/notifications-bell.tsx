"use client"

import { useState, useEffect, useRef } from "react"
import { Bell, Clock, AlertTriangle, CheckSquare, X } from "lucide-react"
import { format, addDays, isBefore, isToday, isTomorrow } from "date-fns"
import { ptBR } from "date-fns/locale"
import { createClient } from "@/lib/supabase/client"
import { formatarMoeda } from "@/lib/utils"

interface Notificacao {
  id: string
  tipo: "conta_pagar" | "conta_receber" | "tarefa"
  titulo: string
  descricao: string
  urgencia: "hoje" | "amanha" | "proximos_dias" | "atrasado"
}

export function NotificationsBell({ empresaId }: { empresaId?: string }) {
  const [aberto, setAberto] = useState(false)
  const [notificacoes, setNotificacoes] = useState<Notificacao[]>([])
  const [loading, setLoading] = useState(false)
  const ref = useRef<HTMLDivElement>(null)
  const supabase = createClient()

  // Fechar ao clicar fora
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setAberto(false)
    }
    document.addEventListener("mousedown", handleClick)
    return () => document.removeEventListener("mousedown", handleClick)
  }, [])

  // Carregar notificações ao abrir
  useEffect(() => {
    if (!aberto || !empresaId) return
    carregarNotificacoes()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [aberto, empresaId])

  async function carregarNotificacoes() {
    setLoading(true)
    const hoje = new Date()
    hoje.setHours(0, 0, 0, 0)
    const em3dias = addDays(hoje, 3)
    const notifs: Notificacao[] = []

    // Contas a pagar (vencendo hoje, amanhã, próximos 3 dias, ou atrasadas)
    try {
      const { data: contas } = await supabase
        .from("contas_pagar")
        .select("id, descricao, valor, data_vencimento, status")
        .eq("empresa_id", empresaId)
        .in("status", ["pendente", "atrasado"])
        .lte("data_vencimento", format(em3dias, "yyyy-MM-dd"))
        .order("data_vencimento")

      ;(contas ?? []).forEach((c: any) => {
        const venc = new Date(c.data_vencimento + "T12:00:00")
        let urgencia: Notificacao["urgencia"] = "proximos_dias"
        let desc = ""

        if (isBefore(venc, hoje)) {
          urgencia = "atrasado"
          desc = `Venceu em ${format(venc, "dd/MM")} · ${formatarMoeda(c.valor)}`
        } else if (isToday(venc)) {
          urgencia = "hoje"
          desc = `Vence HOJE · ${formatarMoeda(c.valor)}`
        } else if (isTomorrow(venc)) {
          urgencia = "amanha"
          desc = `Vence amanhã · ${formatarMoeda(c.valor)}`
        } else {
          desc = `Vence em ${format(venc, "dd/MM")} · ${formatarMoeda(c.valor)}`
        }

        notifs.push({ id: `cp_${c.id}`, tipo: "conta_pagar", titulo: c.descricao, descricao: desc, urgencia })
      })
    } catch {}

    // Valores a receber (vencendo ou atrasados)
    try {
      const { data: receber } = await supabase
        .from("valores_receber")
        .select("id, devedor, valor, data_vencimento, status")
        .eq("empresa_id", empresaId)
        .eq("status", "pendente")
        .lte("data_vencimento", format(em3dias, "yyyy-MM-dd"))
        .order("data_vencimento")

      ;(receber ?? []).forEach((v: any) => {
        const venc = new Date(v.data_vencimento + "T12:00:00")
        let urgencia: Notificacao["urgencia"] = "proximos_dias"
        let desc = ""

        if (isBefore(venc, hoje)) {
          urgencia = "atrasado"
          desc = `Deveria receber em ${format(venc, "dd/MM")} · ${formatarMoeda(v.valor)}`
        } else if (isToday(venc)) {
          urgencia = "hoje"
          desc = `Cobrar HOJE · ${formatarMoeda(v.valor)}`
        } else if (isTomorrow(venc)) {
          urgencia = "amanha"
          desc = `Cobrar amanhã · ${formatarMoeda(v.valor)}`
        } else {
          desc = `Vence em ${format(venc, "dd/MM")} · ${formatarMoeda(v.valor)}`
        }

        notifs.push({ id: `vr_${v.id}`, tipo: "conta_receber", titulo: v.devedor, descricao: desc, urgencia })
      })
    } catch {}

    // Tarefas com prazo (vencendo hoje, amanhã, próximos 3 dias, ou vencidas)
    try {
      const { data: tarefas } = await supabase
        .from("tarefas")
        .select("id, titulo, prazo, status")
        .eq("empresa_id", empresaId)
        .neq("status", "concluido")
        .not("prazo", "is", null)
        .lte("prazo", format(em3dias, "yyyy-MM-dd"))
        .order("prazo")

      ;(tarefas ?? []).forEach((t: any) => {
        const prazo = new Date(t.prazo + "T12:00:00")
        let urgencia: Notificacao["urgencia"] = "proximos_dias"
        let desc = ""

        if (isBefore(prazo, hoje)) {
          urgencia = "atrasado"
          desc = `Prazo vencido em ${format(prazo, "dd/MM")}`
        } else if (isToday(prazo)) {
          urgencia = "hoje"
          desc = "Prazo vence HOJE"
        } else if (isTomorrow(prazo)) {
          urgencia = "amanha"
          desc = "Prazo vence amanhã"
        } else {
          desc = `Prazo em ${format(prazo, "dd/MM")}`
        }

        notifs.push({ id: `t_${t.id}`, tipo: "tarefa", titulo: t.titulo, descricao: desc, urgencia })
      })
    } catch {}

    // Ordenar: atrasado > hoje > amanhã > próximos dias
    const ordem = { atrasado: 0, hoje: 1, amanha: 2, proximos_dias: 3 }
    notifs.sort((a, b) => ordem[a.urgencia] - ordem[b.urgencia])

    setNotificacoes(notifs)
    setLoading(false)
  }

  const qtd = notificacoes.length
  const temAtrasado = notificacoes.some((n) => n.urgencia === "atrasado")

  const iconeTipo = {
    conta_pagar: <AlertTriangle className="w-3.5 h-3.5 text-red-500" />,
    conta_receber: <Clock className="w-3.5 h-3.5 text-amber-500" />,
    tarefa: <CheckSquare className="w-3.5 h-3.5 text-blue-500" />,
  }

  const corUrgencia = {
    atrasado: "bg-red-500/10 border-red-200",
    hoje: "bg-amber-500/10 border-amber-200",
    amanha: "bg-blue-500/10 border-blue-200",
    proximos_dias: "bg-muted border-border",
  }

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setAberto(!aberto)}
        className="w-8 h-8 flex items-center justify-center rounded-md transition-colors relative"
        style={{ color: aberto ? "white" : "rgba(255,255,255,0.5)" }}
        onMouseEnter={(e) => { e.currentTarget.style.color = "white"; e.currentTarget.style.background = "rgba(255,255,255,0.08)" }}
        onMouseLeave={(e) => { if (!aberto) { e.currentTarget.style.color = "rgba(255,255,255,0.5)"; e.currentTarget.style.background = "transparent" } }}
        title="Notificações"
      >
        <Bell className="w-4 h-4" />
        {qtd > 0 && (
          <span className={`absolute -top-0.5 -right-0.5 w-4 h-4 rounded-full text-[9px] font-bold flex items-center justify-center text-white ${temAtrasado ? "bg-red-500" : "bg-amber-500"}`}>
            {qtd > 9 ? "9+" : qtd}
          </span>
        )}
      </button>

      {aberto && (
        <div className="absolute right-0 top-10 w-80 max-h-96 overflow-y-auto rounded-xl border shadow-2xl z-50"
          style={{ background: "#ffffff", borderColor: "#e5e7eb" }}>
          <div className="px-4 py-3 border-b border-gray-100 flex items-center justify-between">
            <p className="text-sm font-bold text-gray-800">Notificações</p>
            {qtd > 0 && <span className="text-[10px] text-muted-foreground">{qtd} alerta(s)</span>}
          </div>

          {loading ? (
            <div className="py-8 text-center text-xs text-muted-foreground">Carregando...</div>
          ) : notificacoes.length === 0 ? (
            <div className="py-8 text-center">
              <Bell className="w-8 h-8 mx-auto mb-2 text-muted-foreground opacity-30" />
              <p className="text-xs text-muted-foreground">Tudo em dia! Nenhuma notificação.</p>
            </div>
          ) : (
            <div className="p-2 space-y-1.5">
              {notificacoes.map((n) => (
                <div key={n.id} className={`rounded-lg border p-2.5 ${corUrgencia[n.urgencia]}`}>
                  <div className="flex items-start gap-2">
                    <div className="mt-0.5">{iconeTipo[n.tipo]}</div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-semibold text-gray-800 truncate">{n.titulo}</p>
                      <p className="text-[10px] text-gray-500 mt-0.5">{n.descricao}</p>
                    </div>
                    {n.urgencia === "atrasado" && (
                      <span className="text-[9px] font-bold text-red-600 bg-red-100 px-1.5 py-0.5 rounded shrink-0">ATRASADO</span>
                    )}
                    {n.urgencia === "hoje" && (
                      <span className="text-[9px] font-bold text-amber-600 bg-amber-100 px-1.5 py-0.5 rounded shrink-0">HOJE</span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
