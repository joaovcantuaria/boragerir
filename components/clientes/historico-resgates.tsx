"use client"

import { useState, useEffect } from "react"
import { Gift, Loader2, Calendar, Award } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { createClient } from "@/lib/supabase/client"

interface Resgate {
  id: string
  nome_recompensa: string
  pontos_usados: number
  created_at: string
  venda_id: string | null
}

interface RecompensaDisponivel {
  id: string
  nome: string
  descricao: string | null
  pontos_necessarios: number
  estoque: number | null
}

export function HistoricoResgates({
  clienteId,
  empresaId,
  pontosAtuais,
}: {
  clienteId: string
  empresaId: string
  pontosAtuais: number
}) {
  const [resgates, setResgates] = useState<Resgate[]>([])
  const [recompensas, setRecompensas] = useState<RecompensaDisponivel[]>([])
  const [loading, setLoading] = useState(true)
  const supabase = createClient()

  useEffect(() => {
    async function carregar() {
      setLoading(true)
      const [{ data: resgs }, { data: recs }] = await Promise.all([
        supabase
          .from("resgates_recompensas")
          .select("id, nome_recompensa, pontos_usados, created_at, venda_id")
          .eq("cliente_id", clienteId)
          .eq("empresa_id", empresaId)
          .order("created_at", { ascending: false })
          .limit(20),
        supabase
          .from("recompensas_fidelidade")
          .select("id, nome, descricao, pontos_necessarios, estoque")
          .eq("empresa_id", empresaId)
          .eq("ativo", true)
          .order("pontos_necessarios", { ascending: true }),
      ])
      setResgates(resgs ?? [])
      setRecompensas(recs ?? [])
      setLoading(false)
    }
    carregar()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [clienteId])

  if (loading) {
    return (
      <div className="flex items-center justify-center py-6">
        <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* Painel de brindes disponíveis */}
      {recompensas.length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <div className="flex items-center gap-2">
              <Award className="w-4 h-4 text-purple-600" />
              <CardTitle className="text-sm">Brindes disponíveis</CardTitle>
            </div>
          </CardHeader>
          <CardContent className="space-y-2">
            <div className="flex items-center gap-2 mb-3">
              <span className="text-xs text-muted-foreground">Saldo atual:</span>
              <Badge variant="secondary" className="font-bold">{pontosAtuais} pts</Badge>
            </div>
            {recompensas
              .filter((r) => r.estoque === null || r.estoque > 0)
              .map((rec) => {
                const podeResgatar = pontosAtuais >= rec.pontos_necessarios
                const faltam = rec.pontos_necessarios - pontosAtuais
                const progresso = Math.min(100, (pontosAtuais / rec.pontos_necessarios) * 100)
                return (
                  <div
                    key={rec.id}
                    className={`rounded-lg border p-3 space-y-1.5 ${
                      podeResgatar ? "border-purple-200 bg-purple-50/50 dark:bg-purple-900/10" : "border-border"
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2 min-w-0">
                        <Gift className={`w-4 h-4 shrink-0 ${podeResgatar ? "text-purple-600" : "text-muted-foreground"}`} />
                        <span className="text-sm font-medium truncate">{rec.nome}</span>
                      </div>
                      <span className="text-xs font-bold text-purple-600 shrink-0">{rec.pontos_necessarios} pts</span>
                    </div>
                    {rec.descricao && (
                      <p className="text-[10px] text-muted-foreground pl-6">{rec.descricao}</p>
                    )}
                    {/* Barra de progresso */}
                    <div className="pl-6">
                      <div className="w-full h-1.5 rounded-full bg-muted overflow-hidden">
                        <div
                          className={`h-full rounded-full transition-all ${podeResgatar ? "bg-purple-500" : "bg-purple-300"}`}
                          style={{ width: `${progresso}%` }}
                        />
                      </div>
                      <p className="text-[10px] text-muted-foreground mt-0.5">
                        {podeResgatar ? (
                          <span className="text-purple-600 font-semibold">✓ Disponível para resgate!</span>
                        ) : (
                          <span>Faltam <strong>{faltam}</strong> pontos</span>
                        )}
                      </p>
                    </div>
                  </div>
                )
              })}
          </CardContent>
        </Card>
      )}

      {/* Histórico de resgates */}
      <Card>
        <CardHeader className="pb-2">
          <div className="flex items-center gap-2">
            <Calendar className="w-4 h-4 text-muted-foreground" />
            <CardTitle className="text-sm">Histórico de resgates</CardTitle>
          </div>
        </CardHeader>
        <CardContent>
          {resgates.length === 0 ? (
            <p className="text-xs text-muted-foreground text-center py-4">
              Nenhum brinde resgatado ainda.
            </p>
          ) : (
            <div className="space-y-2">
              {resgates.map((r) => (
                <div key={r.id} className="flex items-center justify-between gap-2 p-2 rounded-md bg-muted/40">
                  <div className="flex items-center gap-2 min-w-0">
                    <Gift className="w-3.5 h-3.5 text-purple-500 shrink-0" />
                    <div className="min-w-0">
                      <p className="text-xs font-medium truncate">{r.nome_recompensa}</p>
                      <p className="text-[10px] text-muted-foreground">
                        {new Date(r.created_at).toLocaleDateString("pt-BR")}
                      </p>
                    </div>
                  </div>
                  <Badge variant="outline" className="text-[10px] shrink-0">
                    -{r.pontos_usados} pts
                  </Badge>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
