"use client"

import { useRouter, usePathname } from "next/navigation"
import { Moon, Sun, LogOut, Settings, Bell, Search, ChevronRight } from "lucide-react"
import { useTheme } from "next-themes"
import { useState, useEffect } from "react"
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { createClient } from "@/lib/supabase/client"
import { gerarIniciais, cn } from "@/lib/utils"

// Mapa de breadcrumb por rota
const rotaLabels: Record<string, string> = {
  "/dashboard":         "Dashboard",
  "/caixa":             "Caixa",
  "/venda":             "Nova Venda",
  "/agendamentos":      "Agendamentos",
  "/clientes":          "Clientes",
  "/produtos-servicos": "Produtos e Serviços",
  "/orcamentos":        "Orçamentos",
  "/contratos":         "Contratos",
  "/tarefas":           "Tarefas",
  "/funcionarios":      "Colaboradores",
  "/financeiro":        "Financeiro",
  "/planos":            "Planos",
  "/suporte":           "Suporte",
  "/configuracoes":     "Configurações",
}

interface HeaderProps {
  empresaNome?: string
  empresaLogoUrl?: string | null
}

export function Header({ empresaNome = "Bora Gerir", empresaLogoUrl }: HeaderProps) {
  const { theme, setTheme } = useTheme()
  const router = useRouter()
  const pathname = usePathname()
  const supabase = createClient()
  const [mounted, setMounted] = useState(false)

  useEffect(() => setMounted(true), [])

  // Breadcrumb
  const paginaAtual = Object.entries(rotaLabels).find(([path]) =>
    pathname === path || pathname.startsWith(path + "/")
  )?.[1] ?? "Sistema"

  async function handleLogout() {
    await supabase.auth.signOut()
    router.push("/login")
  }

  const iconBtn = cn(
    "w-8 h-8 flex items-center justify-center rounded-md transition-colors relative",
    "text-muted-foreground hover:text-foreground hover:bg-muted"
  )

  return (
    <header className="header-v2">
      {/* Breadcrumb */}
      <div className="flex items-center gap-1.5 text-sm">
        <span className="text-muted-foreground font-medium">{empresaNome}</span>
        <ChevronRight className="w-3.5 h-3.5 text-muted-foreground/50" />
        <span className="font-semibold text-foreground">{paginaAtual}</span>
      </div>

      {/* Ações */}
      <div className="flex items-center gap-0.5">
        {/* Busca — shortcut K */}
        <button
          className={iconBtn}
          onClick={() => {
            const ev = new KeyboardEvent("keydown", { key: "k", metaKey: true, bubbles: true })
            document.dispatchEvent(ev)
          }}
          title="Busca global (K)"
        >
          <Search className="w-4 h-4" />
        </button>

        {/* Notificações */}
        <button className={cn(iconBtn, "relative")} title="Notificações">
          <Bell className="w-4 h-4" />
        </button>

        {/* Tema */}
        {mounted && (
          <button
            className={iconBtn}
            onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
            title="Alternar tema"
          >
            {theme === "dark"
              ? <Sun className="w-4 h-4" />
              : <Moon className="w-4 h-4" />
            }
          </button>
        )}

        {/* Separador */}
        <div className="w-px h-5 bg-border mx-1" />

        {/* Avatar / menu */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button className="flex items-center gap-2 pl-1 pr-2 py-1 rounded-md hover:bg-muted transition-colors focus:outline-none focus:ring-2 focus:ring-primary/40">
              <Avatar className="w-6 h-6 ring-1 ring-border">
                {empresaLogoUrl && <AvatarImage src={empresaLogoUrl} alt={empresaNome} />}
                <AvatarFallback className="text-[10px] font-bold bg-primary text-white">
                  {gerarIniciais(empresaNome)}
                </AvatarFallback>
              </Avatar>
              <span className="text-xs font-semibold text-foreground hidden sm:block max-w-[120px] truncate">
                {empresaNome}
              </span>
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-52">
            <DropdownMenuLabel className="font-semibold truncate text-xs">{empresaNome}</DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => router.push("/configuracoes")} className="text-sm">
              <Settings className="mr-2 h-3.5 w-3.5" />Configurações
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => router.push("/planos")} className="text-sm">
              <span className="mr-2 text-sm">💎</span>Meu plano
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              onClick={handleLogout}
              className="text-sm text-red-600 dark:text-red-400 focus:bg-red-50 dark:focus:bg-red-500/10"
            >
              <LogOut className="mr-2 h-3.5 w-3.5" />Sair
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  )
}
