"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { LayoutDashboard, Wallet, ShoppingCart, Calendar, Users, MoreHorizontal } from "lucide-react"
import { cn } from "@/lib/utils"

const navItems = [
  { href: "/dashboard", icon: LayoutDashboard, label: "Início" },
  { href: "/caixa",     icon: Wallet,          label: "Caixa" },
  { href: "/venda",     icon: ShoppingCart,    label: "Venda" },
  { href: "/agendamentos", icon: Calendar,     label: "Agenda" },
  { href: "/clientes",  icon: Users,           label: "Clientes" },
  { href: "/mais",      icon: MoreHorizontal,  label: "Mais" },
]

export function MobileNav({ prefix = "" }: { prefix?: string }) {
  const pathname = usePathname()

  return (
    <nav className="md:hidden fixed bottom-0 left-0 right-0 z-30 bg-card border-t border-border safe-area-pb">
      <ul className="flex items-center">
        {navItems.map((item) => {
          const href = `${prefix}${item.href}`
          const isActive = pathname === href || pathname.startsWith(href + "/")
          const Icon = item.icon
          return (
            <li key={href} className="flex-1">
              <Link href={href}
                className={cn(
                  "flex flex-col items-center gap-0.5 py-2 px-1 text-[10px] font-semibold transition-colors",
                  isActive ? "text-primary" : "text-muted-foreground hover:text-foreground"
                )}>
                <Icon className={cn("w-5 h-5", isActive && "stroke-[2.5]")} />
                <span>{item.label}</span>
              </Link>
            </li>
          )
        })}
      </ul>
    </nav>
  )
}
