"use client"

import { useState, useEffect, useRef, useCallback } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Loader2, Lock } from "lucide-react"
import { cn } from "@/lib/utils"

interface PinModalProps {
  aberto: boolean
  onClose: () => void
  onSuccess: () => void
  empresaId: string
  titulo?: string
  descricao?: string
}

export function PinModal({
  aberto,
  onClose,
  onSuccess,
  empresaId,
  titulo = "PIN de Gerente",
  descricao = "Digite o PIN de gerente para continuar",
}: PinModalProps) {
  const [pin, setPin] = useState<string[]>(Array(6).fill(""))
  const [erro, setErro] = useState("")
  const [loading, setLoading] = useState(false)
  const [shake, setShake] = useState(false)
  const inputsRef = useRef<(HTMLInputElement | null)[]>([])

  // Limpar estado ao abrir/fechar
  useEffect(() => {
    if (aberto) {
      setPin(Array(6).fill(""))
      setErro("")
      setShake(false)
      // Auto-focus no primeiro input
      setTimeout(() => inputsRef.current[0]?.focus(), 100)
    }
  }, [aberto])

  const verificarPin = useCallback(async (pinCompleto: string) => {
    if (pinCompleto.length < 4) {
      setErro("PIN deve ter no mínimo 4 dígitos")
      return
    }

    setLoading(true)
    setErro("")

    try {
      const res = await fetch("/api/configuracoes/verificar-pin", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ empresa_id: empresaId, pin: pinCompleto }),
      })

      const data = await res.json()

      if (data.valido) {
        onSuccess()
        onClose()
      } else {
        setErro("PIN incorreto")
        setShake(true)
        setTimeout(() => setShake(false), 600)
        setPin(Array(6).fill(""))
        setTimeout(() => inputsRef.current[0]?.focus(), 100)
      }
    } catch {
      setErro("Erro ao verificar PIN")
    } finally {
      setLoading(false)
    }
  }, [empresaId, onSuccess, onClose])

  function handleChange(index: number, value: string) {
    if (!/^\d*$/.test(value)) return

    const newPin = [...pin]
    newPin[index] = value.slice(-1)
    setPin(newPin)
    setErro("")

    // Avançar para o próximo input
    if (value && index < 5) {
      inputsRef.current[index + 1]?.focus()
    }
  }

  function handleKeyDown(index: number, e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Backspace" && !pin[index] && index > 0) {
      inputsRef.current[index - 1]?.focus()
    }

    if (e.key === "Enter") {
      e.preventDefault()
      const pinCompleto = pin.join("")
      if (pinCompleto.length >= 4) {
        verificarPin(pinCompleto)
      }
    }

    if (e.key === "Escape") {
      e.preventDefault()
      onClose()
    }
  }

  function handlePaste(e: React.ClipboardEvent) {
    e.preventDefault()
    const pasted = e.clipboardData.getData("text").replace(/\D/g, "").slice(0, 6)
    if (!pasted) return

    const newPin = Array(6).fill("")
    for (let i = 0; i < pasted.length; i++) {
      newPin[i] = pasted[i]
    }
    setPin(newPin)

    // Focar no último dígito preenchido ou submeter se >= 4 dígitos
    const lastIndex = Math.min(pasted.length, 5)
    inputsRef.current[lastIndex]?.focus()

    if (pasted.length >= 4) {
      setTimeout(() => verificarPin(pasted), 100)
    }
  }

  function handleSubmit() {
    const pinCompleto = pin.join("")
    verificarPin(pinCompleto)
  }

  return (
    <Dialog open={aberto} onOpenChange={(open) => { if (!open) onClose() }}>
      <DialogContent className="sm:max-w-[360px]">
        <DialogHeader className="items-center">
          <div className="w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center mb-2">
            <Lock className="w-6 h-6 text-primary" />
          </div>
          <DialogTitle>{titulo}</DialogTitle>
          <DialogDescription className="text-center">
            {descricao}
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col items-center gap-4 py-4">
          {/* Inputs do PIN */}
          <div
            className={cn(
              "flex gap-2 transition-transform",
              shake && "animate-shake"
            )}
            onPaste={handlePaste}
          >
            {pin.map((digit, i) => (
              <input
                key={i}
                ref={(el) => { inputsRef.current[i] = el }}
                type="password"
                inputMode="numeric"
                maxLength={1}
                value={digit}
                onChange={(e) => handleChange(i, e.target.value)}
                onKeyDown={(e) => handleKeyDown(i, e)}
                disabled={loading}
                className={cn(
                  "w-10 h-12 text-center text-lg font-bold rounded-lg border-2 outline-none transition-all",
                  "bg-background focus:border-primary focus:ring-2 focus:ring-primary/20",
                  erro ? "border-red-400" : "border-border",
                  loading && "opacity-50 cursor-not-allowed"
                )}
                aria-label={`Dígito ${i + 1} do PIN`}
              />
            ))}
          </div>

          {/* Erro */}
          {erro && (
            <p className="text-sm text-red-500 font-medium">{erro}</p>
          )}

          {/* Botões */}
          <div className="flex gap-2 w-full">
            <Button
              variant="outline"
              className="flex-1"
              onClick={onClose}
              disabled={loading}
            >
              Cancelar
            </Button>
            <Button
              className="flex-1"
              onClick={handleSubmit}
              disabled={loading || pin.join("").length < 4}
            >
              {loading ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                "Verificar"
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
