"use client"

import { createContext, useContext, ReactNode } from "react"
import { useColaboradorAtivo, ColaboradorAtivo } from "@/hooks/use-colaborador-ativo"

interface ColaboradorContextType {
  colaborador: ColaboradorAtivo | null
  carregando: boolean
  login: (empresaId: string, usuario: string, senha: string) => Promise<{ sucesso: boolean; erro?: string }>
  logout: (empresaId: string) => Promise<void>
  loginComoAdmin: (empresaNome: string) => void
  temPermissao: (permissao: string) => boolean
  limiteDesconto: number
  isAdmin: boolean
  isGerente: boolean
  logado: boolean
}

const ColaboradorContext = createContext<ColaboradorContextType | undefined>(undefined)

export function ColaboradorProvider({ children }: { children: ReactNode }) {
  const value = useColaboradorAtivo()

  return (
    <ColaboradorContext.Provider value={value}>
      {children}
    </ColaboradorContext.Provider>
  )
}

export function useColaborador() {
  const context = useContext(ColaboradorContext)
  if (!context) {
    throw new Error("useColaborador deve ser usado dentro de ColaboradorProvider")
  }
  return context
}
