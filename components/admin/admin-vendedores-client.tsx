"use client"

import { useState } from "react"
import { Plus, UserCheck, Trash2, Edit, Copy, Loader2, TrendingUp } from "lucide-react"
import { toast } from "sonner"
import { formatarMoeda, formatarTelefone } from "@/lib/utils"

interface Vendedor {
  id: string; nome: string; email: string; telefone: string | null
  comissao_percentual: number; codigo_indicacao: string
  total_vendas: number; total_comissao: number; ativo: boolean
  observacoes: string | null; created_at: string
}

const formPadrao = {
  nome: "", email: "", telefone: "", comissao_percentual: "30",
  observacoes: "", ativo: true
}

export function AdminVendedoresClient({ vendedores: init }: { vendedores: Vendedor[] }) {
  const [vendedores, setVendedores] = useState(init)
  const [modal, setModal] = useState(false)
  const [editando, setEditando] = useState<Vendedor | null>(null)
  const [loading, setLoading] = useState(false)
  const [form, setForm] = useState(formPadrao)

  function abrirNovo() { setEditando(null); setForm(formPadrao); setModal(true) }
  function abrirEditar(v: Vendedor) {
    setEditando(v)
    setForm({ nome: v.nome, email: v.email, telefone: v.telefone ?? "", comissao_percentual: v.comissao_percentual.toString(), observacoes: v.observacoes ?? "", ativo: v.ativo })
    setModal(true)
  }

  async function salvar() {
    if (!form.nome || !form.email) { toast.error("Nome e e-mail obrigatórios."); return }
    setLoading(true)
    const res = await fetch("/api/admin/vendedores", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(editando ? { _acao: "editar", id: editando.id, ...form } : form),
    })
    const data = await res.json()
    if (res.ok) {
      if (editando) {
        setVendedores((prev) => prev.map((v) => v.id === editando.id ? { ...v, ...form, comissao_percentual: parseFloat(form.comissao_percentual) } : v))
        toast.success("Vendedor atualizado!")
      } else {
        setVendedores((prev) => [data, ...prev])
        toast.success("Vendedor cadastrado!")
      }
      setModal(false)
    } else toast.error(data.erro)
    setLoading(false)
  }

  async function excluir(id: string) {
    if (!confirm("Excluir este vendedor?")) return
    const res = await fetch("/api/admin/vendedores", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ _acao: "excluir", id }),
    })
    if (res.ok) { setVendedores((prev) => prev.filter((v) => v.id !== id)); toast.success("Vendedor removido.") }
  }

  function copiar(codigo: string) {
    navigator.clipboard.writeText(`https://app.boragerir.com/cadastro?ref=${codigo}`)
    toast.success("Link de indicação copiado!")
  }

  const totalComissao = vendedores.reduce((s, v) => s + v.total_comissao, 0)
  const totalVendas = vendedores.reduce((s, v) => s + v.total_vendas, 0)

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-black text-gray-900 dark:text-white">Vendedores / Influenciadores</h1>
          <p className="text-gray-400 dark:text-white/40 text-sm">{vendedores.filter((v) => v.ativo).length} ativo(s)</p>
        </div>
        <button onClick={abrirNovo}
          className="flex items-center gap-2 bg-primary text-white px-4 py-2.5 rounded-xl font-bold text-sm hover:bg-primary/90">
          <Plus className="w-4 h-4" />Novo Vendedor
        </button>
      </div>

      {/* Cards resumo */}
      <div className="grid grid-cols-2 gap-4">
        {[
          { label: "Total de vendas", valor: totalVendas.toString(), icon: UserCheck },
          { label: "Total em comissões", valor: formatarMoeda(totalComissao), icon: TrendingUp },
        ].map((c) => {
          const Icon = c.icon
          return (
            <div key={c.label} className="bg-white dark:bg-[#1a1a1a] border border-gray-100 dark:border-white/10 rounded-2xl p-4 flex items-center gap-3">
              <div className="p-2 rounded-xl bg-primary/10"><Icon className="w-5 h-5 text-primary" /></div>
              <div>
                <p className="text-xs text-gray-400 dark:text-white/40">{c.label}</p>
                <p className="text-xl font-black text-gray-900 dark:text-white">{c.valor}</p>
              </div>
            </div>
          )
        })}
      </div>

      {/* Modal */}
      {modal && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-[#1a1a1a] border border-gray-100 dark:border-white/10 rounded-2xl p-6 w-full max-w-md space-y-4">
            <h3 className="text-lg font-black text-gray-900 dark:text-white">{editando ? "Editar Vendedor" : "Novo Vendedor"}</h3>
            {[
              { label: "Nome *", key: "nome", placeholder: "Nome completo" },
              { label: "E-mail *", key: "email", placeholder: "email@exemplo.com", type: "email" },
              { label: "Telefone", key: "telefone", placeholder: "(11) 99999-9999" },
            ].map((f) => (
              <div key={f.key} className="space-y-1.5">
                <label className="text-xs font-semibold text-gray-500 dark:text-white/50">{f.label}</label>
                <input type={f.type ?? "text"} value={(form as Record<string, string | boolean>)[f.key] as string}
                  onChange={(e) => setForm((p) => ({ ...p, [f.key]: e.target.value }))}
                  placeholder={f.placeholder}
                  className="w-full bg-gray-50 dark:bg-[#1a1a1a] border border-gray-200 dark:border-white/10 rounded-xl px-3 py-2.5 text-sm text-gray-900 dark:text-white placeholder:text-gray-400 dark:placeholder:text-white/30 focus:outline-none focus:border-[#F26E1D]" />
              </div>
            ))}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-gray-500 dark:text-white/50">Comissão (%)</label>
              <div className="flex items-center gap-2">
                <input type="range" min="5" max="60" step="5" value={form.comissao_percentual}
                  onChange={(e) => setForm((p) => ({ ...p, comissao_percentual: e.target.value }))}
                  className="flex-1 accent-primary" />
                <span className="text-gray-900 dark:text-white font-black text-lg w-12 text-right">{form.comissao_percentual}%</span>
              </div>
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-gray-500 dark:text-white/50">Observações</label>
              <textarea value={form.observacoes} onChange={(e) => setForm((p) => ({ ...p, observacoes: e.target.value }))}
                placeholder="..." rows={2}
                className="w-full bg-gray-50 dark:bg-[#1a1a1a] border border-gray-200 dark:border-white/10 rounded-xl px-3 py-2.5 text-sm text-gray-900 dark:text-white placeholder:text-gray-400 dark:placeholder:text-white/30 focus:outline-none focus:border-[#F26E1D] resize-none" />
            </div>
            <div className="flex gap-3 pt-2">
              <button onClick={() => setModal(false)}
                className="flex-1 py-2.5 rounded-xl border border-gray-100 dark:border-white/10 text-gray-600 dark:text-white/60 text-sm hover:bg-gray-50 dark:hover:bg-white/5">Cancelar</button>
              <button onClick={salvar} disabled={loading}
                className="flex-1 py-2.5 rounded-xl bg-primary text-white font-bold text-sm hover:bg-primary/90 disabled:opacity-50 flex items-center justify-center gap-2">
                {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : editando ? "Salvar" : "Cadastrar"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Lista */}
      {vendedores.length > 0 ? (
        <div className="space-y-3">
          {vendedores.map((v) => (
            <div key={v.id} className={`bg-white dark:bg-[#1a1a1a] border border-gray-100 dark:border-white/10 rounded-2xl p-5 ${!v.ativo ? "opacity-50" : ""}`}>
              <div className="flex items-start justify-between gap-4">
                <div>
                  <div className="flex items-center gap-2">
                    <p className="font-black text-gray-900 dark:text-white">{v.nome}</p>
                    {!v.ativo && <span className="text-xs text-red-400">Inativo</span>}
                  </div>
                  <p className="text-sm text-gray-500 dark:text-white/50">{v.email}</p>
                  {v.telefone && <p className="text-xs text-gray-300 dark:text-white/30">{formatarTelefone(v.telefone)}</p>}
                </div>
                <div className="flex items-center gap-2">
                  <button onClick={() => abrirEditar(v)} className="p-1.5 hover:bg-gray-100 dark:hover:bg-white/10 rounded-lg text-gray-400 dark:text-white/40 hover:text-gray-900 dark:hover:text-white">
                    <Edit className="w-4 h-4" />
                  </button>
                  <button onClick={() => excluir(v.id)} className="p-1.5 hover:bg-gray-100 dark:hover:bg-white/10 rounded-lg text-red-400 hover:text-red-300">
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
              <div className="mt-3 pt-3 border-t border-gray-50 dark:border-white/5 grid grid-cols-3 gap-4 text-sm">
                <div>
                  <p className="text-gray-300 dark:text-white/30 text-xs">Comissão</p>
                  <p className="text-primary font-black">{v.comissao_percentual}%</p>
                </div>
                <div>
                  <p className="text-gray-300 dark:text-white/30 text-xs">Vendas</p>
                  <p className="text-gray-900 dark:text-white font-bold">{v.total_vendas}</p>
                </div>
                <div>
                  <p className="text-gray-300 dark:text-white/30 text-xs">Comissão total</p>
                  <p className="text-emerald-400 font-bold">{formatarMoeda(v.total_comissao)}</p>
                </div>
              </div>
              <div className="mt-3 flex items-center gap-2">
                <code className="text-xs text-gray-500 dark:text-white/50 bg-gray-100 dark:bg-white/5 px-2 py-1 rounded-lg font-mono flex-1 truncate">
                  app.boragerir.com/cadastro?ref={v.codigo_indicacao}
                </code>
                <button onClick={() => copiar(v.codigo_indicacao)}
                  className="p-1.5 hover:bg-gray-100 dark:hover:bg-white/10 rounded-lg text-gray-400 dark:text-white/40 hover:text-gray-900 dark:hover:text-white shrink-0">
                  <Copy className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="py-16 text-center text-gray-300 dark:text-white/30 bg-white dark:bg-[#1a1a1a] border border-gray-100 dark:border-white/10 rounded-2xl">
          <UserCheck className="w-10 h-10 mx-auto mb-3 opacity-40" />
          <p>Nenhum vendedor cadastrado</p>
        </div>
      )}
    </div>
  )
}
