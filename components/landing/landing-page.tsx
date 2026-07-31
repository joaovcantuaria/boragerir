"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { motion } from "framer-motion"
import {
  Calendar, Wallet, Users, ShoppingCart, BarChart3,
  FileText, CheckCircle, ArrowRight, Menu, X,
  Zap, Shield, Clock, TrendingUp, Star, ChevronRight,
  CheckSquare, Package, HeadphonesIcon, Lock, Smartphone,
} from "lucide-react"
import { LogoIcon } from "@/components/ui/logo"
import { useRegistrarVisita } from "@/hooks/use-registrar-visita"

const CUPOM = "BORA40"
const CTA_URL = "/cadastro"

export function LandingPage() {
  useRegistrarVisita("site")
  const [menuAberto, setMenuAberto] = useState(false)
  const [copied, setCopied] = useState(false)

  function copiarCupom() {
    navigator.clipboard.writeText(CUPOM)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div className="min-h-screen bg-white text-gray-900 overflow-x-hidden">
      {/* ═══════ NAVBAR ═══════ */}
      <nav className="fixed top-0 left-0 right-0 z-50 bg-white/80 backdrop-blur-lg border-b border-gray-100">
        <div className="max-w-6xl mx-auto px-4 h-16 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2">
            <LogoIcon size={28} />
            <span className="font-black text-lg">Bora<span className="text-[#F26E1D]">Gerir</span></span>
          </Link>
          <div className="hidden md:flex items-center gap-6">
            <a href="#problemas" className="text-sm font-medium text-gray-600 hover:text-gray-900 transition">Problemas</a>
            <a href="#solucao" className="text-sm font-medium text-gray-600 hover:text-gray-900 transition">Solução</a>
            <a href="#planos" className="text-sm font-medium text-gray-600 hover:text-gray-900 transition">Planos</a>
            <a href="#faq" className="text-sm font-medium text-gray-600 hover:text-gray-900 transition">FAQ</a>
          </div>
          <div className="hidden md:flex items-center gap-3">
            <Link href="/login" className="text-sm font-semibold text-gray-600 hover:text-gray-900 px-3 py-2">Entrar</Link>
            <Link href={CTA_URL} className="text-sm font-bold text-white bg-[#F26E1D] hover:bg-[#d95e15] px-5 py-2.5 rounded-xl transition shadow-lg shadow-orange-500/20">
              Começar agora
            </Link>
          </div>
          <button onClick={() => setMenuAberto(!menuAberto)} className="md:hidden p-2">
            {menuAberto ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>
        {menuAberto && (
          <div className="md:hidden bg-white border-t border-gray-100 px-4 py-4 space-y-3">
            <a href="#problemas" onClick={() => setMenuAberto(false)} className="block text-sm font-medium py-2">Problemas</a>
            <a href="#solucao" onClick={() => setMenuAberto(false)} className="block text-sm font-medium py-2">Solução</a>
            <a href="#planos" onClick={() => setMenuAberto(false)} className="block text-sm font-medium py-2">Planos</a>
            <Link href={CTA_URL} className="block text-center text-sm font-bold text-white bg-[#F26E1D] px-5 py-3 rounded-xl">Começar agora</Link>
          </div>
        )}
      </nav>

      {/* ═══════ HERO ═══════ */}
      <section className="pt-28 pb-16 sm:pt-36 sm:pb-24 px-4">
        <div className="max-w-4xl mx-auto text-center">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
            <div className="inline-flex items-center gap-2 bg-orange-50 text-[#F26E1D] text-xs font-bold px-4 py-1.5 rounded-full mb-6 border border-orange-100">
              <Zap className="w-3.5 h-3.5" /> +500 negócios já usam o Bora Gerir
            </div>
            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-black leading-tight tracking-tight">
              Pare de perder dinheiro<br />
              <span className="text-[#F26E1D]">com gestão desorganizada.</span>
            </h1>
            <p className="mt-6 text-lg sm:text-xl text-gray-600 max-w-2xl mx-auto leading-relaxed">
              O sistema que transforma o caos do seu negócio em controle total — caixa, clientes, agenda e financeiro em um só lugar.
            </p>
            <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-4">
              <Link href={CTA_URL}
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 text-white bg-[#F26E1D] hover:bg-[#d95e15] text-lg font-bold px-8 py-4 rounded-2xl transition shadow-xl shadow-orange-500/30 hover:shadow-orange-500/40 hover:-translate-y-0.5">
                Quero organizar meu negócio <ArrowRight className="w-5 h-5" />
              </Link>
            </div>
            <p className="mt-4 text-sm text-gray-500">Sem cartão de crédito. Ative em 2 minutos.</p>
          </motion.div>
        </div>
      </section>

      {/* ═══════ PROVA SOCIAL RÁPIDA ═══════ */}
      <section className="py-8 border-y border-gray-100 bg-gray-50/50">
        <div className="max-w-5xl mx-auto px-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6 text-center">
            {[
              { valor: "+500", label: "negócios ativos" },
              { valor: "+12.000", label: "vendas por mês" },
              { valor: "4.9/5", label: "avaliação média" },
              { valor: "24h", label: "suporte disponível" },
            ].map((s) => (
              <div key={s.label}>
                <p className="text-2xl sm:text-3xl font-black text-[#F26E1D]">{s.valor}</p>
                <p className="text-xs text-gray-500 font-medium mt-1">{s.label}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ═══════ PROBLEMAS (DOR) ═══════ */}
      <section id="problemas" className="py-20 px-4">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-3xl sm:text-4xl font-black">Você se identifica com algum desses?</h2>
            <p className="mt-3 text-gray-500 text-lg">Se marcou mais de um, está perdendo dinheiro todo dia.</p>
          </div>
          <div className="grid md:grid-cols-2 gap-5">
            {[
              { emoji: "📱", titulo: "Anota vendas no caderno ou WhatsApp", desc: "E no fim do mês não sabe quanto entrou e quanto saiu. Zero controle." },
              { emoji: "💸", titulo: "Não sabe se está lucrando ou perdendo", desc: "Fatura R$10 mil mas no final sobra quase nada. Sem relatórios, fica no escuro." },
              { emoji: "📅", titulo: "Perde clientes por falta de agenda", desc: "Horários duplicados, esquecimentos e cancelamentos de última hora — todo santo dia." },
              { emoji: "😤", titulo: "Funcionários sem controle de caixa", desc: "Dinheiro some, sangrias não registradas, e na hora de fechar o caixa... surpresa." },
              { emoji: "🧾", titulo: "Orçamentos feitos no papel", desc: "Sem padrão, sem profissionalismo. Cliente recebe um orçamento amador e vai pro concorrente." },
              { emoji: "📊", titulo: "Não sabe quais serviços mais vendem", desc: "Sem dados, não consegue decidir o que promover, o que cortar e onde investir." },
            ].map((p) => (
              <div key={p.titulo} className="flex gap-4 p-5 rounded-2xl border border-gray-100 hover:border-orange-200 hover:bg-orange-50/30 transition-all">
                <span className="text-3xl shrink-0">{p.emoji}</span>
                <div>
                  <h3 className="font-bold text-base">{p.titulo}</h3>
                  <p className="text-sm text-gray-500 mt-1">{p.desc}</p>
                </div>
              </div>
            ))}
          </div>
          <div className="text-center mt-10">
            <p className="text-xl font-black text-gray-800">Cada dia sem gestão é dinheiro que some do seu caixa.</p>
          </div>
        </div>
      </section>

      {/* ═══════ SOLUÇÃO ═══════ */}
      <section id="solucao" className="py-20 px-4 bg-gradient-to-b from-gray-50 to-white">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-3xl sm:text-4xl font-black">Tudo que você precisa.<br /><span className="text-[#F26E1D]">Num só lugar.</span></h2>
            <p className="mt-3 text-gray-500 text-lg">Sem instalar nada. Funciona no celular, tablet e computador.</p>
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {[
              { icon: Wallet, titulo: "Caixa em tempo real", desc: "Abra, feche, registre sangrias e despesas. Saiba o saldo a qualquer momento." },
              { icon: ShoppingCart, titulo: "PDV completo", desc: "Venda rápido com código de barras, atalhos de teclado e recibo automático." },
              { icon: Calendar, titulo: "Agenda online", desc: "Link público para clientes agendarem 24h. Sem mais WhatsApp." },
              { icon: Users, titulo: "Gestão de clientes", desc: "Histórico, fidelidade, aniversariantes e débitos. Tudo organizado." },
              { icon: BarChart3, titulo: "Financeiro inteligente", desc: "Lucro, ticket médio, contas a pagar e fluxo de caixa projetado." },
              { icon: CheckSquare, titulo: "Tarefas Kanban", desc: "Organize demandas da equipe com arrastar e soltar entre colunas." },
              { icon: FileText, titulo: "Orçamentos e contratos", desc: "Crie documentos profissionais com logo e envie por email ou WhatsApp." },
              { icon: Package, titulo: "Estoque automático", desc: "Alerta de estoque baixo e decremento automático a cada venda." },
              { icon: Smartphone, titulo: "Funciona no celular", desc: "Interface responsiva. Use no celular como se fosse um app nativo." },
            ].map((f) => (
              <div key={f.titulo} className="p-5 rounded-2xl border border-gray-100 hover:shadow-lg hover:-translate-y-1 transition-all bg-white">
                <div className="w-10 h-10 rounded-xl bg-orange-50 flex items-center justify-center mb-3">
                  <f.icon className="w-5 h-5 text-[#F26E1D]" />
                </div>
                <h3 className="font-bold text-sm">{f.titulo}</h3>
                <p className="text-xs text-gray-500 mt-1.5 leading-relaxed">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ═══════ DEPOIMENTOS ═══════ */}
      <section className="py-20 px-4">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-3xl sm:text-4xl font-black">Quem usa, <span className="text-[#F26E1D]">recomenda.</span></h2>
          </div>
          <div className="grid md:grid-cols-3 gap-5">
            {[
              { nome: "Carla Mendes", negocio: "Studio de Estética", texto: "Antes eu perdia 2h por dia no caderno. Agora em 5 minutos vejo tudo: caixa, agenda e quanto lucrei. Voltei a ter tempo pra mim." },
              { nome: "Rafael Oliveira", negocio: "Barbearia Premium", texto: "Meus clientes agendam pelo link e eu nem preciso atender telefone. O caixa fecha certinho todo dia. Melhor investimento que fiz." },
              { nome: "Ana Paula", negocio: "Pet Shop e Banho", texto: "Tinha pavor de tecnologia. O Bora Gerir é tão simples que aprendi em 10 minutos. Agora controlo 3 funcionários e estoque sem estresse." },
            ].map((d) => (
              <div key={d.nome} className="p-6 rounded-2xl border border-gray-100 bg-white hover:shadow-md transition-shadow">
                <div className="flex gap-0.5 mb-3">
                  {[1,2,3,4,5].map((i) => <Star key={i} className="w-4 h-4 fill-amber-400 text-amber-400" />)}
                </div>
                <p className="text-sm text-gray-700 leading-relaxed italic">"{d.texto}"</p>
                <div className="mt-4 pt-3 border-t border-gray-100">
                  <p className="text-sm font-bold">{d.nome}</p>
                  <p className="text-xs text-gray-500">{d.negocio}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ═══════ PLANOS ═══════ */}
      <section id="planos" className="py-20 px-4 bg-gray-50">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-3xl sm:text-4xl font-black">Escolha o plano ideal<br />para o seu negócio.</h2>
            <p className="mt-3 text-gray-500 text-lg">Cancele quando quiser. Sem multa. Sem contrato de fidelidade.</p>
          </div>
          <div className="grid md:grid-cols-3 gap-5 items-stretch">
            {/* Básico */}
            <div className="p-6 rounded-2xl border border-gray-200 bg-white flex flex-col">
              <h3 className="font-bold text-lg">Básico</h3>
              <div className="mt-2"><span className="text-3xl font-black">R$49</span><span className="text-gray-500 text-sm">/mês</span></div>
              <p className="text-xs text-gray-500 mt-1">Para quem está começando a organizar</p>
              <ul className="mt-5 space-y-2.5 flex-1">
                {["200 clientes", "Produtos ilimitados", "3 colaboradores", "Agenda interna", "Relatórios", "Tarefas", "Contratos", "Sem marca d'água"].map((f) => (
                  <li key={f} className="flex items-center gap-2 text-sm"><CheckCircle className="w-4 h-4 text-emerald-500 shrink-0" />{f}</li>
                ))}
              </ul>
              <Link href={CTA_URL} className="mt-6 block text-center text-sm font-bold text-[#F26E1D] border-2 border-[#F26E1D] px-5 py-3 rounded-xl hover:bg-orange-50 transition">
                Assinar Básico
              </Link>
            </div>

            {/* Profissional — DESTAQUE */}
            <div className="p-6 rounded-2xl border-2 border-[#F26E1D] bg-white relative flex flex-col shadow-xl shadow-orange-500/10">
              <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-[#F26E1D] text-white text-xs font-bold px-4 py-1 rounded-full">
                MAIS POPULAR
              </div>
              <h3 className="font-bold text-lg">Profissional</h3>
              <div className="mt-2">
                <span className="text-sm text-gray-400 line-through mr-2">R$99</span>
                <span className="text-3xl font-black text-[#F26E1D]">R$59,40</span>
                <span className="text-gray-500 text-sm">/1° mês</span>
              </div>
              <p className="text-xs text-emerald-600 font-bold mt-1">Cupom {CUPOM} = 40% OFF no primeiro mês</p>
              <ul className="mt-5 space-y-2.5 flex-1">
                {["Clientes ilimitados", "Produtos ilimitados", "Colaboradores ilimitados", "Agenda ONLINE (link público)", "Lembretes automáticos", "Fidelidade e pontos", "Relatórios avançados", "Exportação Excel", "Tarefas e contratos", "Prioridade no suporte"].map((f) => (
                  <li key={f} className="flex items-center gap-2 text-sm"><CheckCircle className="w-4 h-4 text-[#F26E1D] shrink-0" />{f}</li>
                ))}
              </ul>
              <Link href={CTA_URL} className="mt-6 block text-center text-sm font-bold text-white bg-[#F26E1D] hover:bg-[#d95e15] px-5 py-3.5 rounded-xl transition shadow-lg shadow-orange-500/20">
                Assinar Profissional — 40% OFF
              </Link>
              <button onClick={copiarCupom} className="mt-2 text-center text-xs text-gray-500 hover:text-[#F26E1D] transition cursor-pointer">
                {copied ? "Cupom copiado!" : `Copiar cupom: ${CUPOM}`}
              </button>
            </div>

            {/* Agenda */}
            <div className="p-6 rounded-2xl border border-gray-200 bg-white flex flex-col">
              <h3 className="font-bold text-lg">Agenda</h3>
              <div className="mt-2"><span className="text-3xl font-black">R$29</span><span className="text-gray-500 text-sm">/mês</span></div>
              <p className="text-xs text-gray-500 mt-1">Só precisa de agendamento online</p>
              <ul className="mt-5 space-y-2.5 flex-1">
                {["Clientes ilimitados", "3 colaboradores", "Agenda online (link público)", "Tarefas", "Configurações"].map((f) => (
                  <li key={f} className="flex items-center gap-2 text-sm"><CheckCircle className="w-4 h-4 text-emerald-500 shrink-0" />{f}</li>
                ))}
              </ul>
              <Link href={CTA_URL} className="mt-6 block text-center text-sm font-bold text-[#F26E1D] border-2 border-[#F26E1D] px-5 py-3 rounded-xl hover:bg-orange-50 transition">
                Assinar Agenda
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* ═══════ CUPOM DESTAQUE ═══════ */}
      <section className="py-16 px-4 bg-[#F26E1D]">
        <div className="max-w-3xl mx-auto text-center">
          <h2 className="text-2xl sm:text-3xl font-black text-white">Oferta por tempo limitado</h2>
          <p className="mt-3 text-white/80 text-lg">Use o cupom abaixo e ganhe <strong className="text-white">40% de desconto</strong> no primeiro mês do plano Profissional.</p>
          <div className="mt-6 inline-flex items-center gap-3 bg-white/20 backdrop-blur-sm border border-white/30 rounded-xl px-6 py-3">
            <span className="text-2xl font-black text-white tracking-widest">{CUPOM}</span>
            <button onClick={copiarCupom} className="text-xs font-bold text-white bg-white/20 hover:bg-white/30 px-3 py-1.5 rounded-lg transition">
              {copied ? "Copiado!" : "Copiar"}
            </button>
          </div>
          <p className="mt-4 text-white/60 text-sm">De R$99 por apenas R$59,40 no primeiro mês. Depois R$99/mês normalmente.</p>
          <Link href={CTA_URL} className="mt-6 inline-flex items-center gap-2 text-[#F26E1D] bg-white hover:bg-gray-50 text-lg font-bold px-8 py-4 rounded-2xl transition shadow-xl">
            Ativar minha conta agora <ArrowRight className="w-5 h-5" />
          </Link>
        </div>
      </section>

      {/* ═══════ FAQ ═══════ */}
      <section id="faq" className="py-20 px-4">
        <div className="max-w-3xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-black">Perguntas frequentes</h2>
          </div>
          <div className="space-y-4">
            {[
              { p: "Preciso instalar algum app?", r: "Não. O Bora Gerir funciona direto no navegador do celular ou computador. Basta acessar app.boragerir.com e pronto." },
              { p: "Posso cancelar quando quiser?", r: "Sim. Sem multa, sem contrato de fidelidade. Cancele a qualquer momento direto no painel." },
              { p: "Funciona para qual tipo de negócio?", r: "Salões, barbearias, clínicas de estética, pet shops, lojas, prestadores de serviço, comércios em geral." },
              { p: "Como funciona o pagamento?", r: "Pagamento mensal via Pix. Você recebe o QR Code na hora e o acesso é liberado imediatamente após confirmação." },
              { p: "Meus dados ficam seguros?", r: "Sim. Usamos criptografia de ponta a ponta e servidores na nuvem com backup automático diário." },
              { p: "Posso usar no celular?", r: "Sim! A interface é 100% responsiva. Funciona perfeitamente no celular, tablet e computador." },
              { p: "Como uso o cupom de desconto?", r: "Ao assinar o plano Profissional, insira o cupom BORA40 na tela de pagamento para ganhar 40% OFF no primeiro mês." },
            ].map((faq) => (
              <details key={faq.p} className="group rounded-xl border border-gray-200 overflow-hidden">
                <summary className="flex items-center justify-between px-5 py-4 cursor-pointer font-semibold text-sm hover:bg-gray-50 transition">
                  {faq.p}
                  <ChevronRight className="w-4 h-4 text-gray-400 group-open:rotate-90 transition-transform" />
                </summary>
                <p className="px-5 pb-4 text-sm text-gray-600 leading-relaxed">{faq.r}</p>
              </details>
            ))}
          </div>
        </div>
      </section>

      {/* ═══════ CTA FINAL ═══════ */}
      <section className="py-20 px-4 bg-gray-900">
        <div className="max-w-3xl mx-auto text-center">
          <h2 className="text-3xl sm:text-4xl font-black text-white">Chega de perder dinheiro.<br />Comece a gerir de verdade.</h2>
          <p className="mt-4 text-gray-400 text-lg">Em 2 minutos você organiza o que levou meses pra bagunçar.</p>
          <Link href={CTA_URL} className="mt-8 inline-flex items-center gap-2 text-white bg-[#F26E1D] hover:bg-[#d95e15] text-lg font-bold px-8 py-4 rounded-2xl transition shadow-xl shadow-orange-500/30">
            Começar agora — 40% OFF <ArrowRight className="w-5 h-5" />
          </Link>
          <p className="mt-4 text-gray-500 text-sm">Use o cupom <strong className="text-white">{CUPOM}</strong> no checkout.</p>
        </div>
      </section>

      {/* ═══════ FOOTER ═══════ */}
      <footer className="py-8 px-4 border-t border-gray-100 bg-white">
        <div className="max-w-5xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <LogoIcon size={22} />
            <span className="font-bold text-sm">Bora<span className="text-[#F26E1D]">Gerir</span></span>
          </div>
          <p className="text-xs text-gray-500">© {new Date().getFullYear()} Bora Gerir. Todos os direitos reservados.</p>
          <div className="flex gap-4 text-xs text-gray-500">
            <Link href="/login" className="hover:text-gray-900 transition">Entrar</Link>
            <Link href={CTA_URL} className="hover:text-gray-900 transition">Cadastrar</Link>
          </div>
        </div>
      </footer>
    </div>
  )
}
