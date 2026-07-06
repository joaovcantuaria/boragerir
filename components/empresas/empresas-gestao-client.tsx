"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Building2, Plus, Loader2, Check, Trash2 } from "lucide-react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent } from "@/components/ui/card"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { createClient } from "@/lib/supabase/client"
import type { Empresa } from "@/types"

export function EmpresasGestaoClient({
  empresas: empresasIniciais,
  maxEmpresas,
  userId,
}: {
  empresas: Empresa[]
  maxEmpresas: number
  userId: string
}) {
  const [empresas, setEmpresas] = useState(empresasIniciais)
  const [modalAberto, setModalAberto] = useState(false)
  const [loading, setLoading] = useState(false)
  const [nome, setNome] = useState("")
  const [telefone, setTelefone] = useState("")
  const [areaAtuacao, setAreaAtuacao] = useState("")
  const router = useRouter()
  const supabase = createClient()

  // A primeira empresa é o "container" do plano — não conta como empresa real
  const empresaPrincipal = empresas[0]
  const empresasReais = empresas.filter((_, idx) => idx > 0)
  const podeAdicionar = empresasReais.length < maxEmpresas

  async function criarEmpresa() {
    if (!nome.trim()) { toast.error("Informe o nome da empresa"); return }
    if (!telefone.trim()) { toast.error("Informe o telefone"); return }
    if (!areaAtuacao.trim()) { toast.error("Informe a área de atuação"); return }

    if (!podeAdicionar) {
      toast.error(`Limite de ${maxEmpresas} empresa(s) atingido.`)
      return
    }

    setLoading(true)

    const { data, error } = await supabase.from("empresas").insert({
      user_id: userId,
      nome: nome.trim(),
      telefone: telefone.trim(),
      area_atuacao: areaAtuacao.trim(),
      email: empresaPrincipal.email,
      plano: empresaPrincipal.plano,
      plano_ativo: true,
    }).select().single()

    if (error) {
      toast.error("Erro ao criar empresa: " + error.message)
      setLoading(false)
      return
    }

    toast.success(`"${nome}" criada com sucesso!`)
    setEmpresas((prev) => [...prev, data])
    setNome("")
    setTelefone("")
    setAreaAtuacao("")
    setModalAberto(false)
    setLoading(false)
    router.refresh()
  }

  async function excluirEmpresa(empresa: Empresa) {
    if (!confirm(`Excluir "${empresa.nome}"? Todos os dados desta empresa serão removidos permanentemente.`)) return

    const { error } = await supabase.from("empresas").delete().eq("id", empresa.id)
    if (error) {
      toast.error("Erro ao excluir: " + error.message)
      return
    }

    setEmpresas((prev) => prev.filter((e) => e.id !== empresa.id))
    toast.success("Empresa excluída.")
    router.refresh()
  }

  function selecionarEmpresa(id: string) {
    localStorage.setItem("boragerir_empresa_selecionada", id)
    router.push("/dashboard")
    router.refresh()
  }

  return (
    <div className="space-y-6 max-w-2xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold flex items-center gap-2">
            <Building2 className="w-5 h-5 text-primary" />
            Minhas Empresas
          </h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            {empresasReais.length} de {maxEmpresas} empresa(s) cadastrada(s)
          </p>
        </div>
        {podeAdicionar && (
          <Button onClick={() => setModalAberto(true)} className="gap-2">
            <Plus className="w-4 h-4" />
            Nova Empresa
          </Button>
        )}
      </div>

      {/* Barra de progresso */}
      <div className="space-y-1.5">
        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <span>Empresas utilizadas</span>
          <span className="font-bold">{empresasReais.length}/{maxEmpresas}</span>
        </div>
        <div className="w-full h-2 rounded-full bg-muted overflow-hidden">
          <div
            className="h-full rounded-full bg-primary transition-all"
            style={{ width: `${(empresasReais.length / maxEmpresas) * 100}%` }}
          />
        </div>
        {!podeAdicionar && (
          <p className="text-xs text-amber-600 font-medium">
            Limite atingido. Para adicionar mais empresas, entre em contato com o suporte.
          </p>
        )}
      </div>

      {/* Lista de empresas reais */}
      {empresasReais.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="py-12 flex flex-col items-center gap-4 text-center">
            <Building2 className="w-12 h-12 text-muted-foreground opacity-30" />
            <div>
              <p className="font-semibold">Nenhuma empresa cadastrada</p>
              <p className="text-sm text-muted-foreground mt-1">
                Cadastre sua primeira empresa para começar a usar o sistema.
              </p>
            </div>
            <Button onClick={() => setModalAberto(true)} className="gap-2">
              <Plus className="w-4 h-4" />
              Cadastrar Empresa
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {empresasReais.map((emp) => (
            <Card key={emp.id} className="hover:border-primary/40 transition-colors">
              <CardContent className="p-4">
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-11 h-11 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                      <span className="text-base font-bold text-primary">
                        {emp.nome.charAt(0).toUpperCase()}
                      </span>
                    </div>
                    <div className="min-w-0">
                      <span className="font-semibold text-sm truncate block">{emp.nome}</span>
                      <div className="flex items-center gap-3 text-xs text-muted-foreground mt-0.5">
                        <span>{emp.area_atuacao}</span>
                        <span>{emp.telefone}</span>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => selecionarEmpresa(emp.id)}
                      className="gap-1.5 text-xs"
                    >
                      <Check className="w-3.5 h-3.5" />
                      Abrir
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => excluirEmpresa(emp)}
                      className="text-destructive hover:text-destructive hover:bg-destructive/10 p-2"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Modal nova empresa */}
      <Dialog open={modalAberto} onOpenChange={setModalAberto}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Cadastrar Nova Empresa</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Nome da empresa *</Label>
              <Input
                placeholder="Ex: Loja Centro"
                value={nome}
                onChange={(e) => setNome(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label>Telefone *</Label>
              <Input
                placeholder="(11) 99999-9999"
                value={telefone}
                onChange={(e) => setTelefone(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label>Área de atuação *</Label>
              <Input
                placeholder="Ex: Restaurante, Loja de roupas..."
                value={areaAtuacao}
                onChange={(e) => setAreaAtuacao(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setModalAberto(false)}>Cancelar</Button>
            <Button onClick={criarEmpresa} disabled={loading} className="gap-2">
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
              Criar Empresa
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
