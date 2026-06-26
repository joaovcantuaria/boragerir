"use client"

import { Plus, FileText, Send, CheckCircle, XCircle } from "lucide-react"
import { format, addDays, isPast, differenceInDays } from "date-fns"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { toast } from "sonner"
import { formatarMoeda, coresStatus, labelsStatus } from "@/lib/utils"
import { orcamentosDemo } from "@/lib/demo/dados-demo"

export default function DemoOrcamentos() {
  function badgeStatus(orc: typeof orcamentosDemo[0]) {
    const validade = addDays(new Date(orc.created_at), orc.validade_dias)
    const diasRestantes = differenceInDays(validade, new Date())
    if (orc.status === "expirado") return <Badge className="text-xs bg-gray-500/10 text-gray-500">Expirado</Badge>
    if (orc.status === "pendente" && isPast(validade)) return <Badge className="text-xs bg-gray-500/10 text-gray-500">Expirado</Badge>
    if (orc.status === "pendente" && diasRestantes <= 3) return <Badge className="text-xs bg-orange-500/10 text-orange-500">Expira em {diasRestantes}d</Badge>
    return <Badge className={`text-xs ${coresStatus[orc.status as keyof typeof coresStatus] ?? ""}`}>{labelsStatus[orc.status] ?? orc.status}</Badge>
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Orçamentos</h1>
          <p className="text-muted-foreground">{orcamentosDemo.length} orçamentos</p>
        </div>
        <Button className="gap-2" onClick={() => toast.info("Modo demo — crie uma conta para usar!")}>
          <Plus className="w-4 h-4" /><span className="hidden sm:inline">Novo Orçamento</span>
        </Button>
      </div>

      <div className="space-y-3">
        {orcamentosDemo.map((orc) => (
          <Card key={orc.id} className="hover:border-primary/40 transition-colors">
            <CardContent className="p-4">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-medium">{orc.titulo}</span>
                    <span className="text-xs text-muted-foreground">#{String(orc.numero_orcamento).padStart(3, "0")}</span>
                    {badgeStatus(orc)}
                  </div>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {orc.clientes?.nome_completo ?? "Sem cliente"} •{format(new Date(orc.created_at), " dd/MM/yyyy")} • Validade: {orc.validade_dias} dias
                  </p>
                  <p className="text-sm font-bold text-primary mt-1">{formatarMoeda(orc.total)}</p>
                  {orc.itens_orcamento && orc.itens_orcamento.length > 0 && (
                    <div className="mt-2 flex flex-wrap gap-1">
                      {orc.itens_orcamento.map((item) => (
                        <span key={item.id} className="text-xs bg-muted px-2 py-0.5 rounded-full text-muted-foreground">
                          {item.nome_item} × {item.quantidade}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
                <div className="flex flex-col gap-1 shrink-0">
                  <Button variant="ghost" size="xs" onClick={() => toast.info("PDF disponível no sistema real!")}>🖨️ PDF</Button>
                  {orc.clientes?.telefone && (
                    <Button variant="ghost" size="xs" onClick={() => toast.info("WhatsApp disponível no sistema real!")}>
                      <Send className="w-3 h-3 mr-1" />WhatsApp
                    </Button>
                  )}
                  {orc.status === "pendente" && (
                    <Button variant="ghost" size="xs" className="text-emerald-500" onClick={() => toast.success("No sistema real, o orçamento seria aprovado!")}>
                      <CheckCircle className="w-3 h-3 mr-1" />Aprovar
                    </Button>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  )
}
