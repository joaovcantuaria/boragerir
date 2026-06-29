"use client"

import { useState } from "react"
import { useForm } from "react-hook-form"
import { z } from "zod"
import { zodResolver } from "@hookform/resolvers/zod"
import { Plus, UserCheck, Edit, Loader2, Mail, Phone } from "lucide-react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { createClient } from "@/lib/supabase/client"
import { formatarTelefone } from "@/lib/utils"
import type { Funcionario } from "@/types"

const schemaFunc = z.object({
  nome: z.string().min(2, "Nome obrigatório"),
  cargo: z.string().min(1, "Cargo obrigatório"),
  telefone: z.string().optional(),
  email: z.string().email("E-mail inválido").optional().or(z.literal("")),
  comissao_percentual_padrao: z.string().optional(),
})
type FormFunc = z.infer<typeof schemaFunc>

export function FuncionariosClient({ empresaId, plano, funcionarios: funcInit }: {
  empresaId: string; plano: string; funcionarios: Funcionario[]
}) {
  const [funcionarios, setFuncionarios] = useState(funcInit)
  const [modalAberto, setModalAberto] = useState(false)
  const [editando, setEditando] = useState<Funcionario | null>(null)
  const [loading, setLoading] = useState(false)
  const supabase = createClient()

  const { register, handleSubmit, reset, setValue, formState: { errors } } = useForm<FormFunc>({
    resolver: zodResolver(schemaFunc),
  })

  const limites: Record<string, number | null> = { gratuito: 0, agenda: 3, basico: 3, profissional: null }
  const limite = limites[plano] ?? null

  async function abrirModalNovo() {
    if (limite === 0) { toast.error("Colaboradores disponíveis a partir do Plano Básico."); return }
    if (limite !== null && funcionarios.filter((f) => f.ativo).length >= limite) {
      toast.error(`Limite de ${limite} colaboradores no plano ${plano}.`); return
    }
    setEditando(null)
    reset()
    setModalAberto(true)
  }

  function abrirModalEditar(f: Funcionario) {
    setEditando(f)
    reset({
      nome: f.nome, cargo: f.cargo,
      telefone: f.telefone ?? "", email: f.email ?? "",
      comissao_percentual_padrao: f.comissao_percentual_padrao?.toString() ?? "",
    })
    setModalAberto(true)
  }

  async function onSubmit(data: FormFunc) {
    setLoading(true)
    const payload = {
      empresa_id: empresaId,
      nome: data.nome, cargo: data.cargo,
      telefone: data.telefone || null, email: data.email || null,
      comissao_percentual_padrao: data.comissao_percentual_padrao ? parseFloat(data.comissao_percentual_padrao) : null,
      ativo: true,
    }

    if (editando) {
      const { error } = await supabase.from("funcionarios").update(payload).eq("id", editando.id)
      if (error) { toast.error("Erro ao atualizar."); setLoading(false); return }
      setFuncionarios((prev) => prev.map((f) => f.id === editando.id ? { ...f, ...payload } : f))
      toast.success("Colaborador atualizado!")
    } else {
      const { data: novo, error } = await supabase.from("funcionarios").insert(payload).select().single()
      if (error) { toast.error("Erro ao cadastrar."); setLoading(false); return }
      setFuncionarios((prev) => [...prev, novo])
      toast.success("Colaborador cadastrado!")
    }
    setModalAberto(false)
    setLoading(false)
  }

  async function toggleAtivo(f: Funcionario) {
    const { error } = await supabase.from("funcionarios").update({ ativo: !f.ativo }).eq("id", f.id)
    if (error) { toast.error("Erro."); return }
    setFuncionarios((prev) => prev.map((x) => x.id === f.id ? { ...x, ativo: !x.ativo } : x))
    toast.success(f.ativo ? "Colaborador desativado." : "Colaborador reativado.")
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Colaboradores</h1>
          <p className="text-muted-foreground">{funcionarios.filter((f) => f.ativo).length} ativo(s)</p>
        </div>
        <Button onClick={abrirModalNovo} className="gap-2">
          <Plus className="w-4 h-4" /><span className="hidden sm:inline">Novo Colaborador</span>
        </Button>
      </div>

      {plano === "gratuito" && (
        <div className="p-3 bg-yellow-500/10 border border-yellow-500/30 rounded-lg text-sm text-yellow-600 dark:text-yellow-400">
          ⚡ Colaboradores disponíveis a partir do Plano Básico.{" "}
          <a href="/configuracoes" className="underline font-medium">Ver planos</a>
        </div>
      )}

      {funcionarios.length > 0 ? (
        <div className="space-y-2">
          {funcionarios.map((f) => (
            <Card key={f.id} className={`hover:border-primary/40 transition-colors ${!f.ativo ? "opacity-50" : ""}`}>
              <CardContent className="p-4">
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                      <span className="text-sm font-bold text-primary">{f.nome.charAt(0).toUpperCase()}</span>
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-sm">{f.nome}</span>
                        <Badge variant={f.ativo ? "secondary" : "outline"} className="text-xs">{f.cargo}</Badge>
                        {f.comissao_percentual_padrao && (
                          <Badge variant="secondary" className="text-xs">{f.comissao_percentual_padrao}% comissão</Badge>
                        )}
                      </div>
                      <div className="flex items-center gap-3 mt-0.5 text-xs text-muted-foreground">
                        {f.telefone && <span className="flex items-center gap-1"><Phone className="w-3 h-3" />{formatarTelefone(f.telefone)}</span>}
                        {f.email && <span className="flex items-center gap-1"><Mail className="w-3 h-3" />{f.email}</span>}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-1">
                    <Button variant="ghost" size="xs" onClick={() => abrirModalEditar(f)}><Edit className="w-3.5 h-3.5" /></Button>
                    <Button variant="ghost" size="xs" className="text-muted-foreground" onClick={() => toggleAtivo(f)}>
                      {f.ativo ? "Desativar" : "Reativar"}
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <div className="py-16 text-center text-muted-foreground">
          <UserCheck className="w-12 h-12 mx-auto mb-3 opacity-40" />
          <p>Nenhum colaborador cadastrado</p>
        </div>
      )}

      <Dialog open={modalAberto} onOpenChange={setModalAberto}>
        <DialogContent onInteractOutside={(e) => e.preventDefault()}>
          <DialogHeader><DialogTitle>{editando ? "Editar" : "Novo"} Colaborador</DialogTitle></DialogHeader>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Nome *</Label>
                <Input placeholder="Nome completo" {...register("nome")} />
                {errors.nome && <p className="text-destructive text-xs">{errors.nome.message}</p>}
              </div>
              <div className="space-y-2">
                <Label>Cargo *</Label>
                <Input placeholder="Ex: Cabeleireiro" {...register("cargo")} />
                {errors.cargo && <p className="text-destructive text-xs">{errors.cargo.message}</p>}
              </div>
              <div className="space-y-2">
                <Label>Telefone</Label>
                <Input placeholder="(11) 99999-9999" {...register("telefone")}
                  onChange={(e) => { const f = formatarTelefone(e.target.value); e.target.value = f; setValue("telefone", f) }} />
              </div>
              <div className="space-y-2">
                <Label>E-mail</Label>
                <Input type="email" placeholder="email@exemplo.com" {...register("email")} />
              </div>
              <div className="col-span-2 space-y-2">
                <Label>Comissão padrão (%)</Label>
                <Input type="number" step="0.01" min="0" max="100" placeholder="Ex: 30" {...register("comissao_percentual_padrao")} />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" type="button" onClick={() => setModalAberto(false)}>Cancelar</Button>
              <Button type="submit" disabled={loading}>
                {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : editando ? "Salvar" : "Cadastrar"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}
