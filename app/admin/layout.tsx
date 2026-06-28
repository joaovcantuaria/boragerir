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
import { cn } from "@/lib/utils"
import { LogoIcon } from "@/components/ui/logo"
import { createClient } from "@/lib/supabase/client"
import { useRouter } from "next/navigation"
import { AdminTemaProvider } from "@/components/admin/admin-tema-context"

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
  const [modoClaro, setModoClaro] = useState(false)
  const pathname = usePathname()
  const router = useRouter()
  const supabase = createClient()

  const naoLidas = notifs.filter((n) => !n.lida).length

  // Forçar theme-color da barra de status mobile para o fundo do admin
  useEffect(() => {
    const cor = modoClaro ? "#ffffff" : "#111113"
    const bgCor = modoClaro ? "#f7f8fa" : "#0d0d0f"
    // Atualizar todas as meta tags theme-color existentes
    document.querySelectorAll('meta[name="theme-color"]').forEach((el) => {
      el.setAttribute("content", cor)
    })
    // Criar uma se não existir
    if (!document.querySelector('meta[name="theme-color"]')) {
      const meta = document.createElement("meta")
      meta.name = "theme-color"
      meta.content = cor
      document.head.appendChild(meta)
    }
    // Forçar fundo do html/body para evitar barra branca no mobile
    document.documentElement.style.backgroundColor = bgCor
    document.body.style.backgroundColor = bgCor

    // Restaurar ao sair do admin
    return () => {
      document.querySelectorAll('meta[name="theme-color"]').forEach((el) => {
        el.setAttribute("content", "#ffffff")
      })
      document.documentElement.style.backgroundColor = ""
      document.body.style.backgroundColor = ""
    }
  }, [modoClaro])

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

  // Cores baseadas no modo atual — independente do tema global do site
  const cores = modoClaro ? {
    pageBg:       "#f7f8fa",
    sidebarBg:    "#ffffff",
    headerBg:     "#ffffff",
    border:       "rgba(0,0,0,0.07)",
    mainBg:       "#f7f8fa",
    textPrimary:  "#111113",
    textSecond:   "#6b7280",
    navInactive:  "#9ca3af",
    navHoverBg:   "rgba(0,0,0,0.04)",
    btnText:      "#6b7280",
    btnHoverBg:   "rgba(0,0,0,0.05)",
    notifBg:      "#ffffff",
    notifBorder:  "rgba(0,0,0,0.07)",
    notifHover:   "#f9fafb",
    notifTitle:   "#111113",
    notifBody:    "#6b7280",
    notifEmpty:   "#d1d5db",
    cardBg:       "#ffffff",
    cardBorder:   "rgba(0,0,0,0.07)",
    inputBg:      "#f3f4f6",
    inputBorder:  "rgba(0,0,0,0.12)",
    filterBtn:    "#f3f4f6",
    filterText:   "#6b7280",
  } : {
    pageBg:       "#0d0d0f",
    sidebarBg:    "#111113",
    headerBg:     "#111113",
    border:       "rgba(255,255,255,0.07)",
    mainBg:       "#0d0d0f",
    textPrimary:  "#f1f1f3",
    textSecond:   "rgba(255,255,255,0.45)",
    navInactive:  "rgba(255,255,255,0.38)",
    navHoverBg:   "rgba(255,255,255,0.05)",
    btnText:      "rgba(255,255,255,0.45)",
    btnHoverBg:   "rgba(255,255,255,0.07)",
    notifBg:      "#1c1c1f",
    notifBorder:  "rgba(255,255,255,0.09)",
    notifHover:   "rgba(255,255,255,0.03)",
    notifTitle:   "#f1f1f3",
    notifBody:    "rgba(255,255,255,0.45)",
    notifEmpty:   "rgba(255,255,255,0.25)",
    cardBg:       "#1a1a1a",
    cardBorder:   "rgba(255,255,255,0.10)",
    inputBg:      "#1a1a1a",
    inputBorder:  "rgba(255,255,255,0.10)",
    filterBtn:    "rgba(255,255,255,0.05)",
    filterText:   "rgba(255,255,255,0.50)",
  }

  return (
    <div
      style={{
        minHeight: "100vh",
        display: "flex",
        backgroundColor: cores.pageBg,
        color: cores.textPrimary,
        colorScheme: modoClaro ? "light" : "dark",
      }}
    >
      {/* ── SIDEBAR ── */}
      <motion.aside
        initial={false}
        animate={{ width: collapsed ? 64 : 220 }}
        transition={{ duration: 0.18, ease: "easeInOut" }}
        style={{
          backgroundColor: cores.sidebarBg,
          borderRight: `1px solid ${cores.border}`,
          boxShadow: modoClaro ? "1px 0 0 0 rgba(0,0,0,0.04)" : "none",
        }}
        className="hidden md:flex flex-col h-screen fixed left-0 top-0 z-30 overflow-hidden"
      >
        {/* Logo */}
        <div
          className="flex items-center h-16 px-4 shrink-0 gap-2.5"
          style={{ borderBottom: `1px solid ${cores.border}` }}
        >
          <LogoIcon size={32} />
          <AnimatePresence>
            {!collapsed && (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                <p style={{ color: cores.textPrimary }} className="font-black text-sm leading-none">
                  Bora Gerir
                </p>
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
                  collapsed ? "h-10 w-10 justify-center mx-auto" : "px-3 py-2.5"
                )}
                style={{ color: isActive ? cores.textPrimary : cores.navInactive }}
              >
                {/* Fundo ativo — borda laranja */}
                {isActive && (
                  <span
                    className="absolute inset-0 rounded-xl"
                    style={{
                      background: modoClaro
                        ? "rgba(242,110,29,0.08)"
                        : "rgba(242,110,29,0.12)",
                      border: "1.5px solid rgba(242,110,29,0.40)",
                    }}
                  />
                )}

                {/* Hover overlay */}
                {!isActive && (
                  <span
                    className="absolute inset-0 rounded-xl opacity-0 group-hover:opacity-100 transition-opacity"
                    style={{ backgroundColor: cores.navHoverBg }}
                  />
                )}

                <Icon
                  className="w-[18px] h-[18px] shrink-0 relative z-10"
                  style={{ color: isActive ? "#F26E1D" : undefined }}
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
                  <div
                    className="absolute left-full ml-3 px-2.5 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap opacity-0 group-hover:opacity-100 pointer-events-none z-50 shadow-lg"
                    style={{
                      backgroundColor: modoClaro ? "#111113" : "#ffffff",
                      color: modoClaro ? "#ffffff" : "#111113",
                    }}
                  >
                    {item.label}
                  </div>
                )}
              </Link>
            )
          })}
        </nav>

        {/* Rodapé */}
        <div
          className="p-2 shrink-0 space-y-1"
          style={{ borderTop: `1px solid ${cores.border}` }}
        >
          <button
            onClick={handleLogout}
            style={{ color: cores.navInactive }}
            className={cn(
              "flex items-center gap-3 w-full rounded-xl text-sm transition-all duration-150 group relative",
              collapsed ? "h-10 w-10 justify-center mx-auto" : "px-3 py-2.5"
            )}
          >
            <span
              className="absolute inset-0 rounded-xl opacity-0 group-hover:opacity-100 transition-opacity"
              style={{ backgroundColor: cores.navHoverBg }}
            />
            <LogOut className="w-[18px] h-[18px] shrink-0 relative z-10" />
            {!collapsed && <span className="relative z-10">Sair</span>}
          </button>

          <button
            onClick={() => setCollapsed(!collapsed)}
            style={{ color: cores.navInactive }}
            className="flex items-center justify-center w-full p-2 rounded-xl transition-all duration-150 group relative"
          >
            <span
              className="absolute inset-0 rounded-xl opacity-0 group-hover:opacity-100 transition-opacity"
              style={{ backgroundColor: cores.navHoverBg }}
            />
            <span className="relative z-10">
              {collapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
            </span>
          </button>
        </div>
      </motion.aside>

      {/* ── CONTEÚDO ── */}
      <div className={cn("flex-1 min-h-screen transition-all duration-200", collapsed ? "md:ml-[64px]" : "md:ml-[220px]")}>

        {/* Header */}
        <header
          className="h-14 flex items-center justify-between px-6 sticky top-0 z-20"
          style={{
            backgroundColor: cores.headerBg,
            borderBottom: `1px solid ${cores.border}`,
            boxShadow: modoClaro ? "0 1px 4px rgba(0,0,0,0.06)" : "none",
          }}
        >
          {/* Esquerda */}
          <div className="flex items-center gap-2">
            <Shield className="w-4 h-4 text-[#F26E1D]" />
            <span className="text-sm font-semibold" style={{ color: cores.textSecond }}>
              Painel Administrativo
            </span>
          </div>

          {/* Direita */}
          <div className="flex items-center gap-1">

            {/* Toggle tema */}
            <button
              onClick={() => setModoClaro(!modoClaro)}
              title={modoClaro ? "Modo escuro" : "Modo claro"}
              className="p-2 rounded-xl transition-colors"
              style={{ color: cores.btnText }}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = cores.btnHoverBg
                e.currentTarget.style.color = cores.textPrimary
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = "transparent"
                e.currentTarget.style.color = cores.btnText
              }}
            >
              {modoClaro
                ? <Moon className="w-[17px] h-[17px]" />
                : <Sun className="w-[17px] h-[17px]" />
              }
            </button>

            {/* Notificações */}
            <div className="relative">
              <button
                onClick={() => setNotifAberto(!notifAberto)}
                className="relative p-2 rounded-xl transition-colors"
                style={{ color: cores.btnText }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor = cores.btnHoverBg
                  e.currentTarget.style.color = cores.textPrimary
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = "transparent"
                  e.currentTarget.style.color = cores.btnText
                }}
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
                    className="absolute right-0 top-full mt-2 w-80 rounded-2xl overflow-hidden z-50"
                    style={{
                      backgroundColor: cores.notifBg,
                      border: `1px solid ${cores.notifBorder}`,
                      boxShadow: modoClaro ? "0 8px 32px rgba(0,0,0,0.10)" : "0 8px 32px rgba(0,0,0,0.50)",
                    }}
                  >
                    <div
                      className="flex items-center justify-between px-4 py-3"
                      style={{ borderBottom: `1px solid ${cores.notifBorder}` }}
                    >
                      <p className="font-bold text-sm" style={{ color: cores.notifTitle }}>Notificações</p>
                      <div className="flex items-center gap-2">
                        {naoLidas > 0 && (
                          <button onClick={marcarTodasLidas} className="text-xs text-[#F26E1D] hover:underline font-semibold">
                            Marcar todas
                          </button>
                        )}
                        <button
                          onClick={() => setNotifAberto(false)}
                          style={{ color: cores.notifBody }}
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                    <div className="max-h-72 overflow-y-auto">
                      {notifs.length > 0 ? notifs.map((n) => (
                        <div
                          key={n.id}
                          className="cursor-pointer transition-colors"
                          style={{
                            padding: "12px 16px",
                            borderBottom: `1px solid ${cores.notifBorder}`,
                            backgroundColor: !n.lida ? "rgba(242,110,29,0.05)" : "transparent",
                          }}
                          onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = cores.notifHover }}
                          onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = !n.lida ? "rgba(242,110,29,0.05)" : "transparent" }}
                        >
                          <div className="flex items-start gap-2.5">
                            <span className="text-base mt-0.5">{tipoIcone[n.tipo] ?? "🔔"}</span>
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-semibold" style={{ color: cores.notifTitle }}>{n.titulo}</p>
                              <p className="text-xs mt-0.5 truncate" style={{ color: cores.notifBody }}>{n.mensagem}</p>
                            </div>
                            {!n.lida && <div className="w-2 h-2 rounded-full bg-[#F26E1D] shrink-0 mt-1.5" />}
                          </div>
                        </div>
                      )) : (
                        <div className="py-8 text-center text-sm" style={{ color: cores.notifEmpty }}>
                          Nenhuma notificação
                        </div>
                      )}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* Indicador online */}
            <div
              className="flex items-center gap-2 ml-2 pl-3"
              style={{ borderLeft: `1px solid ${cores.border}` }}
            >
              <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              <span className="text-xs font-medium" style={{ color: cores.textSecond }}>
                contato@boragerir.com
              </span>
            </div>
          </div>
        </header>

        {/* Página */}
        <main
          className="p-6"
          style={{
            minHeight: "calc(100vh - 56px)",
            backgroundColor: cores.mainBg,
          }}
        >
          <AdminTemaProvider modoClaro={modoClaro}>
            {children}
          </AdminTemaProvider>
        </main>
      </div>
    </div>
  )
}
