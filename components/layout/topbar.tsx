"use client"

import Link from "next/link"
import { usePathname, useRouter } from "next/navigation"
import { useState, useRef, useEffect } from "react"
import { motion, AnimatePresence } from "framer-motion"
import {
  LayoutDashboard, Wallet, ShoppingCart, Calendar, Users,
  ShoppingBag, FileText, UserCheck, BarChart3, Settings,
  CreditCard, HeadphonesIcon, CheckSquare, ClipboardList,
  ChevronDown, Moon, Sun, Bell, Search, LogOut, Grid3X3,
} from "lucide-react"
import { useTheme } from "next-themes"
import { cn } from "@/lib/utils"
import { LogoIcon } from "@/components/ui/logo"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { createClient } from "@/lib/supabase/client"
import { gerarIniciais } from "@/lib/utils"

// Itens principais — ficam direto na topbar
const navPrincipal = [
  { path: "/dashboard",    icon: LayoutDashboard, label: "Dashboard",    shortcut: "D" },
  { path: "/caixa",        icon: Wallet,          label: "Caixa",        shortcut: "C" },
  { path: "/venda",        icon: ShoppingCart,    label: "Nova Venda",   shortcut: "N" },
  { path: "/agendamentos", icon: Calendar,        label: "Agendamentos", shortcut: "A" },
  { path: "/clientes",     icon: Users,           label: "Clientes",     shortcut: "L" },
  { path: "/financeiro",   icon: BarChart3,       label: "Financeiro",   shortcut: "F" },
]

// Itens secundários — aparecem no dropdown "Mais"
const navSecundario = [
  { path: "/produtos-servicos", icon: ShoppingBag,   label: "Produtos/Serviços", color: "#f59e0b" },
  { path: "/orcamentos",        icon: FileText,      label: "Orçamentos",        color: "#8b5cf6" },
  { path: "/contratos",         icon: ClipboardList, label: "Contratos",         color: "#0ea5e9" },
  { path: "/tarefas",           icon: CheckSquare,   label: "Tarefas",           color: "#ec4899" },
  { path: "/funcionarios",      icon: UserCheck,     label: "Colaboradores",     color: "#14b8a6" },
  { path: "/planos",            icon: CreditCard,    label: "Planos",            color: "#6366f1" },
  { path: "/suporte",           icon: HeadphonesIcon,label: "Suporte",           color: "#a855f7" },
  { path: "/configuracoes",     icon: Settings,      label: "Configurações",     color: "#6b7280" },
]

interface TopbarProps {
  empresaNome?: string
  empresaLogoUrl?: string | null
}

export function Topbar({ empresaNome = "Bora Gerir", empresaLogoUrl }: TopbarProps) {
  const pathname = usePathname()
  const router = useRouter()
  const { theme, setTheme } = useTheme()
  const [mounted, setMounted] = useState(false)
  const [maisAberto, setMaisAberto] = useState(false)
  const [userMenuAberto, setUserMenuAberto] = useState(false)
  const maisRef = useRef<HTMLDivElement>(null)
  const userRef = useRef<HTMLDivElement>(null)
  const supabase = createClient()

  useEffect(() => { setMounted(true) }, [])

  // Fechar dropdowns ao clicar fora
  useEffect(() => {
    function handler(e: MouseEvent) {
      if (maisRef.current && !maisRef.current.contains(e.target as Node)) {
        setMaisAberto(false)
      }
      if (userRef.current && !userRef.current.contains(e.target as Node)) {
        setUserMenuAberto(false)
      }
    }
    // mousedown em vez de click para não conflitar com o toggle do botão
    document.addEventListener("mousedown", handler)
    return () => document.removeEventListener("mousedown", handler)
  }, [])

  function toggleMais(e: React.MouseEvent) {
    e.stopPropagation()
    setMaisAberto((v) => !v)
    setUserMenuAberto(false)
  }

  function toggleUser(e: React.MouseEvent) {
    e.stopPropagation()
    setUserMenuAberto((v) => !v)
    setMaisAberto(false)
  }

  // Fechar ao navegar
  useEffect(() => {
    setMaisAberto(false)
    setUserMenuAberto(false)
  }, [pathname])

  const algumSecundarioAtivo = navSecundario.some(
    (i) => pathname === i.path || pathname.startsWith(i.path + "/")
  )

  async function handleLogout() {
    await supabase.auth.signOut()
    router.push("/login")
  }

  const btnIcon = cn(
    "w-8 h-8 flex items-center justify-center rounded-md transition-colors relative",
    "text-muted-foreground hover:text-foreground hover:bg-muted"
  )

  return (
    <header className={cn(
      "sticky top-0 z-30 flex items-center h-12 px-4 gap-4",
      "bg-[hsl(222,28%,14%)] border-b border-[hsl(222,22%,20%)]",
      "shadow-[0_1px_8px_rgba(0,0,0,0.25)]"
    )}>

      {/* Logo */}
      <Link href="/dashboard" className="flex items-center gap-2 shrink-0 mr-2">
        <LogoIcon size={26} />
        <span className="font-bold text-sm text-white hidden sm:block">
          Bora<span style={{ color: "#F26E1D" }}>Gerir</span>
        </span>
      </Link>

      {/* Divisor */}
      <div className="w-px h-5 bg-white/10 shrink-0" />

      {/* Nav principal */}
      <nav className="flex items-center gap-0.5 flex-1 overflow-x-auto scrollbar-none">
        {navPrincipal.map((item) => {
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
              className={cn(
                "flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-all whitespace-nowrap",
                isActive
                  ? "bg-[#F26E1D]/20 text-[#F26E1D]"
                  : "text-white/60 hover:text-white hover:bg-white/8"
              )}
            >
              <Icon className="w-3.5 h-3.5 shrink-0" />
              <span className="hidden lg:inline">{item.label}</span>
            </Link>
          )
        })}

        {/* Dropdown "Mais" */}
        <div ref={maisRef} className="relative">
          <button
            onClick={toggleMais}
            className={cn(
              "flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-all whitespace-nowrap select-none",
              (maisAberto || algumSecundarioAtivo)
                ? "bg-[#F26E1D]/20 text-[#F26E1D]"
                : "text-white/60 hover:text-white hover:bg-white/8"
            )}
          >
            <Grid3X3 className="w-3.5 h-3.5 shrink-0" />
            <span className="hidden lg:inline">Mais</span>
            <ChevronDown className={cn(
              "w-3 h-3 transition-transform hidden lg:block",
              maisAberto && "rotate-180"
            )} />
          </button>

          <AnimatePresence>
            {maisAberto && (
              <motion.div
                initial={{ opacity: 0, y: -6, scale: 0.97 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: -6, scale: 0.97 }}
                transition={{ duration: 0.13 }}
                className={cn(
                  "absolute top-full left-0 mt-1.5 w-64 rounded-lg border shadow-xl overflow-hidden",
                  "bg-card border-border"
                )}
                style={{ zIndex: 9999 }}
              >
                <div className="p-1.5 grid grid-cols-2 gap-0.5">
                  {navSecundario.map((item) => {
                    const isActive = pathname === item.path || pathname.startsWith(item.path + "/")
                    const Icon = item.icon
                    return (
                      <Link
                        key={item.path}
                        href={item.path}
                        className={cn(
                          "flex items-center gap-2.5 px-3 py-2 rounded-md text-xs font-medium transition-colors",
                          isActive
                            ? "bg-primary/10 text-primary"
                            : "text-foreground hover:bg-muted"
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
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </nav>

      {/* Ações direita */}
      <div className="flex items-center gap-0.5 shrink-0 ml-auto">
        {/* Busca */}
        <button className={cn(btnIcon, "text-white/50 hover:text-white hover:bg-white/8")} title="Busca (K)">
          <Search className="w-4 h-4" />
        </button>

        {/* Notificações */}
        <button className={cn(btnIcon, "text-white/50 hover:text-white hover:bg-white/8")} title="Notificações">
          <Bell className="w-4 h-4" />
        </button>

        {/* Tema */}
        {mounted && (
          <button
            className={cn(btnIcon, "text-white/50 hover:text-white hover:bg-white/8")}
            onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
            title="Alternar tema"
          >
            {theme === "dark" ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
          </button>
        )}

        {/* Divisor */}
        <div className="w-px h-5 bg-white/10 mx-1" />

        {/* Avatar + menu */}
        <div ref={userRef} className="relative">
          <button
            onClick={toggleUser}
            className="flex items-center gap-2 pl-1 pr-2 py-1 rounded-md hover:bg-white/8 transition-colors select-none"
          >
            <Avatar className="w-6 h-6 ring-1 ring-white/20">
              {empresaLogoUrl && <AvatarImage src={empresaLogoUrl} alt={empresaNome} />}
              <AvatarFallback className="text-[10px] font-bold bg-primary text-white">
                {gerarIniciais(empresaNome)}
              </AvatarFallback>
            </Avatar>
            <span className="text-xs font-medium text-white/80 hidden md:block max-w-[120px] truncate">
              {empresaNome}
            </span>
            <ChevronDown className={cn(
              "w-3 h-3 text-white/40 transition-transform hidden md:block",
              userMenuAberto && "rotate-180"
            )} />
          </button>

          <AnimatePresence>
            {userMenuAberto && (
              <motion.div
                initial={{ opacity: 0, y: -6, scale: 0.97 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: -6, scale: 0.97 }}
                transition={{ duration: 0.13 }}
                className="absolute top-full right-0 mt-1.5 w-48 rounded-lg border shadow-xl overflow-hidden bg-card border-border"
                style={{ zIndex: 9999 }}
              >
                <div className="px-3 py-2 border-b border-border">
                  <p className="text-xs font-semibold text-foreground truncate">{empresaNome}</p>
                </div>
                <div className="p-1">
                  {[
                    { label: "Configurações", icon: Settings, path: "/configuracoes" },
                    { label: "Meu plano", icon: CreditCard, path: "/planos" },
                  ].map((item) => {
                    const Icon = item.icon
                    return (
                      <button
                        key={item.path}
                        onClick={() => router.push(item.path)}
                        className="w-full flex items-center gap-2.5 px-3 py-2 rounded-md text-xs font-medium text-foreground hover:bg-muted transition-colors"
                      >
                        <Icon className="w-3.5 h-3.5 text-muted-foreground" />
                        {item.label}
                      </button>
                    )
                  })}
                  <div className="border-t border-border mt-1 pt-1">
                    <button
                      onClick={handleLogout}
                      className="w-full flex items-center gap-2.5 px-3 py-2 rounded-md text-xs font-medium text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
                    >
                      <LogOut className="w-3.5 h-3.5" />
                      Sair
                    </button>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </header>
  )
}
