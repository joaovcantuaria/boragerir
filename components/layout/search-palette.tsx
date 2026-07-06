"use client"

import { useState, useEffect, useRef } from "react"
import { useRouter } from "next/navigation"
import {
  Search, LayoutDashboard, Wallet, BarChart3, UserCheck,
  CheckSquare, Settings, Building2, X
} from "lucide-react"

const PAGINAS = [
  { path: "/dashboard", label: "Dashboard", desc: "Página inicial", icon: LayoutDashboard },
  { path: "/caixa", label: "Caixa", desc: "Abrir, fechar e movimentações", icon: Wallet },
  { path: "/financeiro", label: "Financeiro", desc: "A receber, contas, fluxo de caixa", icon: BarChart3 },
  { path: "/funcionarios", label: "Colaboradores", desc: "Equipe e comissões", icon: UserCheck },
  { path: "/tarefas", label: "Tarefas", desc: "Organização e pendências", icon: CheckSquare },
  { path: "/empresas", label: "Empresas", desc: "Gerenciar suas empresas", icon: Building2 },
  { path: "/configuracoes", label: "Configurações", desc: "Dados e preferências", icon: Settings },
]

export function SearchPalette({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [busca, setBusca] = useState("")
  const inputRef = useRef<HTMLInputElement>(null)
  const router = useRouter()

  useEffect(() => {
    if (open) {
      setBusca("")
      setTimeout(() => inputRef.current?.focus(), 100)
    }
  }, [open])

  // Fechar com Escape
  useEffect(() => {
    function handler(e: KeyboardEvent) {
      if (e.key === "Escape") onClose()
    }
    if (open) document.addEventListener("keydown", handler)
    return () => document.removeEventListener("keydown", handler)
  }, [open, onClose])

  if (!open) return null

  const filtrados = PAGINAS.filter((p) => {
    const t = busca.toLowerCase()
    return p.label.toLowerCase().includes(t) || p.desc.toLowerCase().includes(t)
  })

  function navegar(path: string) {
    router.push(path)
    onClose()
  }

  return (
    <div className="fixed inset-0 z-[99999] flex items-start justify-center pt-[15vh]" onClick={onClose}>
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" />
      <div
        className="relative w-full max-w-md mx-4 rounded-2xl border shadow-2xl overflow-hidden"
        style={{ background: "#ffffff", borderColor: "#e5e7eb" }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Input */}
        <div className="flex items-center gap-3 px-4 py-3 border-b border-gray-100">
          <Search className="w-5 h-5 text-muted-foreground shrink-0" />
          <input
            ref={inputRef}
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
            placeholder="Buscar página ou ação..."
            className="flex-1 text-sm bg-transparent outline-none placeholder:text-muted-foreground"
            onKeyDown={(e) => {
              if (e.key === "Enter" && filtrados.length > 0) navegar(filtrados[0].path)
            }}
          />
          <button onClick={onClose} className="p-1 rounded-md hover:bg-muted">
            <X className="w-4 h-4 text-muted-foreground" />
          </button>
        </div>

        {/* Resultados */}
        <div className="max-h-80 overflow-y-auto p-2">
          {filtrados.length === 0 ? (
            <p className="text-center text-sm text-muted-foreground py-6">Nenhum resultado</p>
          ) : (
            filtrados.map((p) => {
              const Icon = p.icon
              return (
                <button
                  key={p.path}
                  onClick={() => navegar(p.path)}
                  className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-left hover:bg-muted transition-colors"
                >
                  <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                    <Icon className="w-4 h-4 text-primary" />
                  </div>
                  <div>
                    <p className="text-sm font-medium">{p.label}</p>
                    <p className="text-[10px] text-muted-foreground">{p.desc}</p>
                  </div>
                </button>
              )
            })
          )}
        </div>

        {/* Footer */}
        <div className="px-4 py-2 border-t border-gray-100 flex items-center justify-between">
          <span className="text-[10px] text-muted-foreground">↵ para navegar · Esc para fechar</span>
          <kbd className="text-[10px] bg-muted px-1.5 py-0.5 rounded font-mono">Ctrl+K</kbd>
        </div>
      </div>
    </div>
  )
}
