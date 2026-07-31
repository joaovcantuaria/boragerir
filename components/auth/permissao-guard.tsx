"use client"

import { useColaborador } from "@/contexts/colaborador-context"
import { Lock } from "lucide-react"

interface PermissaoGuardProps {
  /** Permissão necessária (ex: "caixa", "financeiro", "venda_desconto") */
  permissao: string
  /** O que mostrar quando não tem permissão */
  modo?: "bloquear" | "ocultar"
  /** Nome legível da funcionalidade */
  nomeArea?: string
  children: React.ReactNode
}

/**
 * Componente que verifica se o colaborador logado tem permissão para acessar uma área/ação.
 * Se não tem, bloqueia ou oculta o conteúdo.
 * 
 * Uso:
 * <PermissaoGuard permissao="financeiro" nomeArea="Financeiro">
 *   <FinanceiroContent />
 * </PermissaoGuard>
 */
export function PermissaoGuard({ permissao, modo = "bloquear", nomeArea, children }: PermissaoGuardProps) {
  const { colaborador, temPermissao, logado } = useColaborador()

  // Se não tem colaborador logado (sistema sem login local ativo), libera tudo
  if (!logado) return <>{children}</>

  // Admin sempre passa
  if (colaborador?.perfil === "admin") return <>{children}</>

  // Verifica permissão
  if (temPermissao(permissao)) return <>{children}</>

  // Sem permissão
  if (modo === "ocultar") return null

  return (
    <div className="flex flex-col items-center justify-center py-16 space-y-4">
      <div className="w-14 h-14 rounded-2xl bg-red-500/10 flex items-center justify-center">
        <Lock className="w-7 h-7 text-red-500" />
      </div>
      <div className="text-center space-y-1.5">
        <h3 className="text-lg font-bold">Acesso Restrito</h3>
        <p className="text-sm text-muted-foreground max-w-sm">
          Você não tem permissão para acessar {nomeArea ? <strong>{nomeArea}</strong> : "esta área"}.
        </p>
        <p className="text-xs text-muted-foreground">
          Entre com <strong>{colaborador?.nome}</strong> ({colaborador?.perfil}). Solicite permissão ao administrador.
        </p>
      </div>
    </div>
  )
}

/**
 * Hook simplificado para verificar permissão inline (sem render blocking)
 * Uso: const podeDarDesconto = usePermissao("venda_desconto")
 */
export function usePermissao(permissao: string): boolean {
  const { colaborador, temPermissao, logado } = useColaborador()
  if (!logado) return true // Sistema sem login local
  if (colaborador?.perfil === "admin") return true
  return temPermissao(permissao)
}
