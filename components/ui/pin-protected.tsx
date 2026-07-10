"use client"

import { useState, useEffect } from "react"
import { PinModal } from "@/components/ui/pin-modal"
import { Lock } from "lucide-react"

interface PinProtectedProps {
  /** ID da empresa */
  empresaId: string
  /** Se o PIN está configurado na empresa */
  pinConfigurado: boolean
  /** Lista de áreas protegidas salvas */
  areasProtegidas: string[]
  /** ID da restrição a verificar (ex: "caixa_ver_anteriores") */
  restricaoId: string
  /** Nome legível da funcionalidade protegida */
  nomeRestricao?: string
  /** Conteúdo a ser exibido quando liberado */
  children: React.ReactNode
  /** Modo de exibição quando bloqueado:
   * - "ocultar" — não mostra nada (default para seções)
   * - "bloquear" — mostra placeholder com botão de desbloquear
   * - "botao" — renderiza children mas intercepta o clique
   */
  modo?: "ocultar" | "bloquear" | "botao"
}

/**
 * Componente que protege uma seção/aba/botão com PIN de gerente.
 * Verifica se a restricaoId está na lista de áreas protegidas.
 * Se sim, mostra tela de bloqueio ou oculta.
 * Uma vez desbloqueado na sessão, fica liberado.
 */
export function PinProtected({
  empresaId,
  pinConfigurado,
  areasProtegidas,
  restricaoId,
  nomeRestricao,
  children,
  modo = "bloquear",
}: PinProtectedProps) {
  const [desbloqueado, setDesbloqueado] = useState(false)
  const [pedindoPin, setPedindoPin] = useState(false)

  const precisaProteger = pinConfigurado && areasProtegidas.includes(restricaoId)

  // Verificar sessionStorage
  useEffect(() => {
    if (!precisaProteger) return
    const chave = `pin_acao_${empresaId}_${restricaoId}`
    if (sessionStorage.getItem(chave) === "true") {
      setDesbloqueado(true)
    }
  }, [empresaId, restricaoId, precisaProteger])

  // Se não precisa proteger ou já desbloqueou, mostra normalmente
  if (!precisaProteger || desbloqueado) {
    return <>{children}</>
  }

  // Modo ocultar — não renderiza nada
  if (modo === "ocultar") {
    return null
  }

  // Modo bloquear — mostra placeholder
  return (
    <>
      <div className="flex flex-col items-center justify-center py-10 space-y-4 rounded-xl border-2 border-dashed border-orange-300 dark:border-orange-700 bg-orange-50/50 dark:bg-orange-500/5">
        <div className="w-10 h-10 rounded-xl bg-orange-500/10 flex items-center justify-center">
          <Lock className="w-5 h-5 text-orange-500" />
        </div>
        <div className="text-center space-y-1">
          <p className="text-sm font-semibold text-foreground">
            {nomeRestricao || "Função restrita"}
          </p>
          <p className="text-xs text-muted-foreground">
            Requer PIN de gerente para acesso
          </p>
        </div>
        <button
          onClick={() => setPedindoPin(true)}
          className="px-4 py-2 rounded-lg bg-orange-500 hover:bg-orange-600 text-white text-xs font-bold transition-colors flex items-center gap-1.5"
        >
          <Lock className="w-3.5 h-3.5" />
          Desbloquear
        </button>
      </div>

      <PinModal
        aberto={pedindoPin}
        onClose={() => setPedindoPin(false)}
        onSuccess={() => {
          setDesbloqueado(true)
          setPedindoPin(false)
          const chave = `pin_acao_${empresaId}_${restricaoId}`
          sessionStorage.setItem(chave, "true")
        }}
        empresaId={empresaId}
        titulo={nomeRestricao || "Desbloquear"}
        descricao="Digite o PIN de gerente"
      />
    </>
  )
}
