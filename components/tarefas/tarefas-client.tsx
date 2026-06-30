"use client"

import { useState } from "react"
import { Plus, MoreHorizontal, CheckCircle2, Circle, Clock, AlertCircle, Trash2, Edit2, X, GripVertical, Flag, Calendar, ChevronDown, ChevronUp } from "lucide-react"
import { toast } from "sonner"
import { createClient } from "@/lib/supabase/client"
import { format } from "date-fns"
import { ptBR } from "date-fns/locale"
import { motion, AnimatePresence } from "framer-motion"
import { cn } from "@/lib/utils"

export type StatusTarefa = "pendente" | "iniciado" | "concluido"
export type PrioridadeTarefa = "baixa" | "media" | "alta" | "urgente"

export interface BlocoTarefa {
  id: string
  empresa_id: string
  nome: string
  cor: string
  posicao: number
  created_at: string
}

export interface Tarefa {
  id: string
  empresa_id: string
  bloco_id: string | null
  titulo: string
  descricao: string | null
  status: StatusTarefa
  prioridade: PrioridadeTarefa
  prazo: string | null
  posicao: number
  created_at: string
}

const CORES_BLOCO = [
  "#F26E1D", "#6366f1", "#10b981", "#f59e0b",
  "#ef4444", "#8b5cf6", "#06b6d4", "#84cc16",
]

const CONFIG_STATUS: Record<StatusTarefa, { label: string; icon: typeof Circle; cor: string; bg: string }> = {
  pendente:  { label: "Pendente",   icon: Circle,        cor: "text-gray-400",   bg: "bg-gray-100 dark:bg-gray-800" },
  iniciado:  { label: "Em andamento", icon: Clock,       cor: "text-blue-500",   bg: "bg-blue-50 dark:bg-blue-900/30" },
  concluido: { label: "Concluído",  icon: CheckCircle2,  cor: "text-emerald-500", bg: "bg-emerald-50 dark:bg-emerald-900/30" },
}

const CONFIG_PRIORIDADE: Record<PrioridadeTarefa, { label: string; cor: string; bg: string; dot: string }> = {
  baixa:   { label: "Baixa",   cor: "text-gray-500",  bg: "bg-gray-100 dark:bg-gray-800",     dot: "bg-gray-400" },
  media:   { label: "Média",   cor: "text-blue-600",  bg: "bg-blue-50 dark:bg-blue-900/30",   dot: "bg-blue-500" },
  alta:    { label: "Alta",    cor: "text-orange-600", bg: "bg-orange-50 dark:bg-orange-900/30", dot: "bg-orange-500" },
  urgente: { label: "Urgente", cor: "text-red-600",   bg: "bg-red-50 dark:bg-red-900/30",     dot: "bg-red-500" },
}

interface Props {
  empresaId: string
  blocosInit: BlocoTarefa[]
  tarefasInit: Tarefa[]
}

export function TarefasClient({ empresaId, blocosInit, tarefasInit }: Props) {
  const [blocos, setBlocos] = useState<BlocoTarefa[]>(blocosInit)
  const [tarefas, setTarefas] = useState<Tarefa[]>(tarefasInit)
  const [modalBloco, setModalBloco] = useState(false)
  const [modalTarefa, setModalTarefa] = useState<{ aberto: boolean; blocoId?: string; tarefa?: Tarefa }>({ aberto: false })
  const [blocoEditando, setBlocoEditando] = useState<BlocoTarefa | null>(null)
  const [nomeBlocoInput, setNomeBlocoInput] = useState("")
  const [corBlocoInput, setCorBlocoInput] = useState(CORES_BLOCO[0])
  const [filtroStatus, setFiltroStatus] = useState<StatusTarefa | "todos">("todos")
  const [filtroPrioridade, setFiltroPrioridade] = useState<PrioridadeTarefa | "todos">("todos")
  const [blocosColapsados, setBlocosColapsados] = useState<Set<string>>(new Set())
  const supabase = createClient()

  // Tarefas sem bloco
  const tarefasSemBloco = tarefas.filter((t) => !t.bloco_id)

  function tarefasDoBloco(blocoId: string) {
    return tarefas.filter((t) => t.bloco_id === blocoId)
  }

  function filtrarTarefas(lista: Tarefa[]) {
    return lista.filter((t) => {
      const statusOk = filtroStatus === "todos" || t.status === filtroStatus
      const prioOk = filtroPrioridade === "todos" || t.prioridade === filtroPrioridade
      return statusOk && prioOk
    })
  }

  function toggleColapso(blocoId: string) {
    setBlocosColapsados((prev) => {
      const novo = new Set(prev)
      if (novo.has(blocoId)) novo.delete(blocoId)
      else novo.add(blocoId)
      return novo
    })
  }

  // ── Blocos ───────────────────────────────────────────────
  async function salvarBloco() {
    if (!nomeBlocoInput.trim()) return
    if (blocoEditando) {
      const { error } = await supabase.from("blocos_tarefas")
        .update({ nome: nomeBlocoInput, cor: corBlocoInput })
        .eq("id", blocoEditando.id)
      if (error) { toast.error("Erro ao atualizar bloco."); return }
      setBlocos((prev) => prev.map((b) => b.id === blocoEditando.id ? { ...b, nome: nomeBlocoInput, cor: corBlocoInput } : b))
      toast.success("Bloco atualizado!")
    } else {
      const { data, error } = await supabase.from("blocos_tarefas")
        .insert({ empresa_id: empresaId, nome: nomeBlocoInput, cor: corBlocoInput, posicao: blocos.length })
        .select().single()
      if (error) { toast.error("Erro ao criar bloco."); return }
      setBlocos((prev) => [...prev, data])
      toast.success("Bloco criado!")
    }
    setModalBloco(false)
    setNomeBlocoInput("")
    setBlocoEditando(null)
  }

  async function excluirBloco(bloco: BlocoTarefa) {
    if (!confirm(`Excluir o bloco "${bloco.nome}" e todas as suas tarefas?`)) return
    await supabase.from("blocos_tarefas").delete().eq("id", bloco.id)
    setBlocos((prev) => prev.filter((b) => b.id !== bloco.id))
    setTarefas((prev) => prev.filter((t) => t.bloco_id !== bloco.id))
    toast.success("Bloco excluído.")
  }

  function abrirEditarBloco(bloco: BlocoTarefa) {
    setBlocoEditando(bloco)
    setNomeBlocoInput(bloco.nome)
    setCorBlocoInput(bloco.cor)
    setModalBloco(true)
  }

  // ── Tarefas ──────────────────────────────────────────────
  async function salvarTarefa(dados: {
    titulo: string; descricao: string; prioridade: PrioridadeTarefa; prazo: string; blocoId: string | null
  }) {
    if (!dados.titulo.trim()) return
    const editando = modalTarefa.tarefa

    if (editando) {
      const { error } = await supabase.from("tarefas").update({
        titulo: dados.titulo,
        descricao: dados.descricao || null,
        prioridade: dados.prioridade,
        prazo: dados.prazo || null,
        bloco_id: dados.blocoId,
      }).eq("id", editando.id)
      if (error) { toast.error("Erro ao atualizar tarefa."); return }
      setTarefas((prev) => prev.map((t) => t.id === editando.id
        ? { ...t, titulo: dados.titulo, descricao: dados.descricao || null, prioridade: dados.prioridade, prazo: dados.prazo || null, bloco_id: dados.blocoId }
        : t
      ))
      toast.success("Tarefa atualizada!")
    } else {
      const posicao = tarefas.filter((t) => t.bloco_id === dados.blocoId).length
      const { data, error } = await supabase.from("tarefas").insert({
        empresa_id: empresaId,
        bloco_id: dados.blocoId,
        titulo: dados.titulo,
        descricao: dados.descricao || null,
        prioridade: dados.prioridade,
        prazo: dados.prazo || null,
        status: "pendente",
        posicao,
      }).select().single()
      if (error) { toast.error("Erro ao criar tarefa."); return }
      setTarefas((prev) => [...prev, data])
      toast.success("Tarefa criada!")
    }
    setModalTarefa({ aberto: false })
  }

  async function alterarStatus(tarefa: Tarefa, novoStatus: StatusTarefa) {
    const { error } = await supabase.from("tarefas").update({ status: novoStatus }).eq("id", tarefa.id)
    if (error) { toast.error("Erro ao atualizar status."); return }
    setTarefas((prev) => prev.map((t) => t.id === tarefa.id ? { ...t, status: novoStatus } : t))
  }

  async function excluirTarefa(id: string) {
    await supabase.from("tarefas").delete().eq("id", id)
    setTarefas((prev) => prev.filter((t) => t.id !== id))
    toast.success("Tarefa excluída.")
  }

  // Contadores gerais
  const total = tarefas.length
  const concluidas = tarefas.filter((t) => t.status === "concluido").length
  const urgentes = tarefas.filter((t) => t.prioridade === "urgente" && t.status !== "concluido").length
  const emAndamento = tarefas.filter((t) => t.status === "iniciado").length

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      {/* Header */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-black">Tarefas</h1>
          <p className="text-muted-foreground text-sm mt-0.5">Organize e acompanhe todas as suas tarefas</p>
        </div>
        <div className="flex gap-2">
          <button onClick={() => { setBlocoEditando(null); setNomeBlocoInput(""); setCorBlocoInput(CORES_BLOCO[0]); setModalBloco(true) }}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl border border-border text-sm font-semibold text-muted-foreground hover:border-primary/50 hover:text-foreground transition-all">
            <Plus className="w-4 h-4" />Bloco
          </button>
          <button onClick={() => setModalTarefa({ aberto: true, blocoId: blocos[0]?.id ?? null })}
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-primary text-white text-sm font-bold hover:bg-primary/90 transition-all">
            <Plus className="w-4 h-4" />Nova tarefa
          </button>
        </div>
      </div>

      {/* Cards resumo */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: "Total", valor: total, cor: "text-foreground", bg: "bg-muted/60" },
          { label: "Em andamento", valor: emAndamento, cor: "text-blue-500", bg: "bg-blue-50 dark:bg-blue-900/20" },
          { label: "Concluídas", valor: concluidas, cor: "text-emerald-600", bg: "bg-emerald-50 dark:bg-emerald-900/20" },
          { label: "Urgentes", valor: urgentes, cor: "text-red-500", bg: "bg-red-50 dark:bg-red-900/20" },
        ].map((c) => (
          <div key={c.label} className={`${c.bg} rounded-2xl p-4 border border-border`}>
            <p className="text-xs text-muted-foreground">{c.label}</p>
            <p className={`text-2xl font-black mt-1 ${c.cor}`}>{c.valor}</p>
          </div>
        ))}
      </div>

      {/* Filtros */}
      <div className="flex gap-2 flex-wrap">
        <div className="flex gap-1 p-1 bg-muted rounded-xl">
          {(["todos", "pendente", "iniciado", "concluido"] as const).map((s) => (
            <button key={s} onClick={() => setFiltroStatus(s)}
              className={cn("px-3 py-1.5 rounded-lg text-xs font-semibold transition-all", filtroStatus === s ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground")}>
              {s === "todos" ? "Todos" : CONFIG_STATUS[s as StatusTarefa]?.label}
            </button>
          ))}
        </div>
        <div className="flex gap-1 p-1 bg-muted rounded-xl">
          {(["todos", "baixa", "media", "alta", "urgente"] as const).map((p) => (
            <button key={p} onClick={() => setFiltroPrioridade(p)}
              className={cn("px-3 py-1.5 rounded-lg text-xs font-semibold transition-all flex items-center gap-1.5", filtroPrioridade === p ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground")}>
              {p !== "todos" && <div className={`w-1.5 h-1.5 rounded-full ${CONFIG_PRIORIDADE[p as PrioridadeTarefa]?.dot}`} />}
              {p === "todos" ? "Todas" : CONFIG_PRIORIDADE[p as PrioridadeTarefa]?.label}
            </button>
          ))}
        </div>
      </div>

      {/* Tarefas sem bloco */}
      {filtrarTarefas(tarefasSemBloco).length > 0 && (
        <div className="space-y-2">
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-widest px-1">Sem bloco</p>
          {filtrarTarefas(tarefasSemBloco).map((t) => (
            <CartaoTarefa key={t.id} tarefa={t} blocos={blocos}
              onStatus={alterarStatus} onEditar={(t) => setModalTarefa({ aberto: true, tarefa: t })} onExcluir={excluirTarefa} />
          ))}
        </div>
      )}

      {/* Blocos */}
      <div className="space-y-4">
        {blocos.map((bloco) => {
          const tarefasBloco = filtrarTarefas(tarefasDoBloco(bloco.id))
          const colapsado = blocosColapsados.has(bloco.id)
          const concluidas = tarefasDoBloco(bloco.id).filter((t) => t.status === "concluido").length
          const total = tarefasDoBloco(bloco.id).length

          return (
            <div key={bloco.id} className="rounded-2xl border border-border overflow-hidden">
              {/* Header do bloco */}
              <div className="flex items-center justify-between px-4 py-3 bg-muted/40">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: bloco.cor }} />
                  <h3 className="font-bold text-sm truncate">{bloco.nome}</h3>
                  <span className="text-xs text-muted-foreground shrink-0">{concluidas}/{total}</span>
                  {total > 0 && (
                    <div className="h-1 w-16 bg-border rounded-full overflow-hidden">
                      <div className="h-full bg-emerald-500 rounded-full transition-all" style={{ width: `${(concluidas / total) * 100}%` }} />
                    </div>
                  )}
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  <button onClick={() => setModalTarefa({ aberto: true, blocoId: bloco.id })}
                    className="p-1.5 rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground transition-colors">
                    <Plus className="w-3.5 h-3.5" />
                  </button>
                  <button onClick={() => abrirEditarBloco(bloco)}
                    className="p-1.5 rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground transition-colors">
                    <Edit2 className="w-3.5 h-3.5" />
                  </button>
                  <button onClick={() => excluirBloco(bloco)}
                    className="p-1.5 rounded-lg hover:bg-muted text-muted-foreground hover:text-red-500 transition-colors">
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                  <button onClick={() => toggleColapso(bloco.id)}
                    className="p-1.5 rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground transition-colors">
                    {colapsado ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronUp className="w-3.5 h-3.5" />}
                  </button>
                </div>
              </div>

              {/* Tarefas do bloco */}
              <AnimatePresence>
                {!colapsado && (
                  <motion.div initial={{ height: 0 }} animate={{ height: "auto" }} exit={{ height: 0 }} className="overflow-hidden">
                    <div className="p-3 space-y-2">
                      {tarefasBloco.length > 0
                        ? tarefasBloco.map((t) => (
                            <CartaoTarefa key={t.id} tarefa={t} blocos={blocos}
                              onStatus={alterarStatus} onEditar={(t) => setModalTarefa({ aberto: true, tarefa: t })} onExcluir={excluirTarefa} />
                          ))
                        : <p className="text-xs text-muted-foreground text-center py-4">
                            {filtroStatus !== "todos" || filtroPrioridade !== "todos" ? "Nenhuma tarefa com esses filtros" : "Nenhuma tarefa ainda"}
                          </p>
                      }
                      <button onClick={() => setModalTarefa({ aberto: true, blocoId: bloco.id })}
                        className="w-full flex items-center gap-2 py-2 px-3 rounded-xl text-xs text-muted-foreground hover:text-foreground hover:bg-muted transition-all border border-dashed border-border">
                        <Plus className="w-3.5 h-3.5" />Adicionar tarefa
                      </button>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          )
        })}
      </div>

      {/* Estado vazio */}
      {blocos.length === 0 && tarefas.length === 0 && (
        <div className="text-center py-20 space-y-4">
          <div className="text-6xl">📋</div>
          <h3 className="text-lg font-black">Nenhuma tarefa ainda</h3>
          <p className="text-muted-foreground text-sm max-w-xs mx-auto">
            Crie blocos para organizar suas tarefas por categoria, projeto ou equipe.
          </p>
          <div className="flex gap-3 justify-center">
            <button onClick={() => { setModalBloco(true) }} className="px-4 py-2 rounded-xl border border-border text-sm font-semibold hover:bg-muted transition-all">
              Criar bloco
            </button>
            <button onClick={() => setModalTarefa({ aberto: true })} className="px-4 py-2 rounded-xl bg-primary text-white text-sm font-bold hover:bg-primary/90 transition-all">
              Criar tarefa
            </button>
          </div>
        </div>
      )}

      {/* Modal Bloco */}
      <AnimatePresence>
        {modalBloco && (
          <ModalBloco
            nome={nomeBlocoInput} cor={corBlocoInput}
            editando={!!blocoEditando}
            onNome={setNomeBlocoInput} onCor={setCorBlocoInput}
            onSalvar={salvarBloco} onFechar={() => { setModalBloco(false); setBlocoEditando(null) }}
          />
        )}
      </AnimatePresence>

      {/* Modal Tarefa */}
      <AnimatePresence>
        {modalTarefa.aberto && (
          <ModalTarefa
            tarefa={modalTarefa.tarefa}
            blocoIdInicial={modalTarefa.blocoId ?? null}
            blocos={blocos}
            onSalvar={salvarTarefa}
            onFechar={() => setModalTarefa({ aberto: false })}
          />
        )}
      </AnimatePresence>
    </div>
  )
}

// ── Cartão de tarefa ─────────────────────────────────────
function CartaoTarefa({ tarefa, blocos, onStatus, onEditar, onExcluir }: {
  tarefa: Tarefa
  blocos: BlocoTarefa[]
  onStatus: (t: Tarefa, s: StatusTarefa) => void
  onEditar: (t: Tarefa) => void
  onExcluir: (id: string) => void
}) {
  const [menuAberto, setMenuAberto] = useState(false)
  const status = CONFIG_STATUS[tarefa.status]
  const prioridade = CONFIG_PRIORIDADE[tarefa.prioridade]
  const StatusIcon = status.icon
  const concluido = tarefa.status === "concluido"

  const proximoStatus: Record<StatusTarefa, StatusTarefa> = {
    pendente: "iniciado",
    iniciado: "concluido",
    concluido: "pendente",
  }

  const prazoVencido = tarefa.prazo && new Date(tarefa.prazo) < new Date() && !concluido

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: -4 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.95 }}
      className={cn(
        "group relative rounded-xl border bg-card p-3.5 transition-all hover:shadow-sm",
        concluido ? "border-border opacity-60" : "border-border hover:border-primary/30",
        prazoVencido && "border-red-200 dark:border-red-800/50"
      )}
    >
      <div className="flex items-start gap-3">
        {/* Toggle status */}
        <button onClick={() => onStatus(tarefa, proximoStatus[tarefa.status])}
          className={cn("mt-0.5 shrink-0 transition-all hover:scale-110", status.cor)}>
          <StatusIcon className="w-4.5 h-4.5" strokeWidth={concluido ? 2.5 : 1.5} />
        </button>

        {/* Conteúdo */}
        <div className="flex-1 min-w-0">
          <p className={cn("text-sm font-semibold leading-snug", concluido && "line-through text-muted-foreground")}>
            {tarefa.titulo}
          </p>
          {tarefa.descricao && (
            <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{tarefa.descricao}</p>
          )}
          <div className="flex items-center gap-2 mt-2 flex-wrap">
            {/* Prioridade */}
            <span className={cn("inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full", prioridade.bg, prioridade.cor)}>
              <div className={cn("w-1.5 h-1.5 rounded-full", prioridade.dot)} />
              {prioridade.label}
            </span>
            {/* Status */}
            <span className={cn("text-[10px] font-semibold px-2 py-0.5 rounded-full", status.bg, status.cor)}>
              {status.label}
            </span>
            {/* Prazo */}
            {tarefa.prazo && (
              <span className={cn("inline-flex items-center gap-1 text-[10px] font-medium", prazoVencido ? "text-red-500" : "text-muted-foreground")}>
                <Calendar className="w-3 h-3" />
                {format(new Date(tarefa.prazo), "dd/MM", { locale: ptBR })}
                {prazoVencido && " ⚠️"}
              </span>
            )}
          </div>
        </div>

        {/* Ações */}
        <div className="flex items-center gap-1 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
          <button onClick={() => onEditar(tarefa)} className="p-1 rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground transition-colors">
            <Edit2 className="w-3.5 h-3.5" />
          </button>
          <button onClick={() => onExcluir(tarefa.id)} className="p-1 rounded-lg hover:bg-muted text-muted-foreground hover:text-red-500 transition-colors">
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </motion.div>
  )
}

// ── Modal Bloco ───────────────────────────────────────────
function ModalBloco({ nome, cor, editando, onNome, onCor, onSalvar, onFechar }: {
  nome: string; cor: string; editando: boolean
  onNome: (v: string) => void; onCor: (v: string) => void
  onSalvar: () => void; onFechar: () => void
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }}
        className="bg-card border border-border rounded-2xl p-6 w-full max-w-sm shadow-xl space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="font-black text-base">{editando ? "Editar Bloco" : "Novo Bloco"}</h3>
          <button onClick={onFechar} className="p-1 rounded-lg hover:bg-muted text-muted-foreground"><X className="w-4 h-4" /></button>
        </div>
        <div className="space-y-1.5">
          <label className="text-xs font-semibold text-muted-foreground">Nome do bloco</label>
          <input value={nome} onChange={(e) => onNome(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && onSalvar()}
            placeholder="Ex: Marketing, Operacional..."
            className="w-full h-10 rounded-xl border border-border bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary" />
        </div>
        <div className="space-y-2">
          <label className="text-xs font-semibold text-muted-foreground">Cor do bloco</label>
          <div className="flex gap-2 flex-wrap">
            {CORES_BLOCO.map((c) => (
              <button key={c} onClick={() => onCor(c)}
                className={cn("w-8 h-8 rounded-lg transition-all hover:scale-110", cor === c && "ring-2 ring-offset-2 ring-primary")}
                style={{ backgroundColor: c }} />
            ))}
          </div>
        </div>
        <div className="flex gap-2 pt-2">
          <button onClick={onFechar} className="flex-1 h-10 rounded-xl border border-border text-sm font-semibold text-muted-foreground hover:bg-muted transition-all">Cancelar</button>
          <button onClick={onSalvar} disabled={!nome.trim()}
            className="flex-1 h-10 rounded-xl bg-primary text-white text-sm font-bold hover:bg-primary/90 disabled:opacity-50 transition-all">
            {editando ? "Salvar" : "Criar Bloco"}
          </button>
        </div>
      </motion.div>
    </div>
  )
}

// ── Modal Tarefa ──────────────────────────────────────────
function ModalTarefa({ tarefa, blocoIdInicial, blocos, onSalvar, onFechar }: {
  tarefa?: Tarefa; blocoIdInicial: string | null
  blocos: BlocoTarefa[]
  onSalvar: (dados: { titulo: string; descricao: string; prioridade: PrioridadeTarefa; prazo: string; blocoId: string | null }) => void
  onFechar: () => void
}) {
  const [titulo, setTitulo] = useState(tarefa?.titulo ?? "")
  const [descricao, setDescricao] = useState(tarefa?.descricao ?? "")
  const [prioridade, setPrioridade] = useState<PrioridadeTarefa>(tarefa?.prioridade ?? "media")
  const [prazo, setPrazo] = useState(tarefa?.prazo ? tarefa.prazo.slice(0, 10) : "")
  const [blocoId, setBlocoId] = useState<string | null>(tarefa?.bloco_id ?? blocoIdInicial)

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/50 backdrop-blur-sm">
      <motion.div initial={{ y: 40, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 40, opacity: 0 }}
        className="bg-card border border-border rounded-t-2xl sm:rounded-2xl w-full sm:max-w-md shadow-xl space-y-4 p-5 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between">
          <h3 className="font-black text-base">{tarefa ? "Editar Tarefa" : "Nova Tarefa"}</h3>
          <button onClick={onFechar} className="p-1 rounded-lg hover:bg-muted text-muted-foreground"><X className="w-4 h-4" /></button>
        </div>

        {/* Título */}
        <div className="space-y-1.5">
          <label className="text-xs font-semibold text-muted-foreground">Título *</label>
          <input value={titulo} onChange={(e) => setTitulo(e.target.value)} placeholder="O que precisa ser feito?"
            className="w-full h-10 rounded-xl border border-border bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary" />
        </div>

        {/* Descrição */}
        <div className="space-y-1.5">
          <label className="text-xs font-semibold text-muted-foreground">Descrição</label>
          <textarea value={descricao} onChange={(e) => setDescricao(e.target.value)} rows={3}
            placeholder="Detalhes adicionais..."
            className="w-full rounded-xl border border-border bg-background px-3 py-2.5 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary" />
        </div>

        {/* Prioridade */}
        <div className="space-y-1.5">
          <label className="text-xs font-semibold text-muted-foreground">Prioridade</label>
          <div className="grid grid-cols-2 gap-2">
            {(["baixa", "media", "alta", "urgente"] as const).map((p) => {
              const cfg = CONFIG_PRIORIDADE[p]
              return (
                <button key={p} onClick={() => setPrioridade(p)}
                  className={cn("flex items-center gap-2 px-3 py-2.5 rounded-xl border text-sm font-semibold transition-all",
                    prioridade === p ? `${cfg.bg} ${cfg.cor} border-current` : "border-border text-muted-foreground hover:border-border/80"
                  )}>
                  <div className={cn("w-2 h-2 rounded-full", cfg.dot)} />
                  {cfg.label}
                </button>
              )
            })}
          </div>
        </div>

        {/* Prazo + Bloco */}
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-muted-foreground">Prazo</label>
            <input type="date" value={prazo} onChange={(e) => setPrazo(e.target.value)}
              className="w-full h-10 rounded-xl border border-border bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary" />
          </div>
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-muted-foreground">Bloco</label>
            <select value={blocoId ?? ""} onChange={(e) => setBlocoId(e.target.value || null)}
              className="w-full h-10 rounded-xl border border-border bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary cursor-pointer">
              <option value="">Sem bloco</option>
              {blocos.map((b) => <option key={b.id} value={b.id}>{b.nome}</option>)}
            </select>
          </div>
        </div>

        <div className="flex gap-2 pt-2">
          <button onClick={onFechar} className="flex-1 h-10 rounded-xl border border-border text-sm font-semibold text-muted-foreground hover:bg-muted transition-all">Cancelar</button>
          <button onClick={() => onSalvar({ titulo, descricao, prioridade, prazo, blocoId })} disabled={!titulo.trim()}
            className="flex-1 h-10 rounded-xl bg-primary text-white text-sm font-bold hover:bg-primary/90 disabled:opacity-50 transition-all">
            {tarefa ? "Salvar" : "Criar Tarefa"}
          </button>
        </div>
      </motion.div>
    </div>
  )
}
