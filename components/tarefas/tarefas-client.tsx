"use client"

import { useState, useCallback, useEffect } from "react"
import {
  DndContext, closestCorners, DragOverlay, useSensor, useSensors, PointerSensor,
  type DragStartEvent, type DragEndEvent, type DragOverEvent,
} from "@dnd-kit/core"
import { SortableContext, verticalListSortingStrategy, useSortable } from "@dnd-kit/sortable"
import { CSS } from "@dnd-kit/utilities"
import {
  Plus, CheckCircle2, Circle, Clock, Trash2, Edit2, X, Calendar,
  Paperclip, Upload, FileText, Image, Download, GripVertical, Filter,
} from "lucide-react"
import { toast } from "sonner"
import { createClient } from "@/lib/supabase/client"
import { format } from "date-fns"
import { ptBR } from "date-fns/locale"
import { motion, AnimatePresence } from "framer-motion"
import { cn } from "@/lib/utils"

// ── Types ────────────────────────────────────────────────
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
export interface Anexo {
  id: string; tarefa_id: string; empresa_id: string; nome: string
  url: string; tipo: string; tamanho: number; created_at: string
}

const CORES_BLOCO = ["#F26E1D","#6366f1","#10b981","#f59e0b","#ef4444","#8b5cf6","#06b6d4","#84cc16"]

const STATUS_COLS: { id: StatusTarefa; label: string; icon: typeof Circle; cor: string; bg: string }[] = [
  { id: "pendente",  label: "Pendente",      icon: Circle,       cor: "text-gray-500",    bg: "bg-gray-100 dark:bg-gray-800/50" },
  { id: "iniciado",  label: "Em andamento",  icon: Clock,        cor: "text-blue-500",    bg: "bg-blue-50 dark:bg-blue-900/20" },
  { id: "concluido", label: "Concluído",     icon: CheckCircle2, cor: "text-emerald-500", bg: "bg-emerald-50 dark:bg-emerald-900/20" },
]

const PRIO_CFG: Record<PrioridadeTarefa, { label: string; dot: string; badge: string }> = {
  baixa:   { label: "Baixa",   dot: "bg-gray-300 dark:bg-gray-600",  badge: "bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400" },
  media:   { label: "Média",   dot: "bg-blue-400",                   badge: "bg-blue-50 text-blue-600 dark:bg-blue-900/40 dark:text-blue-400" },
  alta:    { label: "Alta",    dot: "bg-orange-400",                 badge: "bg-orange-50 text-orange-600 dark:bg-orange-900/40 dark:text-orange-400" },
  urgente: { label: "Urgente", dot: "bg-red-500",                    badge: "bg-red-50 text-red-600 dark:bg-red-900/40 dark:text-red-400" },
}

interface Props { empresaId: string; blocosInit: BlocoTarefa[]; tarefasInit: Tarefa[] }

// ── Main Component ───────────────────────────────────────
export function TarefasClient({ empresaId, blocosInit, tarefasInit }: Props) {
  const [blocos, setBlocos] = useState(blocosInit)
  const [tarefas, setTarefas] = useState(tarefasInit)
  const [activeId, setActiveId] = useState<string | null>(null)
  const [modalBloco, setModalBloco] = useState(false)
  const [modalTarefa, setModalTarefa] = useState<{ aberto: boolean; blocoId?: string | null; tarefa?: Tarefa }>({ aberto: false })
  const [modalDetalhe, setModalDetalhe] = useState<Tarefa | null>(null)
  const [blocoEditando, setBlocoEditando] = useState<BlocoTarefa | null>(null)
  const [nomeBlocoInput, setNomeBlocoInput] = useState("")
  const [corBlocoInput, setCorBlocoInput] = useState(CORES_BLOCO[0])
  const [filtroBloco, setFiltroBloco] = useState<string | "todos">("todos")
  const [filtroPrioridade, setFiltroPrioridade] = useState<PrioridadeTarefa | "todos">("todos")
  const supabase = createClient()

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }))

  const filtrar = useCallback((lista: Tarefa[]) => lista.filter((t) =>
    (filtroBloco === "todos" || t.bloco_id === filtroBloco) &&
    (filtroPrioridade === "todos" || t.prioridade === filtroPrioridade)
  ), [filtroBloco, filtroPrioridade])

  const tarefasPorStatus = (status: StatusTarefa) => filtrar(tarefas.filter((t) => t.status === status))
  const activeTarefa = tarefas.find((t) => t.id === activeId)

  const total = tarefas.length
  const concluidas = tarefas.filter((t) => t.status === "concluido").length
  const urgentes = tarefas.filter((t) => t.prioridade === "urgente" && t.status !== "concluido").length
  const emAndamento = tarefas.filter((t) => t.status === "iniciado").length

  // ── Drag handlers ──
  function handleDragStart(e: DragStartEvent) { setActiveId(e.active.id as string) }

  async function handleDragEnd(e: DragEndEvent) {
    setActiveId(null)
    const { active, over } = e
    if (!over) return
    const tarefaId = active.id as string
    const destino = over.id as string
    // Se soltou em uma coluna de status
    const statusDestino = STATUS_COLS.find((s) => s.id === destino)?.id
    if (statusDestino) {
      const tarefa = tarefas.find((t) => t.id === tarefaId)
      if (tarefa && tarefa.status !== statusDestino) {
        setTarefas((p) => p.map((t) => t.id === tarefaId ? { ...t, status: statusDestino } : t))
        await supabase.from("tarefas").update({ status: statusDestino }).eq("id", tarefaId)
        toast.success(`Movido para "${STATUS_COLS.find((s) => s.id === statusDestino)?.label}"`)
      }
    }
  }

  function handleDragOver(e: DragOverEvent) {
    const { active, over } = e
    if (!over) return
    const tarefaId = active.id as string
    const destino = over.id as string
    const statusDestino = STATUS_COLS.find((s) => s.id === destino)?.id
    if (statusDestino) {
      const tarefa = tarefas.find((t) => t.id === tarefaId)
      if (tarefa && tarefa.status !== statusDestino) {
        setTarefas((p) => p.map((t) => t.id === tarefaId ? { ...t, status: statusDestino } : t))
      }
    }
  }

  // ── CRUD ──
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

  async function salvarTarefa(dados: { titulo: string; descricao: string; prioridade: PrioridadeTarefa; prazo: string; blocoId: string | null; status?: StatusTarefa }) {
    if (!dados.titulo.trim()) return
    const edit = modalTarefa.tarefa
    if (edit) {
      await supabase.from("tarefas").update({ titulo: dados.titulo, descricao: dados.descricao || null, prioridade: dados.prioridade, prazo: dados.prazo || null, bloco_id: dados.blocoId, status: dados.status || edit.status }).eq("id", edit.id)
      setTarefas((p) => p.map((t) => t.id === edit.id ? { ...t, ...dados, descricao: dados.descricao || null, prazo: dados.prazo || null, bloco_id: dados.blocoId, status: dados.status || edit.status } : t))
      toast.success("Tarefa atualizada!")
    } else {
      const { data } = await supabase.from("tarefas").insert({ empresa_id: empresaId, bloco_id: dados.blocoId, titulo: dados.titulo, descricao: dados.descricao || null, prioridade: dados.prioridade, prazo: dados.prazo || null, status: dados.status || "pendente", posicao: tarefas.length }).select().single()
      if (data) { setTarefas((p) => [...p, data]); toast.success("Tarefa criada!") }
    }
    setModalTarefa({ aberto: false })
  }

  async function excluirTarefa(id: string) {
    await supabase.from("tarefas").delete().eq("id", id)
    setTarefas((p) => p.filter((t) => t.id !== id))
    setModalDetalhe(null)
  }

  // ── Render ──
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-3xl font-black tracking-tight">Tarefas</h1>
          <p className="text-muted-foreground text-sm mt-1">Arraste os cards entre as colunas para alterar o status</p>
        </div>
        <div className="flex gap-2">
          <button onClick={() => { setBlocoEditando(null); setNomeBlocoInput(""); setCorBlocoInput(CORES_BLOCO[0]); setModalBloco(true) }}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl border border-border text-sm font-semibold text-muted-foreground hover:text-foreground hover:border-foreground/20 transition-all">
            <Plus className="w-3.5 h-3.5" />Bloco
          </button>
          <button onClick={() => setModalTarefa({ aberto: true, blocoId: blocos[0]?.id ?? null })}
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-white text-sm font-bold hover:opacity-90 transition-opacity shadow-sm bg-[#F26E1D]">
            <Plus className="w-3.5 h-3.5" />Nova tarefa
          </button>
        </div>
      </div>

      {/* Métricas compactas */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: "Total", valor: total, cor: "text-foreground" },
          { label: "Em andamento", valor: emAndamento, cor: "text-blue-500" },
          { label: "Concluídas", valor: concluidas, cor: "text-emerald-500" },
          { label: "Urgentes", valor: urgentes, cor: "text-red-500" },
        ].map((c) => (
          <div key={c.label} className="rounded-xl border border-border bg-card p-3">
            <p className="text-[10px] text-muted-foreground font-medium uppercase tracking-wider">{c.label}</p>
            <p className={`text-2xl font-black mt-0.5 ${c.cor}`}>{c.valor}</p>
          </div>
        ))}
      </div>

      {/* Filtros */}
      <div className="flex gap-2 flex-wrap items-center">
        <Filter className="w-3.5 h-3.5 text-muted-foreground" />
        <select value={filtroBloco} onChange={(e) => setFiltroBloco(e.target.value)}
          className="text-xs font-medium px-2.5 py-1.5 rounded-lg border border-border bg-card text-foreground">
          <option value="todos">Todos os blocos</option>
          {blocos.map((b) => <option key={b.id} value={b.id}>{b.nome}</option>)}
        </select>
        <select value={filtroPrioridade} onChange={(e) => setFiltroPrioridade(e.target.value as PrioridadeTarefa | "todos")}
          className="text-xs font-medium px-2.5 py-1.5 rounded-lg border border-border bg-card text-foreground">
          <option value="todos">Todas prioridades</option>
          <option value="baixa">Baixa</option>
          <option value="media">Média</option>
          <option value="alta">Alta</option>
          <option value="urgente">Urgente</option>
        </select>
        {/* Blocos tags */}
        <div className="flex gap-1.5 ml-auto flex-wrap">
          {blocos.map((b) => (
            <button key={b.id} onClick={() => { setBlocoEditando(b); setNomeBlocoInput(b.nome); setCorBlocoInput(b.cor); setModalBloco(true) }}
              className="flex items-center gap-1 px-2 py-1 rounded-md text-[10px] font-semibold border border-border hover:bg-muted transition-colors">
              <div className="w-2 h-2 rounded-full" style={{ backgroundColor: b.cor }} />
              {b.nome}
            </button>
          ))}
        </div>
      </div>

      {/* Kanban Board */}
      <DndContext sensors={sensors} collisionDetection={closestCorners}
        onDragStart={handleDragStart} onDragEnd={handleDragEnd} onDragOver={handleDragOver}>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 min-h-[60vh]">
          {STATUS_COLS.map((col) => (
            <KanbanColumn key={col.id} col={col} tarefas={tarefasPorStatus(col.id)} blocos={blocos}
              onAddTarefa={() => setModalTarefa({ aberto: true, blocoId: blocos[0]?.id ?? null })}
              onClickTarefa={(t) => setModalDetalhe(t)}
              onEditTarefa={(t) => setModalTarefa({ aberto: true, tarefa: t })} />
          ))}
        </div>
        <DragOverlay>
          {activeTarefa && <KanbanCard tarefa={activeTarefa} blocos={blocos} isDragging />}
        </DragOverlay>
      </DndContext>

      {/* Estado vazio */}
      {blocos.length === 0 && tarefas.length === 0 && (
        <div className="text-center py-16 space-y-5">
          <div className="w-16 h-16 rounded-2xl bg-muted flex items-center justify-center mx-auto text-3xl">📋</div>
          <div>
            <h3 className="text-lg font-black">Organize suas tarefas</h3>
            <p className="text-muted-foreground text-sm mt-1 max-w-xs mx-auto">Crie blocos para categorizar e adicione tarefas. Arraste entre as colunas para mudar o status.</p>
          </div>
          <div className="flex gap-3 justify-center">
            <button onClick={() => setModalBloco(true)} className="px-4 py-2.5 rounded-xl border border-border text-sm font-semibold hover:bg-muted transition-all">Criar bloco</button>
            <button onClick={() => setModalTarefa({ aberto: true })} className="px-4 py-2.5 rounded-xl text-white text-sm font-bold hover:opacity-90 transition-opacity shadow-sm bg-[#F26E1D]">Criar tarefa</button>
          </div>
        </div>
      )}

      {/* Modais */}
      <AnimatePresence>
        {modalBloco && (
          <ModalBloco nome={nomeBlocoInput} cor={corBlocoInput} editando={!!blocoEditando}
            onNome={setNomeBlocoInput} onCor={setCorBlocoInput} onSalvar={salvarBloco}
            onFechar={() => { setModalBloco(false); setBlocoEditando(null) }}
            onExcluir={blocoEditando ? () => { excluirBloco(blocoEditando); setModalBloco(false); setBlocoEditando(null) } : undefined} />
        )}
      </AnimatePresence>
      <AnimatePresence>
        {modalTarefa.aberto && (
          <ModalTarefa tarefa={modalTarefa.tarefa} blocoIdInicial={modalTarefa.blocoId ?? null}
            blocos={blocos} onSalvar={salvarTarefa} onFechar={() => setModalTarefa({ aberto: false })} />
        )}
      </AnimatePresence>
      <AnimatePresence>
        {modalDetalhe && (
          <ModalDetalhe tarefa={modalDetalhe} blocos={blocos} empresaId={empresaId}
            onFechar={() => setModalDetalhe(null)}
            onEditar={(t) => { setModalDetalhe(null); setModalTarefa({ aberto: true, tarefa: t }) }}
            onExcluir={(id) => excluirTarefa(id)} />
        )}
      </AnimatePresence>
    </div>
  )
}

// ── Kanban Column ────────────────────────────────────────
function KanbanColumn({ col, tarefas, blocos, onAddTarefa, onClickTarefa, onEditTarefa }: {
  col: typeof STATUS_COLS[0]; tarefas: Tarefa[]; blocos: BlocoTarefa[]
  onAddTarefa: () => void; onClickTarefa: (t: Tarefa) => void; onEditTarefa: (t: Tarefa) => void
}) {
  const Icon = col.icon
  return (
    <div className={cn("rounded-2xl border border-border flex flex-col min-h-[400px]", col.bg)}>
      {/* Header da coluna */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-border/50">
        <div className="flex items-center gap-2">
          <Icon className={cn("w-4 h-4", col.cor)} />
          <span className="text-sm font-bold">{col.label}</span>
          <span className="text-xs text-muted-foreground bg-muted px-1.5 py-0.5 rounded-md font-semibold">{tarefas.length}</span>
        </div>
        <button onClick={onAddTarefa} className="p-1 rounded-md hover:bg-muted text-muted-foreground hover:text-foreground transition-colors">
          <Plus className="w-3.5 h-3.5" />
        </button>
      </div>
      {/* Cards drop zone */}
      <SortableContext items={tarefas.map((t) => t.id)} strategy={verticalListSortingStrategy} id={col.id}>
        <DroppableColumn id={col.id}>
          <div className="flex-1 p-2 space-y-2 overflow-y-auto max-h-[calc(100vh-320px)]">
            {tarefas.map((t) => (
              <SortableCard key={t.id} tarefa={t} blocos={blocos} onClick={() => onClickTarefa(t)} onEdit={() => onEditTarefa(t)} />
            ))}
            {tarefas.length === 0 && (
              <div className="flex flex-col items-center justify-center py-8 text-muted-foreground">
                <p className="text-xs">Arraste tarefas aqui</p>
              </div>
            )}
          </div>
        </DroppableColumn>
      </SortableContext>
    </div>
  )
}

// ── Droppable Column wrapper ─────────────────────────────
function DroppableColumn({ id, children }: { id: string; children: React.ReactNode }) {
  const { setNodeRef } = useSortable({ id, data: { type: "column" } })
  return <div ref={setNodeRef} className="flex-1 flex flex-col">{children}</div>
}

// ── Sortable Card ────────────────────────────────────────
function SortableCard({ tarefa, blocos, onClick, onEdit }: {
  tarefa: Tarefa; blocos: BlocoTarefa[]; onClick: () => void; onEdit: () => void
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: tarefa.id })
  const style = { transform: CSS.Transform.toString(transform), transition, opacity: isDragging ? 0.4 : 1 }
  return (
    <div ref={setNodeRef} style={style} {...attributes}>
      <KanbanCard tarefa={tarefa} blocos={blocos} dragListeners={listeners} onClick={onClick} onEdit={onEdit} />
    </div>
  )
}

// ── Kanban Card ──────────────────────────────────────────
function KanbanCard({ tarefa, blocos, isDragging, dragListeners, onClick, onEdit }: {
  tarefa: Tarefa; blocos: BlocoTarefa[]; isDragging?: boolean
  dragListeners?: Record<string, unknown>; onClick?: () => void; onEdit?: () => void
}) {
  const bloco = blocos.find((b) => b.id === tarefa.bloco_id)
  const prio = PRIO_CFG[tarefa.prioridade]
  const vencido = tarefa.prazo && new Date(tarefa.prazo) < new Date() && tarefa.status !== "concluido"
  const concluido = tarefa.status === "concluido"

  return (
    <div className={cn(
      "group rounded-xl border bg-card p-3 cursor-pointer transition-all hover:shadow-md",
      isDragging && "shadow-xl ring-2 ring-primary/30 rotate-2 scale-105",
      concluido && "opacity-60",
      vencido && "border-red-300 dark:border-red-800",
      !isDragging && !vencido && "border-border hover:border-primary/30"
    )} onClick={onClick}>
      <div className="flex items-start gap-2">
        {/* Drag handle */}
        <div {...dragListeners} className="mt-0.5 cursor-grab active:cursor-grabbing text-muted-foreground/40 hover:text-muted-foreground transition-colors">
          <GripVertical className="w-3.5 h-3.5" />
        </div>
        <div className="flex-1 min-w-0 space-y-2">
          {/* Bloco tag */}
          {bloco && (
            <div className="flex items-center gap-1">
              <div className="h-1.5 w-8 rounded-full" style={{ backgroundColor: bloco.cor }} />
              <span className="text-[9px] font-semibold text-muted-foreground uppercase">{bloco.nome}</span>
            </div>
          )}
          {/* Titulo */}
          <p className={cn("text-sm font-semibold leading-snug", concluido && "line-through text-muted-foreground")}>{tarefa.titulo}</p>
          {/* Meta row */}
          <div className="flex items-center gap-2 flex-wrap">
            <span className={cn("text-[10px] font-semibold px-1.5 py-0.5 rounded", prio.badge)}>{prio.label}</span>
            {tarefa.prazo && (
              <span className={cn("text-[10px] flex items-center gap-0.5", vencido ? "text-red-500 font-bold" : "text-muted-foreground")}>
                <Calendar className="w-2.5 h-2.5" />
                {format(new Date(tarefa.prazo), "dd MMM", { locale: ptBR })}
                {vencido && " · vencida"}
              </span>
            )}
          </div>
        </div>
        {/* Edit button on hover */}
        {onEdit && (
          <button onClick={(e) => { e.stopPropagation(); onEdit() }}
            className="opacity-0 group-hover:opacity-100 p-1 rounded-md hover:bg-muted text-muted-foreground transition-all">
            <Edit2 className="w-3 h-3" />
          </button>
        )}
      </div>
    </div>
  )
}

// ── Modal Detalhe (com upload de documentos) ─────────────
function ModalDetalhe({ tarefa, blocos, empresaId, onFechar, onEditar, onExcluir }: {
  tarefa: Tarefa; blocos: BlocoTarefa[]; empresaId: string
  onFechar: () => void; onEditar: (t: Tarefa) => void; onExcluir: (id: string) => void
}) {
  const [anexos, setAnexos] = useState<Anexo[]>([])
  const [uploading, setUploading] = useState(false)
  const bloco = blocos.find((b) => b.id === tarefa.bloco_id)
  const prio = PRIO_CFG[tarefa.prioridade]
  const statusCfg = STATUS_COLS.find((s) => s.id === tarefa.status)!

  // Carregar anexos
  useEffect(() => {
    fetch(`/api/tarefas/anexos?tarefa_id=${tarefa.id}`)
      .then((r) => r.json())
      .then((d) => { if (d.anexos) setAnexos(d.anexos) })
      .catch(() => {})
  }, [tarefa.id])

  async function handleUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const files = e.target.files
    if (!files || files.length === 0) return
    setUploading(true)
    for (const file of Array.from(files)) {
      const fd = new FormData()
      fd.append("file", file)
      fd.append("tarefa_id", tarefa.id)
      fd.append("empresa_id", empresaId)
      const res = await fetch("/api/tarefas/anexos", { method: "POST", body: fd })
      const data = await res.json()
      if (data.anexo) setAnexos((p) => [data.anexo, ...p])
      else toast.error(data.erro || "Erro ao enviar arquivo")
    }
    setUploading(false)
    toast.success("Arquivo(s) enviado(s)!")
    e.target.value = ""
  }

  async function removerAnexo(anexo: Anexo) {
    if (!confirm(`Remover "${anexo.nome}"?`)) return
    await fetch("/api/tarefas/anexos", { method: "DELETE", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id: anexo.id }) })
    setAnexos((p) => p.filter((a) => a.id !== anexo.id))
    toast.success("Arquivo removido")
  }

  function formatSize(bytes: number) {
    if (bytes < 1024) return `${bytes} B`
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
  }

  function getFileIcon(tipo: string) {
    if (tipo.startsWith("image/")) return <Image className="w-4 h-4 text-purple-500" />
    return <FileText className="w-4 h-4 text-blue-500" />
  }

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4" onClick={onFechar}>
      <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }}
        onClick={(e) => e.stopPropagation()}
        className="bg-white dark:bg-[#1c1c1e] border border-border rounded-2xl w-full max-w-lg shadow-2xl flex flex-col max-h-[85vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-border shrink-0">
          <div className="flex items-center gap-2">
            {bloco && <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: bloco.cor }} />}
            <h3 className="font-bold text-base truncate">{tarefa.titulo}</h3>
          </div>
          <div className="flex items-center gap-1">
            <button onClick={() => onEditar(tarefa)} className="p-1.5 rounded-lg hover:bg-muted text-muted-foreground"><Edit2 className="w-4 h-4" /></button>
            <button onClick={() => onExcluir(tarefa.id)} className="p-1.5 rounded-lg hover:bg-muted text-red-500"><Trash2 className="w-4 h-4" /></button>
            <button onClick={onFechar} className="p-1.5 rounded-lg hover:bg-muted text-muted-foreground"><X className="w-4 h-4" /></button>
          </div>
        </div>
        {/* Body */}
        <div className="flex-1 overflow-y-auto px-5 py-4 space-y-5">
          {/* Status & Prioridade */}
          <div className="flex items-center gap-3 flex-wrap">
            <span className={cn("flex items-center gap-1.5 text-xs font-semibold px-2 py-1 rounded-lg", statusCfg.bg)}>
              {statusCfg.id === "pendente" && <Circle className={cn("w-3 h-3", statusCfg.cor)} />}
              {statusCfg.id === "iniciado" && <Clock className={cn("w-3 h-3", statusCfg.cor)} />}
              {statusCfg.id === "concluido" && <CheckCircle2 className={cn("w-3 h-3", statusCfg.cor)} />}
              {statusCfg.label}
            </span>
            <span className={cn("text-xs font-semibold px-2 py-1 rounded-lg", prio.badge)}>{prio.label}</span>
            {tarefa.prazo && (
              <span className="text-xs text-muted-foreground flex items-center gap-1">
                <Calendar className="w-3 h-3" />{format(new Date(tarefa.prazo), "dd/MM/yyyy")}
              </span>
            )}
          </div>
          {/* Descrição */}
          {tarefa.descricao && (
            <div>
              <p className="text-xs font-semibold text-muted-foreground mb-1">Descrição</p>
              <p className="text-sm text-foreground whitespace-pre-wrap">{tarefa.descricao}</p>
            </div>
          )}
          {/* Bloco */}
          {bloco && (
            <div className="flex items-center gap-2">
              <p className="text-xs font-semibold text-muted-foreground">Bloco:</p>
              <span className="text-xs font-medium flex items-center gap-1">
                <div className="w-2 h-2 rounded-full" style={{ backgroundColor: bloco.cor }} />{bloco.nome}
              </span>
            </div>
          )}

          {/* Anexos / Documentos */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <p className="text-xs font-semibold text-muted-foreground flex items-center gap-1"><Paperclip className="w-3 h-3" />Documentos</p>
              <label className={cn("flex items-center gap-1 text-xs font-semibold text-primary cursor-pointer hover:underline", uploading && "opacity-50 pointer-events-none")}>
                <Upload className="w-3 h-3" />{uploading ? "Enviando..." : "Anexar"}
                <input type="file" className="hidden" multiple onChange={handleUpload} disabled={uploading} />
              </label>
            </div>
            {anexos.length > 0 ? (
              <div className="space-y-1.5">
                {anexos.map((a) => (
                  <div key={a.id} className="flex items-center gap-2.5 p-2 rounded-lg border border-border bg-muted/30 group">
                    {getFileIcon(a.tipo)}
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-medium truncate">{a.nome}</p>
                      <p className="text-[10px] text-muted-foreground">{formatSize(a.tamanho)}</p>
                    </div>
                    <a href={a.url} target="_blank" rel="noopener noreferrer"
                      className="p-1 rounded hover:bg-muted text-muted-foreground hover:text-foreground transition-colors">
                      <Download className="w-3.5 h-3.5" />
                    </a>
                    <button onClick={() => removerAnexo(a)}
                      className="p-1 rounded hover:bg-muted text-muted-foreground hover:text-red-500 transition-colors opacity-0 group-hover:opacity-100">
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-4 border border-dashed border-border rounded-xl">
                <Paperclip className="w-5 h-5 mx-auto text-muted-foreground/40 mb-1" />
                <p className="text-xs text-muted-foreground">Nenhum documento anexado</p>
                <label className="text-xs text-primary font-semibold cursor-pointer hover:underline mt-1 inline-block">
                  Clique para enviar
                  <input type="file" className="hidden" multiple onChange={handleUpload} disabled={uploading} />
                </label>
              </div>
            )}
          </div>
        </div>
      </motion.div>
    </motion.div>
  )
}

// ── Modal Bloco ──────────────────────────────────────────
function ModalBloco({ nome, cor, editando, onNome, onCor, onSalvar, onFechar, onExcluir }: {
  nome: string; cor: string; editando: boolean
  onNome: (v: string) => void; onCor: (v: string) => void
  onSalvar: () => void; onFechar: () => void; onExcluir?: () => void
}) {
  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4" onClick={onFechar}>
      <motion.div initial={{ scale: 0.95 }} animate={{ scale: 1 }} exit={{ scale: 0.95 }}
        onClick={(e) => e.stopPropagation()}
        className="bg-white dark:bg-[#1c1c1e] border border-border rounded-2xl w-full max-w-sm p-5 shadow-2xl space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="font-bold text-sm">{editando ? "Editar bloco" : "Novo bloco"}</h3>
          <button onClick={onFechar} className="p-1 rounded-lg hover:bg-muted text-muted-foreground"><X className="w-4 h-4" /></button>
        </div>
        <input value={nome} onChange={(e) => onNome(e.target.value)} placeholder="Nome do bloco"
          className="w-full h-10 px-3 rounded-xl border border-border bg-background text-sm font-medium focus:outline-none focus:ring-2 focus:ring-primary/30"
          autoFocus onKeyDown={(e) => e.key === "Enter" && onSalvar()} />
        <div>
          <p className="text-xs text-muted-foreground font-medium mb-2">Cor</p>
          <div className="flex gap-2 flex-wrap">
            {CORES_BLOCO.map((c) => (
              <button key={c} onClick={() => onCor(c)}
                className={cn("w-7 h-7 rounded-lg transition-all", cor === c && "ring-2 ring-offset-2 ring-primary scale-110")}
                style={{ backgroundColor: c }} />
            ))}
          </div>
        </div>
        <div className="flex gap-2">
          {editando && onExcluir && (
            <button onClick={onExcluir} className="px-3 py-2 rounded-xl border border-red-200 dark:border-red-800 text-red-500 text-xs font-semibold hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors">
              Excluir
            </button>
          )}
          <button onClick={onSalvar} className="flex-1 py-2.5 rounded-xl text-white text-sm font-bold hover:opacity-90 transition-opacity bg-[#F26E1D]">
            {editando ? "Salvar" : "Criar bloco"}
          </button>
        </div>
      </motion.div>
    </motion.div>
  )
}

// ── Modal Tarefa (criar/editar) ──────────────────────────
function ModalTarefa({ tarefa, blocoIdInicial, blocos, onSalvar, onFechar }: {
  tarefa?: Tarefa; blocoIdInicial: string | null; blocos: BlocoTarefa[]
  onSalvar: (d: { titulo: string; descricao: string; prioridade: PrioridadeTarefa; prazo: string; blocoId: string | null; status?: StatusTarefa }) => void
  onFechar: () => void
}) {
  const [titulo, setTitulo] = useState(tarefa?.titulo ?? "")
  const [descricao, setDescricao] = useState(tarefa?.descricao ?? "")
  const [prioridade, setPrioridade] = useState<PrioridadeTarefa>(tarefa?.prioridade ?? "media")
  const [prazo, setPrazo] = useState(tarefa?.prazo?.slice(0, 10) ?? "")
  const [blocoId, setBlocoId] = useState<string | null>(tarefa?.bloco_id ?? blocoIdInicial)
  const [status, setStatus] = useState<StatusTarefa>(tarefa?.status ?? "pendente")

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4" onClick={onFechar}>
      <motion.div initial={{ scale: 0.95 }} animate={{ scale: 1 }} exit={{ scale: 0.95 }}
        onClick={(e) => e.stopPropagation()}
        className="bg-white dark:bg-[#1c1c1e] border border-border rounded-2xl w-full max-w-md p-5 shadow-2xl space-y-4 max-h-[85vh] overflow-y-auto">
        <div className="flex items-center justify-between">
          <h3 className="font-bold text-sm">{tarefa ? "Editar tarefa" : "Nova tarefa"}</h3>
          <button onClick={onFechar} className="p-1 rounded-lg hover:bg-muted text-muted-foreground"><X className="w-4 h-4" /></button>
        </div>
        <input value={titulo} onChange={(e) => setTitulo(e.target.value)} placeholder="Título da tarefa"
          className="w-full h-10 px-3 rounded-xl border border-border bg-background text-sm font-medium focus:outline-none focus:ring-2 focus:ring-primary/30"
          autoFocus onKeyDown={(e) => e.key === "Enter" && titulo.trim() && onSalvar({ titulo, descricao, prioridade, prazo, blocoId, status })} />
        <textarea value={descricao} onChange={(e) => setDescricao(e.target.value)} placeholder="Descrição (opcional)"
          className="w-full h-20 px-3 py-2 rounded-xl border border-border bg-background text-sm resize-none focus:outline-none focus:ring-2 focus:ring-primary/30" />
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-[10px] font-semibold text-muted-foreground uppercase mb-1 block">Prioridade</label>
            <select value={prioridade} onChange={(e) => setPrioridade(e.target.value as PrioridadeTarefa)}
              className="w-full h-9 px-2.5 rounded-lg border border-border bg-background text-xs font-medium">
              <option value="baixa">Baixa</option>
              <option value="media">Média</option>
              <option value="alta">Alta</option>
              <option value="urgente">Urgente</option>
            </select>
          </div>
          <div>
            <label className="text-[10px] font-semibold text-muted-foreground uppercase mb-1 block">Status</label>
            <select value={status} onChange={(e) => setStatus(e.target.value as StatusTarefa)}
              className="w-full h-9 px-2.5 rounded-lg border border-border bg-background text-xs font-medium">
              <option value="pendente">Pendente</option>
              <option value="iniciado">Em andamento</option>
              <option value="concluido">Concluído</option>
            </select>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-[10px] font-semibold text-muted-foreground uppercase mb-1 block">Prazo</label>
            <input type="date" value={prazo} onChange={(e) => setPrazo(e.target.value)}
              className="w-full h-9 px-2.5 rounded-lg border border-border bg-background text-xs font-medium" />
          </div>
          <div>
            <label className="text-[10px] font-semibold text-muted-foreground uppercase mb-1 block">Bloco</label>
            <select value={blocoId ?? ""} onChange={(e) => setBlocoId(e.target.value || null)}
              className="w-full h-9 px-2.5 rounded-lg border border-border bg-background text-xs font-medium">
              <option value="">Sem bloco</option>
              {blocos.map((b) => <option key={b.id} value={b.id}>{b.nome}</option>)}
            </select>
          </div>
        </div>
        <button onClick={() => titulo.trim() && onSalvar({ titulo, descricao, prioridade, prazo, blocoId, status })}
          disabled={!titulo.trim()}
          className="w-full py-2.5 rounded-xl text-white text-sm font-bold hover:opacity-90 transition-opacity bg-[#F26E1D] disabled:opacity-50">
          {tarefa ? "Salvar alterações" : "Criar tarefa"}
        </button>
      </motion.div>
    </motion.div>
  )
}
