"use client"

import { useState, useEffect } from "react"
import { useSearchParams } from "next/navigation"
import { Check, CreditCard, QrCode, Loader2, Copy, CheckCircle, Zap, Crown, Star, Tag, X, AlertCircle, Calendar } from "lucide-react"
import { toast } from "sonner"
import { motion, AnimatePresence } from "framer-motion"
import { formatarMoeda, cn } from "@/lib/utils"
import type { Empresa } from "@/types"

type PlanoId = "agenda" | "basico" | "profissional"
type Periodicidade = "mensal" | "anual"
type FormaPag = "cartao" | "pix"

const planos = [
  {
    id: "agenda" as PlanoId,
    nome: "Agendamento Online",
    icon: Calendar,
    mensal: 29,
    anual: 290,
    economia: 58,
    popular: false,
    destaque: "Para salões e estúdios",
    recursos: [
      "Link de agendamento online público",
      "Gestão de agenda completa",
      "Até 3 colaboradores",
      "Configuração de horários",
      "QR Code para clientes",
      "Notificações de agendamento",
      "Módulo de tarefas",
    ],
  },
  {
    id: "basico" as PlanoId,
    nome: "Básico",
    icon: Zap,
    mensal: 49,
    anual: 490,
    economia: 98,
    popular: false,
    destaque: null,
    recursos: [
      "Até 200 clientes",
      "Produtos e serviços ilimitados",
      "Até 3 funcionários",
      "Gestão de agenda interna",
      "PDFs sem marca d'água",
      "Relatórios completos",
      "Controle de estoque",
      "Gestão de contratos",
      "Módulo de tarefas",
      "Deixar em débito",
      "Histórico de caixas",
    ],
  },
  {
    id: "profissional" as PlanoId,
    nome: "Profissional",
    icon: Crown,
    mensal: 99,
    anual: 990,
    economia: 198,
    popular: true,
    destaque: null,
    recursos: [
      "Clientes ilimitados",
      "Produtos e serviços ilimitados",
      "Funcionários ilimitados",
      "Agendamento online público",
      "Link e QR Code de agendamento",
      "Lembretes automáticos",
      "Programa de fidelidade",
      "Relatórios avançados",
      "Exportação de dados Excel",
      "PDFs sem marca d'água",
      "Gestão de contratos",
      "Módulo de tarefas",
      "Deixar em débito",
      "Histórico de caixas",
      "Suporte prioritário",
    ],
  },
]

interface Props {
  empresa: Empresa
  assinaturaAtiva: { plano: string; periodicidade: string; status: string; valor_total: number } | null
}

export function PlanosClient({ empresa, assinaturaAtiva }: Props) {
  const searchParams = useSearchParams()
  const planoParam = searchParams.get("plano") as PlanoId | null
  const isNovoCadastro = searchParams.get("novo") === "1"
  const statusParam = searchParams.get("status")

  const [periodicidade, setPeriodicidade] = useState<Periodicidade>("mensal")
  const [planoSel, setPlanoSel] = useState<PlanoId | null>(null)
  const [formaPag, setFormaPag] = useState<FormaPag>("pix")
  const [etapa, setEtapa] = useState<"planos" | "pagamento" | "pix-aguardando" | "sucesso">(
    statusParam === "aprovado" ? "sucesso" : "planos"
  )
  const [loading, setLoading] = useState(false)
  const [pixData, setPixData] = useState<{ qr_code: string; qr_code_text: string; payment_id: string; valor: number } | null>(null)
  const [copiado, setCopiado] = useState(false)
  const [nomeCartao, setNomeCartao] = useState("")
  const [numeroCartao, setNumeroCartao] = useState("")
  const [validade, setValidade] = useState("")
  const [cvv, setCvv] = useState("")
  // Cupom
  const [cupomCodigo, setCupomCodigo] = useState("")
  const [cupomInput, setCupomInput] = useState("")
  const [cupomDados, setCupomDados] = useState<{ tipo: string; valor: number; descricao: string | null } | null>(null)
  const [cupomErro, setCupomErro] = useState("")
  const [cupomLoading, setCupomLoading] = useState(false)

  // Pré-selecionar plano vindo do onboarding
  useEffect(() => {
    if (planoParam && (planoParam === "agenda" || planoParam === "basico" || planoParam === "profissional")) {
      setPlanoSel(planoParam)
      setEtapa("pagamento")
    }
  }, [planoParam])

  const planoEscolhido = planos.find((p) => p.id === planoSel)
  const valorBase = planoSel
    ? periodicidade === "anual" ? planos.find((p) => p.id === planoSel)!.anual : planos.find((p) => p.id === planoSel)!.mensal
    : 0

  // Calcular valor com desconto de cupom
  const valorComDesconto = cupomDados
    ? cupomDados.tipo === "percentual"
      ? Math.max(0.01, valorBase * (1 - cupomDados.valor / 100))
      : Math.max(0.01, valorBase - cupomDados.valor)
    : valorBase
  const valorEscolhido = valorComDesconto
  const descontoAplicado = valorBase - valorComDesconto

  async function validarCupom() {
    if (!cupomInput.trim()) return
    setCupomLoading(true)
    setCupomErro("")
    setCupomDados(null)
    setCupomCodigo("")
    try {
      const res = await fetch("/api/pagamentos/validar-cupom", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ codigo: cupomInput, plano: planoSel, periodicidade }),
      })
      const data = await res.json()
      if (!res.ok) {
        setCupomErro(data.erro ?? "Cupom inválido")
      } else {
        setCupomDados({ tipo: data.tipo, valor: data.valor, descricao: data.descricao })
        setCupomCodigo(data.codigo)
        toast.success(`Cupom aplicado: ${data.tipo === "percentual" ? `${data.valor}% de desconto` : `R$ ${data.valor} de desconto`}`)
      }
    } catch {
      setCupomErro("Erro ao validar cupom")
    }
    setCupomLoading(false)
  }

  function removerCupom() {
    setCupomDados(null)
    setCupomCodigo("")
    setCupomInput("")
    setCupomErro("")
  }

  function selecionarPlano(id: PlanoId) {
    if (empresa.plano === id && assinaturaAtiva?.status === "ativa") {
      toast.info("Você já tem este plano ativo.")
      return
    }
    setPlanoSel(id)
    setEtapa("pagamento")
  }

  async function gerarPix() {
    if (!planoSel) return
    setLoading(true)
    try {
      const res = await fetch("/api/pagamentos/criar-pix", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ plano: planoSel, periodicidade, cupom_codigo: cupomCodigo || undefined }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.erro)

      setPixData({ qr_code: data.qr_code, qr_code_text: data.qr_code_text, payment_id: data.payment_id, valor: data.valor })
      setEtapa("pix-aguardando")
      verificarPix(data.payment_id)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erro ao gerar Pix.")
    }
    setLoading(false)
  }

  function verificarPix(id: string) {
    const iv = setInterval(async () => {
      try {
        const r = await fetch(`/api/pagamentos/status?payment_id=${id}`)
        const d = await r.json()
        if (d.status === "approved") { clearInterval(iv); setEtapa("sucesso"); toast.success("Pagamento confirmado!") }
      } catch {}
    }, 5000)
    setTimeout(() => clearInterval(iv), 15 * 60 * 1000)
  }

  function copiarPix() {
    if (!pixData?.qr_code_text) return
    navigator.clipboard.writeText(pixData.qr_code_text)
    setCopiado(true); toast.success("Código copiado!")
    setTimeout(() => setCopiado(false), 3000)
  }

  // ── Sucesso ───────────────────────────────────────────────
  if (etapa === "sucesso") return (
    <div className="max-w-md mx-auto text-center py-20 space-y-6">
      <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: "spring" }}>
        <div className="w-20 h-20 rounded-full bg-[#F26E1D]/10 flex items-center justify-center mx-auto">
          <CheckCircle className="w-10 h-10 text-[#F26E1D]" />
        </div>
      </motion.div>
      <div>
        <h2 className="text-2xl font-black">Plano ativo! 🎉</h2>
        <p className="text-muted-foreground mt-2">Plano <strong>{planoEscolhido?.nome}</strong> ativado com sucesso.</p>
      </div>
      <button onClick={() => window.location.href = "/dashboard"}
        className="w-full py-3 rounded-xl bg-[#F26E1D] text-white font-bold hover:bg-[#e05e10] transition-colors">
        Ir para o Dashboard →
      </button>
    </div>
  )

  // ── Aguardando Pix ────────────────────────────────────────
  if (etapa === "pix-aguardando" && pixData) return (
    <div className="max-w-md mx-auto space-y-5">
      <div className="text-center">
        <h2 className="text-2xl font-black">Pague com Pix</h2>
        <p className="text-muted-foreground text-sm mt-1">{formatarMoeda(pixData.valor)} — aguardando confirmação</p>
      </div>
      <div className={cn(
        "rounded-2xl p-6 flex flex-col items-center gap-4 border",
        "bg-white border-gray-200 dark:bg-white/[0.03] dark:border-white/10"
      )}>
        {pixData.qr_code
          ? <img src={`data:image/png;base64,${pixData.qr_code}`} alt="QR Code Pix" className="w-52 h-52 rounded-xl" />
          : <QrCode className="w-24 h-24 text-muted-foreground" />
        }
        <p className="text-sm text-muted-foreground">Escaneie o QR code com seu banco</p>
      </div>
      <div>
        <label className="text-xs font-semibold text-muted-foreground block mb-1.5">Pix Copia e Cola</label>
        <div className="flex gap-2">
          <input value={pixData.qr_code_text || "Escaneie o QR Code acima"} readOnly
            className={cn(
              "flex-1 rounded-xl border px-3 py-2 text-xs font-mono",
              "bg-white border-gray-200 text-gray-600",
              "dark:bg-white/[0.03] dark:border-white/10 dark:text-gray-400"
            )} />
          {pixData.qr_code_text && (
          <button onClick={copiarPix}
            className={cn(
              "px-3 rounded-xl border font-semibold text-sm transition-colors",
              copiado
                ? "bg-emerald-500 text-white border-emerald-500"
                : "bg-white border-gray-200 text-gray-700 hover:border-[#F26E1D] hover:text-[#F26E1D] dark:bg-white/[0.03] dark:border-white/10 dark:text-gray-300"
            )}>
            {copiado ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
          </button>
          )}
        </div>
      </div>
      <div className="flex items-center gap-2 p-3 rounded-xl bg-amber-50 border border-amber-200 dark:bg-amber-500/10 dark:border-amber-500/20 text-sm text-amber-700 dark:text-amber-400">
        <Loader2 className="w-4 h-4 animate-spin shrink-0" />
        Verificando pagamento automaticamente...
      </div>
      <button onClick={() => setEtapa("pagamento")}
        className="w-full py-2.5 rounded-xl border border-gray-200 dark:border-white/10 text-sm font-medium text-muted-foreground hover:bg-muted transition-colors">
        ← Voltar
      </button>
    </div>
  )

  // ── Pagamento ─────────────────────────────────────────────
  if (etapa === "pagamento" && planoEscolhido) return (
    <div className="max-w-md mx-auto space-y-5">
      {!isNovoCadastro && (
        <div className="flex items-center gap-2">
          <button onClick={() => setEtapa("planos")} className="text-muted-foreground hover:text-foreground text-sm">← Voltar</button>
          <h2 className="text-xl font-black">Finalizar assinatura</h2>
        </div>
      )}
      {isNovoCadastro && (
        <div className="space-y-3">
          <button
            onClick={() => window.location.href = "/onboarding"}
            className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            ← Voltar para escolha de planos
          </button>
          <div className="text-center space-y-1">
            <h2 className="text-2xl font-black">Finalize sua assinatura</h2>
            <p className="text-muted-foreground text-sm">Um último passo para ativar seu plano <strong>{planoEscolhido.nome}</strong></p>
          </div>
        </div>
      )}

      {/* Resumo */}
      <div className={cn(
        "rounded-2xl p-4 border",
        "bg-[#F26E1D]/5 border-[#F26E1D]/20"
      )}>
        <div className="flex items-center justify-between mb-1">
          <div>
            <p className="font-black text-base">{planoEscolhido.nome}</p>
            <p className="text-sm text-muted-foreground capitalize">{periodicidade}</p>
          </div>
          <div className="text-right">
            {cupomDados && (
              <p className="text-xs line-through text-muted-foreground">{formatarMoeda(valorBase)}</p>
            )}
            <p className="text-2xl font-black text-[#F26E1D]">{formatarMoeda(valorEscolhido)}</p>
            {periodicidade === "anual" && !cupomDados && (
              <p className="text-xs text-emerald-600 font-semibold">
                Economia de {formatarMoeda(planoEscolhido.economia)}
              </p>
            )}
            {cupomDados && (
              <p className="text-xs text-emerald-600 font-semibold">
                Desconto: -{formatarMoeda(descontoAplicado)}
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Cupom de desconto */}
      <div className="space-y-2">
        <p className="text-sm font-semibold flex items-center gap-2">
          <Tag className="w-4 h-4 text-[#F26E1D]" />Cupom de desconto
        </p>
        {!cupomDados ? (
          <div className="flex gap-2">
            <input
              value={cupomInput}
              onChange={(e) => { setCupomInput(e.target.value.toUpperCase()); setCupomErro("") }}
              onKeyDown={(e) => e.key === "Enter" && validarCupom()}
              placeholder="Tem um cupom? Digite aqui"
              className={cn(
                "flex-1 h-10 rounded-xl border px-3 text-sm font-mono tracking-widest",
                "bg-white dark:bg-white/[0.03]",
                cupomErro ? "border-red-400 focus:border-red-400" : "border-gray-200 dark:border-white/10 focus:border-[#F26E1D]",
                "focus:outline-none focus:ring-2 focus:ring-[#F26E1D]/20"
              )}
            />
            <button
              onClick={validarCupom}
              disabled={cupomLoading || !cupomInput.trim()}
              className="px-4 rounded-xl bg-[#F26E1D] text-white text-sm font-bold hover:bg-[#e05e10] disabled:opacity-50 transition-colors flex items-center gap-2"
            >
              {cupomLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : "Aplicar"}
            </button>
          </div>
        ) : (
          <div className="flex items-center justify-between p-3 rounded-xl bg-emerald-50 dark:bg-emerald-500/10 border border-emerald-200 dark:border-emerald-500/20">
            <div className="flex items-center gap-2">
              <CheckCircle className="w-4 h-4 text-emerald-500" />
              <div>
                <p className="text-sm font-bold text-emerald-700 dark:text-emerald-400 font-mono">{cupomCodigo}</p>
                <p className="text-xs text-emerald-600 dark:text-emerald-500">
                  {cupomDados.tipo === "percentual" ? `${cupomDados.valor}% de desconto` : `R$ ${cupomDados.valor} de desconto`}
                  {cupomDados.descricao ? ` — ${cupomDados.descricao}` : ""}
                </p>
              </div>
            </div>
            <button onClick={removerCupom} className="text-emerald-600 hover:text-red-500 transition-colors">
              <X className="w-4 h-4" />
            </button>
          </div>
        )}
        {cupomErro && (
          <div className="flex items-center gap-2 text-xs text-red-500">
            <AlertCircle className="w-3.5 h-3.5" />
            {cupomErro}
          </div>
        )}
      </div>

      {/* Forma de pagamento */}
      <div className="space-y-2">
        <label className="text-sm font-semibold">Forma de pagamento</label>
        <div className="grid grid-cols-2 gap-3">
          {(["pix", "cartao"] as const).map((fp) => (
            <button key={fp} onClick={() => setFormaPag(fp)}
              className={cn(
                "py-4 rounded-xl border-2 flex flex-col items-center gap-2 transition-all text-sm font-semibold",
                formaPag === fp
                  ? "border-[#F26E1D] bg-[#F26E1D]/5 text-[#F26E1D]"
                  : "border-gray-200 dark:border-white/10 text-muted-foreground hover:border-gray-300 dark:hover:border-white/20"
              )}>
              {fp === "pix" ? <QrCode className="w-6 h-6" /> : <CreditCard className="w-6 h-6" />}
              {fp === "pix" ? "Pix" : "Cartão"}
            </button>
          ))}
        </div>
      </div>

      {/* Formulário cartão */}
      <AnimatePresence>
        {formaPag === "cartao" && (
          <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }}
            className="space-y-3 overflow-hidden">
            {[
              { label: "Nome no cartão", placeholder: "NOME SOBRENOME", value: nomeCartao, onChange: (v: string) => setNomeCartao(v.toUpperCase()) },
            ].map((f) => (
              <div key={f.label} className="space-y-1.5">
                <label className="text-xs font-semibold text-muted-foreground">{f.label}</label>
                <input value={f.value} onChange={(e) => f.onChange(e.target.value)} placeholder={f.placeholder}
                  className="w-full h-10 rounded-xl border border-gray-200 dark:border-white/10 bg-white dark:bg-white/[0.03] px-3 text-sm focus:outline-none focus:ring-2 focus:ring-[#F26E1D]/30 focus:border-[#F26E1D]" />
              </div>
            ))}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-muted-foreground">Número do cartão</label>
              <input value={numeroCartao} placeholder="0000 0000 0000 0000" maxLength={19}
                onChange={(e) => setNumeroCartao(e.target.value.replace(/\D/g, "").replace(/(\d{4})/g, "$1 ").trim())}
                className="w-full h-10 rounded-xl border border-gray-200 dark:border-white/10 bg-white dark:bg-white/[0.03] px-3 text-sm focus:outline-none focus:ring-2 focus:ring-[#F26E1D]/30 focus:border-[#F26E1D]" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-muted-foreground">Validade</label>
                <input value={validade} placeholder="MM/AA" maxLength={5}
                  onChange={(e) => setValidade(e.target.value.replace(/\D/g, "").replace(/(\d{2})(\d)/, "$1/$2"))}
                  className="w-full h-10 rounded-xl border border-gray-200 dark:border-white/10 bg-white dark:bg-white/[0.03] px-3 text-sm focus:outline-none focus:ring-2 focus:ring-[#F26E1D]/30 focus:border-[#F26E1D]" />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-muted-foreground">CVV</label>
                <input value={cvv} placeholder="123" maxLength={4}
                  onChange={(e) => setCvv(e.target.value.replace(/\D/g, ""))}
                  className="w-full h-10 rounded-xl border border-gray-200 dark:border-white/10 bg-white dark:bg-white/[0.03] px-3 text-sm focus:outline-none focus:ring-2 focus:ring-[#F26E1D]/30 focus:border-[#F26E1D]" />
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <button
        onClick={formaPag === "pix" ? gerarPix : undefined}
        disabled={loading || (formaPag === "cartao" && (!nomeCartao || !numeroCartao || !validade || !cvv))}
        className="w-full py-3.5 rounded-xl bg-[#F26E1D] text-white font-black text-base hover:bg-[#e05e10] transition-colors disabled:opacity-50 flex items-center justify-center gap-2">
        {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : formaPag === "pix" ? <QrCode className="w-5 h-5" /> : <CreditCard className="w-5 h-5" />}
        {loading ? "Processando..." : formaPag === "pix" ? `Gerar Pix — ${formatarMoeda(valorEscolhido)}` : `Assinar — ${formatarMoeda(valorEscolhido)}`}
      </button>
      <p className="text-center text-xs text-muted-foreground">🔒 Pagamento seguro via Mercado Pago. Cancele quando quiser.</p>
    </div>
  )

  // ── Lista de planos ───────────────────────────────────────
  return (
    <div className="space-y-8 max-w-4xl mx-auto">
      <div className="text-center space-y-2">
        <h1 className="text-3xl font-black">Escolha seu plano</h1>
        <p className="text-muted-foreground">Comece grátis. Faça upgrade quando precisar.</p>
      </div>

      {/* Toggle mensal/anual */}
      <div className="flex items-center justify-center">
        <div className={cn(
          "flex rounded-xl p-1 border",
          "bg-gray-100 border-gray-200",
          "dark:bg-white/[0.05] dark:border-white/10"
        )}>
          {(["mensal", "anual"] as const).map((p) => (
            <button key={p} onClick={() => setPeriodicidade(p)}
              className={cn(
                "px-5 py-2 rounded-lg text-sm font-semibold transition-all flex items-center gap-2",
                periodicidade === p
                  ? "bg-[#F26E1D] text-white shadow-sm"
                  : "text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200"
              )}>
              {p === "mensal" ? "Mensal" : "Anual"}
              {p === "anual" && (
                <span className={cn(
                  "text-[10px] font-black px-1.5 py-0.5 rounded-md",
                  periodicidade === "anual"
                    ? "bg-white/20 text-white"
                    : "bg-[#F26E1D]/10 text-[#F26E1D]"
                )}>
                  -17%
                </span>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
        {/* Agendamento Online — card especial */}
        {(() => {
          const p = planos.find((x) => x.id === "agenda")!
          const ativo = empresa.plano === "agenda" && assinaturaAtiva?.status === "ativa"
          const valor = periodicidade === "anual" ? p.anual : p.mensal
          const Icon = p.icon
          return (
            <div className={cn(
              "rounded-2xl p-6 border flex flex-col relative",
              "bg-gradient-to-br from-violet-50 to-indigo-50 border-violet-200",
              "dark:from-violet-950/40 dark:to-indigo-950/40 dark:border-violet-500/30"
            )}>
              <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                <span className="bg-violet-600 text-white text-[10px] font-black px-3 py-1 rounded-full whitespace-nowrap">
                  SÓ AGENDA
                </span>
              </div>
              <div className="flex items-center gap-2 mb-4">
                <div className="w-8 h-8 rounded-lg bg-violet-100 dark:bg-violet-500/20 flex items-center justify-center">
                  <Icon className="w-4 h-4 text-violet-600 dark:text-violet-400" />
                </div>
                <div>
                  <p className="font-bold text-sm">{p.nome}</p>
                  {ativo
                    ? <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-violet-100 dark:bg-violet-500/20 text-violet-600 dark:text-violet-400">✓ Ativo</span>
                    : <span className="text-[10px] text-violet-500 dark:text-violet-400 font-medium">{p.destaque}</span>
                  }
                </div>
              </div>

              <div className="mb-1">
                <span className="text-3xl font-black text-violet-700 dark:text-violet-300">{formatarMoeda(valor)}</span>
                <span className="text-sm text-violet-500 dark:text-violet-400">/{periodicidade === "anual" ? "ano" : "mês"}</span>
              </div>
              {periodicidade === "anual" && (
                <p className="text-xs font-semibold mb-4 text-emerald-600">
                  Economize {formatarMoeda(p.economia)} — 2 meses grátis
                </p>
              )}
              {periodicidade === "mensal" && (
                <p className="text-xs mb-4 text-violet-400">ou {formatarMoeda(p.anual)}/ano</p>
              )}

              <ul className="space-y-2 flex-1 mb-5">
                {p.recursos.map((r) => (
                  <li key={r} className="flex items-center gap-2 text-sm text-violet-700 dark:text-violet-300">
                    <Check className="w-3.5 h-3.5 shrink-0 text-violet-500" />{r}
                  </li>
                ))}
              </ul>

              <button
                onClick={() => selecionarPlano("agenda")}
                disabled={ativo}
                className={cn(
                  "w-full py-2.5 rounded-xl font-bold text-sm transition-all",
                  ativo
                    ? "bg-violet-100 dark:bg-violet-500/20 text-violet-400 cursor-default"
                    : "bg-violet-600 text-white hover:bg-violet-700"
                )}>
                {ativo ? "Plano ativo ✓" : "Assinar Agendamento"}
              </button>
            </div>
          )
        })()}

        {/* Gratuito */}
        <div className={cn(
          "rounded-2xl p-6 border flex flex-col",
          "bg-white border-gray-200",
          "dark:bg-white/[0.02] dark:border-white/10"
        )}>
          <div className="flex items-center gap-2 mb-4">
            <div className="w-8 h-8 rounded-lg bg-gray-100 dark:bg-white/[0.06] flex items-center justify-center">
              <Star className="w-4 h-4 text-gray-400" />
            </div>
            <div>
              <p className="font-bold text-sm">Gratuito</p>
              {empresa.plano === "gratuito" && (
                <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-gray-100 dark:bg-white/[0.06] text-gray-500">
                  Plano atual
                </span>
              )}
            </div>
          </div>
          <div className="mb-5">
            <span className="text-3xl font-black">R$ 0</span>
            <span className="text-muted-foreground text-sm">/mês</span>
          </div>
          <ul className="space-y-2 flex-1 mb-5">
            {["Até 15 clientes", "Até 10 produtos/serviços", "1 usuário", "PDFs com marca d'água", "Relatórios básicos"].map((r) => (
              <li key={r} className="flex items-center gap-2 text-sm text-muted-foreground">
                <Check className="w-3.5 h-3.5 shrink-0 text-gray-300 dark:text-gray-600" />{r}
              </li>
            ))}
          </ul>
          <button disabled className="w-full py-2.5 rounded-xl border border-gray-200 dark:border-white/10 text-sm font-semibold text-muted-foreground cursor-default">
            {empresa.plano === "gratuito" ? "Plano atual" : "Gratuito"}
          </button>
        </div>

        {/* Básico e Profissional */}
        {planos.filter((p) => p.id !== "agenda").map((p) => {
          const ativo = empresa.plano === p.id && assinaturaAtiva?.status === "ativa"
          const valor = periodicidade === "anual" ? p.anual : p.mensal
          const Icon = p.icon
          return (
            <div key={p.id} className={cn(
              "rounded-2xl p-6 border flex flex-col relative",
              p.popular
                ? "bg-[#F26E1D] border-[#F26E1D] text-white"
                : "bg-white border-gray-200 dark:bg-white/[0.02] dark:border-white/10"
            )}>
              {p.popular && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                  <span className="bg-gray-900 dark:bg-white text-white dark:text-gray-900 text-[10px] font-black px-3 py-1 rounded-full">
                    MAIS POPULAR
                  </span>
                </div>
              )}
              <div className="flex items-center gap-2 mb-4">
                <div className={cn(
                  "w-8 h-8 rounded-lg flex items-center justify-center",
                  p.popular ? "bg-white/20" : "bg-[#F26E1D]/10"
                )}>
                  <Icon className={cn("w-4 h-4", p.popular ? "text-white" : "text-[#F26E1D]")} />
                </div>
                <div>
                  <p className="font-bold text-sm">{p.nome}</p>
                  {ativo && (
                    <span className={cn(
                      "text-[10px] font-bold px-1.5 py-0.5 rounded",
                      p.popular ? "bg-white/20 text-white" : "bg-[#F26E1D]/10 text-[#F26E1D]"
                    )}>
                      ✓ Ativo
                    </span>
                  )}
                </div>
              </div>

              <div className="mb-1">
                <span className="text-3xl font-black">{formatarMoeda(valor)}</span>
                <span className={cn("text-sm", p.popular ? "text-white/70" : "text-muted-foreground")}>
                  /{periodicidade === "anual" ? "ano" : "mês"}
                </span>
              </div>
              {periodicidade === "anual" && (
                <p className={cn("text-xs font-semibold mb-4", p.popular ? "text-white/80" : "text-emerald-600")}>
                  Economize {formatarMoeda(p.economia)} — 2 meses grátis
                </p>
              )}
              {periodicidade === "mensal" && (
                <p className={cn("text-xs mb-4", p.popular ? "text-white/60" : "text-muted-foreground")}>
                  ou {formatarMoeda(p.anual)}/ano
                </p>
              )}

              <ul className="space-y-2 flex-1 mb-5">
                {p.recursos.map((r) => (
                  <li key={r} className={cn(
                    "flex items-center gap-2 text-sm",
                    p.popular ? "text-white/90" : "text-muted-foreground"
                  )}>
                    <Check className={cn(
                      "w-3.5 h-3.5 shrink-0",
                      p.popular ? "text-white" : "text-[#F26E1D]"
                    )} />{r}
                  </li>
                ))}
              </ul>

              <button
                onClick={() => selecionarPlano(p.id)}
                disabled={ativo}
                className={cn(
                  "w-full py-2.5 rounded-xl font-bold text-sm transition-all",
                  ativo
                    ? p.popular
                      ? "bg-white/20 text-white cursor-default"
                      : "bg-muted text-muted-foreground cursor-default"
                    : p.popular
                      ? "bg-white text-[#F26E1D] hover:bg-gray-50"
                      : "bg-[#F26E1D] text-white hover:bg-[#e05e10]"
                )}>
                {ativo ? "Plano ativo ✓" : `Assinar ${p.nome}`}
              </button>
            </div>
          )
        })}
      </div>

      <p className="text-center text-xs text-muted-foreground">
        🔒 Pagamento seguro via Mercado Pago · Cancele quando quiser · Sem multa
      </p>
    </div>
  )
}
