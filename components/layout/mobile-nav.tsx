"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import {
  LayoutDashboard, Wallet, ShoppingCart, Calendar,
  Users, ShoppingBag, FileText, UserCheck, BarChart3,
  CreditCard, Settings, X
} from "lucide-react"
import { cn } from "@/lib/utils"
import { useState } from "react"
import { motion, AnimatePresence } from "framer-motion"

// Itens principais (5 na barra inferior)
const navPrincipal = [
  { href: "/dashboard",    icon: LayoutDashboard, label: "Início" },
  { href: "/caixa",        icon: Wallet,          label: "Caixa" },
  { href: "/venda",        icon: ShoppingCart,    label: "Venda" },
  { href: "/agendamentos", icon: Calendar,        label: "Agenda" },
  { href: "/clientes",     icon: Users,           label: "Clientes" },
]

// Itens extras (aparecem no menu expandido)
const navExtras = [
  { href: "/produtos-servicos", icon: ShoppingBag,  label: "Produtos/Serviços" },
  { href: "/orcamentos",        icon: FileText,     label: "Orçamentos" },
  { href: "/funcionarios",      icon: UserCheck,    label: "Funcionários" },
  { href: "/financeiro",        icon: BarChart3,    label: "Financeiro" },
  { href: "/planos",            icon: CreditCard,   label: "Planos" },
  { href: "/configuracoes",     icon: Settings,     label: "Configurações" },
]

export function MobileNav({ prefix = "" }: { prefix?: string }) {
  const pathname = usePathname()
  const [menuAberto, setMenuAberto] = useState(false)

  const todosItens = [...navPrincipal, ...navExtras]
  const algumExtraAtivo = navExtras.some((item) => {
    const href = `${prefix}${item.href}`
    return pathname === href || pathname.startsWith(href + "/")
  })

  return (
    <>
      {/* Menu extra expandido */}
      <AnimatePresence>
        {menuAberto && (
          <>
            {/* Overlay */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="md:hidden fixed inset-0 z-40 bg-black/50 backdrop-blur-sm"
              onClick={() => setMenuAberto(false)}
            />
            {/* Menu */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 20 }}
              transition={{ duration: 0.15 }}
              className="md:hidden fixed bottom-[65px] left-3 right-3 z-50 rounded-2xl overflow-hidden shadow-xl"
              style={{ backgroundColor: "#ffffff", border: "1px solid #e5e7eb" }}
            >
              <div className="dark:hidden grid grid-cols-3 gap-px bg-gray-100 p-1"
                style={{ backgroundColor: "#f9fafb" }}>
                {navExtras.map((item) => {
                  const href = `${prefix}${item.href}`
                  const isActive = pathname === href || pathname.startsWith(href + "/")
                  const Icon = item.icon
                  return (
                    <Link key={href} href={href}
                      onClick={() => setMenuAberto(false)}
                      className={cn(
                        "flex flex-col items-center gap-1.5 py-3 px-2 rounded-xl text-xs font-semibold transition-colors",
                        isActive
                          ? "bg-[#F26E1D] text-white"
                          : "bg-white text-gray-600 hover:bg-gray-50"
                      )}>
                      <Icon className="w-5 h-5" />
                      <span className="text-center leading-tight">{item.label}</span>
                    </Link>
                  )
                })}
              </div>
              <div className="hidden dark:grid grid-cols-3 gap-px p-1"
                style={{ backgroundColor: "#1a1a2e", border: "none" }}>
                {navExtras.map((item) => {
                  const href = `${prefix}${item.href}`
                  const isActive = pathname === href || pathname.startsWith(href + "/")
                  const Icon = item.icon
                  return (
                    <Link key={href} href={href}
                      onClick={() => setMenuAberto(false)}
                      className={cn(
                        "flex flex-col items-center gap-1.5 py-3 px-2 rounded-xl text-xs font-semibold transition-colors",
                        isActive
                          ? "bg-[#F26E1D] text-white"
                          : "text-gray-300 hover:bg-white/10"
                      )}>
                      <Icon className="w-5 h-5" />
                      <span className="text-center leading-tight">{item.label}</span>
                    </Link>
                  )
                })}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Barra de navegação inferior */}
      <nav className={cn(
        "md:hidden fixed bottom-0 left-0 right-0 z-30 mobile-nav-bar",
        "bg-white border-t border-gray-200",
        "dark:bg-[#0f111a] dark:border-white/[0.08]"
      )}>
        {/* Safe area para iPhone */}
        <div className="flex items-center h-16 pb-safe">
          {navPrincipal.map((item) => {
            const href = `${prefix}${item.href}`
            const isActive = pathname === href || pathname.startsWith(href + "/")
            const Icon = item.icon
            return (
              <Link key={href} href={href}
                className={cn(
                  "flex-1 flex flex-col items-center justify-center gap-1 h-full text-[10px] font-semibold transition-colors",
                  isActive
                    ? "text-primary"
                    : "text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300"
                )}>
                <Icon className={cn("w-5 h-5", isActive && "stroke-[2.5]")} />
                <span>{item.label}</span>
              </Link>
            )
          })}

          {/* Botão Mais */}
          <button
            onClick={() => setMenuAberto(!menuAberto)}
            className={cn(
              "flex-1 flex flex-col items-center justify-center gap-1 h-full text-[10px] font-semibold transition-colors",
              (menuAberto || algumExtraAtivo)
                ? "text-primary"
                : "text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300"
            )}>
            {menuAberto
              ? <X className="w-5 h-5 stroke-[2.5]" />
              : <div className="flex flex-col gap-0.5 items-center">
                  <div className="flex gap-0.5">
                    <div className="w-1 h-1 rounded-full bg-current" />
                    <div className="w-1 h-1 rounded-full bg-current" />
                  </div>
                  <div className="flex gap-0.5">
                    <div className="w-1 h-1 rounded-full bg-current" />
                    <div className="w-1 h-1 rounded-full bg-current" />
                  </div>
                </div>
            }
            <span>Mais</span>
          </button>
        </div>
      </nav>
    </>
  )
}
