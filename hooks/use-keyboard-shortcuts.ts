"use client"

import { useEffect } from "react"
import { useRouter } from "next/navigation"

type Shortcut = {
  key: string
  meta?: boolean
  ctrl?: boolean
  shift?: boolean
  description: string
  action: () => void
}

export function useKeyboardShortcuts() {
  const router = useRouter()

  useEffect(() => {
    const shortcuts: Shortcut[] = [
      { key: "n", description: "Nova Venda",       action: () => router.push("/venda") },
      { key: "c", description: "Caixa",             action: () => router.push("/caixa") },
      { key: "a", description: "Agendamentos",      action: () => router.push("/agendamentos") },
      { key: "d", description: "Dashboard",         action: () => router.push("/dashboard") },
      { key: "f", description: "Financeiro",        action: () => router.push("/financeiro") },
      { key: "p", description: "Produtos/Serviços", action: () => router.push("/produtos-servicos") },
      { key: "l", description: "Clientes",          action: () => router.push("/clientes") },
    ]

    function onKeyDown(e: KeyboardEvent) {
      // Ignorar quando o foco está em input/textarea/select
      const tag = (e.target as HTMLElement).tagName
      if (["INPUT", "TEXTAREA", "SELECT"].includes(tag)) return
      if ((e.target as HTMLElement).isContentEditable) return

      // Ignorar combinações com meta/ctrl exceto as registradas
      if (e.metaKey || e.ctrlKey || e.altKey) return

      const match = shortcuts.find((s) => s.key === e.key.toLowerCase())
      if (match) {
        e.preventDefault()
        match.action()
      }
    }

    document.addEventListener("keydown", onKeyDown)
    return () => document.removeEventListener("keydown", onKeyDown)
  }, [router])
}

// Exporta lista de shortcuts para exibir no painel de ajuda
export const SHORTCUTS_LIST = [
  { key: "N", label: "Nova Venda" },
  { key: "C", label: "Caixa" },
  { key: "A", label: "Agendamentos" },
  { key: "D", label: "Dashboard" },
  { key: "F", label: "Financeiro" },
  { key: "P", label: "Produtos/Serviços" },
  { key: "L", label: "Clientes" },
]
