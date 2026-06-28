"use client"

import { useState } from "react"
import { Plus, Trash2, Loader2, Save, Settings, DollarSign } from "lucide-react"
import { toast } from "sonner"

interface PlanoConfig {
  nome: string
  preco_mensal: number
  preco_anual: number
  limite_clientes: number
  limite_produtos: number
  limite_funcionarios: number
  agendamento: boolean
  fidelidade: boolean
  lembretes: boolean
  marca_dagua: boolean
  suporte: string
  recursos: string[]
}

interface AppConfig {
  nome: string
  slogan: string
  site: string
  suporte_email: string
  trial_dias: number
}

export function AdminConfiguracoesClient({
  planos: planosInit,
  appConfig: appInit,
}: {
  planos: Record<string, PlanoConfig>
  appConfig: AppConfig
}) {
  const [planos, setPlanos] = useState<Record<string, PlanoConfig>>(planosInit)
  const [appConfig, setAppConfig] = useState<AppConfig>(appInit)
  const [loading, setLoading] = useState(false)
  const [aba, setAba] = useState<"planos" | "app">("planos")
  const [novoRecurso, setNovoRecurso] = useState<Record<string, string>>({})

  function atualizarPlano(planoId: string, campo: string, valor: string | number | boolean) {
    setPlanos((prev) => ({
      ...prev,
      [planoId]: { ...prev[planoId], [campo]: valor },
    }))
  }

  function adicionarRecurso(planoId: string) {
    const r = novoRecurso[planoId]
    if (!r?.trim()) return
    setPlanos((prev) => ({
      ...prev,
      [planoId]: {
        ...prev[planoId],
        recursos: [...(prev[planoId].recursos ?? []), r.trim()],
      },
    }))
    setNovoRecurso((prev) => ({ ...prev, [planoId]: "" }))
  }

  function removerRecurso(planoId: string, idx: number) {
    setPlanos((prev) => ({
      ...prev,
      [planoId]: {
        ...prev[planoId],
        recursos: prev[planoId].recursos.filter((_, i) => i !== idx),
      },
    }))
  }

  async function salvarPlanos() {
    setLoading(true)
    const res = await fetch("/api/admin/configuracoes/salvar", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ chave: "planos", valor: planos }),
    })
    if (res.ok) toast.success("Planos salvos com sucesso!")
    else toast.error("Erro ao salvar planos.")
    setLoading(false)
  }

  async function salvarAppConfig() {
    setLoading(true)
    const res = await fetch("/api/admin/configuracoes/salvar", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ chave: "app_config", valor: appConfig }),
    })
    if (res.ok) toast.success("Configurações salvas!")
    else toast.error("Erro ao salvar.")
    setLoading(false)
  }

  const planosOrdem = ["gratuito", "basico", "profissional"]

  return (
    <div className="space-y-6 max-w-4xl">
      <div>
        <h1 className="text-2xl font-black text-gray-900 dark:text-white">Configurações</h1>
        <p className="text-gray-400 dark:text-white/40 text-sm">Edite preços, benefícios e configurações gerais</p>
      </div>

      {/* Abas */}
      <div className="flex gap-2">
        {[
          { id: "planos", label: "Planos e Preços", icon: DollarSign },
          { id: "app", label: "Configurações do App", icon: Settings },
        ].map(({ id, label, icon: Icon }) => (
          <button key={id} onClick={() => setAba(id as "planos" | "app")}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-bold transition-all ${
              aba === id ? "bg-primary text-white" : "bg-gray-100 dark:bg-white/5 text-gray-500 dark:text-white/50 hover:bg-gray-200 dark:hover:bg-white/10"
            }`}>
            <Icon className="w-4 h-4" />{label}
          </button>
        ))}
      </div>

      {/* Planos */}
      {aba === "planos" && (
        <div className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
            {planosOrdem.map((planoId) => {
              const p = planos[planoId]
              if (!p) return null
              return (
                <div key={planoId} className="bg-white dark:bg-[#1a1a1a] border border-gray-100 dark:border-white/10 rounded-2xl p-5 space-y-4">
                  <div className="flex items-center gap-2">
                    <div className={`w-2 h-2 rounded-full ${planoId === "profissional" ? "bg-primary" : planoId === "basico" ? "bg-blue-400" : "bg-gray-400"}`} />
                    <h3 className="font-black text-gray-900 dark:text-white capitalize">{p.nome}</h3>
                  </div>

                  {/* Preços */}
                  <div className="space-y-2">
                    <label className="text-xs text-gray-400 dark:text-white/40">Preço mensal (R$)</label>
                    <input
                      type="number" min="0" step="1"
                      value={p.preco_mensal}
                      onChange={(e) => atualizarPlano(planoId, "preco_mensal", parseFloat(e.target.value) || 0)}
                      className="w-full bg-gray-50 dark:bg-[#1a1a1a] border border-gray-200 dark:border-white/10 rounded-xl px-3 py-2 text-sm text-gray-900 dark:text-white placeholder:text-gray-400 dark:placeholder:text-white/30 focus:outline-none focus:border-[#F26E1D]"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs text-gray-400 dark:text-white/40">Preço anual (R$) — 2 meses grátis</label>
                    <input
                      type="number" min="0" step="1"
                      value={p.preco_anual}
                      onChange={(e) => atualizarPlano(planoId, "preco_anual", parseFloat(e.target.value) || 0)}
                      className="w-full bg-gray-50 dark:bg-[#1a1a1a] border border-gray-200 dark:border-white/10 rounded-xl px-3 py-2 text-sm text-gray-900 dark:text-white placeholder:text-gray-400 dark:placeholder:text-white/30 focus:outline-none focus:border-[#F26E1D]"
                    />
                  </div>

                  {/* Limites */}
                  <div className="grid grid-cols-2 gap-2">
                    {[
                      { label: "Máx. clientes (-1 = ∞)", campo: "limite_clientes" },
                      { label: "Máx. produtos (-1 = ∞)", campo: "limite_produtos" },
                      { label: "Máx. funcionários (-1 = ∞)", campo: "limite_funcionarios" },
                    ].map(({ label, campo }) => (
                      <div key={campo} className="space-y-1">
                        <label className="text-xs text-gray-400 dark:text-white/40">{label}</label>
                        <input
                          type="number"
                          value={(p as Record<string, number | boolean | string | string[]>)[campo] as number}
                          onChange={(e) => atualizarPlano(planoId, campo, parseInt(e.target.value) || 0)}
                          className="w-full bg-gray-50 dark:bg-[#1a1a1a] border border-gray-200 dark:border-white/10 rounded-xl px-3 py-2 text-xs text-gray-900 dark:text-white focus:outline-none focus:border-[#F26E1D]"
                        />
                      </div>
                    ))}
                  </div>

                  {/* Toggles */}
                  <div className="space-y-2">
                    {[
                      { label: "Agendamentos", campo: "agendamento" },
                      { label: "Fidelidade", campo: "fidelidade" },
                      { label: "Lembretes automáticos", campo: "lembretes" },
                      { label: "Marca d'água no PDF", campo: "marca_dagua" },
                    ].map(({ label, campo }) => (
                      <label key={campo} className="flex items-center justify-between cursor-pointer">
                        <span className="text-xs text-gray-600 dark:text-white/60">{label}</span>
                        <div
                          onClick={() => atualizarPlano(planoId, campo, !(p as Record<string, boolean>)[campo])}
                          className={`w-9 h-5 rounded-full transition-colors relative ${(p as Record<string, boolean>)[campo] ? "bg-primary" : "bg-white/10"}`}
                        >
                          <div className={`absolute top-0.5 w-4 h-4 bg-white rounded-full transition-all ${(p as Record<string, boolean>)[campo] ? "left-4.5" : "left-0.5"}`} />
                        </div>
                      </label>
                    ))}
                  </div>

                  {/* Recursos */}
                  <div className="space-y-2">
                    <label className="text-xs text-gray-400 dark:text-white/40">Recursos exibidos na tela de planos</label>
                    <div className="space-y-1.5 max-h-48 overflow-y-auto">
                      {p.recursos?.map((r, i) => (
                        <div key={i} className="flex items-center gap-2 bg-gray-100 dark:bg-white/5 rounded-lg px-3 py-1.5">
                          <span className="text-xs text-gray-700 dark:text-white/70 flex-1">{r}</span>
                          <button onClick={() => removerRecurso(planoId, i)} className="text-red-400 hover:text-red-300">
                            <Trash2 className="w-3 h-3" />
                          </button>
                        </div>
                      ))}
                    </div>
                    <div className="flex gap-2">
                      <input
                        value={novoRecurso[planoId] ?? ""}
                        onChange={(e) => setNovoRecurso((prev) => ({ ...prev, [planoId]: e.target.value }))}
                        onKeyDown={(e) => e.key === "Enter" && adicionarRecurso(planoId)}
                        placeholder="Novo recurso..."
                        className="flex-1 bg-gray-50 dark:bg-[#1a1a1a] border border-gray-200 dark:border-white/10 rounded-lg px-2 py-1.5 text-xs text-gray-900 dark:text-white placeholder:text-gray-400 dark:placeholder:text-white/30 focus:outline-none focus:border-[#F26E1D]"
                      />
                      <button onClick={() => adicionarRecurso(planoId)} className="p-1.5 bg-primary rounded-lg hover:bg-primary/90">
                        <Plus className="w-3.5 h-3.5 text-white" />
                      </button>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>

          <button onClick={salvarPlanos} disabled={loading}
            className="flex items-center gap-2 bg-primary text-white px-6 py-3 rounded-xl font-black hover:bg-primary/90 transition-colors disabled:opacity-50">
            {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Save className="w-5 h-5" />}
            Salvar todos os planos
          </button>
        </div>
      )}

      {/* Configurações do App */}
      {aba === "app" && (
        <div className="bg-white dark:bg-[#1a1a1a] border border-gray-100 dark:border-white/10 rounded-2xl p-6 space-y-4 max-w-lg">
          {[
            { label: "Nome do app", campo: "nome", type: "text" },
            { label: "Slogan", campo: "slogan", type: "text" },
            { label: "URL do site", campo: "site", type: "url" },
            { label: "E-mail de suporte", campo: "suporte_email", type: "email" },
            { label: "Dias de trial gratuito", campo: "trial_dias", type: "number" },
          ].map(({ label, campo, type }) => (
            <div key={campo} className="space-y-1.5">
              <label className="text-xs text-gray-400 dark:text-white/40">{label}</label>
              <input
                type={type}
                value={String((appConfig as Record<string, string | number>)[campo] ?? "")}
                onChange={(e) => setAppConfig((prev) => ({ ...prev, [campo]: type === "number" ? parseInt(e.target.value) : e.target.value }))}
                className="w-full bg-gray-50 dark:bg-[#1a1a1a] border border-gray-200 dark:border-white/10 rounded-xl px-3 py-2.5 text-sm text-gray-900 dark:text-white placeholder:text-gray-400 dark:placeholder:text-white/30 focus:outline-none focus:border-[#F26E1D]"
              />
            </div>
          ))}

          <button onClick={salvarAppConfig} disabled={loading}
            className="flex items-center gap-2 bg-primary text-white px-6 py-3 rounded-xl font-black hover:bg-primary/90 transition-colors disabled:opacity-50">
            {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Save className="w-5 h-5" />}
            Salvar configurações
          </button>
        </div>
      )}
    </div>
  )
}
