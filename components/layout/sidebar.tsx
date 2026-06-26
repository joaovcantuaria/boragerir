"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { motion, AnimatePresence } from "framer-motion"
import {
  LayoutDashboard, Wallet, Users, ShoppingBag, ShoppingCart,
  FileText, Calendar, UserCheck, BarChart3, Settings,
  ChevronLeft, ChevronRight,
} from "lucide-react"
import { cn } from "@/lib/utils"
import { LogoBG } from "@/components/ui/logo"

const navItemsBase = [
  { path: "/dashboard", icon: LayoutDashboard, label: "Dashboard" },
  { path: "/caixa",     icon: Wallet,          label: "Caixa" },
  { path: "/venda",     icon: ShoppingCart,    label: "Nova Venda" },
  { path: "/agendamentos", icon: Calendar,     label: "Agendamentos" },
  { path: "/clientes",  icon: Users,           label: "Clientes" },
  { path: "/produtos-servicos", icon: ShoppingBag, label: "Produtos/Serviços" },
  { path: "/orcamentos", icon: FileText,       label: "Orçamentos" },
  { path: "/funcionarios", icon: UserCheck,    label: "Funcionários" },
  { path: "/financeiro", icon: BarChart3,      label: "Financeiro" },
  { path: "/configuracoes", icon: Settings,    label: "Configurações" },
]

interface SidebarProps {
  collapsed: boolean
  onToggle: () => void
  prefix?: string
}

export function Sidebar({ collapsed, onToggle, prefix = "" }: SidebarProps) {
  const pathname = usePathname()
  const navItems = navItemsBase.map((i) => ({ ...i, href: `${prefix}${i.path}` }))

  return (
    <motion.aside
      initial={false}
      animate={{ width: collapsed ? 68 : 236 }}
      transition={{ duration: 0.2, ease: "easeInOut" }}
      className="hidden md:flex flex-col h-screen bg-card border-r border-border fixed left-0 top-0 z-30 overflow-hidden"
    >
      {/* Logo */}
      <div className="flex items-center h-16 px-3 border-b border-border shrink-0">
        <LogoBG collapsed={collapsed} />
      </div>

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto py-3 px-2 space-y-0.5">
        {navItems.map((item) => {
          const isActive = pathname === item.href || pathname.startsWith(item.href + "/")
          const Icon = item.icon
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all relative group",
                isActive
                  ? "bg-primary text-white shadow-orange"
                  : "text-muted-foreground hover:bg-muted hover:text-foreground"
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
                <div className="absolute left-full ml-3 px-2.5 py-1.5 bg-foreground text-background rounded-lg text-xs whitespace-nowrap opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity z-50 shadow-lg">
                  {item.label}
                </div>
              )}
            </Link>
          )
        })}
      </nav>

      {/* Colapsar */}
      <div className="p-2 border-t border-border shrink-0">
        <button
          onClick={onToggle}
          className="flex items-center justify-center w-full p-2 rounded-xl text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
        >
          {collapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
        </button>
      </div>
    </motion.aside>
  )
}
