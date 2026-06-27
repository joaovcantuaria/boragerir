"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { motion } from "framer-motion"
import {
  Calendar, Wallet, Users, ShoppingCart, BarChart3,
  FileText, CheckCircle, ArrowRight, Menu, X,
  Zap, Shield, Clock, TrendingUp, Star, ChevronRight
} from "lucide-react"
import { LogoIcon } from "@/components/ui/logo"

const NAV_LINKS = [
  { label: "Funcionalidades", href: "#funcionalidades" },
  { label: "Problemas", href: "#problemas" },
  { label: "Planos", href: "#planos" },
]

const PROBLEMAS = [
  {
    emoji: "📱",
    titulo: "Anota tudo no caderno ou no celular?",
    descricao: "Perder controle de vendas, clientes e agendamentos em anotações espalhadas custa tempo e dinheiro todo dia.",
  },
  {
    emoji: "💸",
    titulo: "Não sabe quanto lucrou no mês?",
    descricao: "Sem relatórios, fica impossível saber se o negócio está crescendo ou apenas sobrevivendo.",
  },
  {
    emoji: "📅",
    titulo: "Clientes ligam a toda hora pra agendar?",
    descricao: "Gerenciar agenda pelo WhatsApp é caótico. Horários duplicados, esquecimentos e cancelamentos de última hora.",
  },
  {
    emoji: "🗂️",
    titulo: "Cadastro de clientes bagunçado?",
    descricao: "Não saber o histórico, aniversário ou quanto cada cliente já gastou impede um atendimento personalizado.",
  },
]

const FUNCIONALIDADES = [
  { icon: Wallet, titulo: "Caixa inteligente", descricao: "Abra, feche, registre sangrias e despesas. Veja o saldo em tempo real sem complicação." },
  { icon: ShoppingCart, titulo: "Nova Venda rápida", descricao: "Finalize vendas em segundos, aceite qualquer forma de pagamento e gere recibo PDF." },
  { icon: Calendar, titulo: "Agenda online", descricao: "Link público para clientes agendarem sozinhos. Sem mais WhatsApp para marcar horário." },
  { icon: Users, titulo: "Gestão de clientes", descricao: "Histórico completo, pontos de fidelidade e alerta de aniversariantes." },
  { icon: BarChart3, titulo: "Relatórios financeiros", descricao: "Receitas, despesas, ticket médio e evolução de faturamento em um dashboard limpo." },
  { icon: FileText, titulo: "Orçamentos em PDF", descricao: "Crie orçamentos profissionais com logo da empresa e converta em venda com um clique." },
]

const PLANOS = [
  {
    nome: "Gratuito",
    preco: "R$ 0",
    periodo: "para sempre",
    destaque: false,
    cor: "border-white/10",
    itens: [
      "Até 30 clientes",
      "Até 3 produtos/serviços",
      "Caixa e vendas básicas",
      "Recibo em PDF",
      "Dashboard básico",
    ],
    nao: ["Agendamento online", "Funcionários", "Relatórios avançados"],
  },
  {
    nome: "Básico",
    preco: "R$ 49",
    periodo: "por mês",
    destaque: true,
    cor: "border-[#F26E1D]",
    itens: [
      "Até 200 clientes",
      "Produtos ilimitados",
      "Agendamento online",
      "Até 3 funcionários",
      "Orçamentos em PDF",
      "Relatórios financeiros",
    ],
    nao: ["Fidelidade", "Lembretes automáticos"],
  },
  {
    nome: "Profissional",
    preco: "R$ 99",
    periodo: "por mês",
    destaque: false,
    cor: "border-white/10",
    itens: [
      "Tudo ilimitado",
      "Programa de fidelidade",
      "Lembretes automáticos",
      "Relatórios avançados",
      "Exportação de dados",
      "Suporte prioritário",
    ],
    nao: [],
  },
]

export function LandingPage() {
  const [menuAberto, setMenuAberto] = useState(false)
  const [scrolled, setScrolled] = useState(false)

  useEffect(() => {
    const fn = () => setScrolled(window.scrollY > 20)
    window.addEventListener("scroll", fn)
    return () => window.removeEventListener("scroll", fn)
  }, [])

  return (
    <div className="min-h-screen bg-[#0a0b0f] text-white overflow-x-hidden">

      {/* ── NAVBAR ── */}
      <header className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${scrolled ? "bg-[#0a0b0f]/95 backdrop-blur border-b border-white/[0.06]" : ""}`}>
        <div className="max-w-6xl mx-auto px-5 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <LogoIcon size={28} />
            <span className="font-black text-lg text-white">Bora Gerir</span>
          </div>
          <nav className="hidden md:flex items-center gap-8">
            {NAV_LINKS.map((l) => (
              <a key={l.href} href={l.href} className="text-sm text-white/60 hover:text-white transition-colors">{l.label}</a>
            ))}
          </nav>
          <div className="hidden md:flex items-center gap-3">
            <Link href="/login" className="text-sm text-white/60 hover:text-white transition-colors">Entrar</Link>
            <Link href="/cadastro" className="text-sm bg-[#F26E1D] hover:bg-[#e05e10] text-white font-bold px-4 py-2 rounded-xl transition-colors">
              Testar grátis
            </Link>
          </div>
          <button className="md:hidden text-white/60" onClick={() => setMenuAberto(!menuAberto)}>
            {menuAberto ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </button>
        </div>
        {menuAberto && (
          <div className="md:hidden bg-[#0f1117] border-t border-white/[0.06] px-5 py-4 space-y-4">
            {NAV_LINKS.map((l) => (
              <a key={l.href} href={l.href} onClick={() => setMenuAberto(false)} className="block text-sm text-white/70 hover:text-white">{l.label}</a>
            ))}
            <div className="flex gap-3 pt-2">
              <Link href="/login" className="flex-1 text-center text-sm border border-white/10 text-white/70 py-2 rounded-xl">Entrar</Link>
              <Link href="/cadastro" className="flex-1 text-center text-sm bg-[#F26E1D] text-white font-bold py-2 rounded-xl">Testar grátis</Link>
            </div>
          </div>
        )}
      </header>

      {/* ── HERO ── */}
      <section className="relative pt-32 pb-24 px-5 overflow-hidden">
        {/* Glow de fundo */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[400px] bg-[#F26E1D]/10 blur-[120px] rounded-full pointer-events-none" />
        <div className="max-w-4xl mx-auto text-center relative">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
            <span className="inline-flex items-center gap-2 text-xs font-semibold text-[#F26E1D] bg-[#F26E1D]/10 border border-[#F26E1D]/20 rounded-full px-4 py-1.5 mb-6">
              <Zap className="w-3.5 h-3.5" /> Comece grátis. Sem cartão.
            </span>
            <h1 className="text-4xl md:text-6xl font-black leading-tight mb-6">
              Seu negócio organizado{" "}
              <span className="text-[#F26E1D]">do zero ao lucro</span>
            </h1>
            <p className="text-lg md:text-xl text-white/60 max-w-2xl mx-auto mb-10 leading-relaxed">
              Caixa, agendamentos, clientes, vendas e relatórios em um só lugar.
              Feito para salões, barbearias, estúdios e prestadores de serviço que querem crescer de verdade.
            </p>
            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <Link href="/cadastro" className="inline-flex items-center justify-center gap-2 bg-[#F26E1D] hover:bg-[#e05e10] text-white font-black px-8 py-4 rounded-2xl text-base transition-all hover:scale-[1.02] active:scale-[0.98]">
                Testar grátis agora <ArrowRight className="w-5 h-5" />
              </Link>
              <Link href="/login" className="inline-flex items-center justify-center gap-2 border border-white/10 hover:border-white/20 text-white/70 hover:text-white font-semibold px-8 py-4 rounded-2xl text-base transition-all">
                Já tenho conta
              </Link>
            </div>
            <p className="text-xs text-white/30 mt-4">Sem cartão de crédito • Plano gratuito para sempre</p>
          </motion.div>
        </div>

        {/* Preview do app */}
        <motion.div
          initial={{ opacity: 0, y: 40 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.2 }}
          className="max-w-5xl mx-auto mt-16 relative"
        >
          <div className="bg-[#0f1117] border border-white/[0.08] rounded-2xl overflow-hidden shadow-2xl">
            <div className="flex items-center gap-2 px-4 py-3 border-b border-white/[0.06]">
              <div className="w-3 h-3 rounded-full bg-red-500/60" />
              <div className="w-3 h-3 rounded-full bg-yellow-500/60" />
              <div className="w-3 h-3 rounded-full bg-green-500/60" />
              <span className="text-xs text-white/30 ml-2">app.boragerir.com/dashboard</span>
            </div>
            <div className="p-6 grid grid-cols-2 md:grid-cols-4 gap-3">
              {[
                { label: "Vendas hoje", valor: "R$ 1.240", cor: "text-emerald-400" },
                { label: "Atendimentos", valor: "8", cor: "text-blue-400" },
                { label: "Ticket médio", valor: "R$ 155", cor: "text-purple-400" },
                { label: "Caixa", valor: "Aberto ✓", cor: "text-emerald-400" },
              ].map((c) => (
                <div key={c.label} className="bg-white/[0.04] rounded-xl p-4 border border-white/[0.06]">
                  <p className="text-xs text-white/40">{c.label}</p>
                  <p className={`text-xl font-bold mt-1 ${c.cor}`}>{c.valor}</p>
                </div>
              ))}
            </div>
          </div>
        </motion.div>
      </section>

      {/* ── PROBLEMAS ── */}
      <section id="problemas" className="py-24 px-5">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-14">
            <p className="text-[#F26E1D] text-sm font-semibold uppercase tracking-widest mb-3">Você se identifica?</p>
            <h2 className="text-3xl md:text-4xl font-black">Os problemas que todo mundo tem<br className="hidden md:block" /> mas ninguém fala</h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {PROBLEMAS.map((p, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.08 }}
                className="bg-white/[0.03] border border-white/[0.06] rounded-2xl p-6 hover:border-[#F26E1D]/30 transition-colors"
              >
                <div className="text-3xl mb-3">{p.emoji}</div>
                <h3 className="font-bold text-base mb-2">{p.titulo}</h3>
                <p className="text-sm text-white/50 leading-relaxed">{p.descricao}</p>
              </motion.div>
            ))}
          </div>
          <div className="mt-10 text-center">
            <p className="text-white/40 text-sm">O Bora Gerir resolve tudo isso. Simples assim.</p>
          </div>
        </div>
      </section>

      {/* ── FUNCIONALIDADES ── */}
      <section id="funcionalidades" className="py-24 px-5 bg-white/[0.02]">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-14">
            <p className="text-[#F26E1D] text-sm font-semibold uppercase tracking-widest mb-3">Tudo em um lugar</p>
            <h2 className="text-3xl md:text-4xl font-black">Ferramentas que seu negócio<br className="hidden md:block" /> realmente precisa</h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {FUNCIONALIDADES.map((f, i) => {
              const Icon = f.icon
              return (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: i * 0.07 }}
                  className="bg-[#0f1117] border border-white/[0.06] rounded-2xl p-6 hover:border-[#F26E1D]/30 transition-all group"
                >
                  <div className="w-11 h-11 rounded-xl bg-[#F26E1D]/10 flex items-center justify-center mb-4 group-hover:bg-[#F26E1D]/20 transition-colors">
                    <Icon className="w-5 h-5 text-[#F26E1D]" />
                  </div>
                  <h3 className="font-bold text-base mb-2">{f.titulo}</h3>
                  <p className="text-sm text-white/50 leading-relaxed">{f.descricao}</p>
                </motion.div>
              )
            })}
          </div>
        </div>
      </section>

      {/* ── PLANOS ── */}
      <section id="planos" className="py-24 px-5">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-14">
            <p className="text-[#F26E1D] text-sm font-semibold uppercase tracking-widest mb-3">Preços transparentes</p>
            <h2 className="text-3xl md:text-4xl font-black">Comece grátis,<br className="hidden md:block" /> cresça no seu ritmo</h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            {PLANOS.map((p, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.1 }}
                className={`relative bg-[#0f1117] border-2 ${p.cor} rounded-2xl p-6 flex flex-col`}
              >
                {p.destaque && (
                  <div className="absolute -top-3.5 left-1/2 -translate-x-1/2 bg-[#F26E1D] text-white text-xs font-black px-4 py-1 rounded-full">
                    Mais popular
                  </div>
                )}
                <div className="mb-6">
                  <p className="text-sm text-white/50 mb-1">{p.nome}</p>
                  <div className="flex items-end gap-1">
                    <span className="text-3xl font-black">{p.preco}</span>
                    <span className="text-sm text-white/40 mb-1">/{p.periodo}</span>
                  </div>
                </div>
                <ul className="space-y-2.5 mb-6 flex-1">
                  {p.itens.map((item) => (
                    <li key={item} className="flex items-center gap-2 text-sm text-white/80">
                      <CheckCircle className="w-4 h-4 text-[#F26E1D] shrink-0" />{item}
                    </li>
                  ))}
                  {p.nao.map((item) => (
                    <li key={item} className="flex items-center gap-2 text-sm text-white/25 line-through">
                      <div className="w-4 h-4 shrink-0" />{item}
                    </li>
                  ))}
                </ul>
                <Link
                  href="/cadastro"
                  className={`w-full text-center py-3 rounded-xl font-bold text-sm transition-all ${
                    p.destaque
                      ? "bg-[#F26E1D] hover:bg-[#e05e10] text-white"
                      : "border border-white/10 hover:border-white/20 text-white/70 hover:text-white"
                  }`}
                >
                  {p.preco === "R$ 0" ? "Começar grátis" : "Começar agora"}
                </Link>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ── CTA FINAL ── */}
      <section className="py-24 px-5">
        <div className="max-w-3xl mx-auto text-center">
          <div className="relative">
            <div className="absolute inset-0 bg-[#F26E1D]/10 blur-[80px] rounded-full pointer-events-none" />
            <div className="relative bg-white/[0.03] border border-white/[0.08] rounded-3xl p-10 md:p-16">
              <h2 className="text-3xl md:text-5xl font-black mb-4">
                Pronto para organizar<br />seu negócio?
              </h2>
              <p className="text-white/50 mb-8 text-lg">
                Junte-se a centenas de negócios que já usam o Bora Gerir para crescer.
              </p>
              <Link
                href="/cadastro"
                className="inline-flex items-center gap-2 bg-[#F26E1D] hover:bg-[#e05e10] text-white font-black px-10 py-4 rounded-2xl text-lg transition-all hover:scale-[1.02] active:scale-[0.98]"
              >
                Criar conta grátis <ArrowRight className="w-5 h-5" />
              </Link>
              <p className="text-xs text-white/30 mt-4">Sem cartão de crédito necessário</p>
            </div>
          </div>
        </div>
      </section>

      {/* ── FOOTER ── */}
      <footer className="border-t border-white/[0.06] py-8 px-5">
        <div className="max-w-6xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <LogoIcon size={20} />
            <span className="text-sm font-black text-white">Bora Gerir</span>
            <span className="text-sm text-white/30">— Gestão simples. Resultado de verdade.</span>
          </div>
          <div className="flex items-center gap-6">
            <Link href="/login" className="text-sm text-white/40 hover:text-white transition-colors">Entrar</Link>
            <Link href="/cadastro" className="text-sm text-white/40 hover:text-white transition-colors">Cadastrar</Link>
            <span className="text-xs text-white/20">© {new Date().getFullYear()} Bora Gerir</span>
          </div>
        </div>
      </footer>

    </div>
  )
}
