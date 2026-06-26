"use client"

import { useState } from "react"
import { Sidebar } from "@/components/layout/sidebar"
import { Header } from "@/components/layout/header"
import { MobileNav } from "@/components/layout/mobile-nav"
import { ChatIA } from "@/components/chat/chat-ia"
import { useEmpresa } from "@/hooks/use-empresa"
import { cn } from "@/lib/utils"

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const [collapsed, setCollapsed] = useState(false)
  const { empresa } = useEmpresa()

  return (
    <div className="min-h-screen bg-background">
      <Sidebar collapsed={collapsed} onToggle={() => setCollapsed(!collapsed)} />
      <div className={cn("transition-all duration-200", collapsed ? "md:ml-[64px]" : "md:ml-[232px]")}>
        <Header empresaNome={empresa?.nome} empresaLogoUrl={empresa?.logo_url} />
        <main className="p-4 lg:p-6 pb-24 md:pb-6 min-h-[calc(100vh-4rem)]">
          {children}
        </main>
      </div>
      <MobileNav />
      <ChatIA />
    </div>
  )
}
