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
            className="rounded-lg border shadow-2xl overflow-hidden"
            style={{
              ...style,
              backgroundColor: "var(--dropdown-bg, #ffffff)",
              borderColor: "var(--dropdown-border, #e5e7eb)",
            }}
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
  const supabase = createClient()
  const isPlanoGestao = plano === "gestao"

  useEffect(() => { setMounted(true) }, [])

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
            <div className="px-3 py-2.5" style={{ borderBottom: "1px solid #e5e7eb" }}>
              <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider">
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
                    router.refresh()
                  }}
                  className="w-full flex items-center gap-2.5 px-3 py-2 rounded-md text-xs font-medium transition-colors text-left"
                  style={{
                    color: emp.id === empresaAtualId ? "#F26E1D" : "#374151",
                    background: emp.id === empresaAtualId ? "rgba(242,110,29,0.08)" : "transparent",
                  }}
                  onMouseEnter={(e) => { if (emp.id !== empresaAtualId) e.currentTarget.style.background = "#f3f4f6" }}
                  onMouseLeave={(e) => { if (emp.id !== empresaAtualId) e.currentTarget.style.background = "transparent" }}
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
            <div style={{ borderTop: "1px solid #e5e7eb", padding: "6px" }}>
              <button
                onClick={() => { setEmpresasAberto(false); router.push("/empresas") }}
                className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded-md text-xs font-bold transition-colors"
                style={{ color: "#F26E1D" }}
                onMouseEnter={(e) => { e.currentTarget.style.background = "rgba(242,110,29,0.08)" }}
                onMouseLeave={(e) => { e.currentTarget.style.background = "transparent" }}
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
                  className="flex items-center gap-2.5 px-3 py-2 rounded-md text-xs font-medium transition-colors"
                  style={{
                    color: isActive ? "#F26E1D" : "#374151",
                    background: isActive ? "rgba(242,110,29,0.08)" : "transparent",
                  }}
                  onMouseEnter={(e) => {
                    if (!isActive) e.currentTarget.style.background = "#f3f4f6"
                  }}
                  onMouseLeave={(e) => {
                    if (!isActive) e.currentTarget.style.background = "transparent"
                  }}
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
          className="w-8 h-8 flex items-center justify-center rounded-md transition-colors"
          style={{ color: "rgba(255,255,255,0.5)" }}
          onMouseEnter={(e) => { e.currentTarget.style.color = "white"; e.currentTarget.style.background = "rgba(255,255,255,0.08)" }}
          onMouseLeave={(e) => { e.currentTarget.style.color = "rgba(255,255,255,0.5)"; e.currentTarget.style.background = "transparent" }}
          title="Busca (K)"
        >
          <Search className="w-4 h-4" />
        </button>

        <button
          className="w-8 h-8 flex items-center justify-center rounded-md transition-colors"
          style={{ color: "rgba(255,255,255,0.5)" }}
          onMouseEnter={(e) => { e.currentTarget.style.color = "white"; e.currentTarget.style.background = "rgba(255,255,255,0.08)" }}
          onMouseLeave={(e) => { e.currentTarget.style.color = "rgba(255,255,255,0.5)"; e.currentTarget.style.background = "transparent" }}
          title="Notificações"
        >
          <Bell className="w-4 h-4" />
        </button>

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
          <div className="px-3 py-2.5" style={{ borderBottom: "1px solid #e5e7eb" }}>
            <p className="text-xs font-semibold truncate" style={{ color: "#111827" }}>{empresaNome}</p>
          </div>
          <div className="p-1.5 space-y-0.5">
            <button
              onClick={() => { router.push("/configuracoes"); setUserAberto(false) }}
              className="w-full flex items-center gap-2.5 px-3 py-2 rounded-md text-xs font-medium transition-colors"
              style={{ color: "#374151" }}
              onMouseEnter={(e) => { e.currentTarget.style.background = "#f3f4f6" }}
              onMouseLeave={(e) => { e.currentTarget.style.background = "transparent" }}
            >
              <Settings className="w-3.5 h-3.5" style={{ color: "#9ca3af" }} />
              Configurações
            </button>
            <button
              onClick={() => { router.push("/planos"); setUserAberto(false) }}
              className="w-full flex items-center gap-2.5 px-3 py-2 rounded-md text-xs font-medium transition-colors"
              style={{ color: "#374151" }}
              onMouseEnter={(e) => { e.currentTarget.style.background = "#f3f4f6" }}
              onMouseLeave={(e) => { e.currentTarget.style.background = "transparent" }}
            >
              <CreditCard className="w-3.5 h-3.5" style={{ color: "#9ca3af" }} />
              Meu plano
            </button>
            <div style={{ borderTop: "1px solid #e5e7eb", margin: "4px 0" }} />
            <button
              onClick={handleLogout}
              className="w-full flex items-center gap-2.5 px-3 py-2 rounded-md text-xs font-medium transition-colors"
              style={{ color: "#ef4444" }}
              onMouseEnter={(e) => { e.currentTarget.style.background = "rgba(239,68,68,0.08)" }}
              onMouseLeave={(e) => { e.currentTarget.style.background = "transparent" }}
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
