"use client"

import { useState, useEffect } from "react"
import { usePathname } from "next/navigation"
import { motion, AnimatePresence } from "framer-motion"
import { Topbar } from "@/components/layout/topbar"
import { MobileNav } from "@/components/layout/mobile-nav"
import { ChatIA } from "@/components/chat/chat-ia"
import { PullToRefresh } from "@/components/layout/pull-to-refresh"
import { useEmpresa } from "@/hooks/use-empresa"
import { useRealtimeRefresh } from "@/hooks/use-realtime-refresh"
import { useKeyboardShortcuts } from "@/hooks/use-keyboard-shortcuts"

// Painel de atalhos
function ShortcutPanel({ onClose }: { onClose: () => void }) {
  const shortcuts = [
    { key: "N", label: "Nova Venda" },
    { key: "C", label: "Caixa" },
    { key: "A", label: "Agendamentos" },
    { key: "D", label: "Dashboard" },
    { key: "F", label: "Financeiro" },
    { key: "P", label: "Produtos/Serviços" },
    { key: "L", label: "Clientes" },
    { key: "?", label: "Mostrar atalhos" },
  ]
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm"
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.95, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.95, opacity: 0 }}
        transition={{ duration: 0.15 }}
        className="bg-card border border-border rounded-xl shadow-2xl p-6 w-full max-w-sm"
        onClick={(e) => e.stopPropagation()}
      >
        <h3 className="font-semibold text-sm mb-4 text-foreground">Atalhos de teclado</h3>
        <div className="space-y-2">
          {shortcuts.map((s) => (
            <div key={s.key} className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">{s.label}</span>
              <kbd className="kbd-tooltip">{s.key}</kbd>
            </div>
          ))}
        </div>
        <p className="text-xs text-muted-foreground mt-4 text-center">Pressione Esc para fechar</p>
      </motion.div>
    </motion.div>
  )
}

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const [showShortcuts, setShowShortcuts] = useState(false)
  const { empresa, empresas, selecionarEmpresa } = useEmpresa()
  const pathname = usePathname()
  const plano = empresa?.plano ?? "gratuito"
  const isPlanoAgenda = plano === "agenda"
  const isPlanoGestao = plano === "gestao"

  useRealtimeRefresh(empresa?.id)
  useKeyboardShortcuts()

  // Atalho ? para mostrar painel
  useEffect(() => {
    function handler(e: KeyboardEvent) {
      const tag = (e.target as HTMLElement).tagName
      if (["INPUT", "TEXTAREA", "SELECT"].includes(tag)) return
      if (e.key === "?" || e.key === "/") setShowShortcuts((v) => !v)
      if (e.key === "Escape") setShowShortcuts(false)
    }
    document.addEventListener("keydown", handler)
    return () => document.removeEventListener("keydown", handler)
  }, [])

  return (
    <div className="min-h-screen bg-background flex flex-col">

      {/* Topbar — só no desktop (md+). Mobile usa a barra inferior */}
      {!isPlanoAgenda && (
        <div className="hidden md:block">
          <Topbar
            empresaNome={empresa?.nome}
            empresaLogoUrl={empresa?.logo_url}
            plano={plano}
            empresas={empresas}
            empresaAtualId={empresa?.id}
            onSelecionarEmpresa={selecionarEmpresa}
          />
        </div>
      )}

      {/* Conteúdo com animação de transição */}
      <AnimatePresence mode="wait">
        <motion.main
          key={pathname}
          initial={{ opacity: 0, y: 5 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -3 }}
          transition={{ duration: 0.18, ease: "easeOut" }}
          className={`flex-1 p-4 lg:p-5 pb-20 md:pb-5 max-w-[1600px] w-full mx-auto ${!isPlanoAgenda ? "md:mt-14" : ""}`}
        >
          <PullToRefresh>
            {children}
          </PullToRefresh>
        </motion.main>
      </AnimatePresence>

      <MobileNav plano={plano} empresas={empresas} empresaAtualId={empresa?.id} onSelecionarEmpresa={selecionarEmpresa} />
      {!isPlanoAgenda && <ChatIA />}

      {/* Painel de atalhos */}
      <AnimatePresence>
        {showShortcuts && <ShortcutPanel onClose={() => setShowShortcuts(false)} />}
      </AnimatePresence>
    </div>
  )
}
