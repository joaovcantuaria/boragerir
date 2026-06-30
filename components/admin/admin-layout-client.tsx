"use client"

import React, { useState, useEffect } from "react"
import Link from "next/link"
import { usePathname, useRouter } from "next/navigation"
import { motion, AnimatePresence } from "framer-motion"
import {
  LayoutDashboard, Building2, CreditCard, HeadphonesIcon,
  Settings, LogOut, Shield, Tag, Users2, Bell, X, Bot,
  Sun, Moon, ChevronDown, Grid3X3,
} from "lucide-react"
import { cn } from "@/lib/utils"
import { LogoIcon } from "@/components/ui/logo"
import { createClient } from "@/lib/supabase/client"
import { AdminTemaProvider } from "@/components/admin/admin-tema-context"

// Nav principal — aparece direto na topbar
const navPrincipal = [
  { href: "/admin",               icon: LayoutDashboard, label: "Dashboard" },
  { href: "/admin/empresas",      icon: Building2,       label: "Empresas" },
  { href: "/admin/assinaturas",   icon: CreditCard,      label: "Assinaturas" },
  { href: "/admin/suporte",       icon: HeadphonesIcon,  label: "Suporte" },
]

// Nav secundário — aparece no dropdown "Mais"
const navSecundario = [
  { href: "/admin/vendedores",      icon: Users2,  label: "Vendedores",      color: "#10b981" },
  { href: "/admin/cupons",          icon: Tag,     label: "Cupons",          color: "#f59e0b" },
  { href: "/admin/atendimentos-ia", icon: Bot,     label: "Atendimentos IA", color: "#6366f1" },
  { href: "/admin/usuarios",        icon: Shield,  label: "Usuários",        color: "#a855f7" },
  { href: "/admin/configuracoes",   icon: Settings,label: "Configurações",   color: "#6b7280" },
]

interface Notificacao {
  id: string; tipo: string; titulo: string; mensagem: string; lida: boolean; created_at: string
}

// Dropdown reutilizável com position:fixed (mesmo padrão do app)
function Dropdown({
  open, onClose, children, trigger, align = "left", width = 272,
}: {
  open: boolean; onClose: () => void; children: React.ReactNode
  trigger: (ref: React.RefObject<HTMLDivElement | null>) => React.ReactNode
  align?: "left" | "right"; width?: number
}) {
  const triggerRef = React.useRef<HTMLDivElement>(null)
  const [rect, setRect] = React.useState<DOMRect | null>(null)

  React.useEffect(() => {
    if (open && triggerRef.current) setRect(triggerRef.current.getBoundingClientRect())
  }, [open])

  const style: React.CSSProperties = rect ? {
    position: "fixed",
    top: rect.bottom + 4,
    ...(align === "right" ? { right: window.innerWidth - rect.right } : { left: rect.left }),
    width,
    zIndex: 99999,
  } : { display: "none" }

  return (
    <>
      {trigger(triggerRef)}
      {open && (
        <>
          <div style={{ position: "fixed", inset: 0, zIndex: 99998 }} onClick={onClose} />
          <motion.div
            initial={{ opacity: 0, y: -4, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            transition={{ duration: 0.12 }}
            className="rounded-lg shadow-2xl overflow-hidden"
            style={{
              ...style,
              backgroundColor: "#ffffff",
              border: "1px solid #e5e7eb",
            }}
          >
            {children}
          </motion.div>
        </>
      )}
    </>
  )
}

export function AdminLayoutClient({ children }: { children: React.ReactNode }) {
  const [maisAberto, setMaisAberto]   = useState(false)
  const [userAberto, setUserAberto]   = useState(false)
  const [notifAberto, setNotifAberto] = useState(false)
  const [notifs, setNotifs]           = useState<Notificacao[]>([])
  const [modoClaro, setModoClaro]     = useState(false)
  const pathname = usePathname()
  const router   = useRouter()
  const supabase = createClient()

  const naoLidas = notifs.filter((n) => !n.lida).length

  useEffect(() => {
    setMaisAberto(false)
    setUserAberto(false)
    setNotifAberto(false)
  }, [pathname])

  useEffect(() => {
    const cor = modoClaro ? "#f0f2f5" : "#0d0d0f"
    document.documentElement.style.backgroundColor = cor
    document.body.style.backgroundColor = cor
    return () => {
      document.documentElement.style.backgroundColor = ""
      document.body.style.backgroundColor = ""
    }
  }, [modoClaro])

  useEffect(() => {
    fetch("/api/admin/notificacoes")
      .then((r) => r.json())
      .then((d) => Array.isArray(d) && setNotifs(d))
      .catch(() => {})
  }, [])

  useEffect(() => {
    const channel = supabase
      .channel("notificacoes_admin")
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "notificacoes_admin" },
        (p) => setNotifs((prev) => [p.new as Notificacao, ...prev]))
      .subscribe()
    return () => { supabase.removeChannel(channel) }
  }, [])

  async function marcarTodasLidas() {
    await fetch("/api/admin/notificacoes", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: "todas" }),
    })
    setNotifs((prev) => prev.map((n) => ({ ...n, lida: true })))
  }

  async function handleLogout() {
    await supabase.auth.signOut()
    router.push("/login")
  }

  const algumSecundarioAtivo = navSecundario.some(
    (i) => pathname === i.href || pathname.startsWith(i.href + "/")
  )

  const pageBg  = modoClaro ? "#f0f2f5"  : "#0d0d0f"
  const textCol = modoClaro ? "#111827"  : "#f1f1f3"

  return (
    <div style={{ minHeight: "100vh", backgroundColor: pageBg, color: textCol }}>

      {/* ── TOPBAR ── */}
      <header
        className="sticky top-0 z-30 flex items-center h-12 px-4 gap-3"
        style={{
          background: "hsl(222,28%,14%)",
          borderBottom: "1px solid hsl(222,22%,20%)",
          boxShadow: "0 1px 8px rgba(0,0,0,0.25)",
        }}
      >
        {/* Logo + badge Admin */}
        <Link href="/admin" className="flex items-center gap-2 shrink-0 mr-1">
          <LogoIcon size={26} />
          <div className="hidden sm:flex items-center gap-1.5">
            <span className="font-bold text-sm text-white">BoraGerir</span>
            <span className="text-[10px] font-bold px-1.5 py-0.5 rounded"
              style={{ background: "rgba(242,110,29,0.25)", color: "#F26E1D" }}>
              ADMIN
            </span>
          </div>
        </Link>

        <div className="w-px h-5 shrink-0" style={{ background: "rgba(255,255,255,0.12)" }} />

        {/* Nav principal */}
        <nav className="flex items-center gap-0.5 flex-1 overflow-x-auto">
          {navPrincipal.map((item) => {
            const isActive = item.href === "/admin"
              ? pathname === "/admin"
              : pathname.startsWith(item.href)
            const Icon = item.icon
            return (
              <Link
                key={item.href}
                href={item.href}
                prefetch={true}
                className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-xs font-medium transition-all whitespace-nowrap"
                style={{
                  background: isActive ? "rgba(242,110,29,0.18)" : "transparent",
                  color: isActive ? "#F26E1D" : "rgba(255,255,255,0.6)",
                }}
                onMouseEnter={(e) => { if (!isActive) e.currentTarget.style.color = "white" }}
                onMouseLeave={(e) => { if (!isActive) e.currentTarget.style.color = "rgba(255,255,255,0.6)" }}
              >
                <Icon className="w-3.5 h-3.5 shrink-0" />
                <span className="hidden lg:inline">{item.label}</span>
              </Link>
            )
          })}

          {/* Dropdown Mais */}
          <Dropdown
            open={maisAberto}
            onClose={() => setMaisAberto(false)}
            width={240}
            trigger={(ref) => (
              <div ref={ref}>
                <button
                  onClick={() => { setMaisAberto((v) => !v); setUserAberto(false); setNotifAberto(false) }}
                  className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-xs font-medium transition-all whitespace-nowrap"
                  style={{
                    background: (maisAberto || algumSecundarioAtivo) ? "rgba(242,110,29,0.18)" : "transparent",
                    color: (maisAberto || algumSecundarioAtivo) ? "#F26E1D" : "rgba(255,255,255,0.6)",
                  }}
                >
                  <Grid3X3 className="w-3.5 h-3.5 shrink-0" />
                  <span className="hidden lg:inline">Mais</span>
                  <ChevronDown className={cn("w-3 h-3 hidden lg:block transition-transform", maisAberto && "rotate-180")} />
                </button>
              </div>
            )}
          >
            <div className="p-2 space-y-0.5">
              {navSecundario.map((item) => {
                const isActive = pathname.startsWith(item.href)
                const Icon = item.icon
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={() => setMaisAberto(false)}
                    className="flex items-center gap-2.5 px-3 py-2 rounded-md text-xs font-medium transition-colors"
                    style={{ color: isActive ? "#F26E1D" : "#374151", background: isActive ? "rgba(242,110,29,0.08)" : "transparent" }}
                    onMouseEnter={(e) => { if (!isActive) e.currentTarget.style.background = "#f3f4f6" }}
                    onMouseLeave={(e) => { if (!isActive) e.currentTarget.style.background = "transparent" }}
                  >
                    <div className="w-6 h-6 rounded-md flex items-center justify-center shrink-0"
                      style={{ background: item.color + "22" }}>
                      <Icon className="w-3.5 h-3.5" style={{ color: item.color }} />
                    </div>
                    {item.label}
                  </Link>
                )
              })}
            </div>
          </Dropdown>
        </nav>

        {/* Ações direita */}
        <div className="flex items-center gap-0.5 shrink-0">

          {/* Toggle tema */}
          <button
            onClick={() => setModoClaro((v) => !v)}
            className="w-8 h-8 flex items-center justify-center rounded-md transition-colors"
            style={{ color: "rgba(255,255,255,0.5)" }}
            onMouseEnter={(e) => { e.currentTarget.style.color = "white"; e.currentTarget.style.background = "rgba(255,255,255,0.08)" }}
            onMouseLeave={(e) => { e.currentTarget.style.color = "rgba(255,255,255,0.5)"; e.currentTarget.style.background = "transparent" }}
            title={modoClaro ? "Modo escuro" : "Modo claro"}
          >
            {modoClaro ? <Moon className="w-4 h-4" /> : <Sun className="w-4 h-4" />}
          </button>

          {/* Notificações */}
          <Dropdown
            open={notifAberto}
            onClose={() => setNotifAberto(false)}
            align="right"
            width={320}
            trigger={(ref) => (
              <div ref={ref}>
                <button
                  onClick={() => { setNotifAberto((v) => !v); setMaisAberto(false); setUserAberto(false) }}
                  className="w-8 h-8 flex items-center justify-center rounded-md transition-colors relative"
                  style={{ color: "rgba(255,255,255,0.5)" }}
                  onMouseEnter={(e) => { e.currentTarget.style.color = "white"; e.currentTarget.style.background = "rgba(255,255,255,0.08)" }}
                  onMouseLeave={(e) => { e.currentTarget.style.color = "rgba(255,255,255,0.5)"; e.currentTarget.style.background = "transparent" }}
                >
                  <Bell className="w-4 h-4" />
                  {naoLidas > 0 && (
                    <span className="absolute -top-0.5 -right-0.5 min-w-[14px] h-[14px] bg-[#F26E1D] rounded-full text-[9px] font-black text-white flex items-center justify-center px-0.5">
                      {naoLidas > 9 ? "9+" : naoLidas}
                    </span>
                  )}
                </button>
              </div>
            )}
          >
            <div className="flex items-center justify-between px-4 py-2.5"
              style={{ borderBottom: "1px solid #e5e7eb" }}>
              <p className="font-semibold text-sm" style={{ color: "#111827" }}>Notificações</p>
              <div className="flex items-center gap-2">
                {naoLidas > 0 && (
                  <button onClick={marcarTodasLidas}
                    className="text-xs font-semibold" style={{ color: "#F26E1D" }}>
                    Marcar todas
                  </button>
                )}
                <button onClick={() => setNotifAberto(false)} style={{ color: "#9ca3af" }}>
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
            <div className="max-h-72 overflow-y-auto">
              {notifs.length > 0 ? notifs.slice(0, 10).map((n) => (
                <div key={n.id}
                  className="px-4 py-2.5 cursor-pointer transition-colors"
                  style={{
                    borderBottom: "1px solid #f3f4f6",
                    background: !n.lida ? "rgba(242,110,29,0.04)" : "transparent",
                  }}
                  onMouseEnter={(e) => { e.currentTarget.style.background = "#f9fafb" }}
                  onMouseLeave={(e) => { e.currentTarget.style.background = !n.lida ? "rgba(242,110,29,0.04)" : "transparent" }}
                >
                  <div className="flex items-start gap-2">
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-semibold truncate" style={{ color: "#111827" }}>{n.titulo}</p>
                      <p className="text-xs mt-0.5 truncate" style={{ color: "#6b7280" }}>{n.mensagem}</p>
                    </div>
                    {!n.lida && (
                      <div className="w-2 h-2 rounded-full shrink-0 mt-1" style={{ background: "#F26E1D" }} />
                    )}
                  </div>
                </div>
              )) : (
                <div className="py-8 text-center text-xs" style={{ color: "#9ca3af" }}>
                  Nenhuma notificação
                </div>
              )}
            </div>
          </Dropdown>

          <div className="w-px h-5 mx-1" style={{ background: "rgba(255,255,255,0.12)" }} />

          {/* Menu usuário */}
          <Dropdown
            open={userAberto}
            onClose={() => setUserAberto(false)}
            align="right"
            width={192}
            trigger={(ref) => (
              <div ref={ref}>
                <button
                  onClick={() => { setUserAberto((v) => !v); setMaisAberto(false); setNotifAberto(false) }}
                  className="flex items-center gap-2 pl-1.5 pr-2 py-1 rounded-md transition-colors"
                  style={{ color: "rgba(255,255,255,0.8)" }}
                  onMouseEnter={(e) => { e.currentTarget.style.background = "rgba(255,255,255,0.08)" }}
                  onMouseLeave={(e) => { e.currentTarget.style.background = "transparent" }}
                >
                  <div className="w-6 h-6 rounded-md flex items-center justify-center text-[10px] font-bold text-white"
                    style={{ background: "#F26E1D" }}>
                    A
                  </div>
                  <span className="text-xs font-medium hidden md:block">Admin</span>
                  <ChevronDown className={cn("w-3 h-3 hidden md:block transition-transform", userAberto && "rotate-180")}
                    style={{ color: "rgba(255,255,255,0.4)" }} />
                </button>
              </div>
            )}
          >
            <div className="px-3 py-2.5" style={{ borderBottom: "1px solid #e5e7eb" }}>
              <p className="text-xs font-semibold" style={{ color: "#111827" }}>Painel Admin</p>
              <p className="text-[10px]" style={{ color: "#9ca3af" }}>contato@boragerir.com</p>
            </div>
            <div className="p-1.5 space-y-0.5">
              <button
                onClick={() => { router.push("/admin/configuracoes"); setUserAberto(false) }}
                className="w-full flex items-center gap-2.5 px-3 py-2 rounded-md text-xs font-medium transition-colors"
                style={{ color: "#374151" }}
                onMouseEnter={(e) => { e.currentTarget.style.background = "#f3f4f6" }}
                onMouseLeave={(e) => { e.currentTarget.style.background = "transparent" }}
              >
                <Settings className="w-3.5 h-3.5" style={{ color: "#9ca3af" }} />
                Configurações
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

      {/* ── CONTEÚDO ── */}
      <AnimatePresence mode="wait">
        <motion.main
          key={pathname}
          initial={{ opacity: 0, y: 5 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -3 }}
          transition={{ duration: 0.18, ease: "easeOut" }}
          className="p-4 md:p-5 max-w-[1600px] mx-auto w-full"
          style={{ minHeight: "calc(100vh - 48px)" }}
        >
          <AdminTemaProvider modoClaro={modoClaro}>
            {children}
          </AdminTemaProvider>
        </motion.main>
      </AnimatePresence>
    </div>
  )
}
