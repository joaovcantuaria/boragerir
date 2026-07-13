"use client"

import { useState } from "react"
import { useForm } from "react-hook-form"
import { z } from "zod"
import { zodResolver } from "@hookform/resolvers/zod"
import { Plus, UserCheck, Edit, Loader2, Mail, Phone, Shield, Key, Eye, EyeOff } from "lucide-react"
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
import { PinProtected } from "@/components/ui/pin-protected"
import { PinModal } from "@/components/ui/pin-modal"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Switch } from "@/components/ui/switch"

const schemaFunc = z.object({
  nome: z.string().min(2, "Nome obrigatório"),
  cargo: z.string().min(1, "Cargo obrigatório"),
  telefone: z.string().optional(),
  email: z.string().email("E-mail inválido").optional().or(z.literal("")),
  comissao_percentual_padrao: z.string().optional(),
})
type FormFunc = z.infer<typeof schemaFunc>

export function FuncionariosClient({ empresaId, plano, funcionarios: funcInit, pinGerente, restricoesAcesso }: {
  empresaId: string; plano: string; funcionarios: Funcionario[]
  pinGerente?: string | null
  restricoesAcesso?: { areas_protegidas?: string[]; limite_desconto_sem_pin?: number } | null
}) {
  const [funcionarios, setFuncionarios] = useState(funcInit)
  const [modalAberto, setModalAberto] = useState(false)
  const [editando, setEditando] = useState<Funcionario | null>(null)
  const [loading, setLoading] = useState(false)
  const supabase = createClient()

  // ── PIN Protection ──
  const [pinModalOpen, setPinModalOpen] = useState(false)
  const [pinAcaoPendente, setPinAcaoPendente] = useState<(() => void) | null>(null)
  const areasProtegidas = restricoesAcesso?.areas_protegidas || []
  const pinConf = !!pinGerente

  function executarComPin(restricaoId: string, acao: () => void) {
    if (pinConf && areasProtegidas.includes(restricaoId)) {
      const chave = `pin_acao_${empresaId}_${restricaoId}`
      if (sessionStorage.getItem(chave) === "true") { acao(); return }
      setPinAcaoPendente(() => () => { sessionStorage.setItem(chave, "true"); acao() })
      setPinModalOpen(true)
    } else { acao() }
  }

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

  // ── Login Local / Configurar Acesso ──
  const [acessoModalAberto, setAcessoModalAberto] = useState(false)
  const [acessoFuncionario, setAcessoFuncionario] = useState<Funcionario | null>(null)
  const [acessoUsuario, setAcessoUsuario] = useState("")
  const [acessoSenha, setAcessoSenha] = useState("")
  const [acessoMostrarSenha, setAcessoMostrarSenha] = useState(false)
  const [acessoPerfil, setAcessoPerfil] = useState<"admin" | "gerente" | "colaborador">("colaborador")
  const [acessoPermissoes, setAcessoPermissoes] = useState<Record<string, boolean | number>>({})
  const [acessoLoading, setAcessoLoading] = useState(false)

  const PERMISSOES_DISPONIVEIS = [
    { id: "caixa", label: "Caixa", desc: "Acessar módulo de caixa" },
    { id: "caixa_abrir", label: "Abrir caixa", desc: "Abrir um novo caixa" },
    { id: "caixa_fechar", label: "Fechar caixa", desc: "Fechar caixa aberto" },
    { id: "caixa_sangria", label: "Sangria", desc: "Retirar dinheiro do caixa" },
    { id: "caixa_suprimento", label: "Suprimento", desc: "Adicionar dinheiro ao caixa" },
    { id: "caixa_despesa", label: "Despesa", desc: "Registrar despesa no caixa" },
    { id: "venda", label: "Nova Venda", desc: "Realizar vendas" },
    { id: "venda_desconto", label: "Dar desconto", desc: "Aplicar desconto nas vendas" },
    { id: "clientes", label: "Clientes", desc: "Visualizar clientes" },
    { id: "clientes_editar", label: "Editar clientes", desc: "Alterar dados de clientes" },
    { id: "clientes_excluir", label: "Excluir clientes", desc: "Remover clientes" },
    { id: "produtos", label: "Produtos", desc: "Visualizar produtos/serviços" },
    { id: "produtos_editar", label: "Editar produtos", desc: "Alterar preços e dados" },
    { id: "produtos_excluir", label: "Excluir produtos", desc: "Remover produtos/serviços" },
    { id: "agendamentos", label: "Agendamentos", desc: "Gerenciar agenda" },
    { id: "financeiro", label: "Financeiro", desc: "Ver relatórios financeiros" },
    { id: "configuracoes", label: "Configurações", desc: "Acessar configurações do sistema" },
    { id: "funcionarios", label: "Funcionários", desc: "Gerenciar colaboradores" },
  ]

  function abrirModalAcesso(f: Funcionario) {
    setAcessoFuncionario(f)
    setAcessoUsuario((f as any).usuario || "")
    setAcessoSenha("")
    setAcessoPerfil(((f as any).perfil as "admin" | "gerente" | "colaborador") || "colaborador")
    setAcessoPermissoes((f as any).permissoes || {})
    setAcessoMostrarSenha(false)
    setAcessoModalAberto(true)
  }

  function togglePermissao(id: string) {
    setAcessoPermissoes((prev) => ({ ...prev, [id]: !prev[id] }))
  }

  async function salvarAcesso() {
    if (!acessoFuncionario) return
    if (!acessoUsuario || acessoUsuario.length < 3) {
      toast.error("Usuário deve ter no mínimo 3 caracteres")
      return
    }
    // Se é novo acesso (não tem usuario salvo), senha é obrigatória
    const jaTemLogin = !!(acessoFuncionario as any).usuario
    if (!jaTemLogin && (!acessoSenha || acessoSenha.length < 4)) {
      toast.error("Senha deve ter no mínimo 4 caracteres")
      return
    }
    if (acessoSenha && acessoSenha.length < 4) {
      toast.error("Senha deve ter no mínimo 4 caracteres")
      return
    }

    setAcessoLoading(true)

    const endpoint = jaTemLogin ? "/api/colaboradores/cadastrar" : "/api/colaboradores/cadastrar"
    const method = jaTemLogin ? "PUT" : "POST"

    const body: Record<string, unknown> = {
      empresa_id: empresaId,
      funcionario_id: acessoFuncionario.id,
      usuario: acessoUsuario,
      perfil: acessoPerfil,
      permissoes: acessoPermissoes,
    }
    if (acessoSenha) body.senha = acessoSenha

    try {
      const res = await fetch(endpoint, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      })
      const data = await res.json()

      if (!res.ok) {
        toast.error(data.erro || "Erro ao salvar acesso")
        setAcessoLoading(false)
        return
      }

      // Atualizar state local
      setFuncionarios((prev) => prev.map((f) =>
        f.id === acessoFuncionario.id
          ? { ...f, usuario: acessoUsuario, perfil: acessoPerfil, permissoes: acessoPermissoes } as any
          : f
      ))
      toast.success("Acesso configurado com sucesso!")
      setAcessoModalAberto(false)
    } catch {
      toast.error("Erro de conexão")
    } finally {
      setAcessoLoading(false)
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Colaboradores</h1>
          <p className="text-muted-foreground">{funcionarios.filter((f) => f.ativo).length} ativo(s)</p>
        </div>
        <Button onClick={() => executarComPin("funcionarios_cadastrar", abrirModalNovo)} className="gap-2">
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
                        {(f as any).usuario && (
                          <Badge variant="secondary" className="text-xs bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400">
                            <Shield className="w-2.5 h-2.5 mr-0.5" />
                            {(f as any).perfil === "gerente" ? "Gerente" : "Login"}
                          </Badge>
                        )}
                      </div>
                      <div className="flex items-center gap-3 mt-0.5 text-xs text-muted-foreground">
                        {f.telefone && <span className="flex items-center gap-1"><Phone className="w-3 h-3" />{formatarTelefone(f.telefone)}</span>}
                        {f.email && <span className="flex items-center gap-1"><Mail className="w-3 h-3" />{f.email}</span>}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-1">
                    <Button variant="ghost" size="xs" onClick={() => executarComPin("funcionarios_editar", () => abrirModalAcesso(f))} title="Configurar acesso">
                      <Key className="w-3.5 h-3.5" />
                    </Button>
                    <Button variant="ghost" size="xs" onClick={() => executarComPin("funcionarios_editar", () => abrirModalEditar(f))}><Edit className="w-3.5 h-3.5" /></Button>
                    <Button variant="ghost" size="xs" className="text-muted-foreground" onClick={() => executarComPin("funcionarios_excluir", () => toggleAtivo(f))}>
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

      <PinModal aberto={pinModalOpen} onClose={() => { setPinModalOpen(false); setPinAcaoPendente(null) }} onSuccess={() => { setPinModalOpen(false); if (pinAcaoPendente) { pinAcaoPendente(); setPinAcaoPendente(null) } }} empresaId={empresaId} titulo="Ação Restrita" descricao="Digite o PIN de gerente para executar esta ação" />

      {/* Modal de Configurar Acesso */}
      <Dialog open={acessoModalAberto} onOpenChange={setAcessoModalAberto}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto" onInteractOutside={(e) => e.preventDefault()}>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Shield className="w-5 h-5 text-orange-500" />
              Configurar Acesso — {acessoFuncionario?.nome}
            </DialogTitle>
          </DialogHeader>

          {/* Form wrapper com autocomplete desabilitado */}
          <form autoComplete="off" onSubmit={(e) => { e.preventDefault(); salvarAcesso() }}>
          {/* Input invisível para enganar o autocomplete do navegador */}
          <input type="text" name="fake_user" style={{ display: "none" }} tabIndex={-1} />
          <input type="password" name="fake_pass" style={{ display: "none" }} tabIndex={-1} />

          <div className="space-y-5 py-2">
            {/* Usuário */}
            <div className="space-y-2">
              <Label>Nome de usuário *</Label>
              <Input
                placeholder="ex: maria, joao123"
                value={acessoUsuario}
                onChange={(e) => setAcessoUsuario(e.target.value.toLowerCase().replace(/[^a-z0-9._-]/g, ""))}
                autoComplete="off"
                name="local_user_custom"
                id="local_user_custom"
              />
              <p className="text-[11px] text-muted-foreground">Apenas letras minúsculas, números, ponto, traço e underscore</p>
            </div>

            {/* Senha */}
            <div className="space-y-2">
              <Label>{(acessoFuncionario as any)?.usuario ? "Nova senha (deixe vazio para manter)" : "Senha *"}</Label>
              <div className="relative">
                <Input
                  type={acessoMostrarSenha ? "text" : "password"}
                  placeholder="Mínimo 4 caracteres"
                  value={acessoSenha}
                  onChange={(e) => setAcessoSenha(e.target.value)}
                  autoComplete="new-password"
                  name="local_pass_custom"
                  id="local_pass_custom"
                  data-form-type="other"}
                  className="pr-10"
                />
                <button
                  type="button"
                  onClick={() => setAcessoMostrarSenha(!acessoMostrarSenha)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                >
                  {acessoMostrarSenha ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {/* Perfil */}
            <div className="space-y-2">
              <Label>Nível de acesso</Label>
              <Select value={acessoPerfil} onValueChange={(v: "admin" | "gerente" | "colaborador") => setAcessoPerfil(v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="colaborador">Colaborador — acesso limitado</SelectItem>
                  <SelectItem value="gerente">Gerente — acesso avançado</SelectItem>
                  <SelectItem value="admin">Admin — acesso total</SelectItem>
                </SelectContent>
              </Select>
              <p className="text-[11px] text-muted-foreground">
                {acessoPerfil === "admin" && "Acesso total a todas as funções do sistema."}
                {acessoPerfil === "gerente" && "Acesso avançado. Pode dar descontos, ver financeiro, gerenciar equipe."}
                {acessoPerfil === "colaborador" && "Acesso básico. Pode vender e acessar a agenda. Permissões personalizáveis abaixo."}
              </p>
            </div>

            {/* Permissões granulares (só mostra se não for admin) */}
            {acessoPerfil !== "admin" && (
              <div className="space-y-3">
                <Label>Permissões detalhadas</Label>
                <div className="border border-border rounded-lg divide-y divide-border">
                  {PERMISSOES_DISPONIVEIS.map((perm) => (
                    <div key={perm.id} className="flex items-center justify-between px-3 py-2.5">
                      <div>
                        <p className="text-sm font-medium">{perm.label}</p>
                        <p className="text-[11px] text-muted-foreground">{perm.desc}</p>
                      </div>
                      <Switch
                        checked={acessoPermissoes[perm.id] === true}
                        onCheckedChange={() => togglePermissao(perm.id)}
                      />
                    </div>
                  ))}

                  {/* Limite de desconto */}
                  {acessoPermissoes["venda_desconto"] && (
                    <div className="flex items-center justify-between px-3 py-2.5">
                      <div>
                        <p className="text-sm font-medium">Limite de desconto (%)</p>
                        <p className="text-[11px] text-muted-foreground">Máximo que pode dar sem autorização</p>
                      </div>
                      <Input
                        type="number"
                        min="0"
                        max="100"
                        value={(acessoPermissoes["venda_limite_desconto"] as number) || 0}
                        onChange={(e) => setAcessoPermissoes((prev) => ({ ...prev, venda_limite_desconto: parseInt(e.target.value) || 0 }))}
                        className="w-20 h-8 text-sm text-center"
                      />
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setAcessoModalAberto(false)}>Cancelar</Button>
            <Button type="submit" disabled={acessoLoading} className="gap-2">
              {acessoLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Shield className="w-4 h-4" />}
              Salvar Acesso
            </Button>
          </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}
