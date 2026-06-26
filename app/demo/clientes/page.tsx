"use client"

import { useState } from "react"
import { Search, UserPlus, Phone, Mail, Star, Edit } from "lucide-react"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { toast } from "sonner"
import { formatarCPF, formatarTelefone, eAniversarianteHoje, eAniversarianteEstaSemana } from "@/lib/utils"
import { clientesDemo } from "@/lib/demo/dados-demo"

export default function DemoClientes() {
  const [busca, setBusca] = useState("")

  const clientesFiltrados = clientesDemo.filter((c) => {
    const t = busca.toLowerCase()
    return c.nome_completo.toLowerCase().includes(t) || c.cpf.includes(t) || c.telefone.includes(t)
  })

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Clientes</h1>
          <p className="text-muted-foreground">{clientesDemo.length} clientes cadastrados</p>
        </div>
        <Button className="gap-2" onClick={() => toast.info("Modo demo — crie uma conta para usar!")}>
          <UserPlus className="w-4 h-4" />
          <span className="hidden sm:inline">Novo Cliente</span>
        </Button>
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input placeholder="Buscar por nome, CPF ou telefone..." className="pl-9"
          value={busca} onChange={(e) => setBusca(e.target.value)} />
      </div>

      <div className="space-y-2">
        {clientesFiltrados.map((cliente) => {
          const aniversarioHoje = cliente.data_nascimento ? eAniversarianteHoje(cliente.data_nascimento) : false
          const aniversarioSemana = !aniversarioHoje && cliente.data_nascimento ? eAniversarianteEstaSemana(cliente.data_nascimento) : false
          return (
            <Card key={cliente.id} className="hover:border-primary/50 transition-colors cursor-pointer">
              <CardContent className="p-4">
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                      <span className="text-sm font-bold text-primary">{cliente.nome_completo.charAt(0)}</span>
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-medium text-sm">{cliente.nome_completo}</span>
                        {aniversarioHoje && <Badge variant="warning" className="text-xs">🎂 Aniversário hoje!</Badge>}
                        {aniversarioSemana && <Badge variant="info" className="text-xs">🎂 Aniversário essa semana</Badge>}
                        {cliente.pontos_fidelidade > 0 && (
                          <Badge variant="secondary" className="text-xs gap-1">
                            <Star className="w-2.5 h-2.5" />{cliente.pontos_fidelidade} pts
                          </Badge>
                        )}
                        {cliente.observacoes === "Cliente VIP" && (
                          <Badge className="text-xs bg-yellow-500/10 text-yellow-500 border-yellow-500/20">⭐ VIP</Badge>
                        )}
                      </div>
                      <div className="flex items-center gap-3 mt-0.5 text-xs text-muted-foreground">
                        <span>{formatarCPF(cliente.cpf)}</span>
                        <span className="flex items-center gap-1"><Phone className="w-3 h-3" />{formatarTelefone(cliente.telefone)}</span>
                        {cliente.email && <span className="hidden sm:flex items-center gap-1"><Mail className="w-3 h-3" />{cliente.email}</span>}
                      </div>
                    </div>
                  </div>
                  <Button variant="ghost" size="icon" onClick={() => toast.info("Modo demo — crie uma conta para usar!")}>
                    <Edit className="w-4 h-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          )
        })}
      </div>
    </div>
  )
}
