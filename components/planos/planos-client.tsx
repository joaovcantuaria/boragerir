"use client"

import { useState } from "react"
import { Check, CreditCard, QrCode, Loader2, Copy, CheckCircle, Star, Zap, Crown } from "lucide-react"
import { toast } from "sonner"
import { motion, AnimatePresence } from "framer-motion"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { formatarMoeda } from "@/lib/utils"
import type { Empresa } from "@/types"

type PlanoId = "basico" | "profissional"
type Periodicidade = "mensal" | "anual"
type FormaPag = "cartao" | "pix"

const planos = [
  {
    id: "basico" as PlanoId,
    nome: "Básico",
    icon: Zap,
    cor: "text-blue-500",
    bg: "bg-blue-500/10",
    border: "border-blue-500/30",
    mensal: 49,
    anual: 490,
    economia: 98,
    descricao: "Ideal para quem está começando",
    recursos: [
      "Até 200 clientes",
      "Produtos e serviços ilimitados",
      "Até 3 funcionários",
      "Agendamentos",
      "PDFs sem marca d'água",
      "Relatórios completos",
      "Controle de estoque",
    ],
  },
  {
    id: "profissional" as PlanoId,
    nome: "Profissional",
    icon: Crown,
    cor: "text-primary",
    bg: "bg-primary/10",
    border: "border-primary/30",
    mensal: 99,
    anual: 990,
    economia: 198,
    descricao: "Para negócios em crescimento",
    popular: true,
    recursos: [
      "Clientes ilimitados",
      "Produtos e serviços ilimitados",
      "Funcionários ilimitados",
      "Agendamentos online",
      "Lembretes automáticos",
      "Programa de fidelidade",
      "Relatórios avançados",
      "PDFs sem marca d'água",
      "Suporte prioritário",
    ],
  },
]

interface Props {
  empresa: Empresa
  assinaturaAtiva: {
    plano: string; periodicidade: string; status: string
    data_fim: string | null; valor_total: number
  } | null
}

export function PlanosClient({ empresa, assinaturaAtiva }: Props) {
  const [periodicidade, setPeriodicidade] = useState<Periodicidade>("mensal")
  const [planoSel, setPlanoSel] = useState<PlanoId | null>(null)
  const [formaPag, setFormaPag] = useState<FormaPag>("pix")
  const [etapa, setEtapa] = useState<"planos" | "pagamento" | "pix-aguardando" | "sucesso">("planos")
  const [loading, setLoading] = useState(false)
  const [pixData, setPixData] = useState<{ qr_code: string; qr_code_text: string; payment_id: string; valor: number } | null>(null)
  const [copiado, setCopiado] = useState(false)
  // Cartão
  const [nomeCartao, setNomeCartao] = useState("")
  const [numeroCartao, setNumeroCartao] = useState("")
  const [validade, setValidade] = useState("")
  const [cvv, setCvv] = useState("")

  const planoEscolhido = planos.find((p) => p.id === planoSel)
  const valorEscolhido = planoSel
    ? periodicidade === "anual" ? planos.find((p) => p.id === planoSel)!.anual : planos.find((p) => p.id === planoSel)!.mensal
    : 0

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
        body: JSON.stringify({ plano: planoSel, periodicidade }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.erro)
      setPixData({
        qr_code: data.qr_code,
        qr_code_text: data.qr_code_text,
        payment_id: data.payment_id,
        valor: data.valor,
      })
      setEtapa("pix-aguardando")
      // Verificar pagamento a cada 5 segundos
      verificarPagamentoPix(data.payment_id)
    } catch (err) {
      toast.error("Erro ao gerar Pix. Tente novamente.")
    }
    setLoading(false)
  }

  async function verificarPagamentoPix(paymentId: string) {
    const intervalo = setInterval(async () => {
      try {
        const res = await fetch(`/api/pagamentos/status?payment_id=${paymentId}`)
        const data = await res.json()
        if (data.status === "approved") {
          clearInterval(intervalo)
          setEtapa("sucesso")
          toast.success("Pagamento confirmado! Seu plano está ativo.")
        }
      } catch {}
    }, 5000)
    // Para de verificar após 10 minutos
    setTimeout(() => clearInterval(intervalo), 10 * 60 * 1000)
  }

  async function pagarCartao() {
    if (!planoSel) return
    setLoading(true)
    try {
      // Tokenizar cartão via MP SDK (simplificado)
      toast.info("Processando pagamento...")
      const res = await fetch("/api/pagamentos/criar-assinatura", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ plano: planoSel, periodicidade, card_token: "token_simulado" }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.erro)
      setEtapa("sucesso")
      toast.success("Assinatura criada! Bem-vindo ao plano " + planoEscolhido?.nome)
    } catch (err) {
      toast.error("Erro ao processar cartão. Verifique os dados.")
    }
    setLoading(false)
  }

  function copiarPix() {
    if (!pixData?.qr_code_text) return
    navigator.clipboard.writeText(pixData.qr_code_text)
    setCopiado(true)
    toast.success("Código Pix copiado!")
    setTimeout(() => setCopiado(false), 3000)
  }

  // ── Tela de sucesso ───────────────────────────────────────
  if (etapa === "sucesso") {
    return (
      <div className="max-w-md mx-auto text-center py-16 space-y-6">
        <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: "spring" }}>
          <div className="w-24 h-24 rounded-full bg-primary/10 flex items-center justify-center mx-auto">
            <CheckCircle className="w-12 h-12 text-primary" />
          </div>
        </motion.div>
        <div>
          <h2 className="text-2xl font-black">Plano ativo! 🎉</h2>
          <p className="text-muted-foreground mt-2">
            Seu plano <strong>{planoEscolhido?.nome}</strong> está ativo.<br />
            Aproveite todos os recursos!
          </p>
        </div>
        <Button className="w-full font-bold" onClick={() => window.location.href = "/dashboard"}>
          Ir para o Dashboard →
        </Button>
      </div>
    )
  }

  // ── Aguardando Pix ────────────────────────────────────────
  if (etapa === "pix-aguardando" && pixData) {
    return (
      <div className="max-w-md mx-auto space-y-6">
        <div className="text-center">
          <h2 className="text-2xl font-black">Pague com Pix</h2>
          <p className="text-muted-foreground text-sm mt-1">
            {formatarMoeda(pixData.valor)} — Aguardando pagamento
          </p>
        </div>

        {/* QR Code */}
        <Card className="border-2 border-primary/20">
          <CardContent className="p-6 flex flex-col items-center gap-4">
            {pixData.qr_code ? (
              <img
                src={`data:image/png;base64,${pixData.qr_code}`}
                alt="QR Code Pix"
                className="w-52 h-52 rounded-xl border border-border"
              />
            ) : (
              <div className="w-52 h-52 bg-muted rounded-xl flex items-center justify-center">
                <QrCode className="w-16 h-16 text-muted-foreground" />
              </div>
            )}
            <p className="text-sm text-muted-foreground text-center">
              Escaneie o QR code ou copie o código abaixo
            </p>
          </CardContent>
        </Card>

        {/* Copia e cola */}
        <div className="space-y-2">
          <Label>Pix Copia e Cola</Label>
          <div className="flex gap-2">
            <Input
              value={pixData.qr_code_text}
              readOnly
              className="text-xs font-mono"
            />
            <Button variant="outline" size="icon" onClick={copiarPix}>
              {copiado ? <Check className="w-4 h-4 text-primary" /> : <Copy className="w-4 h-4" />}
            </Button>
          </div>
        </div>

        <div className="flex items-center gap-2 p-3 bg-yellow-500/10 border border-yellow-500/20 rounded-xl text-sm text-yellow-700 dark:text-yellow-400">
          <Loader2 className="w-4 h-4 animate-spin shrink-0" />
          Aguardando confirmação do pagamento...
        </div>

        <Button variant="outline" className="w-full" onClick={() => setEtapa("pagamento")}>
          ← Voltar
        </Button>
      </div>
    )
  }

  // ── Tela de pagamento ────────────────────────────────────
  if (etapa === "pagamento" && planoEscolhido) {
    return (
      <div className="max-w-lg mx-auto space-y-6">
        <div className="flex items-center gap-3">
          <button onClick={() => setEtapa("planos")} className="text-muted-foreground hover:text-foreground text-sm">
            ← Voltar
          </button>
          <div>
            <h2 className="text-xl font-black">Finalizar assinatura</h2>
            <p className="text-muted-foreground text-sm">
              Plano {planoEscolhido.nome} — {periodicidade === "anual" ? "Anual" : "Mensal"}
            </p>
          </div>
        </div>

        {/* Resumo */}
        <Card className={`border-2 ${planoEscolhido.border}`}>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="font-black text-lg">{planoEscolhido.nome}</p>
                <p className="text-sm text-muted-foreground capitalize">{periodicidade}</p>
              </div>
              <div className="text-right">
                <p className="text-2xl font-black text-primary">{formatarMoeda(valorEscolhido)}</p>
                {periodicidade === "anual" && (
                  <p className="text-xs text-emerald-500 font-semibold">
                    Economize {formatarMoeda(planoEscolhido.economia)}
                  </p>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Forma de pagamento */}
        <div className="space-y-3">
          <Label className="font-bold">Forma de pagamento</Label>
          <div className="grid grid-cols-2 gap-3">
            <button
              onClick={() => setFormaPag("pix")}
              className={`p-4 rounded-xl border-2 flex flex-col items-center gap-2 transition-all ${
                formaPag === "pix" ? "border-primary bg-primary/5" : "border-border hover:border-primary/40"
              }`}
            >
              <QrCode className={`w-6 h-6 ${formaPag === "pix" ? "text-primary" : "text-muted-foreground"}`} />
              <span className="text-sm font-bold">Pix</span>
              <span className="text-xs text-muted-foreground">Aprovação imediata</span>
            </button>
            <button
              onClick={() => setFormaPag("cartao")}
              className={`p-4 rounded-xl border-2 flex flex-col items-center gap-2 transition-all ${
                formaPag === "cartao" ? "border-primary bg-primary/5" : "border-border hover:border-primary/40"
              }`}
            >
              <CreditCard className={`w-6 h-6 ${formaPag === "cartao" ? "text-primary" : "text-muted-foreground"}`} />
              <span className="text-sm font-bold">Cartão</span>
              <span className="text-xs text-muted-foreground">Débito automático</span>
            </button>
          </div>
        </div>

        {/* Formulário cartão */}
        <AnimatePresence>
          {formaPag === "cartao" && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              className="space-y-4 overflow-hidden"
            >
              <div className="space-y-1.5">
                <Label>Nome no cartão</Label>
                <Input placeholder="JOÃO DA SILVA" value={nomeCartao}
                  onChange={(e) => setNomeCartao(e.target.value.toUpperCase())} />
              </div>
              <div className="space-y-1.5">
                <Label>Número do cartão</Label>
                <Input
                  placeholder="0000 0000 0000 0000"
                  maxLength={19}
                  value={numeroCartao}
                  onChange={(e) => {
                    const v = e.target.value.replace(/\D/g, "").replace(/(\d{4})/g, "$1 ").trim()
                    setNumeroCartao(v)
                  }}
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label>Validade</Label>
                  <Input
                    placeholder="MM/AA"
                    maxLength={5}
                    value={validade}
                    onChange={(e) => {
                      const v = e.target.value.replace(/\D/g, "").replace(/(\d{2})(\d)/, "$1/$2")
                      setValidade(v)
                    }}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label>CVV</Label>
                  <Input placeholder="123" maxLength={4} value={cvv}
                    onChange={(e) => setCvv(e.target.value.replace(/\D/g, ""))} />
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        <Button
          className="w-full font-black text-base py-6"
          disabled={loading || (formaPag === "cartao" && (!nomeCartao || !numeroCartao || !validade || !cvv))}
          onClick={formaPag === "pix" ? gerarPix : pagarCartao}
        >
          {loading ? (
            <><Loader2 className="w-5 h-5 animate-spin mr-2" />Processando...</>
          ) : formaPag === "pix" ? (
            <><QrCode className="w-5 h-5 mr-2" />Gerar QR Code Pix — {formatarMoeda(valorEscolhido)}</>
          ) : (
            <><CreditCard className="w-5 h-5 mr-2" />Assinar — {formatarMoeda(valorEscolhido)}</>
          )}
        </Button>

        <p className="text-xs text-muted-foreground text-center">
          🔒 Pagamento seguro processado pelo Mercado Pago. Cancele quando quiser.
        </p>
      </div>
    )
  }

  // ── Tela de planos ────────────────────────────────────────
  return (
    <div className="space-y-8 max-w-4xl mx-auto">
      <div className="text-center space-y-2">
        <h1 className="text-3xl font-black">Escolha seu plano</h1>
        <p className="text-muted-foreground">Comece grátis. Faça upgrade quando precisar.</p>
      </div>

      {/* Toggle mensal/anual */}
      <div className="flex items-center justify-center gap-3">
        <button
          onClick={() => setPeriodicidade("mensal")}
          className={`px-5 py-2 rounded-xl font-bold text-sm transition-all ${
            periodicidade === "mensal" ? "bg-primary text-white shadow-orange" : "bg-muted text-muted-foreground"
          }`}
        >
          Mensal
        </button>
        <button
          onClick={() => setPeriodicidade("anual")}
          className={`px-5 py-2 rounded-xl font-bold text-sm transition-all flex items-center gap-2 ${
            periodicidade === "anual" ? "bg-primary text-white shadow-orange" : "bg-muted text-muted-foreground"
          }`}
        >
          Anual
          <span className={`text-xs px-2 py-0.5 rounded-full font-black ${
            periodicidade === "anual" ? "bg-white text-primary" : "bg-primary/20 text-primary"
          }`}>
            2 meses grátis
          </span>
        </button>
      </div>

      {/* Cards de planos */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Plano Gratuito */}
        <Card className={`border-2 ${empresa.plano === "gratuito" ? "border-border" : "border-border"}`}>
          <CardHeader>
            <div className="flex items-center gap-2">
              <div className="p-2 rounded-lg bg-muted">
                <Star className="w-5 h-5 text-muted-foreground" />
              </div>
              <div>
                <CardTitle className="text-base">Gratuito</CardTitle>
                {empresa.plano === "gratuito" && <Badge variant="secondary" className="text-xs mt-0.5">Plano atual</Badge>}
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <span className="text-3xl font-black">R$ 0</span>
              <span className="text-muted-foreground text-sm">/mês</span>
            </div>
            <ul className="space-y-2 text-sm text-muted-foreground">
              {["Até 30 clientes", "Até 3 produtos/serviços", "1 usuário", "PDFs com marca d'água", "Relatórios básicos"].map((r) => (
                <li key={r} className="flex items-center gap-2">
                  <Check className="w-3.5 h-3.5 text-muted-foreground shrink-0" />{r}
                </li>
              ))}
            </ul>
            <Button variant="outline" className="w-full" disabled>
              {empresa.plano === "gratuito" ? "Plano atual" : "Gratuito"}
            </Button>
          </CardContent>
        </Card>

        {/* Planos pagos */}
        {planos.map((p) => {
          const ativo = empresa.plano === p.id && assinaturaAtiva?.status === "ativa"
          const Icon = p.icon
          const valor = periodicidade === "anual" ? p.anual : p.mensal
          return (
            <Card key={p.id} className={`border-2 relative overflow-hidden ${ativo ? "border-primary" : p.popular ? "border-primary/40" : "border-border"} ${p.popular ? "shadow-orange" : ""}`}>
              {p.popular && (
                <div className="absolute top-0 right-0 bg-primary text-white text-xs font-black px-3 py-1 rounded-bl-xl">
                  POPULAR
                </div>
              )}
              <CardHeader>
                <div className="flex items-center gap-2">
                  <div className={`p-2 rounded-lg ${p.bg}`}>
                    <Icon className={`w-5 h-5 ${p.cor}`} />
                  </div>
                  <div>
                    <CardTitle className="text-base">{p.nome}</CardTitle>
                    {ativo && <Badge className="text-xs mt-0.5 bg-primary/10 text-primary border-primary/20">Ativo</Badge>}
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <span className="text-3xl font-black">{formatarMoeda(valor)}</span>
                  <span className="text-muted-foreground text-sm">/{periodicidade === "anual" ? "ano" : "mês"}</span>
                  {periodicidade === "anual" && (
                    <p className="text-xs text-emerald-500 font-semibold mt-0.5">
                      Economize {formatarMoeda(p.economia)} por ano
                    </p>
                  )}
                  {periodicidade === "mensal" && (
                    <p className="text-xs text-muted-foreground mt-0.5">
                      ou {formatarMoeda(p.anual)}/ano (2 meses grátis)
                    </p>
                  )}
                </div>
                <ul className="space-y-2 text-sm text-muted-foreground">
                  {p.recursos.map((r) => (
                    <li key={r} className="flex items-center gap-2">
                      <Check className={`w-3.5 h-3.5 ${p.cor} shrink-0`} />{r}
                    </li>
                  ))}
                </ul>
                <Button
                  className={`w-full font-bold ${p.popular ? "" : "variant-outline"}`}
                  variant={p.popular ? "default" : "outline"}
                  onClick={() => selecionarPlano(p.id)}
                  disabled={ativo}
                >
                  {ativo ? "Plano ativo ✓" : `Assinar ${p.nome}`}
                </Button>
              </CardContent>
            </Card>
          )
        })}
      </div>

      <p className="text-center text-xs text-muted-foreground">
        🔒 Pagamento seguro via Mercado Pago · Cancele quando quiser · Sem multa
      </p>
    </div>
  )
}
