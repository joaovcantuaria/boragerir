"use client"

import { useState, useRef, useEffect } from "react"
import { Search, ChevronDown, Plus, Check } from "lucide-react"
import { cn } from "@/lib/utils"
import { areasAtuacao } from "@/lib/utils"

interface AreaAtuacaoSelectProps {
  value?: string
  onChange: (value: string) => void
  placeholder?: string
  className?: string
}

export function AreaAtuacaoSelect({
  value,
  onChange,
  placeholder = "Selecione ou busque sua área...",
  className,
}: AreaAtuacaoSelectProps) {
  const [aberto, setAberto] = useState(false)
  const [busca, setBusca] = useState("")
  const containerRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  // Fechar ao clicar fora
  useEffect(() => {
    function handler(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setAberto(false)
        setBusca("")
      }
    }
    document.addEventListener("mousedown", handler)
    return () => document.removeEventListener("mousedown", handler)
  }, [])

  // Focar input ao abrir
  useEffect(() => {
    if (aberto) {
      setTimeout(() => inputRef.current?.focus(), 50)
    }
  }, [aberto])

  const buscanLower = busca.trim().toLowerCase()

  // Filtrar opções
  const opcoesFiltradas = buscanLower
    ? areasAtuacao.filter((a) => a.toLowerCase().includes(buscanLower))
    : areasAtuacao

  // Verificar se o texto digitado é exatamente uma opção existente (case-insensitive)
  const jaExiste = areasAtuacao.some(
    (a) => a.toLowerCase() === buscanLower
  )

  // Mostrar opção de criar somente se há busca, não está na lista e tem pelo menos 2 chars
  const mostrarCriar = busca.trim().length >= 2 && !jaExiste

  function selecionar(opcao: string) {
    onChange(opcao)
    setAberto(false)
    setBusca("")
  }

  return (
    <div ref={containerRef} className={cn("relative", className)}>
      {/* Trigger */}
      <button
        type="button"
        onClick={() => setAberto(!aberto)}
        className={cn(
          "w-full flex items-center justify-between gap-2 h-10 px-3 rounded-xl border text-sm transition-all",
          "bg-background border-input",
          "hover:border-primary/60 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary",
          aberto && "border-primary ring-2 ring-primary/20",
          !value && "text-muted-foreground"
        )}
      >
        <span className="truncate text-left">{value || placeholder}</span>
        <ChevronDown
          className={cn(
            "w-4 h-4 shrink-0 text-muted-foreground transition-transform",
            aberto && "rotate-180"
          )}
        />
      </button>

      {/* Dropdown */}
      {aberto && (
        <div className={cn(
          "absolute left-0 right-0 top-full mt-1 z-50 rounded-xl border shadow-lg overflow-hidden",
          "bg-popover border-border"
        )}>
          {/* Campo de busca */}
          <div className="flex items-center gap-2 px-3 py-2.5 border-b border-border">
            <Search className="w-4 h-4 text-muted-foreground shrink-0" />
            <input
              ref={inputRef}
              type="text"
              value={busca}
              onChange={(e) => setBusca(e.target.value)}
              placeholder="Pesquisar área..."
              className="flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground"
            />
          </div>

          {/* Lista */}
          <div className="max-h-56 overflow-y-auto py-1">
            {/* Opção de criar área personalizada */}
            {mostrarCriar && (
              <button
                type="button"
                onClick={() => selecionar(busca.trim())}
                className={cn(
                  "w-full flex items-center gap-2.5 px-3 py-2 text-sm text-left transition-colors",
                  "text-primary hover:bg-primary/8 font-semibold"
                )}
              >
                <div className="w-5 h-5 rounded-full bg-primary/15 flex items-center justify-center shrink-0">
                  <Plus className="w-3 h-3 text-primary" />
                </div>
                <span>Criar &ldquo;{busca.trim()}&rdquo;</span>
              </button>
            )}

            {opcoesFiltradas.length === 0 && !mostrarCriar && (
              <p className="px-3 py-4 text-sm text-center text-muted-foreground">
                Nenhuma área encontrada
              </p>
            )}

            {opcoesFiltradas.map((opcao) => (
              <button
                key={opcao}
                type="button"
                onClick={() => selecionar(opcao)}
                className={cn(
                  "w-full flex items-center justify-between gap-2 px-3 py-2 text-sm text-left transition-colors",
                  value === opcao
                    ? "bg-primary/8 text-primary font-semibold"
                    : "hover:bg-muted"
                )}
              >
                <span>{opcao}</span>
                {value === opcao && <Check className="w-4 h-4 shrink-0 text-primary" />}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
