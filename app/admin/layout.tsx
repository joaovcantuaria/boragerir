"use client"

import { useState } from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { motion, AnimatePresence } from "framer-motion"
import {
  LayoutDashboard, Building2, CreditCard, HeadphonesIcon,
  Settings, ChevronLeft, ChevronRight, LogOut, Shield,
} from "lucide-react"
import { cn } from "@/lib/utils"
import { LogoIcon } from "@/components/ui/logo"
import { createClient } from "@/lib/supabase/client"
import { useRouter } from "next/navigation"

const navItems = [
  { href: "/admin",              icon: LayoutDashboard,  label: "Dashboard" },
  { href: "/admin/empresas",     icon: Building2,        label: "Empresas" },
  { href: "/admin/assinaturas",  icon: CreditCard,       label: "Assinaturas" },
  { href: "/admin/suporte",      icon: HeadphonesIcon,   label: "Suporte" },
  { href: "/admin/configuracoes",icon: Settings,         label: "Configurações" },
]

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const [collapsed, setCollapsed] = useState(false)
  const pathname = usePathname()
  const router = useRouter()
  const supabase = createClient()

  async function handleLogout() {
    await supabase.auth.signOut()
    router.push("/login")
  }

  return (
    <div className="min-h-screen bg-[#0f0f0f] text-white flex">
      {/* Sidebar admin */}
      <motion.aside
        initial={false}
        animate={{ width: collapsed ? 68 : 220 }}
        transition={{ duration: 0.2, ease: "easeInOut" }}
        className="hidden md:flex flex-col h-screen bg-[#161616] border-r border-white/10 fixed left-0 top-0 z-30 overflow-hidden"
      >
        {/* Logo */}
        <div className="flex items-center h-16 px-3 border-b border-white/10 shrink-0 gap-2.5">
          <LogoIcon size={32} />
          <AnimatePresence>
            {!collapsed && (
              <motion.div
                initial={{ opacity: 0, x: -8 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -8 }}
                transition={{ duration: 0.13 }}
              >
                <p className="font-black text-sm text-white leading-none">Bora Gerir</p>
                <div className="flex items-center gap-1 mt-0.5">
                  <Shield className="w-3 h-3 text-primary" />
                  <p className="text-xs text-primary font-bold">Admin</p>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Nav */}
        <nav className="flex-1 overflow-y-auto py-3 px-2 space-y-0.5">
          {navItems.map((item) => {
            const isActive = item.href === "/admin"
              ? pathname === "/admin"
              : pathname.startsWith(item.href)
            const Icon = item.icon
            return (
              <Link key={item.href} href={item.href}
                className={cn(
                  "flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all relative group",
                  isActive
                    ? "bg-primary text-white"
                    : "text-white/50 hover:bg-white/5 hover:text-white"
                )}
              >
                <Icon className="w-[18px] h-[18px] shrink-0" />
                <AnimatePresence>
                  {!collapsed && (
                    <motion.span
                      initial={{ opacity: 0, x: -8 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: -8 }}
                      transition={{ duration: 0.13 }}
                      className="whitespace-nowrap"
                    >
                      {item.label}
                    </motion.span>
                  )}
                </AnimatePresence>
                {collapsed && (
                  <div className="absolute left-full ml-3 px-2.5 py-1.5 bg-white text-black rounded-lg text-xs whitespace-nowrap opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity z-50 shadow-lg font-medium">
                    {item.label}
                  </div>
                )}
              </Link>
            )
          })}
        </nav>

        {/* Logout */}
        <div className="p-2 border-t border-white/10 shrink-0 space-y-1">
          <button onClick={handleLogout}
            className="flex items-center gap-3 w-full px-3 py-2.5 rounded-xl text-sm font-medium text-white/50 hover:bg-white/5 hover:text-white transition-all">
            <LogOut className="w-[18px] h-[18px] shrink-0" />
            {!collapsed && <span className="whitespace-nowrap">Sair</span>}
          </button>
          <button onClick={() => setCollapsed(!collapsed)}
            className="flex items-center justify-center w-full p-2 rounded-xl text-white/30 hover:bg-white/5 hover:text-white transition-all">
            {collapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
          </button>
        </div>
      </motion.aside>

      {/* Conteúdo */}
      <div className={cn(
        "flex-1 transition-all duration-200 min-h-screen",
        collapsed ? "md:ml-[68px]" : "md:ml-[220px]"
      )}>
        {/* Header */}
        <header className="h-14 border-b border-white/10 bg-[#161616] flex items-center justify-between px-6 sticky top-0 z-20">
          <div className="flex items-center gap-2">
            <Shield className="w-4 h-4 text-primary" />
            <span className="text-sm font-bold text-white/70">Painel Administrativo</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <span className="text-xs text-white/50">contato@boragerir.com</span>
          </div>
        </header>

        <main className="p-6">
          {children}
        </main>
      </div>
    </div>
  )
}
