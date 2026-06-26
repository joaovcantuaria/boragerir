"use client"

import { Plus, UserCheck, Edit, Phone, Mail } from "lucide-react"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { toast } from "sonner"
import { formatarTelefone } from "@/lib/utils"
import { funcionariosDemo } from "@/lib/demo/dados-demo"

export default function DemoFuncionarios() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Funcionários</h1>
          <p className="text-muted-foreground">{funcionariosDemo.length} funcionários ativos</p>
        </div>
        <Button className="gap-2" onClick={() => toast.info("Modo demo — crie uma conta para usar!")}>
          <Plus className="w-4 h-4" /><span className="hidden sm:inline">Novo Funcionário</span>
        </Button>
      </div>

      <div className="space-y-2">
        {funcionariosDemo.map((f) => (
          <Card key={f.id} className="hover:border-primary/40 transition-colors">
            <CardContent className="p-4">
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                    <span className="text-base font-bold text-primary">{f.nome.charAt(0)}</span>
                  </div>
                  <div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-medium">{f.nome}</span>
                      <Badge variant="secondary" className="text-xs">{f.cargo}</Badge>
                      {f.comissao_percentual_padrao && (
                        <Badge variant="outline" className="text-xs">{f.comissao_percentual_padrao}% comissão</Badge>
                      )}
                    </div>
                    <div className="flex items-center gap-3 mt-0.5 text-xs text-muted-foreground">
                      {f.telefone && <span className="flex items-center gap-1"><Phone className="w-3 h-3" />{formatarTelefone(f.telefone)}</span>}
                      {f.email && <span className="flex items-center gap-1"><Mail className="w-3 h-3" />{f.email}</span>}
                    </div>
                  </div>
                </div>
                <Button variant="ghost" size="icon" onClick={() => toast.info("Modo demo!")}>
                  <Edit className="w-4 h-4" />
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  )
}
