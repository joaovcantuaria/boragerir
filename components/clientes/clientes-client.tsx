"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { Plus, Search, UserPlus, Loader2, Cake, Phone, Mail, Edit, Star, User, Building2, AlertTriangle, CreditCard, CheckCircle } from "lucide-react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { Textarea } from "@/components/ui/textarea"
import { Separator } from "@/components/ui/separator"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { createClient } from "@/lib/supabase/client"
import {
  formatarCPF, formatarTelefone, validarCPF,
  eAniversarianteHoje, eAniversarianteEstaSemana, formatarData, formatarMoeda
} from "@/lib/utils"
import type { Cliente } from "@/types"

// ── Formatação de CNPJ ────────────────────────────────────────────────────────
function formatarCNPJ(v: string) {
  const d = v.replace(/\D/g, "").slice(0, 14)
  if (d.length <= 2) return d
  if (d.length <= 5) return `${d.slice(0,2)}.${d.slice(2)}`
  if (d.length <= 8) return `${d.slice(0,2)}.${d.slice(2,5)}.${d.slice(5)}`
  if (d.length <= 12) return `${d.slice(0,2)}.${d.slice(2,5)}.${d.slice(5,8)}/${d.slice(8)}`
  return `${d.slice(0,2)}.${d.slice(2,5)}.${d.slice(5,8)}/${d.slice(8,12)}-${d.slice(12)}`
}

function validarCNPJ(cnpj: string): boolean {
  const d = cnpj.replace(/\D/g, "")
  if (d.length !== 14) return false
  if (/^(\d)\1+$/.test(d)) return false
  const calc = (n: number) => {
    let s = 0, p = n - 7
    for (let i = 0; i < n; i++) { s += parseInt(d[i]) * p--; if (p < 2) p = 9 }
    const r = s % 11; return r < 2 ? 0 : 11 - r
  }
  return calc(12) === parseInt(d[12]) && calc(13) === parseInt(d[13])
}

// ── Schema condicional PF / PJ ────────────────────────────────────────────────
const schemaCliente = z.discriminatedUnion("tipo_pessoa", [
  z.object({
    tipo_pessoa: z.literal("pf"),
    nome_completo: z.string().min(2, "Nome obrigatório"),
    cpf: z.string().refine((v) => validarCPF(v), "CPF inválido"),
    telefone: z.string().min(10, "Telefone inválido"),
    email: z.string().email("E-mail inválido").optional().or(z.literal("")),
    data_nascimento: z.string().optional(),
    observacoes: z.string().optional(),
    razao_social: z.string().optional(),
    cnpj: z.string().optional(),
  }),
  z.object({
    tipo_pessoa: z.literal("pj"),
    nome_completo: z.string().min(2, "Nome do contato obrigatório"),
    razao_social: z.string().min(2, "Razão social obrigatória"),
    cnpj: z.string().refine((v) => validarCNPJ(v), "CNPJ inválido"),
    telefone: z.string().min(10, "Telefone inválido"),
    email: z.string().email("E-mail inválido").optional().or(z.literal("")),
    data_nascimento: z.string().optional(),
    observacoes: z.string().optional(),
    cpf: z.string().optional(),
  }),
])

type FormCliente = z.infer<typeof schemaCliente>

export function ClientesClient({
  empresaId,
  plano,
  clientes: clientesIniciais,
  debitos: debitosIniciais,
}: {
  empresaId: string
  plano: string
  clientes: Cliente[]
  debitos: { id: string; cliente_id: string; valor_aberto: number; status: string }[]
}) {
  const [clientes, setClientes] = useState(clientesIniciais)
  const [debitos, setDebitos] = useState(debitosIniciais)
  const [busca, setBusca] = useState("")
  const [modalAberto, setModalAberto] = useState(false)
  const [editando, setEditando] = useState<Cliente | null>(null)
  const [loading, setLoading] = useState(false)
  const [tipoPessoa, setTipoPessoa] = useState<"pf" | "pj">("pf")
  // Modal quitar débito
  const [modalQuitarAberto, setModalQuitarAberto] = useState(false)
  const [clienteQuitarId, setClienteQuitarId] = useState<string>("")
  const [debitosDoCliente, setDebitosDoCliente] = useState<{
    id: string; descricao: string | null; valor_total: number; valor_pago: number; valor_aberto: number; status: string; created_at: string
  }[]>([])
  const [selectedDebitos, setSelectedDebitos] = useState<Set<string>>(new Set())
  const [formaPagQuite, setFormaPagQuite] = useState("")
  const [loadingQuite, setLoadingQuite] = useState(false)
  const [loadingDebitosCliente, setLoadingDebitosCliente] = useState(false)
  const supabase = createClient()
  const router = useRouter()

  const { register, handleSubmit, reset, setValue, watch, formState: { errors } } = useForm<FormCliente>({
    resolver: zodResolver(schemaCliente),
    defaultValues: { tipo_pessoa: "pf" },
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
    if (plano === "gratuito" && clientes.length >= 15) {
      toast.error("Limite de 15 clientes no plano gratuito. Faça upgrade para continuar.")
      return
    }
    setTipoPessoa("pf")
    reset({ tipo_pessoa: "pf" })
    setEditando(null)
    setModalAberto(true)
  }

  function abrirModalEditar(cliente: Cliente) {
    const tipo = (cliente as any).tipo_pessoa === "pj" ? "pj" : "pf"
    setTipoPessoa(tipo)
    setEditando(cliente)
    setValue("tipo_pessoa", tipo)
    setValue("nome_completo", cliente.nome_completo)
    if (tipo === "pf") {
      setValue("cpf", formatarCPF(cliente.cpf ?? ""))
    } else {
      setValue("razao_social", (cliente as any).razao_social ?? "")
      setValue("cnpj", formatarCNPJ((cliente as any).cnpj ?? ""))
    }
    setValue("telefone", formatarTelefone(cliente.telefone))
    setValue("email", cliente.email ?? "")
    setValue("data_nascimento", cliente.data_nascimento ?? "")
    setValue("observacoes", cliente.observacoes ?? "")
    setModalAberto(true)
  }

  async function onSubmit(data: FormCliente) {
    setLoading(true)
    const isPJ = data.tipo_pessoa === "pj"
    const cpfLimpo = isPJ ? null : data.cpf?.replace(/\D/g, "") ?? null
    const cnpjLimpo = isPJ ? data.cnpj?.replace(/\D/g, "") ?? null : null

    const payload = {
      nome_completo: data.nome_completo,
      tipo_pessoa: data.tipo_pessoa,
      cpf: cpfLimpo,
      razao_social: isPJ ? data.razao_social ?? null : null,
      cnpj: cnpjLimpo,
      telefone: data.telefone,
      email: data.email || null,
      data_nascimento: data.data_nascimento || null,
      observacoes: data.observacoes || null,
    }

    if (editando) {
      const { error } = await supabase.from("clientes").update(payload).eq("id", editando.id)
      if (error) { toast.error("Erro ao atualizar cliente."); setLoading(false); return }
      setClientes((prev) => prev.map((c) => c.id === editando.id ? { ...c, ...payload } : c))
      toast.success("Cliente atualizado!")
    } else {
      const { data: novoCliente, error } = await supabase
        .from("clientes")
        .insert({ empresa_id: empresaId, ...payload, ativo: true, pontos_fidelidade: 0 })
        .select().single()

      if (error) {
        if (error.code === "23505") {
          toast.error(isPJ ? "CNPJ já cadastrado para outro cliente." : "CPF já cadastrado para outro cliente.")
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

  // ── Funções de débito ────────────────────────────────────────────────────────
  function debitosPorCliente(clienteId: string) {
    return debitos.filter((d) => d.cliente_id === clienteId)
  }

  function totalDebitoCliente(clienteId: string) {
    return debitosPorCliente(clienteId).reduce((s, d) => s + d.valor_aberto, 0)
  }

  async function abrirQuitarDebito(clienteId?: string) {
    setModalQuitarAberto(true)
    setClienteQuitarId(clienteId ?? "")
    setSelectedDebitos(new Set())
    setFormaPagQuite("")
    setDebitosDoCliente([])
    if (clienteId) await buscarDebitosCliente(clienteId)
  }

  async function buscarDebitosCliente(clienteId: string) {
    setLoadingDebitosCliente(true)
    const { data } = await supabase
      .from("debitos_clientes")
      .select("id, descricao, valor_total, valor_pago, valor_aberto, status, created_at")
      .eq("cliente_id", clienteId)
      .in("status", ["aberto", "parcial"])
      .order("created_at")
    setDebitosDoCliente(data ?? [])
    setSelectedDebitos(new Set((data ?? []).map((d) => d.id)))
    setLoadingDebitosCliente(false)
  }

  async function quitarDebitos() {
    if (!formaPagQuite) { toast.error("Selecione a forma de pagamento."); return }
    if (selectedDebitos.size === 0) { toast.error("Selecione ao menos um débito."); return }
    setLoadingQuite(true)
    for (const debitoId of selectedDebitos) {
      const debito = debitosDoCliente.find((d) => d.id === debitoId)
      if (!debito) continue
      await supabase.from("debitos_clientes").update({
        valor_pago: debito.valor_total,
        valor_aberto: 0,
        status: "pago",
        updated_at: new Date().toISOString(),
      }).eq("id", debitoId)
    }
    setDebitos((prev) => prev.filter((d) => !selectedDebitos.has(d.id)))
    toast.success(`${selectedDebitos.size} débito(s) quitado(s)!`)
    setModalQuitarAberto(false)
    setLoadingQuite(false)
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Clientes</h1>
          <p className="text-muted-foreground">{clientes.length} cliente{clientes.length !== 1 ? "s" : ""} cadastrado{clientes.length !== 1 ? "s" : ""}</p>
        </div>
        <div className="flex items-center gap-2">
          {debitos.length > 0 && (
            <Button variant="outline" onClick={() => abrirQuitarDebito()} className="gap-2 border-amber-400 text-amber-600 hover:bg-amber-50 dark:hover:bg-amber-500/10">
              <AlertTriangle className="w-4 h-4" />
              <span className="hidden sm:inline">Quitar Débitos</span>
              <span className="bg-amber-500 text-white text-xs font-black px-1.5 py-0.5 rounded-full">{debitos.length}</span>
            </Button>
          )}
          <Button onClick={abrirModalNovo} className="gap-2">
            <UserPlus className="w-4 h-4" />
            <span className="hidden sm:inline">Novo Cliente</span>
          </Button>
        </div>
      </div>

      <Tabs defaultValue="clientes">
        <TabsList>
          <TabsTrigger value="clientes">Clientes</TabsTrigger>
          <TabsTrigger value="debitos" className="gap-2">
            Débitos
            {debitos.length > 0 && <span className="bg-amber-500 text-white text-xs font-black px-1.5 py-0.5 rounded-full">{debitos.length}</span>}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="clientes" className="mt-4 space-y-4">
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
                          {(cliente as any).tipo_pessoa === "pj" && (
                            <Badge variant="outline" className="text-xs gap-1"><Building2 className="w-2.5 h-2.5" />PJ</Badge>
                          )}
                          {aniversarioHoje && <Badge variant="warning" className="text-xs">🎂 Aniversário hoje!</Badge>}
                          {aniversarioSemana && <Badge variant="info" className="text-xs">🎂 Aniversário essa semana</Badge>}
                          {cliente.pontos_fidelidade > 0 && (
                            <Badge variant="secondary" className="text-xs gap-1">
                              <Star className="w-2.5 h-2.5" />{cliente.pontos_fidelidade} pts
                            </Badge>
                          )}
                          {totalDebitoCliente(cliente.id) > 0 && (
                            <Badge className="text-xs gap-1 bg-amber-500/10 text-amber-600 border-amber-400/30 cursor-pointer hover:bg-amber-500/20"
                              onClick={(e) => { e.stopPropagation(); abrirQuitarDebito(cliente.id) }}>
                              <AlertTriangle className="w-2.5 h-2.5" />
                              Débito {formatarMoeda(totalDebitoCliente(cliente.id))}
                            </Badge>
                          )}
                        </div>
                        <div className="flex items-center gap-3 mt-0.5 text-xs text-muted-foreground">
                          {(cliente as any).tipo_pessoa === "pj"
                            ? <span>{formatarCNPJ((cliente as any).cnpj ?? "")}</span>
                            : <span>{formatarCPF(cliente.cpf ?? "")}</span>
                          }
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
        </TabsContent>

        {/* ── ABA DÉBITOS ── */}
        <TabsContent value="debitos" className="mt-4 space-y-3">
          {debitos.length === 0 ? (
            <div className="py-16 text-center">
              <CheckCircle className="w-12 h-12 mx-auto mb-3 text-emerald-500 opacity-60" />
              <p className="font-medium text-muted-foreground">Nenhum débito em aberto</p>
              <p className="text-sm text-muted-foreground mt-1">Todos os clientes estão em dia!</p>
            </div>
          ) : (
            <>
              <div className="flex items-center justify-between">
                <p className="text-sm text-muted-foreground">{debitos.length} débito(s) em aberto</p>
                <Button onClick={() => abrirQuitarDebito()} style={{ backgroundColor: "#F26E1D" }} className="gap-2 text-white hover:opacity-90">
                  <CreditCard className="w-4 h-4" />
                  Quitar débitos
                </Button>
              </div>
              {clientes
                .filter((c) => totalDebitoCliente(c.id) > 0)
                .map((c) => {
                  const total = totalDebitoCliente(c.id)
                  const qtd = debitosPorCliente(c.id).length
                  return (
                    <Card key={c.id} className="border-amber-400/30 hover:border-amber-400/60 transition-colors">
                      <CardContent className="p-4">
                        <div className="flex items-center justify-between gap-3">
                          <div className="flex items-center gap-3 min-w-0">
                            <div className="w-10 h-10 rounded-full bg-amber-500/10 flex items-center justify-center shrink-0">
                              <span className="text-sm font-bold text-amber-600">{c.nome_completo.charAt(0).toUpperCase()}</span>
                            </div>
                            <div>
                              <p className="font-semibold text-sm">{c.nome_completo}</p>
                              <p className="text-xs text-muted-foreground">{c.telefone} · {qtd} débito{qtd > 1 ? "s" : ""}</p>
                            </div>
                          </div>
                          <div className="flex items-center gap-3 shrink-0">
                            <span className="font-black text-amber-600">{formatarMoeda(total)}</span>
                            <Button size="sm" onClick={() => abrirQuitarDebito(c.id)}
                              style={{ backgroundColor: "#F26E1D" }} className="text-white text-xs hover:opacity-90">
                              Quitar
                            </Button>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  )
                })}
            </>
          )}
        </TabsContent>
      </Tabs>

      {/* Modal Quitar Débito */}
      <Dialog open={modalQuitarAberto} onOpenChange={(open) => { if (!open) setModalQuitarAberto(false) }}>
        <DialogContent onInteractOutside={(e) => e.preventDefault()} className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Quitar Débitos</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            {/* Seletor de cliente */}
            <div className="space-y-1.5">
              <Label>Cliente</Label>
              <select value={clienteQuitarId}
                onChange={async (e) => { setClienteQuitarId(e.target.value); if (e.target.value) await buscarDebitosCliente(e.target.value) }}
                className="w-full h-10 rounded-xl border border-border bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30">
                <option value="">Selecionar cliente...</option>
                {clientes.filter((c) => totalDebitoCliente(c.id) > 0).map((c) => (
                  <option key={c.id} value={c.id}>{c.nome_completo} — {formatarMoeda(totalDebitoCliente(c.id))}</option>
                ))}
              </select>
            </div>

            {/* Débitos do cliente */}
            {loadingDebitosCliente ? (
              <div className="flex justify-center py-6"><Loader2 className="w-6 h-6 animate-spin text-primary" /></div>
            ) : debitosDoCliente.length > 0 ? (
              <div className="space-y-2">
                <Label className="text-xs text-muted-foreground uppercase tracking-wide">Débitos em aberto</Label>
                {debitosDoCliente.map((d) => (
                  <label key={d.id} className="flex items-center gap-3 p-3 rounded-xl border border-border hover:bg-muted transition-colors cursor-pointer">
                    <input type="checkbox"
                      checked={selectedDebitos.has(d.id)}
                      onChange={(e) => {
                        const next = new Set(selectedDebitos)
                        e.target.checked ? next.add(d.id) : next.delete(d.id)
                        setSelectedDebitos(next)
                      }}
                      className="w-4 h-4 accent-primary rounded" />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium">{d.descricao ?? "Débito"}</p>
                      <p className="text-xs text-muted-foreground">
                        {new Date(d.created_at).toLocaleDateString("pt-BR")} · Pago: {formatarMoeda(d.valor_pago)}
                      </p>
                    </div>
                    <span className="font-black text-amber-600 shrink-0">{formatarMoeda(d.valor_aberto)}</span>
                  </label>
                ))}
                {selectedDebitos.size > 0 && (
                  <div className="flex justify-between text-sm font-bold px-1 pt-1">
                    <span>Total a quitar:</span>
                    <span className="text-primary">
                      {formatarMoeda(debitosDoCliente.filter((d) => selectedDebitos.has(d.id)).reduce((s, d) => s + d.valor_aberto, 0))}
                    </span>
                  </div>
                )}
              </div>
            ) : clienteQuitarId ? (
              <p className="text-sm text-muted-foreground text-center py-4">Nenhum débito em aberto para este cliente</p>
            ) : null}

            {/* Forma de pagamento */}
            {debitosDoCliente.length > 0 && (
              <div className="space-y-1.5">
                <Label>Forma de pagamento</Label>
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { value: "dinheiro", label: "Dinheiro" },
                    { value: "pix", label: "PIX" },
                    { value: "cartao_debito", label: "Débito" },
                    { value: "cartao_credito", label: "Crédito" },
                    { value: "pix", label: "PIX" },
                    { value: "outro", label: "Outro" },
                  ].filter((v, i, arr) => arr.findIndex((x) => x.value === v.value) === i).map((fp) => (
                    <button key={fp.value} type="button"
                      onClick={() => setFormaPagQuite(fp.value)}
                      style={formaPagQuite === fp.value ? { backgroundColor: "#F26E1D", color: "#ffffff", borderColor: "#F26E1D" } : {}}
                      className={`py-2 rounded-xl border text-xs font-bold transition-all ${
                        formaPagQuite === fp.value ? "" : "border-border text-foreground hover:border-primary/50"
                      }`}>
                      {fp.label}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setModalQuitarAberto(false)}>Cancelar</Button>
            <Button onClick={quitarDebitos} disabled={loadingQuite || selectedDebitos.size === 0 || !formaPagQuite}
              style={{ backgroundColor: "#F26E1D" }} className="text-white hover:opacity-90">
              {loadingQuite ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <CheckCircle className="w-4 h-4 mr-2" />}
              Quitar {selectedDebitos.size > 0 ? `${selectedDebitos.size} débito${selectedDebitos.size > 1 ? "s" : ""}` : ""}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Modal cadastro/edição de cliente */}
      <Dialog open={modalAberto} onOpenChange={setModalAberto}>
        <DialogContent onInteractOutside={(e) => e.preventDefault()}>
          <DialogHeader>
            <DialogTitle>{editando ? "Editar Cliente" : "Novo Cliente"}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            {/* Seletor PF / PJ */}
            {!editando && (
              <div className="grid grid-cols-2 gap-2">
                <button type="button"
                  onClick={() => { setTipoPessoa("pf"); setValue("tipo_pessoa", "pf") }}
                  className={`flex items-center justify-center gap-2 py-2.5 rounded-xl border text-sm font-semibold transition-all ${
                    tipoPessoa === "pf"
                      ? "border-primary bg-primary/5 text-primary"
                      : "border-border text-muted-foreground hover:border-primary/40"
                  }`}>
                  <User className="w-4 h-4" />Pessoa Física
                </button>
                <button type="button"
                  onClick={() => { setTipoPessoa("pj"); setValue("tipo_pessoa", "pj") }}
                  className={`flex items-center justify-center gap-2 py-2.5 rounded-xl border text-sm font-semibold transition-all ${
                    tipoPessoa === "pj"
                      ? "border-primary bg-primary/5 text-primary"
                      : "border-border text-muted-foreground hover:border-primary/40"
                  }`}>
                  <Building2 className="w-4 h-4" />Empresa (PJ)
                </button>
              </div>
            )}
            <input type="hidden" {...register("tipo_pessoa")} value={tipoPessoa} />

            {/* Campos PJ */}
            {tipoPessoa === "pj" && (
              <div className="space-y-2">
                <Label>Razão Social *</Label>
                <Input placeholder="Nome da empresa" {...register("razao_social")} />
                {"razao_social" in errors && errors.razao_social && (
                  <p className="text-destructive text-xs">{(errors as any).razao_social.message}</p>
                )}
              </div>
            )}

            <div className="space-y-2">
              <Label>{tipoPessoa === "pj" ? "Nome do contato *" : "Nome completo *"}</Label>
              <Input placeholder={tipoPessoa === "pj" ? "Nome do responsável" : "Nome do cliente"} {...register("nome_completo")} />
              {errors.nome_completo && <p className="text-destructive text-xs">{errors.nome_completo.message}</p>}
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                {tipoPessoa === "pj" ? (
                  <>
                    <Label>CNPJ *</Label>
                    <Input placeholder="00.000.000/0001-00" maxLength={18}
                      {...register("cnpj")}
                      onChange={(e) => { const f = formatarCNPJ(e.target.value); e.target.value = f; setValue("cnpj", f) }} />
                    {"cnpj" in errors && errors.cnpj && (
                      <p className="text-destructive text-xs">{(errors as any).cnpj.message}</p>
                    )}
                  </>
                ) : (
                  <>
                    <Label>CPF *</Label>
                    <Input placeholder="000.000.000-00" maxLength={14}
                      {...register("cpf")}
                      onChange={(e) => { const f = formatarCPF(e.target.value); e.target.value = f; setValue("cpf", f) }} />
                    {"cpf" in errors && errors.cpf && (
                      <p className="text-destructive text-xs">{(errors as any).cpf.message}</p>
                    )}
                  </>
                )}
              </div>
              <div className="space-y-2">
                <Label>Telefone *</Label>
                <Input placeholder="(11) 99999-9999" maxLength={15}
                  {...register("telefone")}
                  onChange={(e) => { const f = formatarTelefone(e.target.value); e.target.value = f; setValue("telefone", f) }} />
                {errors.telefone && <p className="text-destructive text-xs">{errors.telefone.message}</p>}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>E-mail</Label>
                <Input type="email" placeholder="email@exemplo.com" {...register("email")} />
              </div>
              {tipoPessoa === "pf" && (
                <div className="space-y-2">
                  <Label>Data de nascimento</Label>
                  <Input type="date" {...register("data_nascimento")} />
                </div>
              )}
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
