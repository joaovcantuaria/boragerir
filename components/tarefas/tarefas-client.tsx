"use client"

import { useState } from "react"
import { Plus, CheckCircle2, Circle, Clock, Trash2, Edit2, X, Calendar, ChevronDown, ChevronUp } from "lucide-react"
import { toast } from "sonner"
import { createClient } from "@/lib/supabase/client"
import { format } from "date-fns"
import { ptBR } from "date-fns/locale"
import { motion, AnimatePresence } from "framer-motion"
import { cn } from "@/lib/utils"

export type StatusTarefa = "pendente" | "iniciado" | "concluido"
export type PrioridadeTarefa = "baixa" | "media" | "alta" | "urgente"

export interface BlocoTarefa {
  id: string; empresa_id: string; nome: string; cor: string; posicao: number; created_at: string
}

export interface Tarefa {
  id: string; empresa_id: string; bloco_id: string | null; titulo: string
  descricao: string | null; status: StatusTarefa; prioridade: PrioridadeTarefa
  prazo: string | null; posicao: number; created_at: string
}

const CORES_BLOCO = ["#F26E1D","#6366f1","#10b981","#f59e0b","#ef4444","#8b5cf6","#06b6d4","#84cc16"]

const STATUS_CFG: Record<StatusTarefa, { label: string; Icon: typeof Circle; cor: string }> = {
  pendente:  { label: "Pendente",     Icon: Circle,       cor: "text-gray-400 dark:text-gray-500" },
  iniciado:  { label: "Em andamento", Icon: Clock,        cor: "text-blue-500" },
  concluido: { label: "Concluído",    Icon: CheckCircle2, cor: "text-emerald-500" },
}

const PRIO_CFG: Record<PrioridadeTarefa, { label: string; dot: string; badge: string }> = {
  baixa:   { label: "Baixa",   dot: "bg-gray-300 dark:bg-gray-600",  badge: "bg-gray-100 text-gray-500 dark:bg-gray-800 dark:text-gray-400" },
  media:   { label: "Média",   dot: "bg-blue-400",                   badge: "bg-blue-50 text-blue-600 dark:bg-blue-900/40 dark:text-blue-400" },
  alta:    { label: "Alta",    dot: "bg-orange-400",                 badge: "bg-orange-50 text-orange-600 dark:bg-orange-900/40 dark:text-orange-400" },
  urgente: { label: "Urgente", dot: "bg-red-500",                    badge: "bg-red-50 text-red-600 dark:bg-red-900/40 dark:text-red-400" },
}

interface Props { empresaId: string; blocosInit: BlocoTarefa[]; tarefasInit: Tarefa[] }

export function TarefasClient({ empresaId, blocosInit, tarefasInit }: Props) {
  const [blocos, setBlocos] = useState(blocosInit)
  const [tarefas, setTarefas] = useState(tarefasInit)
  const [modalBloco, setModalBloco] = useState(false)
  const [modalTarefa, setModalTarefa] = useState<{ aberto: boolean; blocoId?: string | null; tarefa?: Tarefa }>({ aberto: false })
  const [blocoEditando, setBlocoEditando] = useState<BlocoTarefa | null>(null)
  const [nomeBlocoInput, setNomeBlocoInput] = useState("")
  const [corBlocoInput, setCorBlocoInput] = useState(CORES_BLOCO[0])
  const [filtroStatus, setFiltroStatus] = useState<StatusTarefa | "todos">("todos")
  const [filtroPrioridade, setFiltroPrioridade] = useState<PrioridadeTarefa | "todos">("todos")
  const [colapsados, setColapsados] = useState<Set<string>>(new Set())
  const supabase = createClient()

  const tarefasSemBloco = tarefas.filter((t) => !t.bloco_id)
  const tarefasDoBloco = (id: string) => tarefas.filter((t) => t.bloco_id === id)
  const filtrar = (lista: Tarefa[]) => lista.filter((t) =>
    (filtroStatus === "todos" || t.status === filtroStatus) &&
    (filtroPrioridade === "todos" || t.prioridade === filtroPrioridade)
  )
  const toggleColapso = (id: string) => setColapsados((p) => { const n = new Set(p); n.has(id) ? n.delete(id) : n.add(id); return n })

  const total = tarefas.length
  const concluidas = tarefas.filter((t) => t.status === "concluido").length
  const urgentes = tarefas.filter((t) => t.prioridade === "urgente" && t.status !== "concluido").length
  const emAndamento = tarefas.filter((t) => t.status === "iniciado").length

  async function salvarBloco() {
    if (!nomeBlocoInput.trim()) return
    if (blocoEditando) {
      await supabase.from("blocos_tarefas").update({ nome: nomeBlocoInput, cor: corBlocoInput }).eq("id", blocoEditando.id)
      setBlocos((p) => p.map((b) => b.id === blocoEditando.id ? { ...b, nome: nomeBlocoInput, cor: corBlocoInput } : b))
      toast.success("Bloco atualizado!")
    } else {
      const { data } = await supabase.from("blocos_tarefas").insert({ empresa_id: empresaId, nome: nomeBlocoInput, cor: corBlocoInput, posicao: blocos.length }).select().single()
      if (data) { setBlocos((p) => [...p, data]); toast.success("Bloco criado!") }
    }
    setModalBloco(false); setNomeBlocoInput(""); setBlocoEditando(null)
  }

  async function excluirBloco(bloco: BlocoTarefa) {
    if (!confirm(`Excluir "${bloco.nome}" e todas as suas tarefas?`)) return
    await supabase.from("blocos_tarefas").delete().eq("id", bloco.id)
    setBlocos((p) => p.filter((b) => b.id !== bloco.id))
    setTarefas((p) => p.filter((t) => t.bloco_id !== bloco.id))
  }

  async function salvarTarefa(dados: { titulo: string; descricao: string; prioridade: PrioridadeTarefa; prazo: string; blocoId: string | null }) {
    if (!dados.titulo.trim()) return
    const edit = modalTarefa.tarefa
    if (edit) {
      await supabase.from("tarefas").update({ titulo: dados.titulo, descricao: dados.descricao || null, prioridade: dados.prioridade, prazo: dados.prazo || null, bloco_id: dados.blocoId }).eq("id", edit.id)
      setTarefas((p) => p.map((t) => t.id === edit.id ? { ...t, ...dados, descricao: dados.descricao || null, prazo: dados.prazo || null, bloco_id: dados.blocoId } : t))
      toast.success("Tarefa atualizada!")
    } else {
      const { data } = await supabase.from("tarefas").insert({ empresa_id: empresaId, bloco_id: dados.blocoId, titulo: dados.titulo, descricao: dados.descricao || null, prioridade: dados.prioridade, prazo: dados.prazo || null, status: "pendente", posicao: tarefas.length }).select().single()
      if (data) { setTarefas((p) => [...p, data]); toast.success("Tarefa criada!") }
    }
    setModalTarefa({ aberto: false })
  }

  async function alterarStatus(tarefa: Tarefa, s: StatusTarefa) {
    await supabase.from("tarefas").update({ status: s }).eq("id", tarefa.id)
    setTarefas((p) => p.map((t) => t.id === tarefa.id ? { ...t, status: s } : t))
  }

  async function excluirTarefa(id: string) {
    await supabase.from("tarefas").delete().eq("id", id)
    setTarefas((p) => p.filter((t) => t.id !== id))
  }

  return (
    <div className="space-y-8 max-w-4xl mx-auto">

      {/* Header premium */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-3xl font-black tracking-tight">Tarefas</h1>
          <p className="text-muted-foreground text-sm mt-1">Organize e acompanhe tudo que precisa ser feito</p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => { setBlocoEditando(null); setNomeBlocoInput(""); setCorBlocoInput(CORES_BLOCO[0]); setModalBloco(true) }}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl border border-border text-sm font-semibold text-muted-foreground hover:text-foreground hover:border-foreground/20 transition-all">
            <Plus className="w-3.5 h-3.5" />Bloco
          </button>
          <button
            onClick={() => setModalTarefa({ aberto: true, blocoId: blocos[0]?.id ?? null })}
            style={{ backgroundColor: "#F26E1D" }}
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-white text-sm font-bold hover:opacity-90 transition-opacity shadow-sm">
            <Plus className="w-3.5 h-3.5" />Nova tarefa
          </button>
        </div>
      </div>

      {/* Métricas */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: "Total",        valor: total,       cor: "text-foreground",    borda: "border-border" },
          { label: "Em andamento", valor: emAndamento, cor: "text-blue-500",      borda: "border-blue-200 dark:border-blue-800" },
          { label: "Concluídas",   valor: concluidas,  cor: "text-emerald-500",   borda: "border-emerald-200 dark:border-emerald-800" },
          { label: "Urgentes",     valor: urgentes,    cor: "text-red-500",       borda: "border-red-200 dark:border-red-800" },
        ].map((c) => (
          <div key={c.label} className={`rounded-2xl border ${c.borda} bg-card p-4`}>
            <p className="text-xs text-muted-foreground font-medium">{c.label}</p>
            <p className={`text-3xl font-black mt-1 ${c.cor}`}>{c.valor}</p>
          </div>
        ))}
      </div>

      {/* Filtros */}
      <div className="flex gap-2 flex-wrap">
        <div className="flex gap-1 p-1 bg-muted/60 rounded-xl border border-border">
          {(["todos","pendente","iniciado","concluido"] as const).map((s) => (
            <button key={s} onClick={() => setFiltroStatus(s)}
              className={cn("px-3 py-1.5 rounded-lg text-xs font-semibold transition-all", filtroStatus === s ? "bg-white dark:bg-white/10 text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground")}>
              {s === "todos" ? "Todos" : STATUS_CFG[s as StatusTarefa]?.label}
            </button>
          ))}
        </div>
        <div className="flex gap-1 p-1 bg-muted/60 rounded-xl border border-border">
          {(["todos","baixa","media","alta","urgente"] as const).map((p) => (
            <button key={p} onClick={() => setFiltroPrioridade(p)}
              className={cn("px-3 py-1.5 rounded-lg text-xs font-semibold transition-all flex items-center gap-1.5", filtroPrioridade === p ? "bg-white dark:bg-white/10 text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground")}>
              {p !== "todos" && <div className={cn("w-1.5 h-1.5 rounded-full", PRIO_CFG[p as PrioridadeTarefa]?.dot)} />}
              {p === "todos" ? "Todas" : PRIO_CFG[p as PrioridadeTarefa]?.label}
            </button>
          ))}
        </div>
      </div>

      {/* Tarefas sem bloco */}
      {filtrar(tarefasSemBloco).length > 0 && (
        <div className="space-y-2">
          <p className="text-[11px] font-bold text-muted-foreground uppercase tracking-widest">Sem bloco</p>
          {filtrar(tarefasSemBloco).map((t) => (
            <CartaoTarefa key={t.id} tarefa={t} blocos={blocos} onStatus={alterarStatus}
              onEditar={(t) => setModalTarefa({ aberto: true, tarefa: t })} onExcluir={excluirTarefa} />
          ))}
        </div>
      )}

      {/* Blocos */}
      <div className="space-y-4">
        {blocos.map((bloco) => {
          const lista = filtrar(tarefasDoBloco(bloco.id))
          const all = tarefasDoBloco(bloco.id)
          const concl = all.filter((t) => t.status === "concluido").length
          const col = colapsados.has(bloco.id)
          return (
            <div key={bloco.id} className="rounded-2xl border border-border overflow-hidden">
              <div className="flex items-center justify-between px-4 py-3 bg-muted/30">
                <div className="flex items-center gap-3 min-w-0 flex-1">
                  <div className="w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: bloco.cor }} />
                  <span className="font-bold text-sm truncate">{bloco.nome}</span>
                  <span className="text-xs text-muted-foreground shrink-0">{concl}/{all.length}</span>
                  {all.length > 0 && (
                    <div className="h-1 w-20 bg-border rounded-full overflow-hidden shrink-0">
                      <div className="h-full rounded-full transition-all duration-500" style={{ width: `${(concl/all.length)*100}%`, backgroundColor: bloco.cor }} />
                    </div>
                  )}
                </div>
                <div className="flex items-center gap-0.5 shrink-0">
                  <button onClick={() => setModalTarefa({ aberto: true, blocoId: bloco.id })} className="p-1.5 rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground transition-colors" title="Adicionar tarefa">
                    <Plus className="w-3.5 h-3.5" />
                  </button>
                  <button onClick={() => { setBlocoEditando(bloco); setNomeBlocoInput(bloco.nome); setCorBlocoInput(bloco.cor); setModalBloco(true) }} className="p-1.5 rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground transition-colors">
                    <Edit2 className="w-3.5 h-3.5" />
                  </button>
                  <button onClick={() => excluirBloco(bloco)} className="p-1.5 rounded-lg hover:bg-muted text-muted-foreground hover:text-red-500 transition-colors">
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                  <button onClick={() => toggleColapso(bloco.id)} className="p-1.5 rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground transition-colors">
                    {col ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronUp className="w-3.5 h-3.5" />}
                  </button>
                </div>
              </div>
              <AnimatePresence>
                {!col && (
                  <motion.div initial={{ height: 0 }} animate={{ height: "auto" }} exit={{ height: 0 }} className="overflow-hidden">
                    <div className="p-3 space-y-2">
                      {lista.length > 0 ? lista.map((t) => (
                        <CartaoTarefa key={t.id} tarefa={t} blocos={blocos} onStatus={alterarStatus}
                          onEditar={(t) => setModalTarefa({ aberto: true, tarefa: t })} onExcluir={excluirTarefa} />
                      )) : (
                        <p className="text-xs text-muted-foreground text-center py-6">
                          {filtroStatus !== "todos" || filtroPrioridade !== "todos" ? "Nenhuma tarefa com esses filtros" : "Nenhuma tarefa ainda"}
                        </p>
                      )}
                      <button onClick={() => setModalTarefa({ aberto: true, blocoId: bloco.id })}
                        className="w-full flex items-center gap-2 py-2.5 px-3 rounded-xl text-xs text-muted-foreground hover:text-foreground hover:bg-muted/60 transition-all border border-dashed border-border">
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
        <div className="text-center py-24 space-y-5">
          <div className="w-16 h-16 rounded-2xl bg-muted flex items-center justify-center mx-auto text-3xl">📋</div>
          <div>
            <h3 className="text-lg font-black">Tudo em ordem por aqui</h3>
            <p className="text-muted-foreground text-sm mt-1 max-w-xs mx-auto">Crie blocos para organizar por categoria ou projeto, e adicione suas tarefas.</p>
          </div>
          <div className="flex gap-3 justify-center">
            <button onClick={() => setModalBloco(true)}
              className="px-4 py-2.5 rounded-xl border border-border text-sm font-semibold hover:bg-muted transition-all">
              Criar bloco
            </button>
            <button onClick={() => setModalTarefa({ aberto: true })}
              style={{ backgroundColor: "#F26E1D" }}
              className="px-4 py-2.5 rounded-xl text-white text-sm font-bold hover:opacity-90 transition-opacity shadow-sm">
              Criar tarefa
            </button>
          </div>
        </div>
      )}

      {/* Modais */}
      <AnimatePresence>
        {modalBloco && (
          <ModalBloco nome={nomeBlocoInput} cor={corBlocoInput} editando={!!blocoEditando}
            onNome={setNomeBlocoInput} onCor={setCorBlocoInput} onSalvar={salvarBloco}
            onFechar={() => { setModalBloco(false); setBlocoEditando(null) }} />
        )}
      </AnimatePresence>
      <AnimatePresence>
        {modalTarefa.aberto && (
          <ModalTarefa tarefa={modalTarefa.tarefa} blocoIdInicial={modalTarefa.blocoId ?? null}
            blocos={blocos} onSalvar={salvarTarefa} onFechar={() => setModalTarefa({ aberto: false })} />
        )}
      </AnimatePresence>
    </div>
  )
}

// ── Cartão de tarefa ─────────────────────────────────────
function CartaoTarefa({ tarefa, blocos, onStatus, onEditar, onExcluir }: {
  tarefa: Tarefa; blocos: BlocoTarefa[]
  onStatus: (t: Tarefa, s: StatusTarefa) => void
  onEditar: (t: Tarefa) => void
  onExcluir: (id: string) => void
}) {
  const sc = STATUS_CFG[tarefa.status]
  const pc = PRIO_CFG[tarefa.prioridade]
  const Icon = sc.Icon
  const concluido = tarefa.status === "concluido"
  const prox: Record<StatusTarefa, StatusTarefa> = { pendente: "iniciado", iniciado: "concluido", concluido: "pendente" }
  const vencido = tarefa.prazo && new Date(tarefa.prazo) < new Date() && !concluido

  return (
    <motion.div layout initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95 }}
      className={cn("group relative rounded-xl border bg-card p-4 transition-all hover:shadow-sm cursor-default",
        concluido ? "border-border opacity-55" : vencido ? "border-red-200 dark:border-red-900" : "border-border hover:border-foreground/20"
      )}>
      <div className="flex items-start gap-3">
        <button onClick={() => onStatus(tarefa, prox[tarefa.status])} className={cn("mt-0.5 shrink-0 transition-all hover:scale-110 active:scale-95", sc.cor)} title={sc.label}>
          <Icon className="w-[18px] h-[18px]" strokeWidth={concluido ? 2.5 : 1.5} />
        </button>
        <div className="flex-1 min-w-0">
          <p className={cn("text-sm font-semibold leading-snug", concluido && "line-through text-muted-foreground")}>{tarefa.titulo}</p>
          {tarefa.descricao && <p className="text-xs text-muted-foreground mt-1 line-clamp-2 leading-relaxed">{tarefa.descricao}</p>}
          <div className="flex items-center gap-1.5 mt-2.5 flex-wrap">
            <span className={cn("inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full", pc.badge)}>
              <div className={cn("w-1.5 h-1.5 rounded-full", pc.dot)} />{pc.label}
            </span>
            {tarefa.prazo && (
              <span className={cn("inline-flex items-center gap-1 text-[10px] font-medium", vencido ? "text-red-500 font-semibold" : "text-muted-foreground")}>
                <Calendar className="w-3 h-3" />
                {format(new Date(tarefa.prazo + "T12:00:00"), "dd MMM", { locale: ptBR })}
                {vencido && " · vencida"}
              </span>
            )}
          </div>
        </div>
        <div className="flex items-center gap-1 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
          <button onClick={() => onEditar(tarefa)} className="p-1.5 rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"><Edit2 className="w-3.5 h-3.5" /></button>
          <button onClick={() => onExcluir(tarefa.id)} className="p-1.5 rounded-lg hover:bg-muted text-muted-foreground hover:text-red-500 transition-colors"><Trash2 className="w-3.5 h-3.5" /></button>
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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
      <motion.div initial={{ scale: 0.96, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.96, opacity: 0 }}
        className="w-full max-w-sm rounded-2xl shadow-2xl overflow-hidden"
        style={{ backgroundColor: "#ffffff" }}
      >
        <div className="p-6 space-y-5" style={{ backgroundColor: "#ffffff" }}>
          <div className="flex items-center justify-between">
            <h3 className="font-black text-base text-gray-900">{editando ? "Editar Bloco" : "Novo Bloco"}</h3>
            <button onClick={onFechar} className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400 hover:text-gray-600 transition-colors"><X className="w-4 h-4" /></button>
          </div>
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-gray-500">Nome do bloco</label>
            <input value={nome} onChange={(e) => onNome(e.target.value)} onKeyDown={(e) => e.key === "Enter" && onSalvar()}
              placeholder="Ex: Marketing, Atendimento..."
              className="w-full h-11 rounded-xl border border-gray-200 bg-gray-50 px-3 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-orange-200 focus:border-orange-400 transition-all" />
          </div>
          <div className="space-y-2">
            <label className="text-xs font-semibold text-gray-500">Cor</label>
            <div className="flex gap-2 flex-wrap">
              {CORES_BLOCO.map((c) => (
                <button key={c} onClick={() => onCor(c)} className={cn("w-8 h-8 rounded-lg transition-all hover:scale-110 active:scale-95", cor === c && "ring-2 ring-offset-2 ring-gray-400")} style={{ backgroundColor: c }} />
              ))}
            </div>
          </div>
          <div className="flex gap-2 pt-1">
            <button onClick={onFechar} className="flex-1 h-11 rounded-xl border border-gray-200 text-sm font-semibold text-gray-600 hover:bg-gray-50 transition-all">Cancelar</button>
            <button onClick={onSalvar} disabled={!nome.trim()}
              className="flex-1 h-11 rounded-xl text-white text-sm font-bold transition-all disabled:opacity-40"
              style={{ backgroundColor: "#F26E1D" }}>
              {editando ? "Salvar" : "Criar Bloco"}
            </button>
          </div>
        </div>
      </motion.div>
    </div>
  )
}

// ── Modal Tarefa ──────────────────────────────────────────
function ModalTarefa({ tarefa, blocoIdInicial, blocos, onSalvar, onFechar }: {
  tarefa?: Tarefa; blocoIdInicial: string | null; blocos: BlocoTarefa[]
  onSalvar: (d: { titulo: string; descricao: string; prioridade: PrioridadeTarefa; prazo: string; blocoId: string | null }) => void
  onFechar: () => void
}) {
  const [titulo, setTitulo] = useState(tarefa?.titulo ?? "")
  const [descricao, setDescricao] = useState(tarefa?.descricao ?? "")
  const [prioridade, setPrioridade] = useState<PrioridadeTarefa>(tarefa?.prioridade ?? "media")
  const [prazo, setPrazo] = useState(tarefa?.prazo ? tarefa.prazo.slice(0, 10) : "")
  const [blocoId, setBlocoId] = useState<string | null>(tarefa?.bloco_id ?? blocoIdInicial)

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/40 backdrop-blur-sm">
      <motion.div initial={{ y: 30, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 30, opacity: 0 }}
        className="w-full sm:max-w-md rounded-t-2xl sm:rounded-2xl shadow-2xl overflow-hidden"
        style={{ backgroundColor: "#ffffff" }}>
        <div className="p-5 space-y-5 max-h-[90vh] overflow-y-auto" style={{ backgroundColor: "#ffffff" }}>
          <div className="flex items-center justify-between">
            <h3 className="font-black text-base text-gray-900">{tarefa ? "Editar Tarefa" : "Nova Tarefa"}</h3>
            <button onClick={onFechar} className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400"><X className="w-4 h-4" /></button>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-gray-500">Título *</label>
            <input value={titulo} onChange={(e) => setTitulo(e.target.value)} placeholder="O que precisa ser feito?"
              className="w-full h-11 rounded-xl border border-gray-200 bg-gray-50 px-3 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-orange-200 focus:border-orange-400" />
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-gray-500">Descrição</label>
            <textarea value={descricao} onChange={(e) => setDescricao(e.target.value)} rows={3} placeholder="Detalhes adicionais..."
              className="w-full rounded-xl border border-gray-200 bg-gray-50 px-3 py-2.5 text-sm text-gray-900 resize-none focus:outline-none focus:ring-2 focus:ring-orange-200 focus:border-orange-400" />
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-gray-500">Prioridade</label>
            <div className="grid grid-cols-2 gap-2">
              {(["baixa","media","alta","urgente"] as const).map((p) => {
                const cfg = PRIO_CFG[p]
                return (
                  <button key={p} onClick={() => setPrioridade(p)}
                    className={cn("flex items-center gap-2 px-3 py-2.5 rounded-xl border text-sm font-semibold transition-all text-left",
                      prioridade === p ? "border-orange-300 bg-orange-50 text-orange-700" : "border-gray-200 text-gray-600 hover:border-gray-300 bg-white"
                    )}>
                    <div className={cn("w-2 h-2 rounded-full shrink-0", cfg.dot)} />{cfg.label}
                  </button>
                )
              })}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-gray-500">Prazo</label>
              <input type="date" value={prazo} onChange={(e) => setPrazo(e.target.value)}
                className="w-full h-11 rounded-xl border border-gray-200 bg-gray-50 px-3 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-orange-200 focus:border-orange-400" />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-gray-500">Bloco</label>
              <select value={blocoId ?? ""} onChange={(e) => setBlocoId(e.target.value || null)}
                className="w-full h-11 rounded-xl border border-gray-200 bg-gray-50 px-3 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-orange-200 focus:border-orange-400 cursor-pointer">
                <option value="">Sem bloco</option>
                {blocos.map((b) => <option key={b.id} value={b.id}>{b.nome}</option>)}
              </select>
            </div>
          </div>

          <div className="flex gap-2 pt-1">
            <button onClick={onFechar} className="flex-1 h-11 rounded-xl border border-gray-200 text-sm font-semibold text-gray-600 hover:bg-gray-50 transition-all bg-white">Cancelar</button>
            <button onClick={() => onSalvar({ titulo, descricao, prioridade, prazo, blocoId })} disabled={!titulo.trim()}
              className="flex-1 h-11 rounded-xl text-white text-sm font-bold transition-all disabled:opacity-40"
              style={{ backgroundColor: "#F26E1D" }}>
              {tarefa ? "Salvar" : "Criar Tarefa"}
            </button>
          </div>
        </div>
      </motion.div>
    </div>
  )
}
