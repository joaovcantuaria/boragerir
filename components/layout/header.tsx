"use client"

import { useRouter } from "next/navigation"
import { Moon, Sun, LogOut, Settings, Bell } from "lucide-react"
import { useTheme } from "next-themes"
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { createClient } from "@/lib/supabase/client"
import { toast } from "sonner"
import { gerarIniciais, cn } from "@/lib/utils"

interface HeaderProps {
  empresaNome?: string
  empresaLogoUrl?: string | null
}

export function Header({ empresaNome = "Bora Gerir", empresaLogoUrl }: HeaderProps) {
  const { theme, setTheme } = useTheme()
  const router = useRouter()
  const supabase = createClient()

  async function handleLogout() {
    await supabase.auth.signOut()
    router.push("/login")
  }

  const btnClass = cn(
    "w-9 h-9 flex items-center justify-center rounded-xl transition-colors",
    "text-gray-400 hover:text-gray-700 hover:bg-gray-100",
    "dark:text-gray-500 dark:hover:text-gray-200 dark:hover:bg-white/[0.06]"
  )

  return (
  return (
    <header
      style={{
        backgroundColor: "var(--header-bg, #ffffff)",
        borderBottom: "1px solid var(--header-border, #e5e7eb)",
      }}
      className={cn(
        "h-16 flex items-center justify-between px-5 sticky top-0 z-20",
        "dark:[--header-bg:#0d0f1a] dark:[--header-border:rgba(255,255,255,0.08)]",
        "backdrop-blur-sm"
      )}
    >
      {/* Nome da empresa */}
      <div className="flex items-center gap-2.5 min-w-0">
        {empresaLogoUrl && (
          <img src={empresaLogoUrl} alt={empresaNome}
            className="w-7 h-7 rounded-lg object-cover shrink-0" />
        )}
        <span className={cn(
          "font-semibold text-sm truncate max-w-[200px]",
          "text-gray-800 dark:text-gray-200"
        )}>
          {empresaNome}
        </span>
      </div>

      {/* Ações */}
      <div className="flex items-center gap-1">
        {/* Notificações */}
        <button className={btnClass}>
          <Bell className="w-[18px] h-[18px]" />
        </button>

        {/* Tema */}
        <button
          className={btnClass}
          onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
          title="Alternar tema"
        >
          {theme === "dark"
            ? <Sun className="w-[18px] h-[18px]" />
            : <Moon className="w-[18px] h-[18px]" />
          }
        </button>

        {/* Avatar / menu */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button className="ml-1 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary">
              <Avatar className="w-8 h-8 ring-2 ring-transparent hover:ring-primary/30 transition-all">
                {empresaLogoUrl && <AvatarImage src={empresaLogoUrl} alt={empresaNome} />}
                <AvatarFallback className="text-xs font-black bg-[#F26E1D] text-white">
                  {gerarIniciais(empresaNome)}
                </AvatarFallback>
              </Avatar>
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-52">
            <DropdownMenuLabel className="font-semibold truncate">{empresaNome}</DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => router.push("/configuracoes")}>
              <Settings className="mr-2 h-4 w-4" />Configurações
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => router.push("/planos")}>
              <span className="mr-2 text-sm">💎</span>Meu plano
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              onClick={handleLogout}
              className="text-red-600 dark:text-red-400 focus:bg-red-50 dark:focus:bg-red-500/10 focus:text-red-700 dark:focus:text-red-300"
            >
              <LogOut className="mr-2 h-4 w-4" />Sair
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  )
}
