"use client"

import Link from "next/link"
import { usePathname, useRouter } from "next/navigation"
import {
  LayoutDashboard, Wallet, ShoppingCart, Calendar,
  Users, ShoppingBag, FileText, UserCheck, BarChart3,
  CreditCard, Settings, X, CheckSquare, ClipboardList, MoreHorizontal, LogOut
} from "lucide-react"
import { cn } from "@/lib/utils"
import { useState } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { createClient } from "@/lib/supabase/client"

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
  { href: "/contratos",         icon: ClipboardList,label: "Contratos" },
  { href: "/tarefas",           icon: CheckSquare,  label: "Tarefas" },
  { href: "/funcionarios",      icon: UserCheck,    label: "Colaboradores" },
  { href: "/financeiro",        icon: BarChart3,    label: "Financeiro" },
  { href: "/planos",            icon: CreditCard,   label: "Planos" },
  { href: "/configuracoes",     icon: Settings,     label: "Configurações" },
]

export function MobileNav({ prefix = "", plano = "gratuito" }: { prefix?: string; plano?: string }) {
  const pathname = usePathname()
  const router = useRouter()
  const [menuAberto, setMenuAberto] = useState(false)

  async function handleLogout() {
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push("/login")
  }

  const isPlanoAgenda = plano === "agenda"

  // Plano agenda: apenas agenda e configurações na barra inferior
  const navPrincipalFiltrado = isPlanoAgenda
    ? [
        { href: "/agendamentos", icon: Calendar,  label: "Agenda" },
        { href: "/configuracoes", icon: Settings, label: "Config." },
      ]
    : navPrincipal

  const todosItens = isPlanoAgenda
    ? navPrincipalFiltrado
    : [...navPrincipal, ...navExtras]

  const algumExtraAtivo = isPlanoAgenda
    ? false
    : navExtras.some((item) => {
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
              className="md:hidden fixed bottom-[100px] left-3 right-3 z-50 rounded-2xl overflow-hidden shadow-xl"
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
                      prefetch={true}
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
                <button
                  onClick={() => { setMenuAberto(false); handleLogout() }}
                  className="flex flex-col items-center gap-1.5 py-3 px-2 rounded-xl text-xs font-semibold transition-colors bg-white text-red-500 hover:bg-red-50"
                >
                  <LogOut className="w-5 h-5" />
                  <span className="text-center leading-tight">Sair</span>
                </button>
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
                      prefetch={true}
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
                <button
                  onClick={() => { setMenuAberto(false); handleLogout() }}
                  className="flex flex-col items-center gap-1.5 py-3 px-2 rounded-xl text-xs font-semibold transition-colors text-red-400 hover:bg-white/10"
                >
                  <LogOut className="w-5 h-5" />
                  <span className="text-center leading-tight">Sair</span>
                </button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Barra de navegação inferior — sempre fixed, nunca se move */}
      <nav
        style={{
          position: "fixed",
          bottom: 0,
          left: 0,
          right: 0,
          zIndex: 40,
          backgroundColor: "#ffffff",
          borderTop: "1px solid #e5e7eb",
          paddingBottom: "env(safe-area-inset-bottom)",
        }}
        className="md:hidden"
      >
        <div className="flex items-start h-24 pt-3">
          {navPrincipalFiltrado.map((item) => {
            const href = `${prefix}${item.href}`
            const isActive = pathname === href || pathname.startsWith(href + "/")
            const Icon = item.icon
            return (
              <Link key={href} href={href}
                prefetch={true}
                className="flex-1 flex flex-col items-center justify-start gap-1 text-[10px] font-semibold transition-colors"
                style={{ color: isActive ? "#F26E1D" : "#9ca3af" }}
              >
                <Icon className="w-6 h-6" strokeWidth={isActive ? 2.5 : 1.8} />
                <span>{item.label}</span>
              </Link>
            )
          })}

          {/* Botão Mais */}
          {!isPlanoAgenda && (
            <button
              onClick={() => setMenuAberto(!menuAberto)}
              className="flex-1 flex flex-col items-center justify-start gap-1 text-[10px] font-semibold transition-colors"
              style={{ color: (menuAberto || algumExtraAtivo) ? "#F26E1D" : "#9ca3af" }}
            >
              {menuAberto
                ? <X className="w-6 h-6" strokeWidth={2.5} />
                : <MoreHorizontal className="w-6 h-6" strokeWidth={1.8} />
              }
              <span>Mais</span>
            </button>
          )}
        </div>
      </nav>
    </>
  )
}
