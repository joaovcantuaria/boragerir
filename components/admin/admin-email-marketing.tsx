"use client"

import { useState, useMemo } from "react"
import { useAdminTema } from "@/components/admin/admin-tema-context"
import { toast } from "sonner"
import {
  Mail, Send, Eye, Search, Users, AlertTriangle,
  Megaphone, Gift, Rocket, Clock, Heart, Star, MessageSquare,
} from "lucide-react"

interface Empresa {
  id: string
  nome: string
  email: string | null
  plano: string | null
  endereco_estado: string | null
  user_id: string | null
}

interface Props {
  empresas: Empresa[]
}

type AudienceType = "todos" | "plano" | "regiao" | "individual"

interface Template {
  id: string
  nome: string
  descricao: string
  icon: React.ReactNode
  color: string
  assuntoPadrao: string
}

const TEMPLATES: Template[] = [
  { id: "promocao", nome: "Promoção Especial", descricao: "Desconto % em upgrade de plano", icon: <Megaphone className="w-5 h-5" />, color: "#F26E1D", assuntoPadrao: "🔥 Promoção Especial para você!" },
  { id: "cupom", nome: "Cupom Flash", descricao: "Cupom com código e validade", icon: <Gift className="w-5 h-5" />, color: "#22c55e", assuntoPadrao: "🎫 Cupom exclusivo para você!" },
  { id: "novidade", nome: "Novidade no Sistema", descricao: "Informar nova funcionalidade", icon: <Rocket className="w-5 h-5" />, color: "#6366f1", assuntoPadrao: "🚀 Novidade no Bora Gerir!" },
  { id: "vencimento", nome: "Lembrete de Vencimento", descricao: "Lembrar que plano está vencendo", icon: <Clock className="w-5 h-5" />, color: "#f59e0b", assuntoPadrao: "⚠️ Sua assinatura está vencendo" },
  { id: "boas-vindas", nome: "Boas-vindas", descricao: "Mensagem de boas-vindas personalizada", icon: <Heart className="w-5 h-5" />, color: "#ec4899", assuntoPadrao: "👋 Bem-vindo(a) ao Bora Gerir!" },
  { id: "upgrade", nome: "Convite para Upgrade", descricao: "Benefícios do plano superior", icon: <Star className="w-5 h-5" />, color: "#a855f7", assuntoPadrao: "⭐ Hora de crescer com o Bora Gerir!" },
  { id: "livre", nome: "Mensagem Livre", descricao: "Texto 100% customizável", icon: <MessageSquare className="w-5 h-5" />, color: "#64748b", assuntoPadrao: "" },
]

const PLANOS = ["gratuito", "agenda", "basico", "profissional", "gestao"]

export function AdminEmailMarketing({ empresas }: Props) {
  const t = useAdminTema()

  // Audience state
  const [audienceType, setAudienceType] = useState<AudienceType>("todos")
  const [planosSelecionados, setPlanosSelecionados] = useState<string[]>([])
  const [estadoFiltro, setEstadoFiltro] = useState("")
  const [buscaEmpresa, setBuscaEmpresa] = useState("")
  const [empresasSelecionadas, setEmpresasSelecionadas] = useState<string[]>([])

  // Template state
  const [templateSelecionado, setTemplateSelecionado] = useState<string | null>(null)
  const [assunto, setAssunto] = useState("")
  const [mensagem, setMensagem] = useState("")
  const [desconto, setDesconto] = useState("")
  const [detalhe, setDetalhe] = useState("")
  const [codigoCupom, setCodigoCupom] = useState("")
  const [validade, setValidade] = useState("")
  const [showPreview, setShowPreview] = useState(false)

  // Send state
  const [enviando, setEnviando] = useState(false)
  const [showConfirmacao, setShowConfirmacao] = useState(false)

  // Computed recipients
  const destinatarios = useMemo(() => {
    let filtered = empresas.filter((e) => e.email)
    switch (audienceType) {
      case "plano":
        if (planosSelecionados.length > 0) {
          filtered = filtered.filter((e) => planosSelecionados.includes(e.plano || "gratuito"))
        }
        break
      case "regiao":
        if (estadoFiltro.trim()) {
          filtered = filtered.filter((e) =>
            (e.endereco_estado || "").toLowerCase().includes(estadoFiltro.toLowerCase().trim())
          )
        }
        break
      case "individual":
        filtered = filtered.filter((e) => empresasSelecionadas.includes(e.id))
        break
    }
    return filtered
  }, [empresas, audienceType, planosSelecionados, estadoFiltro, empresasSelecionadas])

  const empresasBusca = useMemo(() => {
    if (!buscaEmpresa.trim()) return empresas.slice(0, 20)
    return empresas.filter((e) =>
      (e.nome || "").toLowerCase().includes(buscaEmpresa.toLowerCase()) ||
      (e.email || "").toLowerCase().includes(buscaEmpresa.toLowerCase())
    ).slice(0, 20)
  }, [empresas, buscaEmpresa])

  function handleSelectTemplate(id: string) {
    setTemplateSelecionado(id)
    const tmpl = TEMPLATES.find((t) => t.id === id)
    if (tmpl) setAssunto(tmpl.assuntoPadrao)
    setMensagem("")
    setDesconto("")
    setDetalhe("")
    setCodigoCupom("")
    setValidade("")
    setShowPreview(false)
  }

  function togglePlano(plano: string) {
    setPlanosSelecionados((prev) =>
      prev.includes(plano) ? prev.filter((p) => p !== plano) : [...prev, plano]
    )
  }

  function toggleEmpresa(id: string) {
    setEmpresasSelecionadas((prev) =>
      prev.includes(id) ? prev.filter((e) => e !== id) : [...prev, id]
    )
  }

  async function handleEnviar() {
    if (!templateSelecionado || !assunto.trim() || destinatarios.length === 0) {
      toast.error("Preencha todos os campos obrigatórios")
      return
    }
    setShowConfirmacao(false)
    setEnviando(true)

    try {
      const res = await fetch("/api/admin/email-marketing", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          template: templateSelecionado,
          assunto,
          destinatarios: destinatarios.map((e) => ({ email: e.email, nome: e.nome })),
          dados_template: {
            mensagem,
            desconto,
            detalhe,
            codigo_cupom: codigoCupom,
            validade,
            plano: planosSelecionados[0] || "",
          },
        }),
      })

      const data = await res.json()
      if (data.sucesso) {
        toast.success(`✅ Disparo concluído! ${data.enviados} e-mails enviados.${data.erros > 0 ? ` (${data.erros} erros)` : ""}`)
      } else {
        toast.error(data.erro || "Erro ao enviar disparos")
      }
    } catch {
      toast.error("Erro de conexão ao enviar disparos")
    } finally {
      setEnviando(false)
    }
  }

  const templateAtual = TEMPLATES.find((tpl) => tpl.id === templateSelecionado)

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className={`text-xl font-bold ${t.text}`}>Email Marketing — Disparos</h1>
          <p className={`text-sm mt-1 ${t.textMuted3}`}>
            Envie campanhas de e-mail para seus clientes
          </p>
        </div>
        <div className={`flex items-center gap-2 px-3 py-1.5 rounded-lg ${t.subBg}`}>
          <AlertTriangle className="w-3.5 h-3.5 text-amber-500" />
          <span className={`text-xs ${t.textMuted3}`}>Limite Brevo: 300 e-mails/dia</span>
        </div>
      </div>

      {/* ── SEÇÃO 1: Audiência ── */}
      <div className={`rounded-xl border ${t.border} ${t.cardBg} p-5`}>
        <div className="flex items-center gap-2 mb-4">
          <Users className="w-4 h-4 text-[#F26E1D]" />
          <h2 className={`text-sm font-semibold ${t.text}`}>Audiência</h2>
          <span className={`ml-auto text-xs font-medium px-2 py-0.5 rounded-full bg-[#F26E1D]/10 text-[#F26E1D]`}>
            {destinatarios.length} destinatário{destinatarios.length !== 1 ? "s" : ""}
          </span>
        </div>

        {/* Seletor de tipo */}
        <div className="flex flex-wrap gap-2 mb-4">
          {([
            { key: "todos", label: "Todos" },
            { key: "plano", label: "Por plano" },
            { key: "regiao", label: "Por região" },
            { key: "individual", label: "Individual" },
          ] as { key: AudienceType; label: string }[]).map((opt) => (
            <button
              key={opt.key}
              onClick={() => setAudienceType(opt.key)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                audienceType === opt.key
                  ? "bg-[#F26E1D] text-white"
                  : t.filterInativo
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>

        {/* Filtros por tipo */}
        {audienceType === "plano" && (
          <div className="flex flex-wrap gap-2">
            {PLANOS.map((plano) => (
              <label key={plano} className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs cursor-pointer transition-all ${
                planosSelecionados.includes(plano) ? "bg-[#F26E1D]/15 text-[#F26E1D] border border-[#F26E1D]/30" : `${t.subBg} ${t.textMuted3} border ${t.borderLight}`
              }`}>
                <input
                  type="checkbox"
                  checked={planosSelecionados.includes(plano)}
                  onChange={() => togglePlano(plano)}
                  className="sr-only"
                />
                <span className="capitalize">{plano}</span>
              </label>
            ))}
          </div>
        )}

        {audienceType === "regiao" && (
          <div className="max-w-xs">
            <input
              type="text"
              placeholder="Estado (UF), ex: SP, RJ, MG..."
              value={estadoFiltro}
              onChange={(e) => setEstadoFiltro(e.target.value)}
              className={`w-full px-3 py-2 rounded-lg text-sm border ${t.inputBorder} ${t.inputBg} ${t.inputText} outline-none`}
            />
          </div>
        )}

        {audienceType === "individual" && (
          <div className="space-y-3">
            <div className="relative max-w-sm">
              <Search className={`absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 ${t.textMuted}`} />
              <input
                type="text"
                placeholder="Buscar empresa..."
                value={buscaEmpresa}
                onChange={(e) => setBuscaEmpresa(e.target.value)}
                className={`w-full pl-9 pr-3 py-2 rounded-lg text-sm border ${t.inputBorder} ${t.inputBg} ${t.inputText} outline-none`}
              />
            </div>
            <div className={`max-h-48 overflow-y-auto rounded-lg border ${t.borderLight} divide-y ${t.borderLight}`}>
              {empresasBusca.map((emp) => (
                <label
                  key={emp.id}
                  className={`flex items-center gap-3 px-3 py-2 cursor-pointer transition-colors ${t.rowHover}`}
                >
                  <input
                    type="checkbox"
                    checked={empresasSelecionadas.includes(emp.id)}
                    onChange={() => toggleEmpresa(emp.id)}
                    className="w-3.5 h-3.5 rounded accent-[#F26E1D]"
                  />
                  <div className="flex-1 min-w-0">
                    <p className={`text-xs font-medium truncate ${t.text}`}>{emp.nome}</p>
                    <p className={`text-[10px] truncate ${t.textMuted}`}>{emp.email}</p>
                  </div>
                  <span className={`text-[10px] px-1.5 py-0.5 rounded ${t.subBg} ${t.textMuted3} capitalize`}>
                    {emp.plano || "gratuito"}
                  </span>
                </label>
              ))}
            </div>
            {empresasSelecionadas.length > 0 && (
              <p className={`text-xs ${t.textMuted3}`}>
                {empresasSelecionadas.length} empresa{empresasSelecionadas.length > 1 ? "s" : ""} selecionada{empresasSelecionadas.length > 1 ? "s" : ""}
              </p>
            )}
          </div>
        )}
      </div>

      {/* ── SEÇÃO 2: Templates ── */}
      <div className={`rounded-xl border ${t.border} ${t.cardBg} p-5`}>
        <div className="flex items-center gap-2 mb-4">
          <Mail className="w-4 h-4 text-[#F26E1D]" />
          <h2 className={`text-sm font-semibold ${t.text}`}>Template</h2>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
          {TEMPLATES.map((tmpl) => (
            <button
              key={tmpl.id}
              onClick={() => handleSelectTemplate(tmpl.id)}
              className={`relative flex flex-col items-center gap-2 p-4 rounded-xl border text-center transition-all ${
                templateSelecionado === tmpl.id
                  ? "border-[#F26E1D] bg-[#F26E1D]/5 ring-1 ring-[#F26E1D]/30"
                  : `${t.borderLight} ${t.hoverBg}`
              }`}
            >
              <div
                className="w-10 h-10 rounded-lg flex items-center justify-center"
                style={{ backgroundColor: tmpl.color + "18", color: tmpl.color }}
              >
                {tmpl.icon}
              </div>
              <p className={`text-xs font-semibold ${t.text}`}>{tmpl.nome}</p>
              <p className={`text-[10px] ${t.textMuted}`}>{tmpl.descricao}</p>
            </button>
          ))}
        </div>
      </div>

      {/* ── SEÇÃO 3: Customização do template ── */}
      {templateSelecionado && (
        <div className={`rounded-xl border ${t.border} ${t.cardBg} p-5 space-y-4`}>
          <div className="flex items-center gap-2 mb-2">
            <div className="w-6 h-6 rounded-md flex items-center justify-center"
              style={{ backgroundColor: templateAtual?.color + "18", color: templateAtual?.color }}>
              {templateAtual?.icon}
            </div>
            <h2 className={`text-sm font-semibold ${t.text}`}>Personalizar: {templateAtual?.nome}</h2>
          </div>

          {/* Assunto */}
          <div>
            <label className={`text-xs font-medium ${t.textMuted3} block mb-1.5`}>Assunto do e-mail *</label>
            <input
              type="text"
              value={assunto}
              onChange={(e) => setAssunto(e.target.value)}
              placeholder="Assunto do e-mail..."
              className={`w-full px-3 py-2 rounded-lg text-sm border ${t.inputBorder} ${t.inputBg} ${t.inputText} outline-none`}
            />
          </div>

          {/* Campos específicos por template */}
          {(templateSelecionado === "promocao") && (
            <>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className={`text-xs font-medium ${t.textMuted3} block mb-1.5`}>Desconto (%)</label>
                  <input
                    type="text"
                    value={desconto}
                    onChange={(e) => setDesconto(e.target.value)}
                    placeholder="Ex: 30"
                    className={`w-full px-3 py-2 rounded-lg text-sm border ${t.inputBorder} ${t.inputBg} ${t.inputText} outline-none`}
                  />
                </div>
                <div>
                  <label className={`text-xs font-medium ${t.textMuted3} block mb-1.5`}>Detalhe da promoção</label>
                  <input
                    type="text"
                    value={detalhe}
                    onChange={(e) => setDetalhe(e.target.value)}
                    placeholder="Ex: No plano Profissional"
                    className={`w-full px-3 py-2 rounded-lg text-sm border ${t.inputBorder} ${t.inputBg} ${t.inputText} outline-none`}
                  />
                </div>
              </div>
              <div>
                <label className={`text-xs font-medium ${t.textMuted3} block mb-1.5`}>Mensagem</label>
                <textarea
                  value={mensagem}
                  onChange={(e) => setMensagem(e.target.value)}
                  placeholder="Mensagem personalizada..."
                  rows={3}
                  className={`w-full px-3 py-2 rounded-lg text-sm border ${t.inputBorder} ${t.inputBg} ${t.inputText} outline-none resize-none`}
                />
              </div>
            </>
          )}

          {(templateSelecionado === "cupom") && (
            <>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className={`text-xs font-medium ${t.textMuted3} block mb-1.5`}>Código do cupom</label>
                  <input
                    type="text"
                    value={codigoCupom}
                    onChange={(e) => setCodigoCupom(e.target.value.toUpperCase())}
                    placeholder="Ex: PROMO30"
                    className={`w-full px-3 py-2 rounded-lg text-sm border ${t.inputBorder} ${t.inputBg} ${t.inputText} outline-none uppercase`}
                  />
                </div>
                <div>
                  <label className={`text-xs font-medium ${t.textMuted3} block mb-1.5`}>Validade</label>
                  <input
                    type="text"
                    value={validade}
                    onChange={(e) => setValidade(e.target.value)}
                    placeholder="Ex: 31/01/2025"
                    className={`w-full px-3 py-2 rounded-lg text-sm border ${t.inputBorder} ${t.inputBg} ${t.inputText} outline-none`}
                  />
                </div>
              </div>
              <div>
                <label className={`text-xs font-medium ${t.textMuted3} block mb-1.5`}>Mensagem</label>
                <textarea
                  value={mensagem}
                  onChange={(e) => setMensagem(e.target.value)}
                  placeholder="Mensagem personalizada..."
                  rows={3}
                  className={`w-full px-3 py-2 rounded-lg text-sm border ${t.inputBorder} ${t.inputBg} ${t.inputText} outline-none resize-none`}
                />
              </div>
            </>
          )}

          {(templateSelecionado === "livre") && (
            <div>
              <label className={`text-xs font-medium ${t.textMuted3} block mb-1.5`}>Mensagem completa *</label>
              <textarea
                value={mensagem}
                onChange={(e) => setMensagem(e.target.value)}
                placeholder="Escreva o conteúdo completo do e-mail aqui..."
                rows={6}
                className={`w-full px-3 py-2 rounded-lg text-sm border ${t.inputBorder} ${t.inputBg} ${t.inputText} outline-none resize-none`}
              />
            </div>
          )}

          {["novidade", "boas-vindas", "upgrade", "vencimento"].includes(templateSelecionado) && (
            <div>
              <label className={`text-xs font-medium ${t.textMuted3} block mb-1.5`}>Mensagem</label>
              <textarea
                value={mensagem}
                onChange={(e) => setMensagem(e.target.value)}
                placeholder="Mensagem personalizada..."
                rows={4}
                className={`w-full px-3 py-2 rounded-lg text-sm border ${t.inputBorder} ${t.inputBg} ${t.inputText} outline-none resize-none`}
              />
            </div>
          )}

          {/* Preview button */}
          <button
            onClick={() => setShowPreview(!showPreview)}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-medium border ${t.borderLight} ${t.textMuted3} ${t.hoverBgBtn} transition-all`}
          >
            <Eye className="w-3.5 h-3.5" />
            {showPreview ? "Fechar preview" : "Visualizar e-mail"}
          </button>

          {/* Preview */}
          {showPreview && (
            <div className={`rounded-lg border ${t.border} overflow-hidden`}>
              <div className={`px-3 py-2 text-xs font-medium ${t.subBg} ${t.textMuted3} border-b ${t.borderLight}`}>
                Preview — Assunto: {assunto || "(vazio)"}
              </div>
              <div className="bg-white p-4">
                <PreviewEmail
                  template={templateSelecionado}
                  dados={{ mensagem, desconto, detalhe, codigo_cupom: codigoCupom, validade }}
                />
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── SEÇÃO 4: Enviar ── */}
      {templateSelecionado && (
        <div className={`rounded-xl border ${t.border} ${t.cardBg} p-5`}>
          <div className="flex items-center justify-between">
            <div>
              <p className={`text-sm font-semibold ${t.text}`}>Pronto para enviar?</p>
              <p className={`text-xs mt-1 ${t.textMuted3}`}>
                {templateAtual?.nome} → {destinatarios.length} destinatário{destinatarios.length !== 1 ? "s" : ""}
              </p>
            </div>
            <button
              onClick={() => setShowConfirmacao(true)}
              disabled={enviando || destinatarios.length === 0 || !assunto.trim()}
              className="flex items-center gap-2 px-5 py-2.5 rounded-lg bg-[#F26E1D] text-white text-sm font-semibold hover:bg-[#d95f15] transition-all disabled:opacity-40 disabled:cursor-not-allowed"
            >
              {enviando ? (
                <>
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Enviando...
                </>
              ) : (
                <>
                  <Send className="w-4 h-4" />
                  Enviar Disparo
                </>
              )}
            </button>
          </div>
        </div>
      )}

      {/* ── Modal de Confirmação ── */}
      {showConfirmacao && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <div className="bg-white rounded-2xl p-6 max-w-sm w-full mx-4 shadow-2xl">
            <h3 className="text-lg font-bold text-gray-900 mb-2">Confirmar envio</h3>
            <div className="space-y-2 text-sm text-gray-600">
              <p><strong>Template:</strong> {templateAtual?.nome}</p>
              <p><strong>Assunto:</strong> {assunto}</p>
              <p><strong>Destinatários:</strong> {destinatarios.length}</p>
            </div>
            <div className="flex items-center gap-2 mt-4 p-2.5 rounded-lg bg-amber-50 border border-amber-200">
              <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
              <p className="text-xs text-amber-700">
                Esta ação não pode ser desfeita. Os e-mails serão enviados imediatamente.
              </p>
            </div>
            <div className="flex gap-3 mt-5">
              <button
                onClick={() => setShowConfirmacao(false)}
                className="flex-1 px-4 py-2 rounded-lg border border-gray-200 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={handleEnviar}
                className="flex-1 px-4 py-2 rounded-lg bg-[#F26E1D] text-white text-sm font-semibold hover:bg-[#d95f15] transition-colors"
              >
                Confirmar envio
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

// ── Preview Component ──
function PreviewEmail({ template, dados }: { template: string; dados: Record<string, string> }) {
  const nome = "João Silva"

  switch (template) {
    case "promocao":
      return (
        <div style={{ fontFamily: "Arial, sans-serif", color: "#555", lineHeight: 1.7 }}>
          <h2 style={{ color: "#1a1a1a", fontSize: 18 }}>🔥 Promoção Especial!</h2>
          <p>Olá, {nome}!</p>
          <p>{dados.mensagem || "(mensagem)"}</p>
          <div style={{ background: "#fff8f5", border: "2px solid #F26E1D", borderRadius: 12, padding: 20, textAlign: "center", margin: "20px 0" }}>
            <p style={{ fontSize: 32, fontWeight: 900, color: "#F26E1D", margin: 0 }}>{dados.desconto || "0"}% OFF</p>
            <p style={{ color: "#666", margin: "4px 0 0" }}>{dados.detalhe || "(detalhe)"}</p>
          </div>
          <div style={{ textAlign: "center" }}>
            <span style={{ display: "inline-block", background: "#F26E1D", color: "white", padding: "12px 28px", borderRadius: 8, fontWeight: 700, fontSize: 14 }}>
              Aproveitar agora →
            </span>
          </div>
        </div>
      )

    case "cupom":
      return (
        <div style={{ fontFamily: "Arial, sans-serif", color: "#555", lineHeight: 1.7 }}>
          <h2 style={{ color: "#1a1a1a", fontSize: 18 }}>🎫 Cupom Exclusivo!</h2>
          <p>Olá, {nome}!</p>
          <p>{dados.mensagem || "(mensagem)"}</p>
          <div style={{ background: "#f0fdf4", border: "2px dashed #22c55e", borderRadius: 12, padding: 20, textAlign: "center", margin: "20px 0" }}>
            <p style={{ color: "#666", fontSize: 12, margin: 0 }}>Seu código:</p>
            <p style={{ fontSize: 28, fontWeight: 900, color: "#16a34a", letterSpacing: 4, margin: "8px 0" }}>{dados.codigo_cupom || "CODIGO"}</p>
            <p style={{ color: "#666", fontSize: 12, margin: "4px 0 0" }}>Válido até {dados.validade || "(data)"}</p>
          </div>
          <div style={{ textAlign: "center" }}>
            <span style={{ display: "inline-block", background: "#F26E1D", color: "white", padding: "12px 28px", borderRadius: 8, fontWeight: 700, fontSize: 14 }}>
              Usar cupom →
            </span>
          </div>
        </div>
      )

    case "novidade":
      return (
        <div style={{ fontFamily: "Arial, sans-serif", color: "#555", lineHeight: 1.7 }}>
          <h2 style={{ color: "#1a1a1a", fontSize: 18 }}>🚀 Novidade no Bora Gerir!</h2>
          <p>Olá, {nome}!</p>
          <p>{dados.mensagem || "(mensagem)"}</p>
          <div style={{ textAlign: "center" }}>
            <span style={{ display: "inline-block", background: "#F26E1D", color: "white", padding: "12px 28px", borderRadius: 8, fontWeight: 700, fontSize: 14 }}>
              Conferir agora →
            </span>
          </div>
        </div>
      )

    case "vencimento":
      return (
        <div style={{ fontFamily: "Arial, sans-serif", color: "#555", lineHeight: 1.7 }}>
          <h2 style={{ color: "#1a1a1a", fontSize: 18 }}>⚠️ Sua assinatura está vencendo</h2>
          <p>Olá, {nome}!</p>
          <p>Sua assinatura do plano vence em breve. Renove para continuar com acesso completo.</p>
          <div style={{ textAlign: "center" }}>
            <span style={{ display: "inline-block", background: "#F26E1D", color: "white", padding: "12px 28px", borderRadius: 8, fontWeight: 700, fontSize: 14 }}>
              Renovar agora →
            </span>
          </div>
        </div>
      )

    case "boas-vindas":
      return (
        <div style={{ fontFamily: "Arial, sans-serif", color: "#555", lineHeight: 1.7 }}>
          <h2 style={{ color: "#1a1a1a", fontSize: 18 }}>👋 Bem-vindo(a) ao Bora Gerir!</h2>
          <p>Olá, {nome}!</p>
          <p>{dados.mensagem || "(mensagem)"}</p>
          <div style={{ textAlign: "center" }}>
            <span style={{ display: "inline-block", background: "#F26E1D", color: "white", padding: "12px 28px", borderRadius: 8, fontWeight: 700, fontSize: 14 }}>
              Acessar seu painel →
            </span>
          </div>
        </div>
      )

    case "upgrade":
      return (
        <div style={{ fontFamily: "Arial, sans-serif", color: "#555", lineHeight: 1.7 }}>
          <h2 style={{ color: "#1a1a1a", fontSize: 18 }}>⭐ Hora de crescer!</h2>
          <p>Olá, {nome}!</p>
          <p>{dados.mensagem || "(mensagem)"}</p>
          <div style={{ textAlign: "center" }}>
            <span style={{ display: "inline-block", background: "#F26E1D", color: "white", padding: "12px 28px", borderRadius: 8, fontWeight: 700, fontSize: 14 }}>
              Ver planos →
            </span>
          </div>
        </div>
      )

    case "livre":
      return (
        <div style={{ fontFamily: "Arial, sans-serif", color: "#555", lineHeight: 1.7 }}>
          <p>Olá, {nome}!</p>
          <p>{dados.mensagem || "(sua mensagem aqui)"}</p>
        </div>
      )

    default:
      return <p className="text-sm text-gray-500">Selecione um template para ver o preview.</p>
  }
}
