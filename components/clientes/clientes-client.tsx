"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { Plus, Search, UserPlus, Loader2, Cake, Phone, Mail, Edit, Star } from "lucide-react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { Textarea } from "@/components/ui/textarea"
import { Separator } from "@/components/ui/separator"
import { createClient } from "@/lib/supabase/client"
import {
  formatarCPF, formatarTelefone, validarCPF,
  eAniversarianteHoje, eAniversarianteEstaSemana, formatarData
} from "@/lib/utils"
import type { Cliente } from "@/types"

const schemaCliente = z.object({
  nome_completo: z.string().min(2, "Nome deve ter ao menos 2 caracteres"),
  cpf: z.string().refine((v) => validarCPF(v), "CPF inválido"),
  telefone: z.string().min(10, "Telefone inválido"),
  email: z.string().email("E-mail inválido").optional().or(z.literal("")),
  data_nascimento: z.string().optional(),
  observacoes: z.string().optional(),
})

type FormCliente = z.infer<typeof schemaCliente>

export function ClientesClient({
  empresaId,
  plano,
  clientes: clientesIniciais,
}: {
  empresaId: string
  plano: string
  clientes: Cliente[]
}) {
  const [clientes, setClientes] = useState(clientesIniciais)
  const [busca, setBusca] = useState("")
  const [modalAberto, setModalAberto] = useState(false)
  const [editando, setEditando] = useState<Cliente | null>(null)
  const [loading, setLoading] = useState(false)
  const supabase = createClient()
  const router = useRouter()

  const { register, handleSubmit, reset, setValue, formState: { errors } } = useForm<FormCliente>({
    resolver: zodResolver(schemaCliente),
  })

  const clientesFiltrados = clientes.filter((c) => {
    const termo = busca.toLowerCase()
    return (
      c.nome_completo.toLowerCase().includes(termo) ||
      c.cpf.includes(termo) ||
      c.telefone.includes(termo)
    )
  })

  function abrirModalNovo() {
    if (plano === "gratuito" && clientes.length >= 30) {
      toast.error("Limite de 30 clientes no plano gratuito. Faça upgrade para continuar.")
      return
    }
    reset()
    setEditando(null)
    setModalAberto(true)
  }

  function abrirModalEditar(cliente: Cliente) {
    setEditando(cliente)
    setValue("nome_completo", cliente.nome_completo)
    setValue("cpf", formatarCPF(cliente.cpf))
    setValue("telefone", formatarTelefone(cliente.telefone))
    setValue("email", cliente.email ?? "")
    setValue("data_nascimento", cliente.data_nascimento ?? "")
    setValue("observacoes", cliente.observacoes ?? "")
    setModalAberto(true)
  }

  async function onSubmit(data: FormCliente) {
    setLoading(true)
    const cpfLimpo = data.cpf.replace(/\D/g, "")

    if (editando) {
      const { error } = await supabase
        .from("clientes")
        .update({
          nome_completo: data.nome_completo,
          cpf: cpfLimpo,
          telefone: data.telefone,
          email: data.email || null,
          data_nascimento: data.data_nascimento || null,
          observacoes: data.observacoes || null,
        })
        .eq("id", editando.id)

      if (error) { toast.error("Erro ao atualizar cliente."); setLoading(false); return }
      setClientes((prev) => prev.map((c) => c.id === editando.id
        ? { ...c, ...data, cpf: cpfLimpo, email: data.email || null, data_nascimento: data.data_nascimento || null, observacoes: data.observacoes || null }
        : c
      ))
      toast.success("Cliente atualizado!")
    } else {
      const { data: novoCliente, error } = await supabase
        .from("clientes")
        .insert({
          empresa_id: empresaId,
          nome_completo: data.nome_completo,
          cpf: cpfLimpo,
          telefone: data.telefone,
          email: data.email || null,
          data_nascimento: data.data_nascimento || null,
          observacoes: data.observacoes || null,
          ativo: true,
          pontos_fidelidade: 0,
        })
        .select()
        .single()

      if (error) {
        if (error.code === "23505") {
          toast.error("CPF já cadastrado para outro cliente.")
        } else {
          toast.error("Erro ao cadastrar cliente.")
        }
        setLoading(false)
        return
      }
      setClientes((prev) => [...prev, novoCliente])
      toast.success("Cliente cadastrado!")
    }

    setModalAberto(false)
    setLoading(false)
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Clientes</h1>
          <p className="text-muted-foreground">{clientes.length} cliente{clientes.length !== 1 ? "s" : ""} cadastrado{clientes.length !== 1 ? "s" : ""}</p>
        </div>
        <Button onClick={abrirModalNovo} className="gap-2">
          <UserPlus className="w-4 h-4" />
          <span className="hidden sm:inline">Novo Cliente</span>
        </Button>
      </div>

      {/* Busca */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input
          placeholder="Buscar por nome, CPF ou telefone..."
          className="pl-9"
          value={busca}
          onChange={(e) => setBusca(e.target.value)}
        />
      </div>

      {/* Lista */}
      {clientesFiltrados.length > 0 ? (
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
                        <span className="text-sm font-bold text-primary">
                          {cliente.nome_completo.charAt(0).toUpperCase()}
                        </span>
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
                        </div>
                        <div className="flex items-center gap-3 mt-0.5 text-xs text-muted-foreground">
                          <span>{formatarCPF(cliente.cpf)}</span>
                          <span className="flex items-center gap-1"><Phone className="w-3 h-3" />{formatarTelefone(cliente.telefone)}</span>
                          {cliente.email && <span className="hidden sm:flex items-center gap-1"><Mail className="w-3 h-3" />{cliente.email}</span>}
                        </div>
                      </div>
                    </div>
                    <Button variant="ghost" size="icon" onClick={() => abrirModalEditar(cliente)}>
                      <Edit className="w-4 h-4" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )
          })}
        </div>
      ) : (
        <div className="py-16 text-center">
          <UserPlus className="w-12 h-12 mx-auto mb-3 text-muted-foreground opacity-40" />
          <p className="text-muted-foreground">
            {busca ? "Nenhum cliente encontrado" : "Nenhum cliente cadastrado"}
          </p>
          {!busca && (
            <Button variant="outline" size="sm" className="mt-3" onClick={abrirModalNovo}>
              Cadastrar primeiro cliente
            </Button>
          )}
        </div>
      )}

      {/* Modal */}
      <Dialog open={modalAberto} onOpenChange={setModalAberto}>
        <DialogContent onInteractOutside={(e) => e.preventDefault()}>
          <DialogHeader>
            <DialogTitle>{editando ? "Editar Cliente" : "Novo Cliente"}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div className="space-y-2">
              <Label>Nome completo *</Label>
              <Input placeholder="Nome do cliente" {...register("nome_completo")} />
              {errors.nome_completo && <p className="text-destructive text-xs">{errors.nome_completo.message}</p>}
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>CPF *</Label>
                <Input
                  placeholder="000.000.000-00"
                  maxLength={14}
                  {...register("cpf")}
                  onChange={(e) => {
                    const f = formatarCPF(e.target.value)
                    e.target.value = f
                    setValue("cpf", f)
                  }}
                />
                {errors.cpf && <p className="text-destructive text-xs">{errors.cpf.message}</p>}
              </div>
              <div className="space-y-2">
                <Label>Telefone *</Label>
                <Input
                  placeholder="(11) 99999-9999"
                  maxLength={15}
                  {...register("telefone")}
                  onChange={(e) => {
                    const f = formatarTelefone(e.target.value)
                    e.target.value = f
                    setValue("telefone", f)
                  }}
                />
                {errors.telefone && <p className="text-destructive text-xs">{errors.telefone.message}</p>}
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>E-mail</Label>
                <Input type="email" placeholder="email@exemplo.com" {...register("email")} />
              </div>
              <div className="space-y-2">
                <Label>Data de nascimento</Label>
                <Input type="date" {...register("data_nascimento")} />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Observações</Label>
              <Textarea placeholder="Anotações sobre o cliente..." {...register("observacoes")} />
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
