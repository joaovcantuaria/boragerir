"use client"

import { useState } from "react"
import { Plus, Edit, Shield, Users, ShoppingCart, Bot, ChevronDown, Loader2, ToggleLeft, ToggleRight } from "lucide-react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent } from "@/components/ui/card"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { cn } from "@/lib/utils"
import { useAdminTema } from "@/components/admin/admin-tema-context"

interface UsuarioAdmin {
  id: string
  nome: string
  email: string
  perfil: string
  ativo: boolean
  created_at: string
}

const PERFIS = [
  {
    value: "super_admin",
    label: "Super Admin",
    descricao: "Acesso total ao painel administrativo",
    icon: Shield,
    cor: "bg-red-500/10 text-red-400 border-red-500/20",
  },
  {
    value: "quase_admin",
    label: "Quase Admin",
    descricao: "Tudo exceto usuários e configurações",
    icon: Shield,
    cor: "bg-orange-500/10 text-orange-400 border-orange-500/20",
  },
  {
    value: "vendas",
    label: "Comercial",
    descricao: "Empresas e assinaturas",
    icon: ShoppingCart,
    cor: "bg-blue-500/10 text-blue-400 border-blue-500/20",
  },
  {
    value: "atendimento",
    label: "Atendimento",
    descricao: "Atendimentos IA e suporte",
    icon: Bot,
    cor: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
  },
]

const PERMISSOES_DESCRICAO: Record<string, string[]> = {
  super_admin: ["Dashboard", "Empresas", "Assinaturas", "Vendedores", "Cupons", "Atendimentos IA", "Suporte", "Usuários", "Configurações"],
  quase_admin: ["Dashboard", "Empresas", "Assinaturas", "Vendedores", "Cupons", "Atendimentos IA", "Suporte"],
  vendas:      ["Empresas", "Assinaturas"],
  atendimento: ["Atendimentos IA", "Suporte"],
}

export function UsuariosAdminClient({ usuarios: init }: { usuarios: UsuarioAdmin[] }) {
  const [usuarios, setUsuarios] = useState(init)
  const [modalAberto, setModalAberto] = useState(false)
  const [editando, setEditando] = useState<UsuarioAdmin | null>(null)
  const [loading, setLoading] = useState(false)
  const [nome, setNome] = useState("")
  const [email, setEmail] = useState("")
  const [perfil, setPerfil] = useState("atendimento")
  const [senha, setSenha] = useState("")
  const t = useAdminTema()

  function abrirNovo() {
    setEditando(null)
    setNome(""); setEmail(""); setPerfil("atendimento"); setSenha("")
    setModalAberto(true)
  }

  function abrirEditar(u: UsuarioAdmin) {
    setEditando(u)
    setNome(u.nome); setEmail(u.email); setPerfil(u.perfil); setSenha("")
    setModalAberto(true)
  }

  async function salvar() {
    if (!nome.trim() || !email.trim() || !perfil) { toast.error("Preencha todos os campos."); return }
    if (!editando && !senha) { toast.error("Informe uma senha para o novo usuário."); return }
    setLoading(true)

    const res = await fetch("/api/admin/usuarios", {
      method: editando ? "PUT" : "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: editando?.id, nome, email, perfil, senha: senha || undefined }),
    })
    const data = await res.json()

    if (!res.ok) { toast.error(data.erro ?? "Erro ao salvar."); setLoading(false); return }

    if (editando) {
      setUsuarios((prev) => prev.map((u) => u.id === editando.id ? { ...u, nome, email, perfil } : u))
      toast.success("Usuário atualizado!")
    } else {
      setUsuarios((prev) => [data.usuario, ...prev])
      toast.success("Usuário criado! Um e-mail de acesso foi enviado.")
    }
    setModalAberto(false)
    setLoading(false)
  }

  async function toggleAtivo(u: UsuarioAdmin) {
    const res = await fetch("/api/admin/usuarios", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: u.id, ativo: !u.ativo }),
    })
    if (!res.ok) { toast.error("Erro ao alterar status."); return }
    setUsuarios((prev) => prev.map((x) => x.id === u.id ? { ...x, ativo: !u.ativo } : x))
    toast.success(u.ativo ? "Usuário desativado." : "Usuário reativado.")
  }

  const perfilInfo = (p: string) => PERFIS.find((x) => x.value === p)

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className={`text-2xl font-black ${t.text}`}>Usuários Admin</h1>
          <p className={`${t.textMuted} text-sm`}>{usuarios.length} usuário(s) cadastrado(s)</p>
        </div>
        <Button onClick={abrirNovo} className="gap-2 bg-primary hover:bg-primary/90">
          <Plus className="w-4 h-4" />Novo Usuário
        </Button>
      </div>

      {/* Cards de perfis */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {PERFIS.map((p) => {
          const Icon = p.icon
          const count = usuarios.filter((u) => u.perfil === p.value && u.ativo).length
          return (
            <div key={p.value} className={`${t.subBg2} border ${t.subBorder} rounded-2xl p-4`}>
              <div className="flex items-center gap-2 mb-2">
                <Icon className="w-4 h-4 text-primary" />
                <span className={`text-sm font-bold ${t.text}`}>{p.label}</span>
              </div>
              <p className={`text-2xl font-black ${t.text}`}>{count}</p>
              <p className={`text-xs ${t.textMuted2} mt-1`}>{p.descricao}</p>
            </div>
          )
        })}
      </div>

      {/* Lista */}
      <div className="space-y-2">
        {usuarios.map((u) => {
          const info = perfilInfo(u.perfil)
          const perms = PERMISSOES_DESCRICAO[u.perfil] ?? []
          return (
            <div key={u.id} className={`${t.subBg2} border ${t.subBorder} rounded-2xl p-4 flex items-center justify-between gap-4 ${!u.ativo ? "opacity-40" : ""}`}>
              <div className="flex items-center gap-4 min-w-0">
                <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center text-primary font-black text-sm shrink-0">
                  {u.nome.charAt(0).toUpperCase()}
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className={`text-sm font-bold ${t.text}`}>{u.nome}</span>
                    {info && (
                      <Badge className={`text-xs ${info.cor}`}>{info.label}</Badge>
                    )}
                    {!u.ativo && <Badge className={`text-xs ${t.subBg} ${t.textMuted2}`}>Inativo</Badge>}
                  </div>
                  <p className={`text-xs ${t.textMuted} mt-0.5`}>{u.email}</p>
                  <div className="flex flex-wrap gap-1 mt-1.5">
                    {perms.slice(0, 4).map((p) => (
                      <span key={p} className={`text-[10px] ${t.subBg2} ${t.textMuted} px-1.5 py-0.5 rounded-md`}>{p}</span>
                    ))}
                    {perms.length > 4 && (
                      <span className={`text-[10px] ${t.textMuted2}`}>+{perms.length - 4}</span>
                    )}
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <button onClick={() => toggleAtivo(u)} title={u.ativo ? "Desativar" : "Ativar"}
                  className={`p-2 rounded-xl ${t.textMuted2} hover:text-white ${t.hoverBg} transition-colors`}>
                  {u.ativo ? <ToggleRight className="w-5 h-5 text-emerald-400" /> : <ToggleLeft className="w-5 h-5" />}
                </button>
                <button onClick={() => abrirEditar(u)}
                  className={`p-2 rounded-xl ${t.textMuted2} hover:text-white ${t.hoverBg} transition-colors`}>
                  <Edit className="w-4 h-4" />
                </button>
              </div>
            </div>
          )
        })}
        {usuarios.length === 0 && (
          <div className={`py-16 text-center ${t.textMuted2}`}>
            <Users className="w-12 h-12 mx-auto mb-3 opacity-30" />
            <p>Nenhum usuário cadastrado</p>
          </div>
        )}
      </div>

      {/* Modal */}
      <Dialog open={modalAberto} onOpenChange={(open) => { if (!open) setModalAberto(false) }}>
        <DialogContent
          onInteractOutside={(e) => e.preventDefault()}
          style={{
            backgroundColor: t.cardBg.includes("white") ? "#ffffff" : "#1a1a1a",
            borderColor: t.cardBg.includes("white") ? "#e5e7eb" : "rgba(255,255,255,0.1)",
            color: t.cardBg.includes("white") ? "#111827" : "#ffffff",
          }}
          className="border"
        >
          <DialogHeader>
            <DialogTitle className={t.text}>{editando ? "Editar Usuário" : "Novo Usuário Admin"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label className={t.textMuted6}>Nome *</Label>
              <Input value={nome} onChange={(e) => setNome(e.target.value)} placeholder="Nome completo"
                className={`${t.subBg} ${t.border} ${t.text} placeholder:text-white/30`} />
            </div>
            <div className="space-y-2">
              <Label className={t.textMuted6}>E-mail *</Label>
              <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="email@exemplo.com"
                disabled={!!editando}
                className={`${t.subBg} ${t.border} ${t.text} placeholder:text-white/30 disabled:opacity-50`} />
            </div>
            {!editando && (
              <div className="space-y-2">
                <Label className={t.textMuted6}>Senha inicial *</Label>
                <Input type="password" value={senha} onChange={(e) => setSenha(e.target.value)} placeholder="Mínimo 8 caracteres"
                  className={`${t.subBg} ${t.border} ${t.text} placeholder:text-white/30`} />
              </div>
            )}
            <div className="space-y-2">
              <Label className={t.textMuted6}>Perfil de acesso *</Label>
              <div className="space-y-2">
                {PERFIS.map((p) => (
                  <button key={p.value} type="button" onClick={() => setPerfil(p.value)}
                    className={`w-full text-left p-3 rounded-xl border transition-all ${
                      perfil === p.value ? "border-primary bg-primary/10" : `${t.border} hover:border-white/20`
                    }`}>
                    <div className="flex items-center gap-2">
                      <p className={`text-sm font-semibold ${t.text}`}>{p.label}</p>
                      {perfil === p.value && <div className="w-2 h-2 rounded-full bg-primary ml-auto" />}
                    </div>
                    <p className={`text-xs ${t.textMuted} mt-0.5`}>{p.descricao}</p>
                    <div className="flex flex-wrap gap-1 mt-1.5">
                      {(PERMISSOES_DESCRICAO[p.value] ?? []).map((perm) => (
                        <span key={perm} className={`text-[10px] ${t.subBg2} ${t.textMuted} px-1.5 py-0.5 rounded-md`}>{perm}</span>
                      ))}
                    </div>
                  </button>
                ))}
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setModalAberto(false)} className={`${t.border} ${t.textMuted4} hover:text-white`}>Cancelar</Button>
            <Button onClick={salvar} disabled={loading} className="bg-primary hover:bg-primary/90">
              {loading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
              {editando ? "Salvar" : "Criar usuário"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
