"use client"

import { useRouter } from "next/navigation"
import { Moon, Sun, LogOut, Settings, Bell } from "lucide-react"
import { useTheme } from "next-themes"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { createClient } from "@/lib/supabase/client"
import { toast } from "sonner"
import { gerarIniciais } from "@/lib/utils"

interface HeaderProps {
  empresaNome?: string
  empresaLogoUrl?: string | null
}

export function Header({ empresaNome = "Bora Gerir", empresaLogoUrl }: HeaderProps) {
  const { theme, setTheme } = useTheme()
  const router = useRouter()
  const supabase = createClient()

  async function handleLogout() {
    const { error } = await supabase.auth.signOut()
    if (error) { toast.error("Erro ao sair."); return }
    router.push("/login")
  }

  return (
    <header className="h-16 border-b border-border bg-card flex items-center justify-between px-4 lg:px-6 sticky top-0 z-20">
      <div className="flex items-center gap-3">
        {/* Logo da empresa no header */}
        {empresaLogoUrl ? (
          <img src={empresaLogoUrl} alt={empresaNome} className="w-8 h-8 rounded-lg object-cover border border-border" />
        ) : (
          <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
            <span className="text-xs font-black text-primary">{gerarIniciais(empresaNome).slice(0, 2)}</span>
          </div>
        )}
        <span className="font-bold text-foreground truncate max-w-[180px] hidden sm:block">{empresaNome}</span>
      </div>

      <div className="flex items-center gap-1">
        {/* Notificações */}
        <Button variant="ghost" size="icon" className="text-muted-foreground hover:text-foreground">
          <Bell className="w-5 h-5" />
        </Button>

        {/* Tema */}
        <Button
          variant="ghost"
          size="icon"
          className="text-muted-foreground hover:text-foreground"
          onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
          title={theme === "dark" ? "Mudar para modo claro" : "Mudar para modo escuro"}
        >
          {theme === "dark" ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
        </Button>

        {/* Menu perfil */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="rounded-full ml-1">
              <Avatar className="w-8 h-8">
                {empresaLogoUrl && <AvatarImage src={empresaLogoUrl} alt={empresaNome} />}
                <AvatarFallback className="bg-primary text-white text-xs font-black">
                  {gerarIniciais(empresaNome)}
                </AvatarFallback>
              </Avatar>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-48">
            <DropdownMenuLabel className="font-semibold">{empresaNome}</DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => router.push("/configuracoes")}>
              <Settings className="mr-2 h-4 w-4" />Configurações
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={handleLogout} className="text-destructive focus:text-destructive">
              <LogOut className="mr-2 h-4 w-4" />Sair
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  )
}
