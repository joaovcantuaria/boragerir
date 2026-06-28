"use client"

import { useState } from "react"
import { Plus, Tag, Trash2, ToggleLeft, ToggleRight, Loader2, Copy } from "lucide-react"
import { toast } from "sonner"
import { format, parseISO } from "date-fns"
import { useAdminTema } from "@/components/admin/admin-tema-context"

interface Cupom {
  id: string; codigo: string; descricao: string | null; tipo: string; valor: number
  uso_maximo: number | null; uso_atual: number; ativo: boolean
  validade: string | null; created_at: string
}

export function AdminCuponsClient({ cupons: init }: { cupons: Cupom[] }) {
  const [cupons, setCupons] = useState(init)
  const [modalAberto, setModalAberto] = useState(false)
  const [loading, setLoading] = useState(false)
  const [form, setForm] = useState({
    codigo: "", descricao: "", tipo: "percentual", valor: "",
    uso_maximo: "", validade: "",
  })
  const t = useAdminTema()

  async function criar() {
    if (!form.codigo || !form.valor) { toast.error("Código e valor são obrigatórios."); return }
    setLoading(true)
    const res = await fetch("/api/admin/cupons", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...form }),
    })
    const data = await res.json()
    if (res.ok) {
      setCupons((prev) => [data, ...prev])
      setModalAberto(false)
      setForm({ codigo: "", descricao: "", tipo: "percentual", valor: "", uso_maximo: "", validade: "" })
      toast.success("Cupom criado!")
    } else toast.error(data.erro)
    setLoading(false)
  }

  async function excluir(id: string) {
    if (!confirm("Excluir este cupom?")) return
    const res = await fetch("/api/admin/cupons", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ _acao: "excluir", id }),
    })
    if (res.ok) { setCupons((prev) => prev.filter((c) => c.id !== id)); toast.success("Cupom excluído.") }
  }

  async function toggleAtivo(id: string) {
    const res = await fetch("/api/admin/cupons", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ _acao: "toggle", id }),
    })
    if (res.ok) {
      setCupons((prev) => prev.map((c) => c.id === id ? { ...c, ativo: !c.ativo } : c))
    }
  }

  function copiar(codigo: string) {
    navigator.clipboard.writeText(codigo)
    toast.success(`Código "${codigo}" copiado!`)
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className={`text-2xl font-black ${t.text}`}>Cupons de Desconto</h1>
          <p className={`${t.textMuted} text-sm`}>{cupons.length} cupom(ns) cadastrado(s)</p>
        </div>
        <button onClick={() => setModalAberto(true)}
          className="flex items-center gap-2 bg-primary text-white px-4 py-2.5 rounded-xl font-bold text-sm hover:bg-primary/90">
          <Plus className="w-4 h-4" />Novo Cupom
        </button>
      </div>

      {/* Modal criar */}
      {modalAberto && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4">
          <div className={`${t.cardBg} border ${t.border} rounded-2xl p-6 w-full max-w-md space-y-4`}>
            <h3 className={`text-lg font-black ${t.text}`}>Novo Cupom</h3>
            {[
              { label: "Código *", key: "codigo", placeholder: "DESCONTO10", upper: true },
              { label: "Descrição", key: "descricao", placeholder: "10% de desconto" },
            ].map((f) => (
              <div key={f.key} className="space-y-1.5">
                <label className={`text-xs font-semibold ${t.textMuted3}`}>{f.label}</label>
                <input value={(form as Record<string, string>)[f.key]}
                  onChange={(e) => setForm((p) => ({ ...p, [f.key]: f.upper ? e.target.value.toUpperCase() : e.target.value }))}
                  placeholder={f.placeholder}
                  className={`w-full ${t.inputBg} border ${t.inputBorder} rounded-xl px-3 py-2.5 text-sm ${t.inputText} focus:outline-none`} />
              </div>
            ))}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <label className={`text-xs font-semibold ${t.textMuted3}`}>Tipo *</label>
                <select value={form.tipo} onChange={(e) => setForm((p) => ({ ...p, tipo: e.target.value }))}
                  className={`w-full ${t.subBg} border ${t.border} rounded-xl px-3 py-2.5 text-sm ${t.text} focus:outline-none focus:border-primary`}>
                  <option value="percentual">Percentual (%)</option>
                  <option value="fixo">Valor fixo (R$)</option>
                </select>
              </div>
              <div className="space-y-1.5">
                <label className={`text-xs font-semibold ${t.textMuted3}`}>
                  Valor * {form.tipo === "percentual" ? "(%)" : "(R$)"}
                </label>
                <input type="number" step="0.01" min="0" value={form.valor}
                  onChange={(e) => setForm((p) => ({ ...p, valor: e.target.value }))}
                  placeholder="10"
                  className={`w-full ${t.inputBg} border ${t.inputBorder} rounded-xl px-3 py-2.5 text-sm ${t.inputText} focus:outline-none`} />
              </div>
              <div className="space-y-1.5">
                <label className={`text-xs font-semibold ${t.textMuted3}`}>Uso máximo</label>
                <input type="number" min="1" value={form.uso_maximo}
                  onChange={(e) => setForm((p) => ({ ...p, uso_maximo: e.target.value }))}
                  placeholder="Ilimitado"
                  className={`w-full ${t.inputBg} border ${t.inputBorder} rounded-xl px-3 py-2.5 text-sm ${t.inputText} focus:outline-none`} />
              </div>
              <div className="space-y-1.5">
                <label className={`text-xs font-semibold ${t.textMuted3}`}>Validade</label>
                <input type="date" value={form.validade}
                  onChange={(e) => setForm((p) => ({ ...p, validade: e.target.value }))}
                  className={`w-full ${t.inputBg} border ${t.inputBorder} rounded-xl px-3 py-2.5 text-sm ${t.inputText} focus:outline-none`} />
              </div>
            </div>
            <div className="flex gap-3 pt-2">
              <button onClick={() => setModalAberto(false)}
                className={`flex-1 py-2.5 rounded-xl border ${t.border} ${t.textMuted4} text-sm ${t.hoverBg}`}>
                Cancelar
              </button>
              <button onClick={criar} disabled={loading}
                className="flex-1 py-2.5 rounded-xl bg-primary text-white font-bold text-sm hover:bg-primary/90 disabled:opacity-50 flex items-center justify-center gap-2">
                {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : "Criar Cupom"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Lista */}
      {cupons.length > 0 ? (
        <div className={`${t.cardBg} border ${t.border} rounded-2xl overflow-hidden`}>
          <div className={`grid grid-cols-[1fr_auto_auto_auto_auto_auto] gap-4 px-5 py-3 border-b ${t.border} text-xs font-bold ${t.textMuted2} uppercase`}>
            <span>Código</span><span>Tipo</span><span>Valor</span><span>Uso</span><span>Validade</span><span>Ações</span>
          </div>
          {cupons.map((c) => (
            <div key={c.id} className={`grid grid-cols-[1fr_auto_auto_auto_auto_auto] gap-4 px-5 py-4 border-b ${t.borderLight} last:border-0 items-center ${t.rowHover}`}>
              <div>
                <div className="flex items-center gap-2">
                  <span className={`font-black ${t.text} font-mono text-sm`}>{c.codigo}</span>
                  <button onClick={() => copiar(c.codigo)} className={`${t.textMuted2} hover:text-white transition-colors`}>
                    <Copy className="w-3 h-3" />
                  </button>
                </div>
                {c.descricao && <p className={`text-xs ${t.textMuted} mt-0.5`}>{c.descricao}</p>}
              </div>
              <span className={`text-xs ${t.textMuted3} capitalize`}>{c.tipo}</span>
              <span className="text-sm font-bold text-primary">
                {c.tipo === "percentual" ? `${c.valor}%` : `R$ ${c.valor}`}
              </span>
              <span className={`text-xs ${t.textMuted3}`}>
                {c.uso_atual}{c.uso_maximo ? `/${c.uso_maximo}` : ""}
              </span>
              <span className={`text-xs ${t.textMuted3}`}>
                {c.validade ? format(parseISO(c.validade), "dd/MM/yy") : "∞"}
              </span>
              <div className="flex items-center gap-1">
                <button onClick={() => toggleAtivo(c.id)} title={c.ativo ? "Desativar" : "Ativar"}
                  className={`transition-colors ${c.ativo ? "text-emerald-400" : t.textMuted2}`}>
                  {c.ativo ? <ToggleRight className="w-5 h-5" /> : <ToggleLeft className="w-5 h-5" />}
                </button>
                <button onClick={() => excluir(c.id)} className="text-red-400 hover:text-red-300 transition-colors">
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className={`py-16 text-center ${t.textMuted2} ${t.cardBg} border ${t.border} rounded-2xl`}>
          <Tag className="w-10 h-10 mx-auto mb-3 opacity-40" />
          <p>Nenhum cupom criado ainda</p>
        </div>
      )}
    </div>
  )
}
