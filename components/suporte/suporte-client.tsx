"use client"

import { useState } from "react"
import { useForm } from "react-hook-form"
import { z } from "zod"
import { zodResolver } from "@hookform/resolvers/zod"
import { HeadphonesIcon, Plus, MessageSquare, Clock, CheckCircle, Loader2, ChevronDown, ChevronUp } from "lucide-react"
import { toast } from "sonner"
import { format, parseISO } from "date-fns"
import { ptBR } from "date-fns/locale"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { createClient } from "@/lib/supabase/client"

const schema = z.object({
  assunto: z.string().min(5, "Descreva o assunto em pelo menos 5 caracteres"),
  mensagem: z.string().min(20, "Detalhe o problema em pelo menos 20 caracteres"),
  prioridade: z.enum(["baixa", "normal", "alta", "urgente"]),
})
type FormData = z.infer<typeof schema>

interface Ticket {
  id: string; assunto: string; mensagem: string; status: string; prioridade: string
  resposta_admin: string | null; respondido_em: string | null; created_at: string
}

const corStatus: Record<string, string> = {
  aberto: "bg-yellow-500/10 text-yellow-600 border-yellow-500/20",
  em_andamento: "bg-blue-500/10 text-blue-600 border-blue-500/20",
  resolvido: "bg-emerald-500/10 text-emerald-600 border-emerald-500/20",
  fechado: "bg-gray-500/10 text-gray-500 border-gray-500/20",
}

const labelStatus: Record<string, string> = {
  aberto: "Aguardando", em_andamento: "Em andamento",
  resolvido: "Resolvido", fechado: "Fechado",
}

const corPrioridade: Record<string, string> = {
  baixa: "text-gray-500", normal: "text-blue-500",
  alta: "text-orange-500", urgente: "text-red-500",
}

export function SuporteClient({ empresaId, tickets: init }: {
  empresaId: string
  tickets: Ticket[]
}) {
  const [tickets, setTickets] = useState(init)
  const [modalAberto, setModalAberto] = useState(false)
  const [expandido, setExpandido] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const supabase = createClient()

  const { register, handleSubmit, reset, setValue, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: { prioridade: "normal" },
  })

  async function onSubmit(data: FormData) {
    setLoading(true)
    const { data: ticket, error } = await supabase
      .from("tickets_suporte")
      .insert({
        empresa_id: empresaId,
        assunto: data.assunto,
        mensagem: data.mensagem,
        prioridade: data.prioridade,
        status: "aberto",
      })
      .select()
      .single()

    if (error) { toast.error("Erro ao abrir ticket."); setLoading(false); return }

    setTickets((prev) => [ticket, ...prev])
    setModalAberto(false)
    reset()
    toast.success("Ticket aberto! Nossa equipe responderá em breve. 🎫")
    setLoading(false)
  }

  const abertos = tickets.filter((t) => t.status === "aberto" || t.status === "em_andamento").length

  return (
    <div className="space-y-6 max-w-3xl">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-black">Suporte</h1>
          <p className="text-muted-foreground text-sm">
            {abertos > 0 ? `${abertos} ticket(s) em aberto` : "Nenhum ticket em aberto"}
          </p>
        </div>
        <Button onClick={() => setModalAberto(true)} className="gap-2 font-bold">
          <Plus className="w-4 h-4" />
          Abrir ticket
        </Button>
      </div>

      {/* Card informativo */}
      <Card>
        <CardContent className="p-5">
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center shrink-0">
              <HeadphonesIcon className="w-6 h-6 text-primary" />
            </div>
            <div>
              <h3 className="font-bold text-base">Precisa de ajuda?</h3>
              <p className="text-sm text-muted-foreground mt-1">
                Nossa equipe de suporte responde em até 24 horas nos dias úteis.
                Para dúvidas rápidas, use a <strong>Mel</strong> — nossa assistente IA disponível 24h
                (botão 🌟 no canto da tela).
              </p>
              <div className="flex items-center gap-4 mt-3 text-xs text-muted-foreground">
                <span className="flex items-center gap-1.5">
                  <div className="w-2 h-2 rounded-full bg-emerald-500" />
                  Suporte por ticket — seg a sex, 9h às 18h
                </span>
                <span className="flex items-center gap-1.5">
                  <div className="w-2 h-2 rounded-full bg-primary animate-pulse" />
                  IA disponível 24/7
                </span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Modal novo ticket */}
      {modalAberto && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-zinc-900 border border-border rounded-2xl p-6 w-full max-w-lg shadow-2xl space-y-4">
            <h2 className="text-lg font-black">Abrir ticket de suporte</h2>
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
              <div className="space-y-1.5">
                <Label>Assunto *</Label>
                <Input placeholder="Descreva brevemente o problema" {...register("assunto")} />
                {errors.assunto && <p className="text-destructive text-xs">{errors.assunto.message}</p>}
              </div>
              <div className="space-y-1.5">
                <Label>Prioridade</Label>
                <Select defaultValue="normal" onValueChange={(v) => setValue("prioridade", v as FormData["prioridade"])}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="baixa">🟢 Baixa — dúvida geral</SelectItem>
                    <SelectItem value="normal">🔵 Normal — problema não urgente</SelectItem>
                    <SelectItem value="alta">🟠 Alta — impacta o trabalho</SelectItem>
                    <SelectItem value="urgente">🔴 Urgente — sistema parado</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Descrição detalhada *</Label>
                <Textarea
                  placeholder="Descreva o problema com detalhes: o que aconteceu, quando, qual tela estava usando..."
                  rows={4}
                  {...register("mensagem")}
                />
                {errors.mensagem && <p className="text-destructive text-xs">{errors.mensagem.message}</p>}
              </div>
              <div className="flex gap-3 pt-1">
                <Button type="button" variant="outline" className="flex-1" onClick={() => { setModalAberto(false); reset() }}>
                  Cancelar
                </Button>
                <Button type="submit" disabled={loading} className="flex-1 font-bold">
                  {loading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
                  Enviar ticket
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Lista de tickets */}
      {tickets.length > 0 ? (
        <div className="space-y-3">
          {tickets.map((ticket) => (
            <Card key={ticket.id} className="overflow-hidden">
              <button
                className="w-full text-left p-4 hover:bg-muted/40 transition-colors"
                onClick={() => setExpandido(expandido === ticket.id ? null : ticket.id)}
              >
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-3 min-w-0">
                    <MessageSquare className={`w-4 h-4 shrink-0 ${corPrioridade[ticket.prioridade] ?? "text-muted-foreground"}`} />
                    <div className="min-w-0">
                      <p className="font-semibold text-sm truncate">{ticket.assunto}</p>
                      <p className="text-xs text-muted-foreground">
                        {format(parseISO(ticket.created_at), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <Badge className={`text-xs ${corStatus[ticket.status] ?? ""}`}>
                      {labelStatus[ticket.status] ?? ticket.status}
                    </Badge>
                    {expandido === ticket.id
                      ? <ChevronUp className="w-4 h-4 text-muted-foreground" />
                      : <ChevronDown className="w-4 h-4 text-muted-foreground" />
                    }
                  </div>
                </div>
              </button>

              {expandido === ticket.id && (
                <div className="border-t border-border px-4 py-4 space-y-4">
                  {/* Mensagem original */}
                  <div className="bg-muted/40 rounded-xl p-3">
                    <p className="text-xs font-semibold text-muted-foreground mb-1">Sua mensagem:</p>
                    <p className="text-sm">{ticket.mensagem}</p>
                  </div>

                  {/* Resposta do suporte */}
                  {ticket.resposta_admin ? (
                    <div className="bg-primary/5 border border-primary/20 rounded-xl p-3">
                      <div className="flex items-center gap-2 mb-1">
                        <CheckCircle className="w-3.5 h-3.5 text-primary" />
                        <p className="text-xs font-semibold text-primary">
                          Resposta do suporte
                          {ticket.respondido_em && (
                            <span className="font-normal text-muted-foreground ml-2">
                              — {format(parseISO(ticket.respondido_em), "dd/MM HH:mm")}
                            </span>
                          )}
                        </p>
                      </div>
                      <p className="text-sm">{ticket.resposta_admin}</p>
                    </div>
                  ) : (
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <Clock className="w-3.5 h-3.5" />
                      <span>Aguardando resposta da nossa equipe...</span>
                    </div>
                  )}
                </div>
              )}
            </Card>
          ))}
        </div>
      ) : (
        <div className="py-16 text-center text-muted-foreground">
          <HeadphonesIcon className="w-12 h-12 mx-auto mb-3 opacity-30" />
          <p className="font-semibold">Nenhum ticket aberto</p>
          <p className="text-sm mt-1">Tudo funcionando? 😊 Se precisar de ajuda, abra um ticket.</p>
        </div>
      )}
    </div>
  )
}
