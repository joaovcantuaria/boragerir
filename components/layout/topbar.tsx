"use client"

import Link from "next/link"
import { usePathname, useRouter } from "next/navigation"
import React, { useState, useEffect } from "react"
import { motion, AnimatePresence } from "framer-motion"
import {
  LayoutDashboard, Wallet, ShoppingCart, Calendar, Users,
  ShoppingBag, FileText, UserCheck, BarChart3, Settings,
  CreditCard, HeadphonesIcon, CheckSquare, ClipboardList,
  ChevronDown, Moon, Sun, Bell, Search, LogOut, Grid3X3, Building2,
} from "lucide-react"
import { useTheme } from "next-themes"
import { cn } from "@/lib/utils"
import { LogoIcon } from "@/components/ui/logo"
import { NotificationsBell } from "@/components/layout/notifications-bell"
import { SearchPalette } from "@/components/layout/search-palette"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { createClient } from "@/lib/supabase/client"
import { gerarIniciais } from "@/lib/utils"

const navPrincipal = [
  { path: "/dashboard",    icon: LayoutDashboard, label: "Dashboard",    shortcut: "D" },
  { path: "/caixa",        icon: Wallet,          label: "Caixa",        shortcut: "C" },
  { path: "/venda",        icon: ShoppingCart,    label: "Nova Venda",   shortcut: "N" },
  { path: "/agendamentos", icon: Calendar,        label: "Agendamentos", shortcut: "A" },
  { path: "/clientes",     icon: Users,           label: "Clientes",     shortcut: "L" },
  { path: "/financeiro",   icon: BarChart3,       label: "Financeiro",   shortcut: "F" },
]

const navSecundario = [
  { path: "/produtos-servicos", icon: ShoppingBag,    label: "Produtos/Serviços", color: "#f59e0b" },
  { path: "/orcamentos",        icon: FileText,       label: "Orçamentos",        color: "#8b5cf6" },
  { path: "/contratos",         icon: ClipboardList,  label: "Contratos",         color: "#0ea5e9" },
  { path: "/tarefas",           icon: CheckSquare,    label: "Tarefas",           color: "#ec4899" },
  { path: "/funcionarios",      icon: UserCheck,      label: "Colaboradores",     color: "#14b8a6" },
  { path: "/planos",            icon: CreditCard,     label: "Planos",            color: "#6366f1" },
  { path: "/suporte",           icon: HeadphonesIcon, label: "Suporte",           color: "#a855f7" },
  { path: "/configuracoes",     icon: Settings,       label: "Configurações",     color: "#6b7280" },
]

interface TopbarProps {
  empresaNome?: string
  empresaLogoUrl?: string | null
  plano?: string
  empresas?: { id: string; nome: string; logo_url: string | null }[]
  empresaAtualId?: string
  onSelecionarEmpresa?: (id: string) => void
}

// Dropdown genérico com portal — renderiza fora do stacking context do header
function Dropdown({
  open,
  onClose,
  children,
  trigger,
  align = "left",
  width = 272,
}: {
  open: boolean
  onClose: () => void
  children: React.ReactNode
  trigger: (ref: React.RefObject<HTMLDivElement | null>) => React.ReactNode
  align?: "left" | "right"
  width?: number
}) {
  const triggerRef = React.useRef<HTMLDivElement>(null)
  const [rect, setRect] = React.useState<DOMRect | null>(null)

  React.useEffect(() => {
    if (open && triggerRef.current) {
      setRect(triggerRef.current.getBoundingClientRect())
    }
  }, [open])

  const style: React.CSSProperties = rect
    ? {
        position: "fixed",
        top: rect.bottom + 4,
        ...(align === "right"
          ? { right: window.innerWidth - rect.right }
          : { left: rect.left }),
        width,
        zIndex: 99999,
      }
    : { display: "none" }

  return (
    <>
      {trigger(triggerRef)}
      {open && (
        <>
          {/* Overlay invisível */}
          <div
            style={{ position: "fixed", inset: 0, zIndex: 99998 }}
            onClick={onClose}
          />
          {/* Menu — fora do stacking context */}
          <motion.div
            initial={{ opacity: 0, y: -4, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            transition={{ duration: 0.12 }}
            className="rounded-lg border shadow-2xl overflow-hidden bg-white border-gray-200 dark:bg-[#1e2030] dark:border-[#2d3148]"
            style={style}
          >
            {children}
          </motion.div>
        </>
      )}
    </>
  )
}

export function Topbar({ empresaNome = "Bora Gerir", empresaLogoUrl, plano, empresas = [], empresaAtualId, onSelecionarEmpresa }: TopbarProps) {
  const pathname = usePathname()
  const router = useRouter()
  const { theme, setTheme } = useTheme()
  const [mounted, setMounted] = useState(false)
  const [maisAberto, setMaisAberto] = useState(false)
  const [userAberto, setUserAberto] = useState(false)
  const [empresasAberto, setEmpresasAberto] = useState(false)
  const [buscaAberta, setBuscaAberta] = useState(false)
  const supabase = createClient()
  const isPlanoGestao = plano === "gestao"

  useEffect(() => { setMounted(true) }, [])

  // Atalho Ctrl+K para busca
  useEffect(() => {
    function handler(e: KeyboardEvent) {
      if ((e.ctrlKey || e.metaKey) && e.key === "k") {
        e.preventDefault()
        setBuscaAberta((v) => !v)
      }
    }
    document.addEventListener("keydown", handler)
    return () => document.removeEventListener("keydown", handler)
  }, [])

  // Fechar ao mudar de página
  useEffect(() => {
    setMaisAberto(false)
    setUserAberto(false)
    setEmpresasAberto(false)
  }, [pathname])

  // Nav filtrada para plano gestão
  const navPrincipalFiltrado = isPlanoGestao
    ? [
        { path: "/dashboard",    icon: LayoutDashboard, label: "Dashboard",    shortcut: "D" },
        { path: "/caixa",        icon: Wallet,          label: "Caixa",        shortcut: "C" },
        { path: "/financeiro",   icon: BarChart3,       label: "Financeiro",   shortcut: "F" },
        { path: "/funcionarios", icon: UserCheck,       label: "Colaboradores", shortcut: "" },
        { path: "/tarefas",      icon: CheckSquare,     label: "Tarefas",      shortcut: "" },
      ]
    : navPrincipal

  const algumSecundarioAtivo = isPlanoGestao
    ? false
    : navSecundario.some(
      (i) => pathname === i.path || pathname.startsWith(i.path + "/")
    )

  async function handleLogout() {
    await supabase.auth.signOut()
    router.push("/login")
  }

  return (
    <header className="sticky top-0 z-30 flex items-center h-12 px-4 gap-3"
      style={{
        background: "hsl(222,28%,14%)",
        borderBottom: "1px solid hsl(222,22%,20%)",
        boxShadow: "0 1px 8px rgba(0,0,0,0.25)",
      }}
    >
      {/* Logo */}
      <Link href="/dashboard" className="flex items-center gap-2 shrink-0 mr-1">
        <LogoIcon size={26} />
        <span className="font-bold text-sm text-white hidden sm:block">
          Bora<span style={{ color: "#F26E1D" }}>Gerir</span>
        </span>
      </Link>

      <div className="w-px h-5 shrink-0" style={{ background: "rgba(255,255,255,0.12)" }} />

      {/* Nav principal */}
      <nav className="flex items-center gap-0.5 flex-1 overflow-x-auto">
        {navPrincipalFiltrado.map((item) => {
          const isActive = item.path === "/dashboard"
            ? pathname === item.path
            : pathname === item.path || pathname.startsWith(item.path + "/")
          const Icon = item.icon
          return (
            <Link
              key={item.path}
              href={item.path}
              prefetch={true}
              title={`${item.label} (${item.shortcut})`}
              className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-xs font-medium transition-all whitespace-nowrap"
              style={{
                background: isActive ? "rgba(242,110,29,0.18)" : "transparent",
                color: isActive ? "#F26E1D" : "rgba(255,255,255,0.6)",
              }}
              onMouseEnter={(e) => {
                if (!isActive) e.currentTarget.style.color = "white"
              }}
              onMouseLeave={(e) => {
                if (!isActive) e.currentTarget.style.color = "rgba(255,255,255,0.6)"
              }}
            >
              <Icon className="w-3.5 h-3.5 shrink-0" />
              <span className="hidden lg:inline">{item.label}</span>
            </Link>
          )
        })}

        {/* Seletor de Empresas — para plano gestão */}
        {isPlanoGestao && (
          <Dropdown
            open={empresasAberto}
            onClose={() => setEmpresasAberto(false)}
            width={240}
            trigger={(ref) => (
              <div ref={ref}>
                <button
                  onClick={() => { setEmpresasAberto((v) => !v); setMaisAberto(false); setUserAberto(false) }}
                  className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-xs font-medium transition-all whitespace-nowrap"
                  style={{
                    background: empresasAberto ? "rgba(242,110,29,0.18)" : "transparent",
                    color: empresasAberto ? "#F26E1D" : "rgba(255,255,255,0.6)",
                  }}
                >
                  <Building2 className="w-3.5 h-3.5 shrink-0" />
                  <span className="hidden lg:inline">Empresas</span>
                  <ChevronDown className={cn(
                    "w-3 h-3 transition-transform hidden lg:block",
                    empresasAberto && "rotate-180"
                  )} />
                </button>
              </div>
            )}
          >
            <div className="px-3 py-2.5 border-b border-gray-200 dark:border-[#2d3148]">
              <p className="text-[10px] font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wider">
                Suas empresas ({empresas.length})
              </p>
            </div>
            <div className="p-1.5 space-y-0.5 max-h-60 overflow-y-auto">
              {empresas.map((emp) => (
                <button
                  key={emp.id}
                  onClick={() => {
                    onSelecionarEmpresa?.(emp.id)
                    setEmpresasAberto(false)
                    window.location.reload()
                  }}
                  className={cn(
                    "w-full flex items-center gap-2.5 px-3 py-2 rounded-md text-xs font-medium transition-colors text-left",
                    emp.id === empresaAtualId
                      ? "text-[#F26E1D] bg-[rgba(242,110,29,0.08)]"
                      : "text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-white/5"
                  )}
                >
                  <div className="w-6 h-6 rounded-md bg-primary/10 flex items-center justify-center shrink-0 overflow-hidden">
                    {emp.logo_url
                      ? <img src={emp.logo_url} alt="" className="w-full h-full object-cover" />
                      : <span className="text-[9px] font-bold text-primary">{emp.nome.charAt(0)}</span>
                    }
                  </div>
                  <span className="truncate flex-1">{emp.nome}</span>
                  {emp.id === empresaAtualId && (
                    <div className="w-2 h-2 rounded-full bg-primary shrink-0" />
                  )}
                </button>
              ))}
            </div>
            <div className="border-t border-gray-200 dark:border-[#2d3148] p-1.5">
              <button
                onClick={() => { setEmpresasAberto(false); router.push("/empresas") }}
                className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded-md text-xs font-bold text-[#F26E1D] hover:bg-[rgba(242,110,29,0.08)] transition-colors"
              >
                <Settings className="w-3.5 h-3.5" />
                Gerenciar empresas
              </button>
            </div>
          </Dropdown>
        )}

        {/* Botão Mais — oculto no plano gestão */}
        {!isPlanoGestao && (
        <Dropdown
          open={maisAberto}
          onClose={() => setMaisAberto(false)}
          width={272}
          trigger={(ref) => (
            <div ref={ref}>
              <button
                onClick={() => { setMaisAberto((v) => !v); setUserAberto(false) }}
                className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-xs font-medium transition-all whitespace-nowrap"
                style={{
                  background: (maisAberto || algumSecundarioAtivo) ? "rgba(242,110,29,0.18)" : "transparent",
                  color: (maisAberto || algumSecundarioAtivo) ? "#F26E1D" : "rgba(255,255,255,0.6)",
                }}
              >
                <Grid3X3 className="w-3.5 h-3.5 shrink-0" />
                <span className="hidden lg:inline">Mais</span>
                <ChevronDown className={cn(
                  "w-3 h-3 transition-transform hidden lg:block",
                  maisAberto && "rotate-180"
                )} />
              </button>
            </div>
          )}
        >
          <div className="p-2 grid grid-cols-2 gap-0.5">
            {navSecundario.map((item) => {
              const isActive = pathname === item.path || pathname.startsWith(item.path + "/")
              const Icon = item.icon
              return (
                <Link
                  key={item.path}
                  href={item.path}
                  onClick={() => setMaisAberto(false)}
                  className={cn(
                    "flex items-center gap-2.5 px-3 py-2 rounded-md text-xs font-medium transition-colors",
                    isActive
                      ? "text-[#F26E1D] bg-[rgba(242,110,29,0.08)]"
                      : "text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-white/5"
                  )}
                >
                  <div
                    className="w-6 h-6 rounded-md flex items-center justify-center shrink-0"
                    style={{ background: item.color + "22" }}
                  >
                    <Icon className="w-3.5 h-3.5" style={{ color: item.color }} />
                  </div>
                  {item.label}
                </Link>
              )
            })}
          </div>
        </Dropdown>
        )}
      </nav>

      {/* Ações direita */}
      <div className="flex items-center gap-0.5 shrink-0">
        <button
          onClick={() => setBuscaAberta(true)}
          className="w-8 h-8 flex items-center justify-center rounded-md transition-colors"
          style={{ color: "rgba(255,255,255,0.5)" }}
          onMouseEnter={(e) => { e.currentTarget.style.color = "white"; e.currentTarget.style.background = "rgba(255,255,255,0.08)" }}
          onMouseLeave={(e) => { e.currentTarget.style.color = "rgba(255,255,255,0.5)"; e.currentTarget.style.background = "transparent" }}
          title="Busca (Ctrl+K)"
        >
          <Search className="w-4 h-4" />
        </button>

        <SearchPalette open={buscaAberta} onClose={() => setBuscaAberta(false)} />

        <NotificationsBell empresaId={empresaAtualId} />

        {mounted && (
          <button
            className="w-8 h-8 flex items-center justify-center rounded-md transition-colors"
            style={{ color: "rgba(255,255,255,0.5)" }}
            onMouseEnter={(e) => { e.currentTarget.style.color = "white"; e.currentTarget.style.background = "rgba(255,255,255,0.08)" }}
            onMouseLeave={(e) => { e.currentTarget.style.color = "rgba(255,255,255,0.5)"; e.currentTarget.style.background = "transparent" }}
            onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
            title="Alternar tema"
          >
            {theme === "dark" ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
          </button>
        )}

        <div className="w-px h-5 mx-1 shrink-0" style={{ background: "rgba(255,255,255,0.12)" }} />

        {/* Menu do usuário */}
        <Dropdown
          open={userAberto}
          onClose={() => setUserAberto(false)}
          align="right"
          width={192}
          trigger={(ref) => (
            <div ref={ref}>
              <button
                onClick={() => { setUserAberto((v) => !v); setMaisAberto(false) }}
                className="flex items-center gap-2 pl-1 pr-2 py-1 rounded-md transition-colors"
                style={{ color: "rgba(255,255,255,0.8)" }}
                onMouseEnter={(e) => { e.currentTarget.style.background = "rgba(255,255,255,0.08)" }}
                onMouseLeave={(e) => { e.currentTarget.style.background = "transparent" }}
              >
                <Avatar className="w-6 h-6">
                  {empresaLogoUrl && <AvatarImage src={empresaLogoUrl} alt={empresaNome} />}
                  <AvatarFallback className="text-[10px] font-bold" style={{ background: "#F26E1D", color: "white" }}>
                    {gerarIniciais(empresaNome)}
                  </AvatarFallback>
                </Avatar>
                <span className="text-xs font-medium hidden md:block max-w-[120px] truncate">
                  {empresaNome}
                </span>
                <ChevronDown
                  className={cn("w-3 h-3 transition-transform hidden md:block", userAberto && "rotate-180")}
                  style={{ color: "rgba(255,255,255,0.4)" }}
                />
              </button>
            </div>
          )}
        >
          <div className="px-3 py-2.5 border-b border-gray-200 dark:border-[#2d3148]">
            <p className="text-xs font-semibold truncate text-gray-900 dark:text-gray-100">{empresaNome}</p>
            {typeof window !== "undefined" && (() => {
              try {
                const colab = JSON.parse(sessionStorage.getItem("boragerir_colaborador_ativo") || "null")
                if (colab) return <p className="text-[10px] text-muted-foreground mt-0.5">👤 {colab.nome} ({colab.perfil})</p>
              } catch {}
              return null
            })()}
          </div>
          <div className="p-1.5 space-y-0.5">
            <button
              onClick={() => { router.push("/configuracoes"); setUserAberto(false) }}
              className="w-full flex items-center gap-2.5 px-3 py-2 rounded-md text-xs font-medium transition-colors text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-white/5"
            >
              <Settings className="w-3.5 h-3.5 text-gray-400 dark:text-gray-500" />
              Configurações
            </button>
            {!isPlanoGestao && (
            <button
              onClick={() => { router.push("/planos"); setUserAberto(false) }}
              className="w-full flex items-center gap-2.5 px-3 py-2 rounded-md text-xs font-medium transition-colors text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-white/5"
            >
              <CreditCard className="w-3.5 h-3.5 text-gray-400 dark:text-gray-500" />
              Meu plano
            </button>
            )}
            <div className="border-t border-gray-200 dark:border-[#2d3148] my-1" />
            <button
              onClick={() => { sessionStorage.removeItem("boragerir_colaborador_ativo"); window.location.reload() }}
              className="w-full flex items-center gap-2.5 px-3 py-2 rounded-md text-xs font-medium transition-colors text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-white/5"
            >
              <Users className="w-3.5 h-3.5 text-gray-400 dark:text-gray-500" />
              Trocar usuário
            </button>
            <button
              onClick={handleLogout}
              className="w-full flex items-center gap-2.5 px-3 py-2 rounded-md text-xs font-medium transition-colors text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10"
            >
              <LogOut className="w-3.5 h-3.5" />
              Sair
            </button>
          </div>
        </Dropdown>
      </div>
    </header>
  )
}
