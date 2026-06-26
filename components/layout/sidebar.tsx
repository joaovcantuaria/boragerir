"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { motion, AnimatePresence } from "framer-motion"
import {
  LayoutDashboard, Wallet, Users, ShoppingBag, ShoppingCart,
  FileText, Calendar, UserCheck, BarChart3, Settings, CreditCard,
  ChevronLeft, ChevronRight, HeadphonesIcon,
} from "lucide-react"
import { cn } from "@/lib/utils"
import { LogoBG } from "@/components/ui/logo"

const navItemsBase = [
  { path: "/dashboard",         icon: LayoutDashboard, label: "Dashboard" },
  { path: "/caixa",             icon: Wallet,          label: "Caixa" },
  { path: "/venda",             icon: ShoppingCart,    label: "Nova Venda" },
  { path: "/agendamentos",      icon: Calendar,        label: "Agendamentos" },
  { path: "/clientes",          icon: Users,           label: "Clientes" },
  { path: "/produtos-servicos", icon: ShoppingBag,     label: "Produtos/Serviços" },
  { path: "/orcamentos",        icon: FileText,        label: "Orçamentos" },
  { path: "/funcionarios",      icon: UserCheck,       label: "Colaboradores" },
  { path: "/financeiro",        icon: BarChart3,       label: "Financeiro" },
  { path: "/planos",            icon: CreditCard,      label: "Planos" },
  { path: "/suporte",           icon: HeadphonesIcon,  label: "Suporte" },
  { path: "/configuracoes",     icon: Settings,        label: "Configurações" },
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
      animate={{ width: collapsed ? 64 : 232 }}
      transition={{ duration: 0.18, ease: "easeInOut" }}
      style={{
        backgroundColor: "var(--sidebar-bg, #ffffff)",
        borderRight: "1px solid var(--sidebar-border, #e5e7eb)",
      }}
      className={cn(
        "hidden md:flex flex-col h-screen fixed left-0 top-0 z-30 overflow-hidden",
        "dark:[--sidebar-bg:#0d0f1a] dark:[--sidebar-border:rgba(255,255,255,0.06)]"
      )}
    >
      {/* Logo */}
      <div
        style={{ borderBottom: "1px solid var(--sidebar-border, #e5e7eb)" }}
        className={cn(
          "flex items-center h-16 shrink-0",
          collapsed ? "px-4 justify-center" : "px-4"
        )}
      >
        <LogoBG collapsed={collapsed} />
      </div>

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto py-3 px-2">
        <ul className="space-y-0.5">
          {navItems.map((item) => {
            const isActive = item.path === "/dashboard"
              ? pathname === item.href
              : pathname === item.href || pathname.startsWith(item.href + "/")
            const Icon = item.icon

            return (
              <li key={item.href}>
                <Link
                  href={item.href}
                  title={collapsed ? item.label : undefined}
                  className={cn(
                    "flex items-center gap-3 rounded-xl transition-all duration-150 relative group",
                    collapsed ? "h-10 w-10 justify-center mx-auto" : "px-3 py-2.5",
                    isActive
                      // Ativo: laranja sólido, texto BRANCO sempre
                      ? "bg-[#F26E1D] text-white font-semibold shadow-orange"
                      // Inativo: usa variáveis CSS (funciona em light e dark)
                      : "text-muted-foreground hover:bg-muted hover:text-foreground"
                  )}
                >
                  <Icon className={cn("shrink-0", collapsed ? "w-5 h-5" : "w-[18px] h-[18px]")} />

                  <AnimatePresence>
                    {!collapsed && (
                      <motion.span
                        initial={{ opacity: 0, x: -6 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: -6 }}
                        transition={{ duration: 0.12 }}
                        className={cn(
                          "whitespace-nowrap text-sm",
                          // Quando ativo: forçar branco
                          isActive ? "text-white" : ""
                        )}
                      >
                        {item.label}
                      </motion.span>
                    )}
                  </AnimatePresence>

                  {/* Tooltip quando colapsado */}
                  {collapsed && (
                    <div className={cn(
                      "absolute left-full ml-3 px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap",
                      "opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity z-50",
                      "shadow-lg border",
                      "bg-gray-900 text-white border-gray-800",
                      "dark:bg-white dark:text-gray-900 dark:border-gray-200"
                    )}>
                      {item.label}
                    </div>
                  )}
                </Link>
              </li>
            )
          })}
        </ul>
      </nav>

      {/* Colapsar */}
      <div className={cn(
        "p-2 shrink-0 border-t",
        "border-gray-100 dark:border-white/[0.06]"
      )}>
        <button
          onClick={onToggle}
          className={cn(
            "flex items-center justify-center w-full py-2 rounded-xl transition-colors text-sm",
            "text-gray-400 hover:bg-gray-100 hover:text-gray-700",
            "dark:text-gray-500 dark:hover:bg-white/[0.06] dark:hover:text-gray-300"
          )}
        >
          {collapsed
            ? <ChevronRight className="w-4 h-4" />
            : <><ChevronLeft className="w-4 h-4 mr-2" /><span className="text-xs font-medium">Recolher</span></>
          }
        </button>
      </div>
    </motion.aside>
  )
}
