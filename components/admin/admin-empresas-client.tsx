"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { format, parseISO } from "date-fns"
import { Search, Building2, Eye, Shield, ShieldOff, Trash2, Bell, Plus, Loader2 } from "lucide-react"
import { toast } from "sonner"
import { formatarCNPJ, formatarCPF, formatarTelefone } from "@/lib/utils"
import { useAdminTema } from "@/components/admin/admin-tema-context"

interface Empresa {
  id: string; nome: string; email: string; telefone: string; area_atuacao: string
  plano: string; plano_ativo: boolean; tipo_documento: string; documento: string
  created_at: string; logo_url: string | null; user_id: string
  max_empresas?: number | null
  assinaturas?: { status: string; plano: string; valor_total: number }[]
}

const badgePlano: Record<string, string> = {
  gratuito: "bg-gray-500/10 text-gray-400 border-gray-500/20",
  basico: "bg-blue-500/10 text-blue-400 border-blue-500/20",
  profissional: "bg-orange-500/10 text-orange-400 border-orange-500/20",
  agenda: "bg-purple-500/10 text-purple-400 border-purple-500/20",
  gestao: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
}

export function AdminEmpresasClient({ empresas: init }: { empresas: Empresa[] }) {
  const [empresas, setEmpresas] = useState(init)
  const [busca, setBusca] = useState("")
  const [filtroPlano, setFiltroPlano] = useState("todos")
  const [modalCadastro, setModalCadastro] = useState(false)
  const [cadastroLoading, setCadastroLoading] = useState(false)
  const [formCadastro, setFormCadastro] = useState({
    email: "", senha: "", nome_empresa: "", nome_titular: "", telefone: "", area_atuacao: "", plano: "gestao", max_empresas: "1"
  })
  const router = useRouter()
  const t = useAdminTema()

  const filtradas = empresas.filter((e) => {
    // Para cada user_id, encontrar a primeira empresa (principal)
    const primeiraDoUsuario = empresas
      .filter((x) => x.user_id === e.user_id)
      .sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime())[0]
    // Só mostrar a empresa principal (primeira do user) — sub-empresas ficam no detalhe
    if (primeiraDoUsuario && primeiraDoUsuario.id !== e.id) return false

    const bate = e.nome.toLowerCase().includes(busca.toLowerCase()) ||
      e.email.toLowerCase().includes(busca.toLowerCase()) ||
      (e.documento ?? "").includes(busca)
    const planoBate = filtroPlano === "todos" || e.plano === filtroPlano
    return bate && planoBate
  })

  // Contar sub-empresas por user
  const subEmpresasCount = (userId: string) =>
    empresas.filter((x) => x.user_id === userId).length - 1

  async function alterarPlano(id: string, novoPlano: string) {
    const res = await fetch("/api/admin/empresas/alterar-plano", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ empresa_id: id, plano: novoPlano }),
    })
    if (res.ok) {
      setEmpresas((prev) => prev.map((e) => e.id === id ? { ...e, plano: novoPlano } : e))
      toast.success("Plano alterado!")
    } else {
      toast.error("Erro ao alterar plano.")
    }
  }

  async function excluirEmpresa(empresa: Empresa) {
    if (!confirm(`Excluir "${empresa.nome}" permanentemente? Esta ação não pode ser desfeita.`)) return
    const res = await fetch("/api/admin/empresas/excluir", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ empresa_id: empresa.id }),
    })
    if (res.ok) {
      setEmpresas((prev) => prev.filter((e) => e.id !== empresa.id))
      toast.success("Empresa excluída.")
    } else toast.error("Erro ao excluir empresa.")
  }

  async function enviarAlertaVencimento(empresa: Empresa) {
    const res = await fetch("/api/admin/empresas/alerta-vencimento", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ empresa_id: empresa.id }),
    })
    const data = await res.json()
    if (res.ok) toast.success(`Alerta enviado para ${data.email}`)
    else toast.error("Erro ao enviar alerta.")
  }

  async function toggleAtivo(empresa: Empresa) {
    const res = await fetch("/api/admin/empresas/toggle-ativo", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ empresa_id: empresa.id, ativo: !empresa.plano_ativo }),
    })
    if (res.ok) {
      setEmpresas((prev) => prev.map((e) => e.id === empresa.id ? { ...e, plano_ativo: !e.plano_ativo } : e))
      toast.success(empresa.plano_ativo ? "Empresa desativada." : "Empresa reativada.")
    }
  }

  async function cadastrarEmpresa() {
    const { email, senha, nome_empresa, nome_titular, telefone, area_atuacao, plano } = formCadastro
    if (!email || !senha || !telefone) {
      toast.error("Preencha email, senha e telefone.")
      return
    }
    if (plano !== "gestao" && (!nome_empresa || !area_atuacao)) {
      toast.error("Preencha nome da empresa e área de atuação.")
      return
    }
    if (plano === "gestao" && !nome_titular) {
      toast.error("Preencha o nome do titular.")
      return
    }
    if (senha.length < 6) {
      toast.error("A senha deve ter no mínimo 6 caracteres.")
      return
    }
    setCadastroLoading(true)
    try {
      const res = await fetch("/api/admin/empresas/cadastrar", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, senha, nome_empresa, nome_titular: formCadastro.nome_titular, telefone, area_atuacao, plano, max_empresas: formCadastro.max_empresas }),
      })
      const data = await res.json()
      if (!res.ok) {
        toast.error(data.erro || "Erro ao cadastrar empresa.")
        return
      }
      toast.success(`Empresa "${nome_empresa}" cadastrada com sucesso!`)
      setModalCadastro(false)
      setFormCadastro({ email: "", senha: "", nome_empresa: "", nome_titular: "", telefone: "", area_atuacao: "", plano: "gestao", max_empresas: "1" })
      router.refresh()
    } catch {
      toast.error("Erro de conexão.")
    } finally {
      setCadastroLoading(false)
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className={`text-2xl font-black ${t.text}`}>Empresas</h1>
          <p className={`${t.textMuted} text-sm`}>{filtradas.length} conta(s) · {empresas.length} empresa(s) total</p>
        </div>
        <button
          onClick={() => setModalCadastro(true)}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-primary text-white text-sm font-bold hover:opacity-90 transition-opacity"
        >
          <Plus className="w-4 h-4" />
          Nova Empresa
        </button>
      </div>

      {/* Filtros */}
      <div className="space-y-3">
        <div className="relative">
          <Search className={`absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 ${t.textMuted2}`} />
          <input
            className={`w-full ${t.inputBg} border ${t.inputBorder} rounded-xl pl-9 pr-4 py-2.5 text-sm ${t.inputText} focus:outline-none`}
            placeholder="Buscar por nome, e-mail ou documento..."
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
          />
        </div>
        <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-none">
          {["todos", "gratuito", "basico", "profissional", "agenda", "gestao"].map((p) => (
            <button key={p} onClick={() => setFiltroPlano(p)}
              className={`px-3 py-2 rounded-xl text-xs font-bold transition-all capitalize shrink-0 ${
                filtroPlano === p ? "bg-primary text-white" : "bg-white border border-gray-300 text-gray-700 hover:border-primary hover:text-primary"
              }`}>
              {p}
            </button>
          ))}
        </div>
      </div>

      {/* Tabela — desktop */}
      <div className={`hidden md:block ${t.cardBg} border ${t.border} rounded-2xl overflow-hidden`}>
        <div className={`grid grid-cols-[1fr_1fr_1fr_auto_auto] gap-4 px-5 py-3 border-b ${t.border} text-xs font-bold ${t.textMuted2} uppercase tracking-wider`}>
          <span>Empresa</span><span>Contato</span><span>Área</span><span>Plano</span><span>Ações</span>
        </div>

        {filtradas.length > 0 ? filtradas.map((e) => {
          const docFormatado = e.tipo_documento === "cnpj"
            ? formatarCNPJ(e.documento ?? "")
            : formatarCPF(e.documento ?? "")
          const assinaturaAtiva = e.assinaturas?.find((a) => a.status === "ativa")

          return (
            <div key={e.id} className={`grid grid-cols-[1fr_1fr_1fr_auto_auto] gap-4 px-5 py-4 border-b ${t.borderLight} last:border-0 ${t.rowHover} transition-colors items-center`}>
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-9 h-9 rounded-xl bg-primary/20 flex items-center justify-center shrink-0 overflow-hidden">
                  {e.logo_url
                    ? <img src={e.logo_url} alt="" className="w-full h-full object-cover" />
                    : <span className="text-xs font-black text-primary">{e.nome.charAt(0)}</span>
                  }
                </div>
                <div className="min-w-0">
                  <p className={`text-sm font-semibold ${t.text} truncate`}>{e.nome}</p>
                  <p className={`text-xs ${t.textMuted2}`}>{docFormatado}</p>
                  <p className={`text-xs ${t.textMuted5}`}>{format(parseISO(e.created_at), "dd/MM/yyyy")}</p>
                  {subEmpresasCount(e.user_id) > 0 && (
                    <p className="text-[10px] text-primary font-semibold">
                      +{subEmpresasCount(e.user_id)} empresa(s) vinculada(s)
                    </p>
                  )}
                </div>
              </div>
              <div className="min-w-0">
                <p className={`text-xs ${t.textMuted4} truncate`}>{e.email}</p>
                <p className={`text-xs ${t.textMuted2}`}>{formatarTelefone(e.telefone)}</p>
              </div>
              <p className={`text-xs ${t.textMuted3} truncate`}>{e.area_atuacao}</p>
              <div className="flex flex-col gap-1">
                <span className={`text-xs px-2 py-0.5 rounded-full border capitalize ${badgePlano[e.plano] ?? ""}`}>{e.plano}</span>
                {assinaturaAtiva && <span className="text-xs text-emerald-400">✓ ativa</span>}
                {!e.plano_ativo && <span className="text-xs text-red-400">⛔ inativa</span>}
              </div>
              <div className="flex items-center gap-1">
                <button onClick={() => router.push(`/admin/empresas/${e.id}`)} className={`p-1.5 rounded-lg ${t.hoverBgBtn} ${t.textMuted} hover:text-white transition-colors`} title="Ver detalhes"><Eye className="w-3.5 h-3.5" /></button>
                <button onClick={() => enviarAlertaVencimento(e)} className={`p-1.5 rounded-lg ${t.hoverBgBtn} text-yellow-400/60 hover:text-yellow-400 transition-colors`} title="Alerta"><Bell className="w-3.5 h-3.5" /></button>
                <button onClick={() => toggleAtivo(e)} className={`p-1.5 rounded-lg ${t.hoverBgBtn} transition-colors ${e.plano_ativo ? "text-emerald-400 hover:text-red-400" : "text-red-400 hover:text-emerald-400"}`} title={e.plano_ativo ? "Desativar" : "Reativar"}>{e.plano_ativo ? <Shield className="w-3.5 h-3.5" /> : <ShieldOff className="w-3.5 h-3.5" />}</button>
                <button onClick={() => excluirEmpresa(e)} className={`p-1.5 rounded-lg ${t.hoverBgBtn} text-red-400/60 hover:text-red-400 transition-colors`} title="Excluir"><Trash2 className="w-3.5 h-3.5" /></button>
              </div>
            </div>
          )
        }) : (
          <div className={`py-12 text-center ${t.textMuted2}`}>
            <Building2 className="w-8 h-8 mx-auto mb-2 opacity-40" />
            <p>Nenhuma empresa encontrada</p>
          </div>
        )}
      </div>

      {/* Cards — mobile */}
      <div className={`md:hidden ${t.cardBg} border ${t.border} rounded-2xl overflow-hidden`}>
        {filtradas.length > 0 ? filtradas.map((e, idx) => {
          const docFormatado = e.tipo_documento === "cnpj"
            ? formatarCNPJ(e.documento ?? "")
            : formatarCPF(e.documento ?? "")
          const assinaturaAtiva = e.assinaturas?.find((a) => a.status === "ativa")
          return (
            <div key={e.id} className={`p-4 ${idx > 0 ? `border-t ${t.borderLight}` : ""}`}>
              {/* Linha 1: logo + nome + plano + ações */}
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-primary/20 flex items-center justify-center shrink-0 overflow-hidden">
                  {e.logo_url
                    ? <img src={e.logo_url} alt="" className="w-full h-full object-cover" />
                    : <span className="text-sm font-black text-primary">{e.nome.charAt(0)}</span>
                  }
                </div>
                <div className="flex-1 min-w-0">
                  <p className={`text-sm font-bold ${t.text} truncate`}>{e.nome}</p>
                  <p className={`text-xs ${t.textMuted2} truncate`}>{docFormatado}</p>
                  {subEmpresasCount(e.user_id) > 0 && (
                    <p className="text-[10px] text-primary font-semibold mt-0.5">
                      +{subEmpresasCount(e.user_id)} empresa(s) vinculada(s)
                    </p>
                  )}
                </div>
                <div className="flex flex-col items-end gap-1 shrink-0">
                  <span className={`text-xs px-2 py-0.5 rounded-full border capitalize ${badgePlano[e.plano] ?? ""}`}>{e.plano}</span>
                  {assinaturaAtiva && <span className="text-[10px] text-emerald-400 font-semibold">✓ ativa</span>}
                  {!e.plano_ativo && <span className="text-[10px] text-red-400 font-semibold">inativa</span>}
                </div>
              </div>

              {/* Linha 2: email + telefone + área */}
              <div className={`mt-2.5 pt-2.5 border-t ${t.borderLight} grid grid-cols-2 gap-1`}>
                <p className={`text-xs ${t.textMuted3} truncate`}>{e.email}</p>
                <p className={`text-xs ${t.textMuted3} text-right`}>{formatarTelefone(e.telefone)}</p>
                <p className={`text-xs ${t.textMuted2} truncate col-span-2`}>{e.area_atuacao}</p>
              </div>

              {/* Linha 3: ações */}
              <div className={`mt-2.5 pt-2.5 border-t ${t.borderLight} flex items-center gap-2`}>
                <button onClick={() => router.push(`/admin/empresas/${e.id}`)}
                  className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl text-xs font-semibold ${t.subBg} ${t.textMuted4} border ${t.border}`}>
                  <Eye className="w-3.5 h-3.5" />Ver detalhes
                </button>
                <button onClick={() => enviarAlertaVencimento(e)}
                  className={`p-2 rounded-xl ${t.subBg} border ${t.border} text-yellow-400`} title="Alerta">
                  <Bell className="w-4 h-4" />
                </button>
                <button onClick={() => toggleAtivo(e)}
                  className={`p-2 rounded-xl ${t.subBg} border ${t.border} ${e.plano_ativo ? "text-emerald-400" : "text-red-400"}`}>
                  {e.plano_ativo ? <Shield className="w-4 h-4" /> : <ShieldOff className="w-4 h-4" />}
                </button>
                <button onClick={() => excluirEmpresa(e)}
                  className={`p-2 rounded-xl ${t.subBg} border ${t.border} text-red-400`}>
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          )
        }) : (
          <div className={`py-12 text-center ${t.textMuted2}`}>
            <Building2 className="w-8 h-8 mx-auto mb-2 opacity-40" />
            <p>Nenhuma empresa encontrada</p>
          </div>
        )}
      </div>

      {/* Modal Cadastrar Empresa */}
      {modalCadastro && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm" onClick={() => setModalCadastro(false)}>
          <div
            className={`${t.cardBg} border ${t.border} rounded-2xl shadow-2xl p-6 w-full max-w-md mx-4`}
            onClick={(e) => e.stopPropagation()}
          >
            <h2 className={`text-lg font-black ${t.text} mb-4`}>Nova Empresa</h2>
            <div className="space-y-3">
              {/* Plano gestão: nome do titular em vez de nome da empresa */}
              {formCadastro.plano === "gestao" ? (
                <div>
                  <label className={`text-xs font-semibold ${t.textMuted} block mb-1`}>Nome do titular *</label>
                  <input
                    className={`w-full ${t.inputBg} border ${t.inputBorder} rounded-xl px-3 py-2.5 text-sm ${t.inputText} focus:outline-none`}
                    placeholder="Nome completo do cliente"
                    value={formCadastro.nome_titular}
                    onChange={(e) => setFormCadastro((f) => ({ ...f, nome_titular: e.target.value }))}
                  />
                </div>
              ) : (
                <div>
                  <label className={`text-xs font-semibold ${t.textMuted} block mb-1`}>Nome da empresa *</label>
                  <input
                    className={`w-full ${t.inputBg} border ${t.inputBorder} rounded-xl px-3 py-2.5 text-sm ${t.inputText} focus:outline-none`}
                    placeholder="Ex: Salão da Maria"
                    value={formCadastro.nome_empresa}
                    onChange={(e) => setFormCadastro((f) => ({ ...f, nome_empresa: e.target.value }))}
                  />
                </div>
              )}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className={`text-xs font-semibold ${t.textMuted} block mb-1`}>E-mail (login) *</label>
                  <input
                    type="email"
                    className={`w-full ${t.inputBg} border ${t.inputBorder} rounded-xl px-3 py-2.5 text-sm ${t.inputText} focus:outline-none`}
                    placeholder="email@exemplo.com"
                    value={formCadastro.email}
                    onChange={(e) => setFormCadastro((f) => ({ ...f, email: e.target.value }))}
                  />
                </div>
                <div>
                  <label className={`text-xs font-semibold ${t.textMuted} block mb-1`}>Senha *</label>
                  <input
                    type="text"
                    className={`w-full ${t.inputBg} border ${t.inputBorder} rounded-xl px-3 py-2.5 text-sm ${t.inputText} focus:outline-none`}
                    placeholder="Mín. 6 caracteres"
                    value={formCadastro.senha}
                    onChange={(e) => setFormCadastro((f) => ({ ...f, senha: e.target.value }))}
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className={`text-xs font-semibold ${t.textMuted} block mb-1`}>Telefone *</label>
                  <input
                    className={`w-full ${t.inputBg} border ${t.inputBorder} rounded-xl px-3 py-2.5 text-sm ${t.inputText} focus:outline-none`}
                    placeholder="(11) 99999-9999"
                    value={formCadastro.telefone}
                    onChange={(e) => setFormCadastro((f) => ({ ...f, telefone: e.target.value }))}
                  />
                </div>
                <div>
                  <label className={`text-xs font-semibold ${t.textMuted} block mb-1`}>Área de atuação *</label>
                  <input
                    className={`w-full ${t.inputBg} border ${t.inputBorder} rounded-xl px-3 py-2.5 text-sm ${t.inputText} focus:outline-none`}
                    placeholder="Ex: Barbearia"
                    value={formCadastro.area_atuacao}
                    onChange={(e) => setFormCadastro((f) => ({ ...f, area_atuacao: e.target.value }))}
                  />
                </div>
              </div>
              <div>
                <label className={`text-xs font-semibold ${t.textMuted} block mb-1`}>Plano</label>
                <select
                  className={`w-full ${t.inputBg} border ${t.inputBorder} rounded-xl px-3 py-2.5 text-sm ${t.inputText} focus:outline-none`}
                  value={formCadastro.plano}
                  onChange={(e) => setFormCadastro((f) => ({ ...f, plano: e.target.value }))}
                >
                  <option value="gratuito">Gratuito</option>
                  <option value="basico">Básico</option>
                  <option value="profissional">Profissional</option>
                  <option value="agenda">Agenda</option>
                  <option value="gestao">Gestão</option>
                </select>
              </div>
              {formCadastro.plano === "gestao" && (
                <div>
                  <label className={`text-xs font-semibold ${t.textMuted} block mb-1`}>Qtd. de empresas liberadas</label>
                  <input
                    type="number"
                    min="1"
                    max="50"
                    className={`w-full ${t.inputBg} border ${t.inputBorder} rounded-xl px-3 py-2.5 text-sm ${t.inputText} focus:outline-none`}
                    placeholder="1"
                    value={formCadastro.max_empresas}
                    onChange={(e) => setFormCadastro((f) => ({ ...f, max_empresas: e.target.value }))}
                  />
                  <p className={`text-[10px] ${t.textMuted} mt-1`}>
                    Valor total: R$ {((parseFloat(formCadastro.max_empresas) || 1) * 29.9).toFixed(2).replace(".", ",")}/mês
                  </p>
                </div>
              )}
            </div>
            <div className="flex gap-3 mt-5">
              <button
                onClick={() => setModalCadastro(false)}
                className={`flex-1 py-2.5 rounded-xl border ${t.border} ${t.text} text-sm font-semibold hover:opacity-80 transition-opacity`}
              >
                Cancelar
              </button>
              <button
                onClick={cadastrarEmpresa}
                disabled={cadastroLoading}
                className="flex-1 py-2.5 rounded-xl bg-primary text-white text-sm font-bold hover:opacity-90 transition-opacity flex items-center justify-center gap-2"
              >
                {cadastroLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
                Cadastrar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
