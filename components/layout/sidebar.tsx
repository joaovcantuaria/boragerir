"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { AnimatePresence, motion } from "framer-motion"
import {
  LayoutDashboard, Wallet, Users, ShoppingBag, ShoppingCart,
  FileText, Calendar, UserCheck, BarChart3, Settings, CreditCard,
  ChevronLeft, ChevronRight, HeadphonesIcon, CheckSquare, ClipboardList,
} from "lucide-react"
import { cn } from "@/lib/utils"
import { LogoIcon } from "@/components/ui/logo"

const navGroups = [
  {
    label: "Principal",
    items: [
      { path: "/dashboard",    icon: LayoutDashboard, label: "Dashboard",         shortcut: "D" },
      { path: "/caixa",        icon: Wallet,          label: "Caixa",             shortcut: "C" },
      { path: "/venda",        icon: ShoppingCart,    label: "Nova Venda",        shortcut: "N" },
      { path: "/agendamentos", icon: Calendar,        label: "Agendamentos",      shortcut: "A" },
    ],
  },
  {
    label: "Gestão",
    items: [
      { path: "/clientes",          icon: Users,        label: "Clientes" },
      { path: "/produtos-servicos", icon: ShoppingBag,  label: "Produtos/Serviços" },
      { path: "/orcamentos",        icon: FileText,     label: "Orçamentos" },
      { path: "/contratos",         icon: ClipboardList,label: "Contratos" },
      { path: "/tarefas",           icon: CheckSquare,  label: "Tarefas" },
      { path: "/funcionarios",      icon: UserCheck,    label: "Colaboradores" },
    ],
  },
  {
    label: "Financeiro",
    items: [
      { path: "/financeiro", icon: BarChart3, label: "Financeiro" },
    ],
  },
  {
    label: "Sistema",
    items: [
      { path: "/planos",       icon: CreditCard,      label: "Planos" },
      { path: "/suporte",      icon: HeadphonesIcon,  label: "Suporte" },
      { path: "/configuracoes",icon: Settings,        label: "Configurações" },
    ],
  },
]

interface SidebarProps {
  collapsed: boolean
  onToggle: () => void
  prefix?: string
}

export function Sidebar({ collapsed, onToggle, prefix = "" }: SidebarProps) {
  const pathname = usePathname()

  return (
    <motion.aside
      initial={false}
      animate={{ width: collapsed ? 52 : 220 }}
      transition={{ duration: 0.18, ease: "easeInOut" }}
      className="hidden md:flex flex-col h-screen fixed left-0 top-0 z-30 overflow-hidden sidebar-v2 shadow-sidebar"
    >
      {/* Logo */}
      <div className={cn(
        "flex items-center h-12 shrink-0 border-b",
        "border-[hsl(var(--sidebar-border))]",
        collapsed ? "px-3 justify-center" : "px-4 gap-2.5"
      )}>
        <LogoIcon size={28} />
        <AnimatePresence>
          {!collapsed && (
            <motion.div
              initial={{ opacity: 0, x: -8 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -8 }}
              transition={{ duration: 0.12 }}
              className="flex items-baseline gap-0.5 overflow-hidden"
            >
              <span className="font-bold text-base text-white leading-none whitespace-nowrap">Bora</span>
              <span className="font-bold text-base leading-none whitespace-nowrap" style={{ color: "#F26E1D" }}>Gerir</span>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto py-2 px-2 space-y-4">
        {navGroups.map((group) => (
          <div key={group.label}>
            {/* Label do grupo */}
            <AnimatePresence>
              {!collapsed && (
                <motion.p
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.1 }}
                  className="px-2 mb-1 text-[10px] font-bold uppercase tracking-widest"
                  style={{ color: "hsl(var(--sidebar-text))", opacity: 0.5 }}
                >
                  {group.label}
                </motion.p>
              )}
            </AnimatePresence>

            <ul className="space-y-0.5">
              {group.items.map((item) => {
                const href = `${prefix}${item.path}`
                const isActive = item.path === "/dashboard"
                  ? pathname === href
                  : pathname === href || pathname.startsWith(href + "/")
                const Icon = item.icon

                return (
                  <li key={href}>
                    <Link
                      href={href}
                      prefetch={true}
                      title={collapsed ? item.label : undefined}
                      className={cn(
                        "sidebar-item",
                        collapsed ? "justify-center px-2" : "",
                        isActive ? "active" : ""
                      )}
                    >
                      <Icon className="w-4 h-4 shrink-0" />

                      <AnimatePresence>
                        {!collapsed && (
                          <motion.span
                            initial={{ opacity: 0, x: -6 }}
                            animate={{ opacity: 1, x: 0 }}
                            exit={{ opacity: 0, x: -6 }}
                            transition={{ duration: 0.1 }}
                            className="flex-1 whitespace-nowrap"
                          >
                            {item.label}
                          </motion.span>
                        )}
                      </AnimatePresence>

                      {/* Shortcut badge */}
                      {!collapsed && "shortcut" in item && item.shortcut && (
                        <motion.span
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          exit={{ opacity: 0 }}
                          className="kbd-tooltip ml-auto shrink-0 opacity-0 group-hover:opacity-100"
                        >
                          {item.shortcut}
                        </motion.span>
                      )}

                      {/* Tooltip colapsado */}
                      {collapsed && (
                        <div className={cn(
                          "absolute left-full ml-2 px-2.5 py-1.5 rounded-md text-xs font-medium whitespace-nowrap z-50",
                          "opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity",
                          "bg-gray-900 text-white shadow-lg"
                        )}>
                          {item.label}
                          {"shortcut" in item && item.shortcut && (
                            <span className="ml-2 opacity-60">[{item.shortcut}]</span>
                          )}
                        </div>
                      )}
                    </Link>
                  </li>
                )
              })}
            </ul>
          </div>
        ))}
      </nav>

      {/* Botão colapsar */}
      <div className="p-2 shrink-0 border-t border-[hsl(var(--sidebar-border))]">
        <button
          onClick={onToggle}
          className={cn(
            "flex items-center justify-center w-full py-1.5 rounded-md transition-colors text-xs font-medium",
            "text-[hsl(var(--sidebar-text))] hover:bg-[hsl(var(--sidebar-hover))] hover:text-white"
          )}
          title={collapsed ? "Expandir" : "Recolher"}
        >
          {collapsed
            ? <ChevronRight className="w-4 h-4" />
            : <><ChevronLeft className="w-3.5 h-3.5 mr-1.5" /><span>Recolher</span></>
          }
        </button>
      </div>
    </motion.aside>
  )
}
