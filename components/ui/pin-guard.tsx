"use client"

import { useState, useEffect } from "react"
import { PinModal } from "@/components/ui/pin-modal"
import { Lock } from "lucide-react"
import { Button } from "@/components/ui/button"
import { useColaborador } from "@/contexts/colaborador-context"

interface PinGuardProps {
  empresaId: string
  pinConfigurado: boolean
  areaProtegida: boolean
  nomeArea: string
  children: React.ReactNode
}

/**
 * Envolve uma página/seção protegida.
 * Se a área está marcada como protegida e PIN está configurado,
 * mostra tela de bloqueio e pede o PIN antes de exibir o conteúdo.
 * Uma vez desbloqueado naquela sessão, fica liberado até fechar/recarregar.
 */
export function PinGuard({ empresaId, pinConfigurado, areaProtegida, nomeArea, children }: PinGuardProps) {
  const [desbloqueado, setDesbloqueado] = useState(false)
  const [pedindoPin, setPedindoPin] = useState(false)
  const { colaborador, logado } = useColaborador()

  // Se colaborador logado como admin ou gerente, nunca pede PIN
  const adminOuGerente = logado && colaborador && (colaborador.perfil === "admin" || colaborador.perfil === "gerente")

  // Verificar se já desbloqueou nesta sessão (sessionStorage)
  useEffect(() => {
    if (!pinConfigurado || !areaProtegida || adminOuGerente) return
    const chave = `pin_desbloqueado_${empresaId}_${nomeArea}`
    if (sessionStorage.getItem(chave) === "true") {
      setDesbloqueado(true)
    }
  }, [empresaId, nomeArea, pinConfigurado, areaProtegida, adminOuGerente])

  // Se não precisa de proteção, mostra direto
  if (!pinConfigurado || !areaProtegida || desbloqueado || adminOuGerente) {
    return <>{children}</>
  }

  return (
    <div className="flex flex-col items-center justify-center py-20 space-y-6">
      <div className="w-16 h-16 rounded-2xl bg-orange-500/10 flex items-center justify-center">
        <Lock className="w-8 h-8 text-orange-500" />
      </div>
      <div className="text-center space-y-2">
        <h3 className="text-xl font-bold">Acesso Restrito</h3>
        <p className="text-sm text-muted-foreground max-w-sm">
          A área <strong>{nomeArea}</strong> está protegida pelo PIN de gerente.
        </p>
      </div>
      <Button
        onClick={() => setPedindoPin(true)}
        className="gap-2 bg-orange-500 hover:bg-orange-600 text-white"
        size="lg"
      >
        <Lock className="w-4 h-4" />
        Desbloquear com PIN
      </Button>

      <PinModal
        aberto={pedindoPin}
        onClose={() => setPedindoPin(false)}
        onSuccess={() => {
          setDesbloqueado(true)
          setPedindoPin(false)
          // Salvar na sessão para não pedir novamente enquanto não fechar o navegador
          const chave = `pin_desbloqueado_${empresaId}_${nomeArea}`
          sessionStorage.setItem(chave, "true")
        }}
        empresaId={empresaId}
        titulo={`Acessar ${nomeArea}`}
        descricao="Digite o PIN de gerente para desbloquear"
      />
    </div>
  )
}
