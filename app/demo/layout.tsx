"use client"

import { useState } from "react"
import { Sidebar } from "@/components/layout/sidebar"
import { MobileNav } from "@/components/layout/mobile-nav"
import { cn } from "@/lib/utils"
import { X } from "lucide-react"
import Link from "next/link"
import { LogoIcon } from "@/components/ui/logo"

export default function DemoLayout({ children }: { children: React.ReactNode }) {
  const [collapsed, setCollapsed] = useState(false)
  const [bannerVisible, setBannerVisible] = useState(true)

  return (
    <div className="min-h-screen bg-background">
      {/* Banner Demo */}
      {bannerVisible && (
        <div className="fixed top-0 left-0 right-0 z-50 bg-primary text-white px-4 py-2 flex items-center justify-between text-xs font-semibold">
          <div className="flex items-center gap-2">
            <LogoIcon size={18} />
            <span>Modo Demo — Bora Gerir</span>
            <span className="hidden sm:inline opacity-80">| Dados fictícios. Nenhuma ação é salva.</span>
          </div>
          <div className="flex items-center gap-3">
            <Link href="/login" className="underline opacity-90 hover:opacity-100 hidden sm:block">
              Criar conta grátis →
            </Link>
            <button onClick={() => setBannerVisible(false)} className="opacity-80 hover:opacity-100">
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      <Sidebar collapsed={collapsed} onToggle={() => setCollapsed(!collapsed)} prefix="/demo" />

      <div className={cn(
        "transition-all duration-200",
        collapsed ? "md:ml-[68px]" : "md:ml-[236px]",
        bannerVisible ? "pt-9" : ""
      )}>
        {/* Header demo */}
        <header className={cn(
          "h-16 border-b border-border bg-card flex items-center justify-between px-4 lg:px-6 sticky z-20",
          bannerVisible ? "top-9" : "top-0"
        )}>
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-primary/10 flex items-center justify-center">
              <span className="text-xs font-black text-primary">SA</span>
            </div>
            <span className="font-bold text-foreground hidden sm:block">Salão da Ana</span>
            <span className="text-xs text-muted-foreground bg-muted px-2 py-0.5 rounded-full">Demo</span>
          </div>
          <Link href="/login"
            className="text-sm font-bold text-primary border border-primary px-3 py-1.5 rounded-xl hover:bg-primary hover:text-white transition-colors">
            Criar conta
          </Link>
        </header>

        <main className="p-4 lg:p-6 pb-20 md:pb-6 min-h-[calc(100vh-4rem)]">
          {children}
        </main>
      </div>

      <MobileNav prefix="/demo" />
    </div>
  )
}
