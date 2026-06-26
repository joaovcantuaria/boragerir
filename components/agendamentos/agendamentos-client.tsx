"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { useForm } from "react-hook-form"
import { z } from "zod"
import { zodResolver } from "@hookform/resolvers/zod"
import { Plus, Calendar, Clock, User, Loader2, Edit, ChevronLeft, ChevronRight } from "lucide-react"
import { toast } from "sonner"
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameDay, parseISO, addMonths, subMonths, isToday } from "date-fns"
import { ptBR } from "date-fns/locale"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { createClient } from "@/lib/supabase/client"
import { coresStatus, labelsStatus, formatarTelefone } from "@/lib/utils"

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
  observacoes: string | null; nome_cliente_avulso: string | null; telefone_cliente_avulso: string | null;
  clientes?: { nome_completo: string; telefone: string } | null
  funcionarios?: { nome: string } | null
  produtos_servicos?: { nome: string } | null
}

export function AgendamentosClient({
  empresaId, plano, agendamentos: agInit, clientes, servicos, funcionarios
}: {
  empresaId: string; plano: string
  agendamentos: AgendamentoCompleto[]
  clientes: { id: string; nome_completo: string; telefone: string }[]
  servicos: { id: string; nome: string; duracao_minutos: number | null }[]
  funcionarios: { id: string; nome: string }[]
}) {
  const [agendamentos, setAgendamentos] = useState(agInit)
  const [mesAtual, setMesAtual] = useState(new Date())
  const [diaSelecionado, setDiaSelecionado] = useState(new Date())
  const [modalAberto, setModalAberto] = useState(false)
  const [editando, setEditando] = useState<AgendamentoCompleto | null>(null)
  const [tipoCliente, setTipoCliente] = useState<"cadastrado" | "avulso">("cadastrado")
  const [loading, setLoading] = useState(false)
  const supabase = createClient()

  const { register, handleSubmit, reset, setValue, watch, formState: { errors } } = useForm<FormAgendamento>({
    resolver: zodResolver(schemaAgendamento),
  })

  const diasDoMes = eachDayOfInterval({ start: startOfMonth(mesAtual), end: endOfMonth(mesAtual) })

  const agendamentosDoDia = agendamentos.filter((a) =>
    isSameDay(parseISO(a.data_hora), diaSelecionado)
  )

  function nomeCliente(ag: AgendamentoCompleto) {
    return ag.clientes?.nome_completo ?? ag.nome_cliente_avulso ?? "Cliente avulso"
  }

  function abrirModalNovo() {
    if (plano === "gratuito") {
      toast.error("Agendamentos requerem o plano Básico ou superior.")
      return
    }
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
      observacoes: data.observacoes || null,
    }

    if (editando) {
      const { error } = await supabase.from("agendamentos").update(payload).eq("id", editando.id)
      if (error) { toast.error("Erro ao atualizar."); setLoading(false); return }
      setAgendamentos((prev) => prev.map((a) => a.id === editando.id ? { ...a, ...payload, clientes: a.clientes, funcionarios: a.funcionarios, produtos_servicos: a.produtos_servicos } : a))
      toast.success("Agendamento atualizado!")
    } else {
      const { data: novo, error } = await supabase.from("agendamentos").insert(payload).select(
        "*, clientes(nome_completo, telefone), funcionarios(nome), produtos_servicos(nome)"
      ).single()
      if (error) { toast.error("Erro ao agendar."); setLoading(false); return }
      setAgendamentos((prev) => [...prev, novo])
      toast.success("Agendamento criado!")
    }
    setModalAberto(false)
    setLoading(false)
  }

  async function alterarStatus(id: string, status: string) {
    const { error } = await supabase.from("agendamentos").update({ status }).eq("id", id)
    if (error) { toast.error("Erro ao atualizar status."); return }
    setAgendamentos((prev) => prev.map((a) => a.id === id ? { ...a, status } : a))
    toast.success(`Status atualizado para "${labelsStatus[status]}"`)
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Agendamentos</h1>
          <p className="text-muted-foreground">{agendamentos.length} agendamento(s)</p>
        </div>
        <Button onClick={abrirModalNovo} className="gap-2">
          <Plus className="w-4 h-4" />
          <span className="hidden sm:inline">Novo Agendamento</span>
        </Button>
      </div>

      {plano === "gratuito" && (
        <div className="p-3 bg-yellow-500/10 border border-yellow-500/30 rounded-lg text-sm text-yellow-600 dark:text-yellow-400">
          ⚡ Agendamentos disponíveis a partir do Plano Básico.{" "}
          <a href="/configuracoes" className="underline font-medium">Ver planos</a>
        </div>
      )}

      <Tabs defaultValue="calendario">
        <TabsList>
          <TabsTrigger value="calendario">Calendário</TabsTrigger>
          <TabsTrigger value="lista">Lista do dia</TabsTrigger>
        </TabsList>

        <TabsContent value="calendario" className="mt-4">
          <Card>
            <CardContent className="p-4">
              {/* Cabeçalho do calendário */}
              <div className="flex items-center justify-between mb-4">
                <Button variant="ghost" size="icon" onClick={() => setMesAtual(subMonths(mesAtual, 1))}>
                  <ChevronLeft className="w-4 h-4" />
                </Button>
                <h3 className="font-semibold capitalize">
                  {format(mesAtual, "MMMM yyyy", { locale: ptBR })}
                </h3>
                <Button variant="ghost" size="icon" onClick={() => setMesAtual(addMonths(mesAtual, 1))}>
                  <ChevronRight className="w-4 h-4" />
                </Button>
              </div>

              {/* Dias da semana */}
              <div className="grid grid-cols-7 mb-2">
                {["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"].map((d) => (
                  <div key={d} className="text-center text-xs font-medium text-muted-foreground py-1">{d}</div>
                ))}
              </div>

              {/* Grade de dias */}
              <div className="grid grid-cols-7 gap-0.5">
                {/* Dias em branco antes do primeiro dia */}
                {Array.from({ length: diasDoMes[0].getDay() }).map((_, i) => (
                  <div key={`blank-${i}`} />
                ))}
                {diasDoMes.map((dia) => {
                  const agsDoDia = agendamentos.filter((a) => isSameDay(parseISO(a.data_hora), dia))
                  const isSel = isSameDay(dia, diaSelecionado)
                  const isHoje = isToday(dia)
                  return (
                    <button
                      key={dia.toISOString()}
                      onClick={() => setDiaSelecionado(dia)}
                      className={`relative aspect-square flex flex-col items-center justify-center rounded-lg text-sm transition-colors
                        ${isSel ? "bg-primary text-primary-foreground" : isHoje ? "border border-primary text-primary" : "hover:bg-muted"}
                      `}
                    >
                      <span className="font-medium">{format(dia, "d")}</span>
                      {agsDoDia.length > 0 && (
                        <span className={`text-[10px] font-bold ${isSel ? "text-primary-foreground/80" : "text-primary"}`}>
                          {agsDoDia.length}
                        </span>
                      )}
                    </button>
                  )
                })}
              </div>
            </CardContent>
          </Card>

          {/* Agendamentos do dia selecionado */}
          <div className="mt-4">
            <h3 className="text-sm font-semibold mb-3 text-muted-foreground">
              {format(diaSelecionado, "EEEE, d 'de' MMMM", { locale: ptBR })}
              {" — "}{agendamentosDoDia.length} agendamento(s)
            </h3>
            {agendamentosDoDia.length > 0 ? (
              <div className="space-y-2">
                {agendamentosDoDia.map((ag) => (
                  <AgendamentoCard key={ag.id} ag={ag} onEditar={abrirModalEditar} onAlterarStatus={alterarStatus} nomeCliente={nomeCliente(ag)} />
                ))}
              </div>
            ) : (
              <div className="py-8 text-center text-muted-foreground border border-dashed border-border rounded-xl">
                <Calendar className="w-8 h-8 mx-auto mb-2 opacity-40" />
                <p className="text-sm">Sem agendamentos neste dia</p>
                <Button variant="outline" size="sm" className="mt-2" onClick={abrirModalNovo}>Novo agendamento</Button>
              </div>
            )}
          </div>
        </TabsContent>

        <TabsContent value="lista" className="mt-4 space-y-2">
          {agendamentos.filter((a) => isSameDay(parseISO(a.data_hora), new Date())).map((ag) => (
            <AgendamentoCard key={ag.id} ag={ag} onEditar={abrirModalEditar} onAlterarStatus={alterarStatus} nomeCliente={nomeCliente(ag)} />
          ))}
        </TabsContent>
      </Tabs>

      {/* Modal */}
      <Dialog open={modalAberto} onOpenChange={setModalAberto}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editando ? "Editar Agendamento" : "Novo Agendamento"}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div className="space-y-2">
              <Label>Data e hora *</Label>
              <Input type="datetime-local" {...register("data_hora")} />
              {errors.data_hora && <p className="text-destructive text-xs">{errors.data_hora.message}</p>}
            </div>

            {/* Tipo cliente */}
            <div className="space-y-2">
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

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Serviço</Label>
                <Select onValueChange={(v) => {
                  setValue("servico_id", v)
                  const serv = servicos.find((s) => s.id === v)
                  if (serv?.duracao_minutos) setValue("duracao_minutos", serv.duracao_minutos.toString())
                }}>
                  <SelectTrigger><SelectValue placeholder="Selecionar" /></SelectTrigger>
                  <SelectContent>
                    {servicos.map((s) => <SelectItem key={s.id} value={s.id}>{s.nome}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Duração (min)</Label>
                <Input type="number" min="15" step="15" defaultValue="60" {...register("duracao_minutos")} />
              </div>
            </div>

            {funcionarios.length > 0 && (
              <div className="space-y-2">
                <Label>Funcionário</Label>
                <Select onValueChange={(v) => setValue("funcionario_id", v)}>
                  <SelectTrigger><SelectValue placeholder="Selecionar" /></SelectTrigger>
                  <SelectContent>
                    {funcionarios.map((f) => <SelectItem key={f.id} value={f.id}>{f.nome}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            )}

            <div className="space-y-2">
              <Label>Observações</Label>
              <Textarea placeholder="..." {...register("observacoes")} />
            </div>

            <DialogFooter>
              <Button variant="outline" type="button" onClick={() => setModalAberto(false)}>Cancelar</Button>
              <Button type="submit" disabled={loading}>
                {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : editando ? "Salvar" : "Agendar"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}

function AgendamentoCard({ ag, onEditar, onAlterarStatus, nomeCliente }: {
  ag: AgendamentoCompleto
  onEditar: (ag: AgendamentoCompleto) => void
  onAlterarStatus: (id: string, status: string) => void
  nomeCliente: string
}) {
  return (
    <Card className="hover:border-primary/40 transition-colors">
      <CardContent className="p-4">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-start gap-3">
            <div className="mt-0.5">
              <Clock className="w-4 h-4 text-muted-foreground" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <span className="font-medium text-sm">{nomeCliente}</span>
                <Badge className={`text-xs ${coresStatus[ag.status as keyof typeof coresStatus] ?? ""}`}>
                  {labelsStatus[ag.status] ?? ag.status}
                </Badge>
              </div>
              <p className="text-xs text-muted-foreground mt-0.5">
                {format(parseISO(ag.data_hora), "HH:mm")} • {ag.duracao_minutos}min
                {ag.produtos_servicos?.nome && ` • ${ag.produtos_servicos.nome}`}
                {ag.funcionarios?.nome && ` • ${ag.funcionarios.nome}`}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-1">
            {ag.status === "agendado" && (
              <Button variant="ghost" size="xs" onClick={() => onAlterarStatus(ag.id, "confirmado")}
                className="text-emerald-500 hover:text-emerald-600 text-xs">Confirmar</Button>
            )}
            {(ag.status === "agendado" || ag.status === "confirmado") && (
              <Button variant="ghost" size="xs" onClick={() => onAlterarStatus(ag.id, "concluido")}
                className="text-blue-500 hover:text-blue-600 text-xs">Concluir</Button>
            )}
            <Button variant="ghost" size="xs" onClick={() => onEditar(ag)}>
              <Edit className="w-3.5 h-3.5" />
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
