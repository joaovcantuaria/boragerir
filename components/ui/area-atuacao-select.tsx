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
  const [dropdownStyle, setDropdownStyle] = useState<React.CSSProperties>({})
  const containerRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  // Calcular posição do dropdown baseado no trigger
  useEffect(() => {
    if (aberto && containerRef.current) {
      const rect = containerRef.current.getBoundingClientRect()
      const spaceBelow = window.innerHeight - rect.bottom
      const dropdownHeight = 320 // altura máxima estimada

      setDropdownStyle({
        position: "fixed",
        left: rect.left,
        width: rect.width,
        zIndex: 99999,
        // Se não tiver espaço abaixo, abre para cima
        ...(spaceBelow < dropdownHeight
          ? { bottom: window.innerHeight - rect.top + 4 }
          : { top: rect.bottom + 4 }),
        backgroundColor: "#ffffff",
        border: "1px solid #e5e7eb",
        borderRadius: "12px",
        boxShadow: "0 10px 40px rgba(0,0,0,0.15)",
        overflow: "hidden",
      })

      setTimeout(() => inputRef.current?.focus(), 50)
    }
  }, [aberto])

  // Fechar ao clicar fora
  useEffect(() => {
    function handler(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        // Verificar se clicou dentro do dropdown (que agora é fixed/fora do container)
        const target = e.target as HTMLElement
        if (target.closest("[data-area-dropdown]")) return
        setAberto(false)
        setBusca("")
      }
    }
    document.addEventListener("mousedown", handler)
    return () => document.removeEventListener("mousedown", handler)
  }, [])

  // Fechar ao rolar a página
  useEffect(() => {
    if (!aberto) return
    function handler() { setAberto(false); setBusca("") }
    window.addEventListener("scroll", handler, true)
    return () => window.removeEventListener("scroll", handler, true)
  }, [aberto])

  const buscanLower = busca.trim().toLowerCase()
  const opcoesFiltradas = buscanLower
    ? areasAtuacao.filter((a) => a.toLowerCase().includes(buscanLower))
    : areasAtuacao
  const jaExiste = areasAtuacao.some((a) => a.toLowerCase() === buscanLower)
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
        onClick={() => setAberto((v) => !v)}
        className={cn(
          "w-full flex items-center justify-between gap-2 h-10 px-3 rounded-xl border text-sm transition-all",
          "border-input",
          "hover:border-primary/60 focus:outline-none",
          aberto && "border-primary ring-2 ring-primary/20"
        )}
        style={{
          backgroundColor: "#ffffff",
          color: value ? "#111827" : "#9ca3af",
        }}
      >
        <span className="truncate text-left">{value || placeholder}</span>
        <ChevronDown
          className={cn("w-4 h-4 shrink-0 transition-transform", aberto && "rotate-180")}
          style={{ color: "#9ca3af" }}
        />
      </button>

      {/* Dropdown — renderiza via portal fixed para nunca ficar preso em overflow */}
      {aberto && (
        <>
          {/* Overlay invisível para fechar */}
          <div
            style={{ position: "fixed", inset: 0, zIndex: 99998 }}
            onClick={() => { setAberto(false); setBusca("") }}
          />

          {/* Menu */}
          <div data-area-dropdown style={dropdownStyle}>
            {/* Campo de busca */}
            <div
              className="flex items-center gap-2 px-3 py-2.5"
              style={{ borderBottom: "1px solid #e5e7eb" }}
            >
              <Search className="w-4 h-4 shrink-0" style={{ color: "#9ca3af" }} />
              <input
                ref={inputRef}
                type="text"
                value={busca}
                onChange={(e) => setBusca(e.target.value)}
                placeholder="Pesquisar área..."
                className="flex-1 text-sm outline-none bg-transparent"
                style={{ color: "#111827" }}
              />
              {busca && (
                <button
                  type="button"
                  onClick={() => setBusca("")}
                  style={{ color: "#9ca3af" }}
                >
                  ×
                </button>
              )}
            </div>

            {/* Lista */}
            <div style={{ maxHeight: "240px", overflowY: "auto" }}>
              {mostrarCriar && (
                <button
                  type="button"
                  onClick={() => selecionar(busca.trim())}
                  className="w-full flex items-center gap-2.5 px-3 py-2.5 text-sm text-left font-semibold transition-colors"
                  style={{ color: "#F26E1D" }}
                  onMouseEnter={(e) => { e.currentTarget.style.background = "rgba(242,110,29,0.08)" }}
                  onMouseLeave={(e) => { e.currentTarget.style.background = "transparent" }}
                >
                  <div
                    className="w-5 h-5 rounded-full flex items-center justify-center shrink-0"
                    style={{ background: "rgba(242,110,29,0.15)" }}
                  >
                    <Plus className="w-3 h-3" style={{ color: "#F26E1D" }} />
                  </div>
                  Criar &ldquo;{busca.trim()}&rdquo;
                </button>
              )}

              {opcoesFiltradas.length === 0 && !mostrarCriar && (
                <p className="px-3 py-4 text-sm text-center" style={{ color: "#9ca3af" }}>
                  Nenhuma área encontrada
                </p>
              )}

              {opcoesFiltradas.map((opcao) => (
                <button
                  key={opcao}
                  type="button"
                  onClick={() => selecionar(opcao)}
                  className="w-full flex items-center justify-between gap-2 px-3 py-2.5 text-sm text-left transition-colors"
                  style={{
                    color: value === opcao ? "#F26E1D" : "#374151",
                    fontWeight: value === opcao ? 600 : 400,
                    background: value === opcao ? "rgba(242,110,29,0.06)" : "transparent",
                    borderLeft: value === opcao ? "3px solid #F26E1D" : "3px solid transparent",
                  }}
                  onMouseEnter={(e) => {
                    if (value !== opcao) {
                      e.currentTarget.style.background = "#f9fafb"
                      e.currentTarget.style.color = "#111827"
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (value !== opcao) {
                      e.currentTarget.style.background = "transparent"
                      e.currentTarget.style.color = "#374151"
                    }
                  }}
                >
                  <span>{opcao}</span>
                  {value === opcao && (
                    <Check className="w-4 h-4 shrink-0" style={{ color: "#F26E1D" }} />
                  )}
                </button>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  )
}
