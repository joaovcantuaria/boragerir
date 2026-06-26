"use client"

import { useState } from "react"
import { format, parseISO, isSameDay, addDays, subDays, startOfMonth, endOfMonth, eachDayOfInterval, isToday, addMonths, subMonths } from "date-fns"
import { ptBR } from "date-fns/locale"
import { Plus, Calendar, Clock, ChevronLeft, ChevronRight, Edit } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { toast } from "sonner"
import { coresStatus, labelsStatus } from "@/lib/utils"
import { agendamentosDemo } from "@/lib/demo/dados-demo"

export default function DemoAgendamentos() {
  const [mesAtual, setMesAtual] = useState(new Date())
  const [diaSelecionado, setDiaSelecionado] = useState(new Date())

  const diasDoMes = eachDayOfInterval({ start: startOfMonth(mesAtual), end: endOfMonth(mesAtual) })

  const agsDoDia = agendamentosDemo.filter((a) => isSameDay(parseISO(a.data_hora), diaSelecionado))

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Agendamentos</h1>
          <p className="text-muted-foreground">{agendamentosDemo.length} agendamentos</p>
        </div>
        <Button className="gap-2" onClick={() => toast.info("Modo demo — crie uma conta para usar!")}>
          <Plus className="w-4 h-4" /><span className="hidden sm:inline">Novo Agendamento</span>
        </Button>
      </div>

      <Tabs defaultValue="calendario">
        <TabsList>
          <TabsTrigger value="calendario">Calendário</TabsTrigger>
          <TabsTrigger value="lista">Lista</TabsTrigger>
        </TabsList>

        <TabsContent value="calendario" className="mt-4">
          <Card>
            <CardContent className="p-4">
              {/* Header calendário */}
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
              {/* Grade */}
              <div className="grid grid-cols-7 gap-0.5">
                {Array.from({ length: diasDoMes[0].getDay() }).map((_, i) => <div key={`b-${i}`} />)}
                {diasDoMes.map((dia) => {
                  const ags = agendamentosDemo.filter((a) => isSameDay(parseISO(a.data_hora), dia))
                  const isSel = isSameDay(dia, diaSelecionado)
                  const isHoje = isToday(dia)
                  return (
                    <button key={dia.toISOString()} onClick={() => setDiaSelecionado(dia)}
                      className={`relative aspect-square flex flex-col items-center justify-center rounded-lg text-sm transition-colors
                        ${isSel ? "bg-primary text-primary-foreground" : isHoje ? "border border-primary text-primary" : "hover:bg-muted"}`}>
                      <span className="font-medium">{format(dia, "d")}</span>
                      {ags.length > 0 && (
                        <span className={`text-[10px] font-bold ${isSel ? "text-primary-foreground/80" : "text-primary"}`}>
                          {ags.length}
                        </span>
                      )}
                    </button>
                  )
                })}
              </div>
            </CardContent>
          </Card>

          <div className="mt-4">
            <h3 className="text-sm font-semibold mb-3 text-muted-foreground">
              {format(diaSelecionado, "EEEE, d 'de' MMMM", { locale: ptBR })} — {agsDoDia.length} agendamento(s)
            </h3>
            {agsDoDia.length > 0 ? (
              <div className="space-y-2">
                {agsDoDia.map((ag) => (
                  <Card key={ag.id} className="hover:border-primary/40 transition-colors">
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex items-start gap-3">
                          <Clock className="w-4 h-4 text-muted-foreground mt-0.5" />
                          <div>
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="font-medium text-sm">
                                {ag.clientes?.nome_completo ?? ag.nome_cliente_avulso ?? "Avulso"}
                              </span>
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
                        <Button variant="ghost" size="xs" onClick={() => toast.info("Modo demo!")}>
                          <Edit className="w-3.5 h-3.5" />
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : (
              <div className="py-8 text-center text-muted-foreground border border-dashed border-border rounded-xl">
                <Calendar className="w-8 h-8 mx-auto mb-2 opacity-40" />
                <p className="text-sm">Nenhum agendamento neste dia</p>
              </div>
            )}
          </div>
        </TabsContent>

        <TabsContent value="lista" className="mt-4 space-y-2">
          {agendamentosDemo.map((ag) => (
            <Card key={ag.id} className="hover:border-primary/40 transition-colors">
              <CardContent className="p-4">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-medium text-sm">
                        {ag.clientes?.nome_completo ?? ag.nome_cliente_avulso ?? "Avulso"}
                      </span>
                      <Badge className={`text-xs ${coresStatus[ag.status as keyof typeof coresStatus] ?? ""}`}>
                        {labelsStatus[ag.status] ?? ag.status}
                      </Badge>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {format(parseISO(ag.data_hora), "dd/MM HH:mm")} • {ag.produtos_servicos?.nome} • {ag.funcionarios?.nome}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </TabsContent>
      </Tabs>
    </div>
  )
}
