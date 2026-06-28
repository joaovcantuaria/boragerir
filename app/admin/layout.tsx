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

// ─── Tokens de design por tema ──────────────────────────────────────────────
const T = {
  dark: {
    // Layout
    pageBg:        "#0d0d0f",
    sidebarBg:     "#111113",
    headerBg:      "#111113",
    border:        "rgba(255,255,255,0.07)",
    mainBg:        "#0d0d0f",
    // Texto
    textPrimary:   "#f1f1f3",
    textSecondary: "rgba(255,255,255,0.45)",
    textMuted:     "rgba(255,255,255,0.25)",
    // Nav
    navInactive:   "rgba(255,255,255,0.38)",
    navHoverBg:    "rgba(255,255,255,0.05)",
    navHoverText:  "#ffffff",
    // Botões do header
    btnText:       "rgba(255,255,255,0.45)",
    btnHoverBg:    "rgba(255,255,255,0.07)",
    btnHoverText:  "#ffffff",
    // Notif panel
    notifBg:       "#1c1c1f",
    notifBorder:   "rgba(255,255,255,0.09)",
    notifHover:    "rgba(255,255,255,0.03)",
    notifTitle:    "#f1f1f3",
    notifBody:     "rgba(255,255,255,0.45)",
    notifEmpty:    "rgba(255,255,255,0.25)",
  },
  light: {
    // Layout
    pageBg:        "#f7f8fa",
    sidebarBg:     "#ffffff",
    headerBg:      "#ffffff",
    border:        "rgba(0,0,0,0.07)",
    mainBg:        "#f7f8fa",
    // Texto
    textPrimary:   "#111113",
    textSecondary: "#6b7280",
    textMuted:     "#9ca3af",
    // Nav
    navInactive:   "#9ca3af",
    navHoverBg:    "#f3f4f6",
    navHoverText:  "#111113",
    // Botões do header
    btnText:       "#6b7280",
    btnHoverBg:    "#f3f4f6",
    btnHoverText:  "#111113",
    // Notif panel
    notifBg:       "#ffffff",
    notifBorder:   "rgba(0,0,0,0.08)",
    notifHover:    "#f9fafb",
    notifTitle:    "#111113",
    notifBody:     "#6b7280",
    notifEmpty:    "#d1d5db",
  },
} as const

type Tema = "dark" | "light"

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const [collapsed, setCollapsed] = useState(false)
  const [notifAberto, setNotifAberto] = useState(false)
  const [notifs, setNotifs] = useState<Notificacao[]>([])
  const [tema, setTema] = useState<Tema>("dark")
  const pathname = usePathname()
  const router = useRouter()
  const supabase = createClient()

  const t = T[tema]
  const naoLidas = notifs.filter((n) => !n.lida).length

  // Buscar notificações
  useEffect(() => {
    fetch("/api/admin/notificacoes")
      .then((r) => r.json())
      .then((data) => Array.isArray(data) && setNotifs(data))
      .catch(() => {})
  }, [])

  // Realtime
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

  // Estilo base para botões do header
  const btnStyle: React.CSSProperties = {
    color: t.btnText,
    borderRadius: "10px",
    padding: "7px",
    transition: "background 0.15s, color 0.15s",
    display: "flex", alignItems: "center", justifyContent: "center",
    cursor: "pointer", border: "none", background: "transparent",
  }

  return (
    <div style={{ minHeight: "100vh", backgroundColor: t.pageBg, color: t.textPrimary, display: "flex", colorScheme: tema }}>

      {/* ── SIDEBAR ── */}
      <motion.aside
        initial={false}
        animate={{ width: collapsed ? 64 : 220 }}
        transition={{ duration: 0.18, ease: "easeInOut" }}
        style={{
          backgroundColor: t.sidebarBg,
          borderRight: `1px solid ${t.border}`,
          boxShadow: tema === "light" ? "1px 0 0 0 rgba(0,0,0,0.04)" : "none",
        }}
        className="hidden md:flex flex-col h-screen fixed left-0 top-0 z-30 overflow-hidden"
      >
        {/* Logo */}
        <div
          className="flex items-center h-16 px-4 shrink-0 gap-2.5"
          style={{ borderBottom: `1px solid ${t.border}` }}
        >
          <LogoIcon size={32} />
          <AnimatePresence>
            {!collapsed && (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                <p style={{ color: t.textPrimary }} className="font-black text-sm leading-none">Bora Gerir</p>
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
                style={isActive ? {} : { color: t.navInactive }}
                className={cn(
                  "flex items-center gap-3 rounded-xl transition-all duration-150 relative group",
                  collapsed ? "h-10 w-10 justify-center mx-auto" : "px-3 py-2.5",
                  isActive
                    ? "text-white"
                    : ""
                )}
              >
                {/* Fundo do item ativo — borda laranja + bg sutil */}
                {isActive && (
                  <span
                    className="absolute inset-0 rounded-xl"
                    style={{
                      background: tema === "dark"
                        ? "linear-gradient(135deg, rgba(242,110,29,0.18), rgba(242,110,29,0.08))"
                        : "linear-gradient(135deg, rgba(242,110,29,0.10), rgba(242,110,29,0.04))",
                      border: "1.5px solid rgba(242,110,29,0.45)",
                    }}
                  />
                )}

                {/* Hover overlay */}
                {!isActive && (
                  <span
                    className="absolute inset-0 rounded-xl opacity-0 group-hover:opacity-100 transition-opacity"
                    style={{ backgroundColor: t.navHoverBg }}
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
                      style={{ color: isActive ? t.textPrimary : undefined }}
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
                      backgroundColor: tema === "dark" ? "#ffffff" : "#111113",
                      color: tema === "dark" ? "#111113" : "#ffffff",
                    }}
                  >
                    {item.label}
                  </div>
                )}
              </Link>
            )
          })}
        </nav>

        {/* Rodapé sidebar */}
        <div className="p-2 shrink-0 space-y-1" style={{ borderTop: `1px solid ${t.border}` }}>
          <button
            onClick={handleLogout}
            style={{ color: t.navInactive }}
            className={cn(
              "flex items-center gap-3 w-full rounded-xl text-sm transition-all duration-150 group relative",
              collapsed ? "h-10 w-10 justify-center mx-auto" : "px-3 py-2.5"
            )}
          >
            <span className="absolute inset-0 rounded-xl opacity-0 group-hover:opacity-100 transition-opacity" style={{ backgroundColor: t.navHoverBg }} />
            <LogOut className="w-[18px] h-[18px] shrink-0 relative z-10" />
            {!collapsed && <span className="relative z-10">Sair</span>}
          </button>

          <button
            onClick={() => setCollapsed(!collapsed)}
            style={{ color: t.textMuted }}
            className="flex items-center justify-center w-full p-2 rounded-xl transition-all duration-150 group relative"
          >
            <span className="absolute inset-0 rounded-xl opacity-0 group-hover:opacity-100 transition-opacity" style={{ backgroundColor: t.navHoverBg }} />
            <span className="relative z-10">
              {collapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
            </span>
          </button>
        </div>
      </motion.aside>

      {/* ── CONTEÚDO PRINCIPAL ── */}
      <div className={cn("flex-1 min-h-screen transition-all duration-200", collapsed ? "md:ml-[64px]" : "md:ml-[220px]")}>

        {/* Header */}
        <header
          className="h-14 flex items-center justify-between px-6 sticky top-0 z-20"
          style={{
            backgroundColor: t.headerBg,
            borderBottom: `1px solid ${t.border}`,
            boxShadow: tema === "light" ? "0 1px 3px rgba(0,0,0,0.04)" : "none",
          }}
        >
          {/* Esquerda */}
          <div className="flex items-center gap-2">
            <Shield className="w-4 h-4 text-[#F26E1D]" />
            <span className="text-sm font-semibold" style={{ color: t.textSecondary }}>
              Painel Administrativo
            </span>
          </div>

          {/* Direita */}
          <div className="flex items-center gap-1">

            {/* Toggle tema */}
            <button
              onClick={() => setTema(tema === "dark" ? "light" : "dark")}
              title={tema === "dark" ? "Modo claro" : "Modo escuro"}
              style={btnStyle}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = t.btnHoverBg
                e.currentTarget.style.color = t.btnHoverText
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = "transparent"
                e.currentTarget.style.color = t.btnText
              }}
            >
              {tema === "dark"
                ? <Sun className="w-[17px] h-[17px]" />
                : <Moon className="w-[17px] h-[17px]" />
              }
            </button>

            {/* Notificações */}
            <div className="relative">
              <button
                onClick={() => setNotifAberto(!notifAberto)}
                style={{ ...btnStyle, position: "relative" }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor = t.btnHoverBg
                  e.currentTarget.style.color = t.btnHoverText
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = "transparent"
                  e.currentTarget.style.color = t.btnText
                }}
              >
                <Bell className="w-[18px] h-[18px]" />
                {naoLidas > 0 && (
                  <span className="absolute -top-0.5 -right-0.5 w-4 h-4 bg-[#F26E1D] rounded-full text-[9px] font-black text-white flex items-center justify-center">
                    {naoLidas > 9 ? "9+" : naoLidas}
                  </span>
                )}
              </button>

              {/* Painel notificações */}
              <AnimatePresence>
                {notifAberto && (
                  <motion.div
                    initial={{ opacity: 0, y: 8, scale: 0.97 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: 8, scale: 0.97 }}
                    className="absolute right-0 top-full mt-2 w-80 rounded-2xl shadow-2xl overflow-hidden z-50"
                    style={{
                      backgroundColor: t.notifBg,
                      border: `1px solid ${t.notifBorder}`,
                      boxShadow: tema === "light"
                        ? "0 8px 32px rgba(0,0,0,0.10)"
                        : "0 8px 32px rgba(0,0,0,0.50)",
                    }}
                  >
                    <div
                      className="flex items-center justify-between px-4 py-3"
                      style={{ borderBottom: `1px solid ${t.notifBorder}` }}
                    >
                      <p className="font-bold text-sm" style={{ color: t.notifTitle }}>Notificações</p>
                      <div className="flex items-center gap-2">
                        {naoLidas > 0 && (
                          <button onClick={marcarTodasLidas} className="text-xs text-[#F26E1D] hover:underline font-semibold">
                            Marcar todas
                          </button>
                        )}
                        <button onClick={() => setNotifAberto(false)} style={{ color: t.notifBody }}>
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
                            borderBottom: `1px solid ${t.notifBorder}`,
                            backgroundColor: !n.lida ? "rgba(242,110,29,0.05)" : "transparent",
                          }}
                          onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = t.notifHover }}
                          onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = !n.lida ? "rgba(242,110,29,0.05)" : "transparent" }}
                        >
                          <div className="flex items-start gap-2.5">
                            <span className="text-base mt-0.5">{tipoIcone[n.tipo] ?? "🔔"}</span>
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-semibold" style={{ color: t.notifTitle }}>{n.titulo}</p>
                              <p className="text-xs mt-0.5 truncate" style={{ color: t.notifBody }}>{n.mensagem}</p>
                            </div>
                            {!n.lida && <div className="w-2 h-2 rounded-full bg-[#F26E1D] shrink-0 mt-1.5" />}
                          </div>
                        </div>
                      )) : (
                        <div className="py-8 text-center text-sm" style={{ color: t.notifEmpty }}>
                          Nenhuma notificação
                        </div>
                      )}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* Indicador online */}
            <div className="flex items-center gap-2 ml-2 pl-3" style={{ borderLeft: `1px solid ${t.border}` }}>
              <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              <span className="text-xs font-medium" style={{ color: t.textSecondary }}>
                contato@boragerir.com
              </span>
            </div>
          </div>
        </header>

        {/* Conteúdo da página */}
        <main className="p-6" style={{ backgroundColor: t.mainBg, minHeight: "calc(100vh - 56px)" }}>
          {children}
        </main>
      </div>
    </div>
  )
}
