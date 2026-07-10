"use client"

import { useState, useCallback } from "react"

interface RestricoesAcesso {
  areas_protegidas?: string[]
  limite_desconto_sem_pin?: number
}

interface EmpresaComPin {
  id: string
  pin_gerente?: string | null
  restricoes_acesso?: RestricoesAcesso | null
}

interface UsePinGerenteReturn {
  verificarAcesso: (area: string) => Promise<boolean>
  precisaPin: (area: string) => boolean
  limiteDesconto: number
  pinConfigurado: boolean
  pinModalAberto: boolean
  fecharPinModal: () => void
  empresaId: string
  onPinSuccess: () => void
}

export function usePinGerente(empresa: EmpresaComPin): UsePinGerenteReturn {
  const [pinModalAberto, setPinModalAberto] = useState(false)
  const [resolvePromise, setResolvePromise] = useState<((value: boolean) => void) | null>(null)

  const restricoes: RestricoesAcesso = empresa.restricoes_acesso || {}
  const areasProtegidas = restricoes.areas_protegidas || []
  const limiteDesconto = restricoes.limite_desconto_sem_pin ?? 100
  const pinConfigurado = !!empresa.pin_gerente

  const precisaPin = useCallback((area: string): boolean => {
    if (!pinConfigurado) return false
    return areasProtegidas.includes(area)
  }, [pinConfigurado, areasProtegidas])

  const verificarAcesso = useCallback((area: string): Promise<boolean> => {
    // Se não precisa de PIN, libera direto
    if (!precisaPin(area)) {
      return Promise.resolve(true)
    }

    // Abre o modal e retorna uma Promise que resolve quando o PIN é verificado
    return new Promise<boolean>((resolve) => {
      setResolvePromise(() => resolve)
      setPinModalAberto(true)
    })
  }, [precisaPin])

  const fecharPinModal = useCallback(() => {
    setPinModalAberto(false)
    // Se fechar sem verificar, nega acesso
    if (resolvePromise) {
      resolvePromise(false)
      setResolvePromise(null)
    }
  }, [resolvePromise])

  const onPinSuccess = useCallback(() => {
    if (resolvePromise) {
      resolvePromise(true)
      setResolvePromise(null)
    }
    setPinModalAberto(false)
  }, [resolvePromise])

  return {
    verificarAcesso,
    precisaPin,
    limiteDesconto,
    pinConfigurado,
    pinModalAberto,
    fecharPinModal,
    empresaId: empresa.id,
    onPinSuccess,
  }
}
