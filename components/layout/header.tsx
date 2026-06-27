"use client"

import { useRouter } from "next/navigation"
import { Moon, Sun, LogOut, Settings, Bell, RefreshCw } from "lucide-react"
import { useTheme } from "next-themes"
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { createClient } from "@/lib/supabase/client"
import { gerarIniciais, cn } from "@/lib/utils"
import { useRouter as useNav } from "next/navigation"

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
    <header
      className={cn(
        "h-16 flex items-center justify-between px-4 sticky top-0 z-20",
        "bg-white dark:bg-[#0a0b0f]",
        "border-b border-gray-200 dark:border-white/[0.08]",
      )}
    >
      {/* Card premium da empresa */}
      <div className="flex items-center">
        <div className={cn(
          "flex items-center gap-2.5 px-3 py-1.5 rounded-xl border transition-all",
          "border-[#F26E1D]/40 bg-[#F26E1D]/5",
          "dark:border-[#F26E1D]/30 dark:bg-[#F26E1D]/10",
        )}>
          {/* Avatar com anel branco */}
          <div className="relative">
            <Avatar className="w-8 h-8 ring-2 ring-white dark:ring-white/20 shadow-sm">
              {empresaLogoUrl
                ? <AvatarImage src={empresaLogoUrl} alt={empresaNome} />
                : null}
              <AvatarFallback className="text-xs font-black bg-[#F26E1D] text-white">
                {gerarIniciais(empresaNome)}
              </AvatarFallback>
            </Avatar>
            <div className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full bg-emerald-500 border-2 border-white dark:border-[#0a0b0f]" />
          </div>
          <span className="font-bold text-sm text-[#F26E1D] truncate max-w-[160px]">
            {empresaNome}
          </span>
        </div>
      </div>

      {/* Ações */}
      <div className="flex items-center gap-1">
        {/* Botão atualizar */}
        <button
          className={btnClass}
          onClick={() => router.refresh()}
          title="Atualizar"
        >
          <RefreshCw className="w-[17px] h-[17px]" />
        </button>

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
              <Avatar className="w-8 h-8 ring-2 ring-[#F26E1D]/30 hover:ring-[#F26E1D] transition-all">
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
