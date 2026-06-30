"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { format, parseISO, addDays, addMonths } from "date-fns"
import { ptBR } from "date-fns/locale"
import {
  ArrowLeft, Building2, Mail, Phone, MessageSquare, Plus, Send, Loader2,
  Trash2, AlertTriangle, CreditCard, Edit2, Save, X, Gift, Calendar,
  CheckCircle, Clock, XCircle, QrCode, BadgeCheck
} from "lucide-react"
import { toast } from "sonner"
import { formatarCNPJ, formatarCPF, formatarTelefone, formatarMoeda } from "@/lib/utils"
import { useAdminTema } from "@/components/admin/admin-tema-context"
import { cn } from "@/lib/utils"

interface Empresa {
  id: string; nome: string; email: string; telefone: string; area_atuacao: string
  plano: string; plano_ativo: boolean; tipo_documento: string; documento: string
  endereco_rua: string; endereco_numero: string; endereco_bairro: string
  endereco_cidade: string; endereco_estado: string; endereco_cep: string
  created_at: string; logo_url: string | null
}

type Aba = "dados" | "assinaturas" | "notas" | "email" | "perigo"

const PLANOS = ["gratuito", "basico", "profissional", "agenda"]
const PLANOS_PAGOS = ["basico", "profissional", "agenda"]
const DIAS_TESTE = [7, 15, 30]
const BADGE_STATUS: Record<string, string> = {
  ativa:     "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
  pendente:  "bg-yellow-500/10 text-yellow-400 border-yellow-500/20",
  cancelada: "bg-red-500/10 text-red-400 border-red-500/20",
  pausada:   "bg-gray-500/10 text-gray-400 border-gray-500/20",
}

export function AdminEmpresaDetalhe({ empresa: empInit, assinaturas: assInit, notas: notasInit, tickets }: {
  empresa: Empresa
  assinaturas: { id: string; plano: string; periodicidade: string; status: string; valor_total: number; forma_pagamento: string | null; created_at: string; data_fim: string | null }[]
  notas: { id: string; nota: string; created_at: string }[]
  tickets: { id: string; assunto: string; status: string; mensagem: string; resposta_admin: string | null; created_at: string }[]
}) {
  const [empresa, setEmpresa] = useState(empInit)
  const [assinaturas, setAssinaturas] = useState(assInit)
  const [notas, setNotas] = useState(notasInit)
  const [aba, setAba] = useState<Aba>("dados")
  const [loading, setLoading] = useState(false)
  const [t] = [useAdminTema()]
  const router = useRouter()

  // Edição de dados
  const [editando, setEditando] = useState(false)
  const [dadosEdit, setDadosEdit] = useState({
    nome: empresa.nome, telefone: empresa.telefone, area_atuacao: empresa.area_atuacao,
    endereco_rua: empresa.endereco_rua, endereco_numero: empresa.endereco_numero,
    endereco_bairro: empresa.endereco_bairro, endereco_cidade: empresa.endereco_cidade,
    endereco_estado: empresa.endereco_estado, endereco_cep: empresa.endereco_cep,
  })

  // Assinatura manual
  const [tipoAssinatura, setTipoAssinatura] = useState<"teste" | "pago">("teste")
  const [diasTeste, setDiasTeste] = useState(7)
  const [planoManual, setPlanoManual] = useState("profissional")
  const [mesesManual, setMesesManual] = useState(1)
  const [valorRecebido, setValorRecebido] = useState("")
  const [loadingAssinatura, setLoadingAssinatura] = useState(false)

  // Email
  const [emailAssunto, setEmailAssunto] = useState("")
  const [emailMensagem, setEmailMensagem] = useState("")

  // Notas
  const [novaNota, setNovaNota] = useState("")

  // Perigo
  const [confirmZerar, setConfirmZerar] = useState(false)
  const [zerandoConta, setZerandoConta] = useState(false)

  const docFormatado = empresa.tipo_documento === "cnpj"
    ? formatarCNPJ(empresa.documento ?? "")
    : formatarCPF(empresa.documento ?? "")

  const valoresPadrao: Record<string, number> = { basico: 49, profissional: 99, agenda: 29 }
  const valorPadrao = (valoresPadrao[planoManual] ?? 49) * mesesManual
  const valorDesc = valorRecebido ? Math.max(0, valorPadrao - parseFloat(valorRecebido)) : 0

  async function salvarDados() {
    setLoading(true)
    const res = await fetch("/api/admin/empresas/atualizar", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ empresa_id: empresa.id, dados: dadosEdit }),
    })
    if (res.ok) {
      setEmpresa((p) => ({ ...p, ...dadosEdit }))
      setEditando(false)
      toast.success("Dados atualizados!")
    } else toast.error("Erro ao salvar.")
    setLoading(false)
  }

  async function criarAssinatura() {
    setLoadingAssinatura(true)
    const body = tipoAssinatura === "teste"
      ? { empresa_id: empresa.id, tipo: "teste", plano: planoManual, dias_teste: diasTeste }
      : { empresa_id: empresa.id, tipo: "pago", plano: planoManual, meses: mesesManual, valor_recebido: valorRecebido || undefined }

    const res = await fetch("/api/admin/assinaturas/manual", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    })
    const data = await res.json()
    if (res.ok) {
      toast.success(data.mensagem)
      setEmpresa((p) => ({ ...p, plano: planoManual, plano_ativo: true }))
      // Recarregar assinaturas
      window.location.reload()
    } else toast.error(data.erro ?? "Erro ao criar assinatura.")
    setLoadingAssinatura(false)
  }

  async function enviarEmail() {
    if (!emailAssunto || !emailMensagem) { toast.error("Preencha assunto e mensagem."); return }
    setLoading(true)
    const res = await fetch("/api/admin/suporte/enviar-email", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ empresa_id: empresa.id, email: empresa.email, assunto: emailAssunto, mensagem: emailMensagem }),
    })
    if (res.ok) { toast.success("E-mail enviado!"); setEmailAssunto(""); setEmailMensagem("") }
    else toast.error("Erro ao enviar e-mail.")
    setLoading(false)
  }

  async function salvarNota() {
    if (!novaNota.trim()) return
    const res = await fetch("/api/admin/notas", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ empresa_id: empresa.id, nota: novaNota }),
    })
    if (res.ok) {
      const data = await res.json()
      setNotas((p) => [data, ...p])
      setNovaNota("")
      toast.success("Nota salva!")
    }
  }

  async function zerarConta() {
    setZerandoConta(true)
    try {
      const res = await fetch("/api/admin/empresas/zerar-conta", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ empresa_id: empresa.id }),
      })
      const data = await res.json()
      if (!res.ok) { toast.error(data.erro ?? "Erro ao zerar."); return }
      toast.success(data.mensagem)
      setConfirmZerar(false)
    } catch { toast.error("Erro de conexão.") }
    setZerandoConta(false)
  }

  const abas: { id: Aba; label: string }[] = [
    { id: "dados",        label: "Dados" },
    { id: "assinaturas",  label: "Assinaturas" },
    { id: "notas",        label: `Notas${notas.length ? ` (${notas.length})` : ""}` },
    { id: "email",        label: "E-mail" },
    { id: "perigo",       label: "⚠️ Perigo" },
  ]

  return (
    <div className="space-y-5 max-w-4xl">
      {/* Header */}
      <div className="flex items-center gap-3">
        <button onClick={() => router.back()} className={`p-2 ${t.hoverBg} rounded-xl transition-colors ${t.textMuted} hover:text-white`}>
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div className="flex items-center gap-3 flex-1 min-w-0">
          <div className="w-12 h-12 rounded-2xl bg-primary/20 flex items-center justify-center overflow-hidden shrink-0">
            {empresa.logo_url
              ? <img src={empresa.logo_url} alt="" className="w-full h-full object-cover" />
              : <span className="text-lg font-black text-primary">{empresa.nome.charAt(0)}</span>}
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className={`text-xl font-black ${t.text} truncate`}>{empresa.nome}</h1>
              <span className={`text-xs px-2 py-0.5 rounded-full border capitalize ${BADGE_STATUS[empresa.plano_ativo ? "ativa" : "cancelada"]}`}>
                {empresa.plano} {empresa.plano_ativo ? "✓" : "inativo"}
              </span>
            </div>
            <p className={`${t.textMuted} text-xs`}>{empresa.email} · cadastro em {format(parseISO(empresa.created_at), "dd/MM/yyyy")}</p>
          </div>
        </div>
      </div>

      {/* Abas */}
      <div className={`flex gap-1 p-1 ${t.subBg} rounded-xl border ${t.border} overflow-x-auto`}>
        {abas.map((a) => (
          <button key={a.id} onClick={() => setAba(a.id)}
            className={cn("px-3 py-2 rounded-lg text-xs font-semibold transition-all shrink-0 whitespace-nowrap",
              aba === a.id ? "bg-primary text-white" : `${t.textMuted3} hover:text-white ${t.hoverBg}`)}>
            {a.label}
          </button>
        ))}
      </div>

      {/* ── ABA DADOS ── */}
      {aba === "dados" && (
        <div className={`${t.cardBg} border ${t.border} rounded-2xl p-5 space-y-4`}>
          <div className="flex items-center justify-between">
            <h3 className={`text-sm font-bold ${t.text} flex items-center gap-2`}>
              <Building2 className="w-4 h-4 text-primary" />Dados da empresa
            </h3>
            {!editando
              ? <button onClick={() => setEditando(true)} className={`flex items-center gap-1.5 text-xs font-bold px-3 py-1.5 rounded-lg ${t.subBg} ${t.textMuted4} border ${t.border} hover:border-primary/50 transition-all`}>
                  <Edit2 className="w-3.5 h-3.5" />Editar
                </button>
              : <div className="flex gap-2">
                  <button onClick={() => { setEditando(false); setDadosEdit({ nome: empresa.nome, telefone: empresa.telefone, area_atuacao: empresa.area_atuacao, endereco_rua: empresa.endereco_rua, endereco_numero: empresa.endereco_numero, endereco_bairro: empresa.endereco_bairro, endereco_cidade: empresa.endereco_cidade, endereco_estado: empresa.endereco_estado, endereco_cep: empresa.endereco_cep }) }}
                    className={`flex items-center gap-1 text-xs px-3 py-1.5 rounded-lg border ${t.border} ${t.textMuted4}`}>
                    <X className="w-3.5 h-3.5" />Cancelar
                  </button>
                  <button onClick={salvarDados} disabled={loading} className="flex items-center gap-1 text-xs font-bold px-3 py-1.5 rounded-lg bg-primary text-white hover:bg-primary/90 disabled:opacity-50">
                    {loading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}Salvar
                  </button>
                </div>
            }
          </div>

          {!editando ? (
            <div className="grid grid-cols-2 gap-3 text-sm">
              {[
                { label: "Documento", valor: docFormatado },
                { label: "E-mail", valor: empresa.email },
                { label: "Telefone", valor: formatarTelefone(empresa.telefone) },
                { label: "Área", valor: empresa.area_atuacao },
                { label: "Rua", valor: `${empresa.endereco_rua}, ${empresa.endereco_numero}` },
                { label: "Bairro", valor: empresa.endereco_bairro },
                { label: "Cidade/UF", valor: `${empresa.endereco_cidade}/${empresa.endereco_estado}` },
                { label: "CEP", valor: empresa.endereco_cep },
              ].map((f) => (
                <div key={f.label}>
                  <p className={`${t.textMuted2} text-xs`}>{f.label}</p>
                  <p className={`${t.text} font-medium text-sm`}>{f.valor}</p>
                </div>
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {[
                { label: "Nome", key: "nome" }, { label: "Telefone", key: "telefone" },
                { label: "Área de atuação", key: "area_atuacao" }, { label: "Rua", key: "endereco_rua" },
                { label: "Número", key: "endereco_numero" }, { label: "Bairro", key: "endereco_bairro" },
                { label: "Cidade", key: "endereco_cidade" }, { label: "Estado (UF)", key: "endereco_estado" },
                { label: "CEP", key: "endereco_cep" },
              ].map((f) => (
                <div key={f.key} className="space-y-1">
                  <label className={`text-xs font-semibold ${t.textMuted3}`}>{f.label}</label>
                  <input
                    value={(dadosEdit as Record<string, string>)[f.key] ?? ""}
                    onChange={(e) => setDadosEdit((p) => ({ ...p, [f.key]: e.target.value }))}
                    className={`w-full h-9 rounded-xl border ${t.inputBorder} ${t.inputBg} px-3 text-sm ${t.inputText} focus:outline-none focus:border-primary`}
                  />
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ── ABA ASSINATURAS ── */}
      {aba === "assinaturas" && (
        <div className="space-y-4">
          {/* Criar assinatura manual */}
          <div className={`${t.cardBg} border ${t.border} rounded-2xl p-5 space-y-4`}>
            <h3 className={`text-sm font-bold ${t.text} flex items-center gap-2`}>
              <BadgeCheck className="w-4 h-4 text-primary" />Criar assinatura manual
            </h3>

            {/* Tipo */}
            <div className="flex gap-2">
              {(["teste", "pago"] as const).map((tipo) => (
                <button key={tipo} onClick={() => setTipoAssinatura(tipo)}
                  className={cn("flex-1 py-2.5 rounded-xl border text-sm font-bold transition-all capitalize",
                    tipoAssinatura === tipo ? "bg-primary text-white border-primary" : `${t.subBg} ${t.textMuted4} border-${t.border} hover:border-primary/40`)}>
                  {tipo === "teste" ? "🎁 Período de Teste" : "💳 Plano Pago"}
                </button>
              ))}
            </div>

            {/* Plano */}
            <div className="space-y-1.5">
              <label className={`text-xs font-semibold ${t.textMuted3}`}>Plano</label>
              <select value={planoManual} onChange={(e) => setPlanoManual(e.target.value)}
                className={`w-full h-10 rounded-xl border ${t.border} ${t.subBg} px-3 text-sm ${t.text} focus:outline-none cursor-pointer`}>
                {PLANOS_PAGOS.map((p) => <option key={p} value={p} className="capitalize">{p.charAt(0).toUpperCase() + p.slice(1)}</option>)}
              </select>
            </div>

            {tipoAssinatura === "teste" ? (
              <div className="space-y-1.5">
                <label className={`text-xs font-semibold ${t.textMuted3}`}>Duração do teste</label>
                <div className="grid grid-cols-3 gap-2">
                  {DIAS_TESTE.map((d) => (
                    <button key={d} onClick={() => setDiasTeste(d)}
                      className={cn("py-2.5 rounded-xl border text-sm font-bold transition-all",
                        diasTeste === d ? "bg-primary text-white border-primary" : `${t.subBg} ${t.textMuted4} border-${t.border}`)}>
                      {d} dias
                    </button>
                  ))}
                </div>
                <p className={`text-xs ${t.textMuted} pt-1`}>
                  Acesso gratuito ao plano {planoManual} por {diasTeste} dias.
                  Vence em {format(addDays(new Date(), diasTeste), "dd/MM/yyyy")}.
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <label className={`text-xs font-semibold ${t.textMuted3}`}>Duração (meses)</label>
                    <select value={mesesManual} onChange={(e) => setMesesManual(parseInt(e.target.value))}
                      className={`w-full h-10 rounded-xl border ${t.border} ${t.subBg} px-3 text-sm ${t.text} focus:outline-none cursor-pointer`}>
                      {Array.from({ length: 48 }, (_, i) => i + 1).map((m) => (
                        <option key={m} value={m}>{m} {m === 1 ? "mês" : "meses"}</option>
                      ))}
                    </select>
                  </div>
                  <div className="space-y-1.5">
                    <label className={`text-xs font-semibold ${t.textMuted3}`}>
                      Valor recebido (R$) — padrão: R${valorPadrao}
                    </label>
                    <input
                      type="number" step="0.01" min="0"
                      value={valorRecebido}
                      onChange={(e) => setValorRecebido(e.target.value)}
                      placeholder={`${valorPadrao.toFixed(2)}`}
                      className={`w-full h-10 rounded-xl border ${t.inputBorder} ${t.inputBg} px-3 text-sm ${t.inputText} focus:outline-none focus:border-primary`}
                    />
                  </div>
                </div>
                {valorDesc > 0 && (
                  <p className="text-xs text-amber-400 bg-amber-500/10 border border-amber-500/20 rounded-lg px-3 py-2">
                    💡 Desconto aplicado: <strong>R${valorDesc.toFixed(2)}</strong> — cliente paga R${parseFloat(valorRecebido).toFixed(2)} de R${valorPadrao.toFixed(2)}
                  </p>
                )}
                <p className={`text-xs ${t.textMuted}`}>
                  Plano ativo até {format(addMonths(new Date(), mesesManual), "dd/MM/yyyy", { locale: ptBR })}. Não gera venda no sistema.
                </p>
              </div>
            )}

            <button onClick={criarAssinatura} disabled={loadingAssinatura}
              className="w-full h-11 rounded-xl bg-primary text-white font-bold text-sm hover:bg-primary/90 transition-all disabled:opacity-50 flex items-center justify-center gap-2">
              {loadingAssinatura ? <Loader2 className="w-4 h-4 animate-spin" /> : <BadgeCheck className="w-4 h-4" />}
              {tipoAssinatura === "teste" ? `Ativar ${diasTeste} dias grátis` : `Ativar plano por ${mesesManual} ${mesesManual === 1 ? "mês" : "meses"}`}
            </button>
          </div>

          {/* Histórico de assinaturas */}
          <div className={`${t.cardBg} border ${t.border} rounded-2xl overflow-hidden`}>
            <div className={`px-5 py-3 border-b ${t.border}`}>
              <h3 className={`text-sm font-bold ${t.text}`}>Histórico de assinaturas ({assinaturas.length})</h3>
            </div>
            {assinaturas.length > 0 ? (
              <div className="divide-y divide-white/5">
                {assinaturas.map((a) => (
                  <div key={a.id} className={`flex items-center justify-between px-5 py-3.5 ${t.rowHover} transition-colors`}>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className={`text-sm font-semibold ${t.text} capitalize`}>{a.plano}</p>
                        <span className={`text-xs px-2 py-0.5 rounded-full border capitalize ${BADGE_STATUS[a.status] ?? ""}`}>{a.status}</span>
                        {a.forma_pagamento === null && <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-violet-500/10 text-violet-400">Manual</span>}
                      </div>
                      <p className={`text-xs ${t.textMuted2} mt-0.5`}>
                        {format(parseISO(a.created_at), "dd/MM/yyyy")}
                        {a.data_fim && ` → ${format(parseISO(a.data_fim), "dd/MM/yyyy")}`}
                        {a.forma_pagamento && ` · ${a.forma_pagamento}`}
                        {` · ${a.periodicidade}`}
                      </p>
                    </div>
                    <p className={`text-sm font-bold ${a.valor_total === 0 ? "text-violet-400" : "text-emerald-400"} shrink-0 ml-4`}>
                      {a.valor_total === 0 ? "Grátis" : formatarMoeda(a.valor_total)}
                    </p>
                  </div>
                ))}
              </div>
            ) : (
              <div className={`py-12 text-center ${t.textMuted2}`}>
                <CreditCard className="w-8 h-8 mx-auto mb-2 opacity-40" />
                <p className="text-sm">Nenhuma assinatura registrada</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── ABA NOTAS ── */}
      {aba === "notas" && (
        <div className={`${t.cardBg} border ${t.border} rounded-2xl p-5 space-y-4`}>
          <h3 className={`text-sm font-bold ${t.text} flex items-center gap-2`}>
            <MessageSquare className="w-4 h-4 text-primary" />Notas internas
          </h3>
          <div className="flex gap-2">
            <input value={novaNota} onChange={(e) => setNovaNota(e.target.value)} placeholder="Adicionar nota..."
              onKeyDown={(e) => e.key === "Enter" && salvarNota()}
              className={`flex-1 ${t.inputBg} border ${t.inputBorder} rounded-xl px-3 py-2 text-sm ${t.inputText} focus:outline-none`} />
            <button onClick={salvarNota} className="p-2 bg-primary rounded-xl hover:bg-primary/90 transition-colors">
              <Plus className="w-4 h-4 text-white" />
            </button>
          </div>
          <div className="space-y-2 max-h-80 overflow-y-auto">
            {notas.map((n) => (
              <div key={n.id} className={`${t.subBg} rounded-xl p-3`}>
                <p className={`text-sm ${t.textMuted6}`}>{n.nota}</p>
                <p className={`text-xs ${t.textMuted2} mt-1`}>{format(parseISO(n.created_at), "dd/MM/yyyy HH:mm")}</p>
              </div>
            ))}
            {notas.length === 0 && <p className={`${t.textMuted2} text-xs text-center py-4`}>Sem notas ainda</p>}
          </div>
        </div>
      )}

      {/* ── ABA EMAIL ── */}
      {aba === "email" && (
        <div className={`${t.cardBg} border ${t.border} rounded-2xl p-5 space-y-4`}>
          <h3 className={`text-sm font-bold ${t.text} flex items-center gap-2`}>
            <Mail className="w-4 h-4 text-primary" />Enviar e-mail para {empresa.email}
          </h3>
          <input value={emailAssunto} onChange={(e) => setEmailAssunto(e.target.value)} placeholder="Assunto"
            className={`w-full ${t.inputBg} border ${t.inputBorder} rounded-xl px-3 py-2.5 text-sm ${t.inputText} focus:outline-none`} />
          <textarea value={emailMensagem} onChange={(e) => setEmailMensagem(e.target.value)} placeholder="Mensagem..." rows={5}
            className={`w-full ${t.inputBg} border ${t.inputBorder} rounded-xl px-3 py-2.5 text-sm ${t.inputText} focus:outline-none resize-none`} />
          <button onClick={enviarEmail} disabled={loading}
            className="flex items-center gap-2 bg-primary text-white px-4 py-2.5 rounded-xl font-bold text-sm hover:bg-primary/90 disabled:opacity-50">
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
            Enviar e-mail
          </button>
        </div>
      )}

      {/* ── ABA PERIGO ── */}
      {aba === "perigo" && (
        <div className="rounded-2xl border border-red-500/30 bg-red-500/5 p-5 space-y-4">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-red-500" />
            <h3 className="font-bold text-sm text-red-500">Zona de Risco</h3>
          </div>
          <div className={`flex items-start justify-between gap-4 p-4 rounded-xl ${t.subBg} border border-red-500/20`}>
            <div>
              <p className={`text-sm font-semibold ${t.text}`}>Zerar conta</p>
              <p className={`text-xs ${t.textMuted} mt-0.5 max-w-sm`}>
                Remove todos os dados operacionais (vendas, caixas, agendamentos, orçamentos, tarefas).
                Preserva empresa, clientes, produtos, funcionários e plano.
              </p>
            </div>
            {!confirmZerar ? (
              <button onClick={() => setConfirmZerar(true)}
                className="shrink-0 flex items-center gap-1.5 px-3 py-2 rounded-xl border border-red-500/40 text-red-400 text-xs font-bold hover:bg-red-500/10 transition-colors">
                <Trash2 className="w-3.5 h-3.5" />Zerar
              </button>
            ) : (
              <div className="shrink-0 flex flex-col items-end gap-2">
                <p className="text-xs text-red-400 font-semibold">Tem certeza? Ação irreversível.</p>
                <div className="flex gap-2">
                  <button onClick={() => setConfirmZerar(false)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold ${t.subBg} ${t.textMuted4} border ${t.border}`}>
                    Cancelar
                  </button>
                  <button onClick={zerarConta} disabled={zerandoConta}
                    className="px-3 py-1.5 rounded-lg text-xs font-bold bg-red-500 text-white hover:bg-red-600 disabled:opacity-50 flex items-center gap-1.5">
                    {zerandoConta ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Trash2 className="w-3.5 h-3.5" />}
                    Confirmar
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
