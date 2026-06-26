"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { motion, AnimatePresence } from "framer-motion"
import {
  LayoutDashboard, Building2, CreditCard, HeadphonesIcon,
  Settings, ChevronLeft, ChevronRight, LogOut, Shield,
  Tag, Users2, Bell, X, Bot,
} from "lucide-react"
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
  { href: "/admin/configuracoes",    icon: Settings,        label: "Configurações" },
]

interface Notificacao {
  id: string; tipo: string; titulo: string; mensagem: string; lida: boolean; created_at: string
}

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const [collapsed, setCollapsed] = useState(false)
  const [notifAberto, setNotifAberto] = useState(false)
  const [notifs, setNotifs] = useState<Notificacao[]>([])
  const pathname = usePathname()
  const router = useRouter()
  const supabase = createClient()

  const naoLidas = notifs.filter((n) => !n.lida).length

  // Buscar notificações
  useEffect(() => {
    fetch("/api/admin/notificacoes")
      .then((r) => r.json())
      .then((data) => Array.isArray(data) && setNotifs(data))
      .catch(() => {})
  }, [])

  // Realtime via Supabase
  useEffect(() => {
    const channel = supabase
      .channel("notificacoes_admin")
      .on("postgres_changes", {
        event: "INSERT",
        schema: "public",
        table: "notificacoes_admin",
      }, (payload) => {
        setNotifs((prev) => [payload.new as Notificacao, ...prev])
      })
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
    nova_empresa: "🏪",
    novo_pagamento: "💰",
    ticket_aberto: "🎫",
    cancelamento: "⚠️",
    erro: "❌",
  }

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white flex">
      {/* Sidebar */}
      <motion.aside
        initial={false}
        animate={{ width: collapsed ? 64 : 220 }}
        transition={{ duration: 0.18, ease: "easeInOut" }}
        style={{ backgroundColor: "#111111", borderRight: "1px solid rgba(255,255,255,0.07)" }}
        className="hidden md:flex flex-col h-screen fixed left-0 top-0 z-30 overflow-hidden"
      >
        {/* Logo */}
        <div className="flex items-center h-16 px-4 border-b border-white/[0.07] shrink-0 gap-2.5">
          <LogoIcon size={32} />
          <AnimatePresence>
            {!collapsed && (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                <p className="font-black text-sm text-white leading-none">Bora Gerir</p>
                <div className="flex items-center gap-1 mt-0.5">
                  <Shield className="w-3 h-3 text-primary" />
                  <p className="text-[10px] text-primary font-bold">Admin</p>
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
              <Link key={item.href} href={item.href}
                className={cn(
                  "flex items-center gap-3 rounded-xl transition-all relative group",
                  collapsed ? "h-10 w-10 justify-center mx-auto" : "px-3 py-2.5",
                  isActive
                    ? "bg-primary text-white"
                    : "text-white/40 hover:bg-white/[0.05] hover:text-white"
                )}>
                <Icon className="w-[18px] h-[18px] shrink-0" />
                <AnimatePresence>
                  {!collapsed && (
                    <motion.span initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                      className="whitespace-nowrap text-sm font-medium">
                      {item.label}
                    </motion.span>
                  )}
                </AnimatePresence>
                {collapsed && (
                  <div className="absolute left-full ml-3 px-2.5 py-1.5 bg-white text-gray-900 rounded-lg text-xs font-medium whitespace-nowrap opacity-0 group-hover:opacity-100 pointer-events-none z-50 shadow-lg">
                    {item.label}
                  </div>
                )}
              </Link>
            )
          })}
        </nav>

        {/* Rodapé */}
        <div className="p-2 border-t border-white/[0.07] shrink-0 space-y-1">
          <button onClick={handleLogout}
            className={cn("flex items-center gap-3 w-full rounded-xl text-sm text-white/40 hover:bg-white/[0.05] hover:text-white transition-all",
              collapsed ? "h-10 w-10 justify-center mx-auto" : "px-3 py-2.5")}>
            <LogOut className="w-[18px] h-[18px] shrink-0" />
            {!collapsed && <span>Sair</span>}
          </button>
          <button onClick={() => setCollapsed(!collapsed)}
            className="flex items-center justify-center w-full p-2 rounded-xl text-white/20 hover:bg-white/[0.05] hover:text-white transition-all">
            {collapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
          </button>
        </div>
      </motion.aside>

      {/* Conteúdo */}
      <div className={cn("flex-1 min-h-screen transition-all duration-200", collapsed ? "md:ml-[64px]" : "md:ml-[220px]")}>
        {/* Header */}
        <header
          style={{ backgroundColor: "#111111", borderBottom: "1px solid rgba(255,255,255,0.07)" }}
          className="h-14 flex items-center justify-between px-6 sticky top-0 z-20"
        >
          <div className="flex items-center gap-2">
            <Shield className="w-4 h-4 text-primary" />
            <span className="text-sm font-bold text-white/60">Painel Administrativo</span>
          </div>
          <div className="flex items-center gap-3">
            {/* Notificações */}
            <div className="relative">
              <button onClick={() => setNotifAberto(!notifAberto)}
                className="relative p-2 rounded-xl text-white/40 hover:bg-white/[0.05] hover:text-white transition-colors">
                <Bell className="w-5 h-5" />
                {naoLidas > 0 && (
                  <span className="absolute -top-0.5 -right-0.5 w-4 h-4 bg-primary rounded-full text-[9px] font-black text-white flex items-center justify-center">
                    {naoLidas > 9 ? "9+" : naoLidas}
                  </span>
                )}
              </button>

              {/* Painel de notificações */}
              <AnimatePresence>
                {notifAberto && (
                  <motion.div
                    initial={{ opacity: 0, y: 8, scale: 0.97 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: 8, scale: 0.97 }}
                    className="absolute right-0 top-full mt-2 w-80 bg-[#1a1a1a] border border-white/10 rounded-2xl shadow-2xl overflow-hidden z-50"
                  >
                    <div className="flex items-center justify-between px-4 py-3 border-b border-white/10">
                      <p className="font-bold text-white text-sm">Notificações</p>
                      <div className="flex items-center gap-2">
                        {naoLidas > 0 && (
                          <button onClick={marcarTodasLidas}
                            className="text-xs text-primary hover:underline">Marcar todas</button>
                        )}
                        <button onClick={() => setNotifAberto(false)} className="text-white/40 hover:text-white">
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                    <div className="max-h-72 overflow-y-auto">
                      {notifs.length > 0 ? notifs.map((n) => (
                        <div key={n.id} className={cn(
                          "px-4 py-3 border-b border-white/5 last:border-0 cursor-pointer hover:bg-white/[0.03]",
                          !n.lida && "bg-primary/5"
                        )}>
                          <div className="flex items-start gap-2.5">
                            <span className="text-base mt-0.5">{tipoIcone[n.tipo] ?? "🔔"}</span>
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-semibold text-white">{n.titulo}</p>
                              <p className="text-xs text-white/50 mt-0.5 truncate">{n.mensagem}</p>
                            </div>
                            {!n.lida && <div className="w-2 h-2 rounded-full bg-primary shrink-0 mt-1.5" />}
                          </div>
                        </div>
                      )) : (
                        <div className="py-8 text-center text-white/30 text-sm">
                          Nenhuma notificação
                        </div>
                      )}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              <span className="text-xs text-white/40">contato@boragerir.com</span>
            </div>
          </div>
        </header>

        <main className="p-6">{children}</main>
      </div>
    </div>
  )
}
