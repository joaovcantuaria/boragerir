"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { motion, AnimatePresence } from "framer-motion"
import {
  LayoutDashboard, Building2, CreditCard, HeadphonesIcon,
  Settings, ChevronLeft, ChevronRight, LogOut, Shield,
  Tag, Users2, Bell, X, Bot, Sun, Moon,
} from "lucide-react"
import { useTheme } from "next-themes"
import { cn } from "@/lib/utils"
import { LogoIcon } from "@/components/ui/logo"
import { createClient } from "@/lib/supabase/client"
import { useRouter } from "next/navigation"

const navItems = [
  { href: "/admin",                  icon: LayoutDashboard, label: "Dashboard" },
  { href: "/admin/empresas",         icon: Building2,       label: "Empresas" },
  { href: "/admin/assinaturas",      icon: CreditCard,      label: "Assinaturas" },
  { href: "/admin/vendedores",       icon: Users2,          label: "Vendedores" },
  { href: "/admin/cupons",           icon: Tag,             label: "Cupons" },
  { href: "/admin/atendimentos-ia",  icon: Bot,             label: "🌟 Atendimentos IA" },
  { href: "/admin/suporte",          icon: HeadphonesIcon,  label: "Suporte" },
  { href: "/admin/usuarios",         icon: Shield,          label: "Usuários" },
  { href: "/admin/configuracoes",    icon: Settings,        label: "Configurações" },
]

interface Notificacao {
  id: string; tipo: string; titulo: string; mensagem: string; lida: boolean; created_at: string
}

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const [collapsed, setCollapsed] = useState(false)
  const [notifAberto, setNotifAberto] = useState(false)
  const [notifs, setNotifs] = useState<Notificacao[]>([])
  const [mounted, setMounted] = useState(false)
  const pathname = usePathname()
  const router = useRouter()
  const supabase = createClient()
  const { theme, setTheme } = useTheme()

  useEffect(() => { setMounted(true) }, [])

  const naoLidas = notifs.filter((n) => !n.lida).length

  useEffect(() => {
    fetch("/api/admin/notificacoes")
      .then((r) => r.json())
      .then((data) => Array.isArray(data) && setNotifs(data))
      .catch(() => {})
  }, [])

  useEffect(() => {
    const channel = supabase
      .channel("notificacoes_admin")
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "notificacoes_admin" },
        (payload) => setNotifs((prev) => [payload.new as Notificacao, ...prev]))
      .subscribe()
    return () => { supabase.removeChannel(channel) }
  }, [])

  async function marcarTodasLidas() {
    await fetch("/api/admin/notificacoes", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: "todas" }),
    })
    setNotifs((prev) => prev.map((n) => ({ ...n, lida: true })))
  }

  async function handleLogout() {
    await supabase.auth.signOut()
    router.push("/login")
  }

  const tipoIcone: Record<string, string> = {
    nova_empresa: "🏪", novo_pagamento: "💰",
    ticket_aberto: "🎫", cancelamento: "⚠️", erro: "❌",
  }

  const isDark = theme === "dark"

  return (
    <div className="min-h-screen flex bg-white dark:bg-[#0d0d0f] text-gray-900 dark:text-white">

      {/* ── SIDEBAR ── */}
      <motion.aside
        initial={false}
        animate={{ width: collapsed ? 64 : 220 }}
        transition={{ duration: 0.18, ease: "easeInOut" }}
        className="hidden md:flex flex-col h-screen fixed left-0 top-0 z-30 overflow-hidden
          bg-white dark:bg-[#111113]
          border-r border-gray-100 dark:border-white/[0.07]"
      >
        {/* Logo */}
        <div className="flex items-center h-16 px-4 shrink-0 gap-2.5 border-b border-gray-100 dark:border-white/[0.07]">
          <LogoIcon size={32} />
          <AnimatePresence>
            {!collapsed && (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                <p className="font-black text-sm leading-none text-gray-900 dark:text-white">Bora Gerir</p>
                <div className="flex items-center gap-1 mt-0.5">
                  <Shield className="w-3 h-3 text-[#F26E1D]" />
                  <p className="text-[10px] text-[#F26E1D] font-bold">Admin</p>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Nav */}
        <nav className="flex-1 overflow-y-auto py-3 px-2 space-y-0.5">
          {navItems.map((item) => {
            const isActive = item.href === "/admin" ? pathname === "/admin" : pathname.startsWith(item.href)
            const Icon = item.icon
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "flex items-center gap-3 rounded-xl transition-all duration-150 relative group",
                  collapsed ? "h-10 w-10 justify-center mx-auto" : "px-3 py-2.5",
                  isActive
                    ? "text-gray-900 dark:text-white"
                    : "text-gray-400 dark:text-white/40 hover:text-gray-700 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-white/[0.05]"
                )}
              >
                {/* Fundo ativo — borda laranja igual ao painel cliente */}
                {isActive && (
                  <span className="absolute inset-0 rounded-xl
                    bg-[#F26E1D]/10 dark:bg-[#F26E1D]/15
                    border border-[#F26E1D]/40 dark:border-[#F26E1D]/40" />
                )}

                <Icon
                  className={cn("w-[18px] h-[18px] shrink-0 relative z-10",
                    isActive ? "text-[#F26E1D]" : "")}
                />

                <AnimatePresence>
                  {!collapsed && (
                    <motion.span
                      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                      className="whitespace-nowrap text-sm font-medium relative z-10"
                    >
                      {item.label}
                    </motion.span>
                  )}
                </AnimatePresence>

                {/* Tooltip colapsado */}
                {collapsed && (
                  <div className="absolute left-full ml-3 px-2.5 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap opacity-0 group-hover:opacity-100 pointer-events-none z-50 shadow-lg
                    bg-gray-900 text-white dark:bg-white dark:text-gray-900">
                    {item.label}
                  </div>
                )}
              </Link>
            )
          })}
        </nav>

        {/* Rodapé sidebar */}
        <div className="p-2 shrink-0 space-y-1 border-t border-gray-100 dark:border-white/[0.07]">
          <button
            onClick={handleLogout}
            className={cn(
              "flex items-center gap-3 w-full rounded-xl text-sm transition-all duration-150",
              "text-gray-400 dark:text-white/40 hover:text-gray-700 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-white/[0.05]",
              collapsed ? "h-10 w-10 justify-center mx-auto" : "px-3 py-2.5"
            )}
          >
            <LogOut className="w-[18px] h-[18px] shrink-0" />
            {!collapsed && <span>Sair</span>}
          </button>

          <button
            onClick={() => setCollapsed(!collapsed)}
            className="flex items-center justify-center w-full p-2 rounded-xl transition-all duration-150
              text-gray-300 dark:text-white/20 hover:bg-gray-100 dark:hover:bg-white/[0.05] hover:text-gray-600 dark:hover:text-white"
          >
            {collapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
          </button>
        </div>
      </motion.aside>

      {/* ── CONTEÚDO ── */}
      <div className={cn("flex-1 min-h-screen transition-all duration-200", collapsed ? "md:ml-[64px]" : "md:ml-[220px]")}>

        {/* Header */}
        <header className="h-14 flex items-center justify-between px-6 sticky top-0 z-20
          bg-white dark:bg-[#111113]
          border-b border-gray-100 dark:border-white/[0.07]
          shadow-[0_1px_3px_rgba(0,0,0,0.04)] dark:shadow-none"
        >
          {/* Esquerda */}
          <div className="flex items-center gap-2">
            <Shield className="w-4 h-4 text-[#F26E1D]" />
            <span className="text-sm font-semibold text-gray-500 dark:text-white/60">
              Painel Administrativo
            </span>
          </div>

          {/* Direita */}
          <div className="flex items-center gap-1">

            {/* Toggle tema */}
            {mounted && (
              <button
                onClick={() => setTheme(isDark ? "light" : "dark")}
                title={isDark ? "Modo claro" : "Modo escuro"}
                className="p-2 rounded-xl transition-colors
                  text-gray-400 dark:text-white/40
                  hover:bg-gray-100 dark:hover:bg-white/[0.07]
                  hover:text-gray-700 dark:hover:text-white"
              >
                {isDark
                  ? <Sun className="w-[17px] h-[17px]" />
                  : <Moon className="w-[17px] h-[17px]" />
                }
              </button>
            )}

            {/* Notificações */}
            <div className="relative">
              <button
                onClick={() => setNotifAberto(!notifAberto)}
                className="relative p-2 rounded-xl transition-colors
                  text-gray-400 dark:text-white/40
                  hover:bg-gray-100 dark:hover:bg-white/[0.07]
                  hover:text-gray-700 dark:hover:text-white"
              >
                <Bell className="w-[18px] h-[18px]" />
                {naoLidas > 0 && (
                  <span className="absolute -top-0.5 -right-0.5 w-4 h-4 bg-[#F26E1D] rounded-full text-[9px] font-black text-white flex items-center justify-center">
                    {naoLidas > 9 ? "9+" : naoLidas}
                  </span>
                )}
              </button>

              <AnimatePresence>
                {notifAberto && (
                  <motion.div
                    initial={{ opacity: 0, y: 8, scale: 0.97 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: 8, scale: 0.97 }}
                    className="absolute right-0 top-full mt-2 w-80 rounded-2xl overflow-hidden z-50
                      bg-white dark:bg-[#1c1c1f]
                      border border-gray-100 dark:border-white/10
                      shadow-xl dark:shadow-[0_8px_32px_rgba(0,0,0,0.5)]"
                  >
                    <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100 dark:border-white/10">
                      <p className="font-bold text-sm text-gray-900 dark:text-white">Notificações</p>
                      <div className="flex items-center gap-2">
                        {naoLidas > 0 && (
                          <button onClick={marcarTodasLidas} className="text-xs text-[#F26E1D] hover:underline font-semibold">
                            Marcar todas
                          </button>
                        )}
                        <button onClick={() => setNotifAberto(false)} className="text-gray-400 dark:text-white/40 hover:text-gray-700 dark:hover:text-white">
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                    <div className="max-h-72 overflow-y-auto">
                      {notifs.length > 0 ? notifs.map((n) => (
                        <div key={n.id} className={cn(
                          "px-4 py-3 border-b border-gray-50 dark:border-white/5 last:border-0 cursor-pointer",
                          "hover:bg-gray-50 dark:hover:bg-white/[0.03] transition-colors",
                          !n.lida && "bg-[#F26E1D]/5"
                        )}>
                          <div className="flex items-start gap-2.5">
                            <span className="text-base mt-0.5">{tipoIcone[n.tipo] ?? "🔔"}</span>
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-semibold text-gray-900 dark:text-white">{n.titulo}</p>
                              <p className="text-xs text-gray-500 dark:text-white/50 mt-0.5 truncate">{n.mensagem}</p>
                            </div>
                            {!n.lida && <div className="w-2 h-2 rounded-full bg-[#F26E1D] shrink-0 mt-1.5" />}
                          </div>
                        </div>
                      )) : (
                        <div className="py-8 text-center text-sm text-gray-300 dark:text-white/25">
                          Nenhuma notificação
                        </div>
                      )}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* Indicador online */}
            <div className="flex items-center gap-2 ml-2 pl-3 border-l border-gray-100 dark:border-white/[0.07]">
              <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              <span className="text-xs font-medium text-gray-500 dark:text-white/40">
                contato@boragerir.com
              </span>
            </div>
          </div>
        </header>

        {/* Página */}
        <main className="p-6 min-h-[calc(100vh-56px)] bg-gray-50 dark:bg-[#0d0d0f]">
          {children}
        </main>
      </div>
    </div>
  )
}
