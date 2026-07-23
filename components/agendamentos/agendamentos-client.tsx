"use client"

import { useState } from "react"
import { useForm } from "react-hook-form"
import { z } from "zod"
import { zodResolver } from "@hookform/resolvers/zod"
import {
  Plus, Calendar, Clock, Loader2, Edit,
  ChevronLeft, ChevronRight, CheckCircle, Clock3, XCircle, Bell,
} from "lucide-react"
import { toast } from "sonner"
import {
  format, startOfMonth, endOfMonth, eachDayOfInterval,
  isSameDay, parseISO, addMonths, subMonths, isToday,
} from "date-fns"
import { ptBR } from "date-fns/locale"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { LinkAgendamento } from "@/components/agendamentos/link-agendamento"
import { AgendaConfig } from "@/components/agendamentos/agenda-config"
import { createClient } from "@/lib/supabase/client"
import { coresStatus, labelsStatus } from "@/lib/utils"

const schemaAgendamento = z.object({
  data_hora: z.string().min(1, "Data e hora obrigatórias"),
  cliente_id: z.string().optional(),
  nome_cliente_avulso: z.string().optional(),
  telefone_cliente_avulso: z.string().optional(),
  funcionario_id: z.string().optional(),
  servico_id: z.string().optional(),
  duracao_minutos: z.string().optional(),
  observacoes: z.string().optional(),
})
type FormAgendamento = z.infer<typeof schemaAgendamento>

type AgendamentoCompleto = {
  id: string; data_hora: string; status: string; duracao_minutos: number;
  observacoes: string | null; nome_cliente_avulso: string | null
  telefone_cliente_avulso: string | null; email_cliente?: string | null; origem?: string | null
  clientes?: { nome_completo: string; telefone: string } | null
  funcionarios?: { nome: string } | null
  produtos_servicos?: { nome: string } | null
}

export function AgendamentosClient({
  empresaId, plano, empresaSlug, agendamentos: agInit, clientes, servicos, funcionarios, agendaConfig,
}: {
  empresaId: string; plano: string; empresaSlug: string | null
  agendamentos: AgendamentoCompleto[]
  clientes: { id: string; nome_completo: string; telefone: string }[]
  servicos: { id: string; nome: string; duracao_minutos: number | null }[]
  funcionarios: { id: string; nome: string }[]
  agendaConfig: {
    id?: string; dias_semana: number[]; hora_inicio: string; hora_fim: string
    intervalo_minutos: number; duracao_padrao: number
    almoco_inicio: string | null; almoco_fim: string | null
  } | null
}) {
  const [agendamentos, setAgendamentos] = useState(agInit)
  const [mesAtual, setMesAtual] = useState(new Date())
  const [diaSelecionado, setDiaSelecionado] = useState(new Date())
  const [modalAberto, setModalAberto] = useState(false)
  const [editando, setEditando] = useState<AgendamentoCompleto | null>(null)
  const [tipoCliente, setTipoCliente] = useState<"cadastrado" | "avulso">("cadastrado")
  const [loading, setLoading] = useState(false)
  const supabase = createClient()

  const { register, handleSubmit, reset, setValue, formState: { errors } } = useForm<FormAgendamento>({
    resolver: zodResolver(schemaAgendamento),
  })

  const diasDoMes = eachDayOfInterval({ start: startOfMonth(mesAtual), end: endOfMonth(mesAtual) })
  const agendamentosDoDia = agendamentos.filter((a) => isSameDay(parseISO(a.data_hora), diaSelecionado))
  const solicitacoesPendentes = agendamentos.filter((a) => a.status === "solicitado")

  function nomeCliente(ag: AgendamentoCompleto) {
    return ag.clientes?.nome_completo ?? ag.nome_cliente_avulso ?? "Cliente avulso"
  }

  function abrirModalNovo() {
    if (plano === "gratuito") { toast.error("Agendamentos requerem o Plano Básico ou superior."); return }
    setEditando(null)
    reset({ data_hora: format(diaSelecionado, "yyyy-MM-dd'T'HH:mm") })
    setModalAberto(true)
  }

  function abrirModalEditar(ag: AgendamentoCompleto) {
    setEditando(ag)
    reset({
      data_hora: format(parseISO(ag.data_hora), "yyyy-MM-dd'T'HH:mm"),
      cliente_id: ag.clientes ? (clientes.find((c) => c.nome_completo === ag.clientes?.nome_completo)?.id ?? "") : "",
      nome_cliente_avulso: ag.nome_cliente_avulso ?? "",
      telefone_cliente_avulso: ag.telefone_cliente_avulso ?? "",
      duracao_minutos: ag.duracao_minutos.toString(),
      observacoes: ag.observacoes ?? "",
    })
    setTipoCliente(ag.clientes ? "cadastrado" : "avulso")
    setModalAberto(true)
  }

  async function onSubmit(data: FormAgendamento) {
    setLoading(true)
    const payload = {
      empresa_id: empresaId,
      data_hora: new Date(data.data_hora).toISOString(),
      cliente_id: tipoCliente === "cadastrado" ? (data.cliente_id || null) : null,
      nome_cliente_avulso: tipoCliente === "avulso" ? (data.nome_cliente_avulso || null) : null,
      telefone_cliente_avulso: tipoCliente === "avulso" ? (data.telefone_cliente_avulso || null) : null,
      funcionario_id: data.funcionario_id || null,
      servico_id: data.servico_id || null,
      duracao_minutos: parseInt(data.duracao_minutos || "60") || 60,
      status: "agendado" as const,
      origem: "manual" as const,
      observacoes: data.observacoes || null,
    }
    if (editando) {
      const { error } = await supabase.from("agendamentos").update(payload).eq("id", editando.id)
      if (error) { toast.error("Erro ao atualizar."); setLoading(false); return }
      setAgendamentos((prev) => prev.map((a) => a.id === editando.id ? { ...a, ...payload, clientes: a.clientes, funcionarios: a.funcionarios, produtos_servicos: a.produtos_servicos } : a))
      toast.success("Agendamento atualizado!")
    } else {
      const { data: novo, error } = await supabase.from("agendamentos").insert(payload)
        .select("*, clientes(nome_completo, telefone), funcionarios(nome), produtos_servicos(nome)").single()
      if (error) { toast.error("Erro ao agendar."); setLoading(false); return }
      setAgendamentos((prev) => [...prev, novo])
      toast.success("Agendamento criado!")
    }
    setModalAberto(false)
    setLoading(false)
  }

  async function alterarStatus(id: string, status: string) {
    // Optimistic update
    const statusAnterior = agendamentos.find((a) => a.id === id)?.status
    setAgendamentos((prev) => prev.map((a) => a.id === id ? { ...a, status } : a))
    const { error } = await supabase.from("agendamentos").update({ status }).eq("id", id)
    if (error) {
      // Reverter em caso de erro
      setAgendamentos((prev) => prev.map((a) => a.id === id ? { ...a, status: statusAnterior ?? a.status } : a))
      toast.error("Erro ao atualizar status.")
      return
    }
    toast.success(`Status: "${labelsStatus[status] ?? status}"`)
  }

  const [processando, setProcessando] = useState<Set<string>>(new Set())

  async function confirmarAgendamento(id: string, acao: "confirmar" | "espera" | "cancelar") {
    // Marcar como processando para desabilitar botões
    setProcessando((p) => new Set(p).add(id))

    // Optimistic update — remove da lista de solicitações imediatamente
    const novoStatusOtimista = acao === "confirmar" ? "confirmado" : acao === "espera" ? "espera" : "cancelado"
    setAgendamentos((prev) => prev.map((a) => a.id === id ? { ...a, status: novoStatusOtimista } : a))

    try {
      const res = await fetch("/api/agendamentos/confirmar", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ agendamento_id: id, acao }),
      })
      const data = await res.json()
      if (res.ok) {
        // Confirma com o status real retornado pela API
        setAgendamentos((prev) => prev.map((a) => a.id === id ? { ...a, status: data.status } : a))
        const msgs: Record<string, string> = {
          confirmar: "✅ Confirmado! E-mail enviado ao cliente.",
          espera: "⏳ Na lista de espera. Cliente notificado.",
          cancelar: "❌ Cancelado.",
        }
        toast.success(msgs[acao])
      } else {
        // Reverter o optimistic update em caso de erro
        setAgendamentos((prev) => prev.map((a) => a.id === id ? { ...a, status: "solicitado" } : a))
        toast.error(data.erro ?? "Erro ao processar.")
      }
    } catch {
      setAgendamentos((prev) => prev.map((a) => a.id === id ? { ...a, status: "solicitado" } : a))
      toast.error("Erro de conexão.")
    } finally {
      setProcessando((p) => { const novo = new Set(p); novo.delete(id); return novo })
    }
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-lg font-semibold text-foreground">Agendamentos</h1>
          <p className="text-xs text-muted-foreground mt-0.5">{agendamentos.length} agendamento(s)</p>
        </div>
        <Button onClick={abrirModalNovo} className="gap-2 font-bold">
          <Plus className="w-4 h-4" />
          <span className="hidden sm:inline">Novo Agendamento</span>
        </Button>
      </div>

      {/* Layout: Link compacto + Painel de solicitações */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Link compacto */}
        <LinkAgendamento empresaSlug={empresaSlug} empresaId={empresaId} plano={plano} />

        {/* Painel de solicitações online */}
        <div className={`rounded-2xl border p-4 flex flex-col ${
          solicitacoesPendentes.length > 0
            ? "border-yellow-500/30 bg-yellow-500/5"
            : "border-border bg-muted/20"
        }`}>
          <div className="flex items-center gap-2 mb-3 shrink-0">
            <Bell className={`w-4 h-4 shrink-0 ${solicitacoesPendentes.length > 0 ? "text-yellow-500" : "text-muted-foreground"}`} />
            <p className="text-sm font-bold">
              Solicitações online
            </p>
            {solicitacoesPendentes.length > 0 && (
              <span className="ml-1 bg-yellow-500 text-white text-xs font-black px-1.5 py-0.5 rounded-full">
                {solicitacoesPendentes.length}
              </span>
            )}
          </div>

          <div className="flex-1 overflow-y-auto max-h-44 space-y-2 pr-0.5">
            {solicitacoesPendentes.length > 0 ? solicitacoesPendentes.map((ag) => (
              <div key={ag.id} className="bg-card rounded-xl border border-border p-3 space-y-2">
                <div>
                  <p className="text-sm font-semibold leading-tight">
                    {ag.clientes?.nome_completo ?? ag.nome_cliente_avulso ?? "Cliente"}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {format(parseISO(ag.data_hora), "dd/MM 'às' HH:mm")}
                    {ag.produtos_servicos?.nome && ` · ${ag.produtos_servicos.nome}`}
                  </p>
                  {ag.telefone_cliente_avulso && (
                    <p className="text-xs text-muted-foreground">{ag.telefone_cliente_avulso}</p>
                  )}
                  {ag.email_cliente && (
                    <p className="text-xs text-primary">{ag.email_cliente}</p>
                  )}
                </div>
                <div className="flex gap-1.5">
                  <button onClick={() => confirmarAgendamento(ag.id, "confirmar")}
                    disabled={processando.has(ag.id)}
                    className="flex-1 flex items-center justify-center gap-1 py-1.5 rounded-lg bg-emerald-500 text-white text-xs font-bold hover:bg-emerald-600 transition-colors disabled:opacity-60">
                    {processando.has(ag.id) ? <span className="w-3 h-3 border border-white border-t-transparent rounded-full animate-spin" /> : <CheckCircle className="w-3 h-3" />}
                    Confirmar
                  </button>
                  <button onClick={() => confirmarAgendamento(ag.id, "espera")}
                    disabled={processando.has(ag.id)}
                    className="flex-1 flex items-center justify-center gap-1 py-1.5 rounded-lg bg-amber-500 text-white text-xs font-bold hover:bg-amber-600 transition-colors disabled:opacity-60">
                    <Clock3 className="w-3 h-3" />Espera
                  </button>
                  <button onClick={() => confirmarAgendamento(ag.id, "cancelar")}
                    disabled={processando.has(ag.id)}
                    className="px-2 py-1.5 rounded-lg border border-red-200 text-red-500 text-xs hover:bg-red-50 transition-colors disabled:opacity-60">
                    <XCircle className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            )) : (
              <div className="flex items-center justify-center h-full py-4 text-xs text-muted-foreground">
                Nenhuma solicitação pendente ✨
              </div>
            )}
          </div>
        </div>
      </div>

      {plano === "gratuito" && (
        <div className="p-3 bg-yellow-500/10 border border-yellow-500/30 rounded-xl text-sm text-yellow-600 dark:text-yellow-400">
          ⚡ Agendamentos disponíveis a partir do Plano Básico.{" "}
          <a href="/planos" className="underline font-medium">Ver planos</a>
        </div>
      )}

      {/* Calendário + Lista */}
      <Tabs defaultValue="calendario">
        <TabsList className="w-full">
          <TabsTrigger value="calendario" className="flex-1">Calendário</TabsTrigger>
          <TabsTrigger value="lista" className="flex-1">Lista do dia</TabsTrigger>
          <TabsTrigger value="configuracao" className="flex-1">Configuração</TabsTrigger>
        </TabsList>

        <TabsContent value="calendario" className="mt-4 space-y-4">
          {/* Calendário premium */}
          <div className="rounded-2xl border border-border bg-card overflow-hidden">
            {/* Header do mês */}
            <div className="flex items-center justify-between px-5 py-4 border-b border-border">
              <button onClick={() => setMesAtual(subMonths(mesAtual, 1))}
                className="w-8 h-8 rounded-xl flex items-center justify-center text-muted-foreground hover:bg-muted hover:text-foreground transition-all">
                <ChevronLeft className="w-4 h-4" />
              </button>
              <div className="text-center">
                <h3 className="font-black text-base capitalize">
                  {format(mesAtual, "MMMM", { locale: ptBR })}
                </h3>
                <p className="text-xs text-muted-foreground">{format(mesAtual, "yyyy")}</p>
              </div>
              <button onClick={() => setMesAtual(addMonths(mesAtual, 1))}
                className="w-8 h-8 rounded-xl flex items-center justify-center text-muted-foreground hover:bg-muted hover:text-foreground transition-all">
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>

            <div className="p-4">
              {/* Dias da semana */}
              <div className="grid grid-cols-7 mb-3">
                {["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"].map((d) => (
                  <div key={d} className="text-center text-[11px] font-bold text-muted-foreground py-1 uppercase tracking-wide">{d}</div>
                ))}
              </div>

              {/* Grade */}
              <div className="grid grid-cols-7 gap-1.5">
                {Array.from({ length: diasDoMes[0]?.getDay() ?? 0 }).map((_, i) => <div key={`b-${i}`} />)}
                {diasDoMes.map((dia) => {
                  const agsDoDia = agendamentos.filter((a) => isSameDay(parseISO(a.data_hora), dia))
                  const isSel = isSameDay(dia, diaSelecionado)
                  const isHoje = isToday(dia)
                  const temSolicitacao = agsDoDia.some((a) => a.status === "solicitado")
                  const temAgendamentos = agsDoDia.length > 0

                  return (
                    <button key={dia.toISOString()} onClick={() => setDiaSelecionado(dia)}
                      style={isSel ? { backgroundColor: "#F26E1D", color: "#ffffff" } : {}}
                      className={`relative aspect-square flex flex-col items-center justify-center rounded-xl text-sm font-semibold transition-all hover:scale-105 ${
                        isSel ? "shadow-md"
                        : isHoje ? "border-2 border-[#F26E1D] text-[#F26E1D]"
                        : temAgendamentos ? "bg-primary/5 text-foreground"
                        : "hover:bg-muted text-foreground"
                      }`}
                    >
                      <span className="text-sm font-bold">{format(dia, "d")}</span>
                      {temAgendamentos && (
                        <div className="flex gap-0.5 mt-0.5">
                          {Array.from({ length: Math.min(agsDoDia.length, 3) }).map((_, i) => (
                            <div key={i} className={`w-1 h-1 rounded-full ${
                              isSel ? "bg-white/70"
                              : temSolicitacao ? "bg-yellow-500"
                              : "bg-[#F26E1D]"
                            }`} />
                          ))}
                        </div>
                      )}
                    </button>
                  )
                })}
              </div>
            </div>

            {/* Legenda */}
            <div className="px-5 py-3 border-t border-border flex items-center gap-5 bg-muted/30">
              <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                <div className="w-2 h-2 rounded-full bg-[#F26E1D]" />
                <span>Agendamentos</span>
              </div>
              <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                <div className="w-2 h-2 rounded-full bg-yellow-500" />
                <span>Solicitações</span>
              </div>
              <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                <div className="w-4 h-4 rounded-lg border-2 border-[#F26E1D] flex items-center justify-center text-[10px] text-[#F26E1D] font-bold leading-none">H</div>
                <span>Hoje</span>
              </div>
            </div>
          </div>

          {/* Dia selecionado */}
          <div className="rounded-2xl border border-border bg-card overflow-hidden">
            {/* Header do dia */}
            <div className="flex items-center justify-between px-5 py-4 border-b border-border">
              <div>
                <p className="font-black text-base capitalize">
                  {format(diaSelecionado, "EEEE", { locale: ptBR })}
                </p>
                <p className="text-sm text-muted-foreground">
                  {format(diaSelecionado, "d 'de' MMMM 'de' yyyy", { locale: ptBR })}
                </p>
              </div>
              <div className="flex items-center gap-2">
                {agendamentosDoDia.length > 0 && (
                  <span className="text-xs font-bold bg-primary/10 text-primary px-2.5 py-1 rounded-full">
                    {agendamentosDoDia.length} agendamento{agendamentosDoDia.length > 1 ? "s" : ""}
                  </span>
                )}
                <button onClick={abrirModalNovo}
                  style={{ backgroundColor: "#F26E1D" }}
                  className="flex items-center gap-1.5 text-white text-xs font-bold px-3 py-2 rounded-xl hover:opacity-90 transition-opacity">
                  <Plus className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">Agendar</span>
                </button>
              </div>
            </div>

            {/* Lista do dia */}
            <div className="p-4">
              {agendamentosDoDia.length > 0 ? (
                <div className="space-y-2">
                  {agendamentosDoDia
                    .sort((a, b) => new Date(a.data_hora).getTime() - new Date(b.data_hora).getTime())
                    .map((ag) => (
                      <AgendamentoCard key={ag.id} ag={ag}
                        onEditar={abrirModalEditar}
                        onAlterarStatus={alterarStatus}
                        onConfirmar={confirmarAgendamento}
                        nomeCliente={nomeCliente(ag)} />
                    ))}
                </div>
              ) : (
                <div className="py-12 text-center">
                  <div className="w-16 h-16 rounded-2xl bg-muted flex items-center justify-center mx-auto mb-3">
                    <Calendar className="w-7 h-7 text-muted-foreground opacity-50" />
                  </div>
                  <p className="text-sm font-medium text-muted-foreground">Nenhum agendamento neste dia</p>
                  <p className="text-xs text-muted-foreground/60 mt-1">Clique em "Agendar" para adicionar</p>
                </div>
              )}
            </div>
          </div>
        </TabsContent>

        <TabsContent value="lista" className="mt-4 space-y-2">
          {agendamentos
            .filter((a) => isSameDay(parseISO(a.data_hora), new Date()))
            .sort((a, b) => new Date(a.data_hora).getTime() - new Date(b.data_hora).getTime())
            .map((ag) => (
              <AgendamentoCard key={ag.id} ag={ag}
                onEditar={abrirModalEditar}
                onAlterarStatus={alterarStatus}
                onConfirmar={confirmarAgendamento}
                nomeCliente={nomeCliente(ag)} />
            ))}
        </TabsContent>

        <TabsContent value="configuracao" className="mt-4">
          <AgendaConfig empresaId={empresaId} config={agendaConfig} />
        </TabsContent>
      </Tabs>

      {/* Modal novo/editar agendamento */}
      <Dialog open={modalAberto} onOpenChange={(open) => { if (!open) { setModalAberto(false) } }}>
        <DialogContent onInteractOutside={(e) => e.preventDefault()}>
          <DialogHeader>
            <DialogTitle>{editando ? "Editar Agendamento" : "Novo Agendamento"}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div className="space-y-1.5">
              <Label>Data e hora *</Label>
              <Input type="datetime-local" {...register("data_hora")} />
              {errors.data_hora && <p className="text-destructive text-xs">{errors.data_hora.message}</p>}
            </div>

            <div className="space-y-1.5">
              <Label>Cliente</Label>
              <div className="flex gap-2 mb-2">
                <Button type="button" size="sm" variant={tipoCliente === "cadastrado" ? "default" : "outline"}
                  onClick={() => setTipoCliente("cadastrado")}>Cadastrado</Button>
                <Button type="button" size="sm" variant={tipoCliente === "avulso" ? "default" : "outline"}
                  onClick={() => setTipoCliente("avulso")}>Avulso</Button>
              </div>
              {tipoCliente === "cadastrado" ? (
                <Select onValueChange={(v) => setValue("cliente_id", v)}>
                  <SelectTrigger><SelectValue placeholder="Selecionar cliente" /></SelectTrigger>
                  <SelectContent>
                    {clientes.map((c) => <SelectItem key={c.id} value={c.id}>{c.nome_completo}</SelectItem>)}
                  </SelectContent>
                </Select>
              ) : (
                <div className="space-y-2">
                  <Input placeholder="Nome do cliente" {...register("nome_cliente_avulso")} />
                  <Input placeholder="Telefone" {...register("telefone_cliente_avulso")} />
                </div>
              )}
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Serviço</Label>
                <Select onValueChange={(v) => {
                  setValue("servico_id", v)
                  const s = servicos.find((s) => s.id === v)
                  if (s?.duracao_minutos) setValue("duracao_minutos", s.duracao_minutos.toString())
                }}>
                  <SelectTrigger><SelectValue placeholder="Selecionar" /></SelectTrigger>
                  <SelectContent>
                    {servicos.map((s) => <SelectItem key={s.id} value={s.id}>{s.nome}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Duração (min)</Label>
                <Input type="number" min="15" step="15" defaultValue="60" {...register("duracao_minutos")} />
              </div>
            </div>

            {funcionarios.length > 0 && (
              <div className="space-y-1.5">
                <Label>Colaborador</Label>
                <Select onValueChange={(v) => setValue("funcionario_id", v)}>
                  <SelectTrigger><SelectValue placeholder="Selecionar" /></SelectTrigger>
                  <SelectContent>
                    {funcionarios.map((f) => <SelectItem key={f.id} value={f.id}>{f.nome}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            )}

            <div className="space-y-1.5">
              <Label>Observações</Label>
              <Textarea placeholder="..." {...register("observacoes")} />
            </div>

            <DialogFooter>
              <Button variant="outline" type="button" onClick={() => setModalAberto(false)}>Cancelar</Button>
              <Button type="submit" disabled={loading} className="font-bold">
                {loading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
                {editando ? "Salvar" : "Agendar"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}

function AgendamentoCard({ ag, onEditar, onAlterarStatus, onConfirmar, nomeCliente }: {
  ag: AgendamentoCompleto
  onEditar: (ag: AgendamentoCompleto) => void
  onAlterarStatus: (id: string, status: string) => void
  onConfirmar: (id: string, acao: "confirmar" | "espera" | "cancelar") => void
  nomeCliente: string
}) {
  const isSolicitacao = ag.status === "solicitado"

  return (
    <Card className={`transition-all hover:shadow-sm ${isSolicitacao ? "border-yellow-500/30 bg-yellow-500/5" : "hover:border-primary/30"}`}>
      <CardContent className="p-4">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-start gap-3 min-w-0">
            <Clock className={`w-4 h-4 mt-0.5 shrink-0 ${isSolicitacao ? "text-yellow-500" : "text-muted-foreground"}`} />
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="font-semibold text-sm">{nomeCliente}</span>
                {ag.origem === "online" && !isSolicitacao && (
                  <span className="text-[10px] bg-blue-500/10 text-blue-600 px-1.5 py-0.5 rounded-full font-semibold">online</span>
                )}
                <Badge className={`text-xs ${coresStatus[ag.status as keyof typeof coresStatus] ?? ""}`}>
                  {labelsStatus[ag.status] ?? ag.status}
                </Badge>
              </div>
              <p className="text-xs text-muted-foreground mt-0.5">
                {format(parseISO(ag.data_hora), "HH:mm")}
                {ag.duracao_minutos > 0 && ` • ${ag.duracao_minutos}min`}
                {ag.produtos_servicos?.nome && ` • ${ag.produtos_servicos.nome}`}
                {ag.funcionarios?.nome && ` • ${ag.funcionarios.nome}`}
              </p>
              {ag.email_cliente && isSolicitacao && (
                <p className="text-[10px] text-primary mt-0.5">{ag.email_cliente}</p>
              )}
            </div>
          </div>

          <div className="flex items-center gap-1 shrink-0">
            {/* Ações para solicitações */}
            {isSolicitacao && (
              <>
                <button onClick={() => onConfirmar(ag.id, "confirmar")}
                  className="p-1.5 rounded-lg bg-emerald-500/10 text-emerald-600 hover:bg-emerald-500 hover:text-white transition-all text-xs font-bold"
                  title="Confirmar">
                  <CheckCircle className="w-3.5 h-3.5" />
                </button>
                <button onClick={() => onConfirmar(ag.id, "espera")}
                  className="p-1.5 rounded-lg bg-amber-500/10 text-amber-600 hover:bg-amber-500 hover:text-white transition-all"
                  title="Lista de espera">
                  <Clock3 className="w-3.5 h-3.5" />
                </button>
              </>
            )}

            {/* Ações normais */}
            {ag.status === "agendado" && (
              <Button variant="ghost" size="xs" onClick={() => onAlterarStatus(ag.id, "confirmado")}
                className="text-emerald-600 hover:text-emerald-700 text-xs">Confirmar</Button>
            )}
            {(ag.status === "agendado" || ag.status === "confirmado") && (
              <Button variant="ghost" size="xs" onClick={() => onAlterarStatus(ag.id, "concluido")}
                className="text-blue-600 hover:text-blue-700 text-xs">Concluir</Button>
            )}
            <Button variant="ghost" size="icon" className="w-7 h-7" onClick={() => onEditar(ag)}>
              <Edit className="w-3.5 h-3.5" />
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
