"use client"

import { useState, useEffect, useRef, useCallback } from "react"
import { Copy, Loader2, X, Clock, Check, QrCode } from "lucide-react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { formatarMoeda } from "@/lib/utils"

interface PixOnlinePanelProps {
  boletoId: string
  qrCode: string // base64 image (may or may not include data:image/png;base64, prefix)
  copiaCola: string
  valor: number
  onPaid: () => void
  onCancel: () => void
}

const POLL_INTERVAL = 5000 // 5 seconds
const TIMEOUT_SECONDS = 300 // 5 minutes

export function PixOnlinePanel({
  boletoId,
  qrCode,
  copiaCola,
  valor,
  onPaid,
  onCancel,
}: PixOnlinePanelProps) {
  const [elapsed, setElapsed] = useState(0)
  const [showTimeoutAlert, setShowTimeoutAlert] = useState(false)
  const [paid, setPaid] = useState(false)
  const [canceling, setCanceling] = useState(false)
  const intervalRef = useRef<NodeJS.Timeout | null>(null)
  const timerRef = useRef<NodeJS.Timeout | null>(null)

  // Build QR code src
  const qrSrc = qrCode.startsWith("data:") ? qrCode : `data:image/png;base64,${qrCode}`

  // Polling function
  const checkStatus = useCallback(async () => {
    try {
      const res = await fetch(`/api/cora/pix/status?boletoId=${boletoId}`)
      if (!res.ok) return
      const data = await res.json()
      if (data.status === "pago") {
        setPaid(true)
        clearInterval(intervalRef.current!)
        clearInterval(timerRef.current!)
        setTimeout(() => onPaid(), 1200) // brief success flash
      } else if (data.status === "cancelado") {
        clearInterval(intervalRef.current!)
        clearInterval(timerRef.current!)
        toast.error("Cobrança Pix cancelada")
        onCancel()
      }
    } catch {
      /* network errors ignored — next poll will retry */
    }
  }, [boletoId, onPaid, onCancel])

  useEffect(() => {
    // Start polling
    intervalRef.current = setInterval(checkStatus, POLL_INTERVAL)
    // Timer
    timerRef.current = setInterval(() => {
      setElapsed((prev) => {
        const next = prev + 1
        if (next >= TIMEOUT_SECONDS) setShowTimeoutAlert(true)
        return next
      })
    }, 1000)

    return () => {
      clearInterval(intervalRef.current!)
      clearInterval(timerRef.current!)
    }
  }, [checkStatus])

  async function handleCancel() {
    setCanceling(true)
    try {
      await fetch(`/api/cora/boletos/${boletoId}/cancelar`, { method: "POST" })
    } catch {
      /* best effort */
    }
    clearInterval(intervalRef.current!)
    clearInterval(timerRef.current!)
    onCancel()
  }

  function handleCopy() {
    navigator.clipboard
      .writeText(copiaCola)
      .then(() => toast.success("Código Pix copiado!"))
      .catch(() => toast.error("Não foi possível copiar"))
  }

  function formatTime(s: number) {
    const m = Math.floor(s / 60).toString().padStart(2, "0")
    const sec = (s % 60).toString().padStart(2, "0")
    return `${m}:${sec}`
  }

  // Paid state
  if (paid) {
    return (
      <div className="flex flex-col items-center gap-3 rounded-xl border border-emerald-300 bg-emerald-50 dark:bg-emerald-950/30 p-6 text-center">
        <div className="flex h-12 w-12 items-center justify-center rounded-full bg-emerald-500">
          <Check className="h-6 w-6 text-white" />
        </div>
        <p className="font-bold text-emerald-700 dark:text-emerald-400">Pagamento confirmado!</p>
        <p className="text-sm text-emerald-600 dark:text-emerald-500">Finalizando venda...</p>
      </div>
    )
  }

  // Timeout alert
  if (showTimeoutAlert) {
    return (
      <div className="flex flex-col gap-3 rounded-xl border border-amber-300 bg-amber-50 dark:bg-amber-950/30 p-4">
        <div className="flex items-center gap-2">
          <Clock className="h-5 w-5 text-amber-600" />
          <p className="font-semibold text-amber-700 dark:text-amber-400 text-sm">
            Pagamento não detectado
          </p>
        </div>
        <p className="text-xs text-amber-600">
          O QR Code ainda está válido. Deseja continuar aguardando?
        </p>
        <div className="flex gap-2">
          <Button
            size="sm"
            variant="outline"
            className="flex-1"
            onClick={() => {
              setShowTimeoutAlert(false)
              setElapsed(0)
            }}
          >
            Continuar aguardando
          </Button>
          <Button
            size="sm"
            variant="destructive"
            className="flex-1"
            onClick={handleCancel}
            disabled={canceling}
          >
            {canceling ? <Loader2 className="h-4 w-4 animate-spin" /> : "Cancelar"}
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-3 rounded-xl border border-border bg-card p-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <QrCode className="h-4 w-4 text-[#F26E1D]" />
          <span className="text-sm font-semibold">Pix Online</span>
        </div>
        <span className="text-xs text-muted-foreground font-mono">{formatTime(elapsed)}</span>
      </div>

      {/* Valor */}
      <p className="text-center text-lg font-bold text-[#F26E1D]">{formatarMoeda(valor)}</p>

      {/* QR Code */}
      <div className="flex justify-center rounded-lg bg-white p-3">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={qrSrc} alt="QR Code Pix" className="h-40 w-40 object-contain" />
      </div>

      {/* Status indicator */}
      <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
        <Loader2 className="h-4 w-4 animate-spin text-[#F26E1D]" />
        Aguardando pagamento...
      </div>

      {/* Copia e cola */}
      <div className="flex items-center gap-2 rounded-lg border bg-muted/40 px-3 py-2">
        <p className="flex-1 truncate text-xs font-mono text-muted-foreground">{copiaCola}</p>
        <button
          onClick={handleCopy}
          className="shrink-0 text-muted-foreground hover:text-foreground transition-colors"
          aria-label="Copiar código Pix"
        >
          <Copy className="h-3.5 w-3.5" />
        </button>
      </div>

      {/* Cancel */}
      <Button
        variant="outline"
        size="sm"
        onClick={handleCancel}
        disabled={canceling}
        className="w-full border-red-200 text-red-600 hover:bg-red-50 dark:hover:bg-red-950/20"
      >
        {canceling ? <Loader2 className="h-4 w-4 animate-spin" /> : <X className="h-4 w-4" />}
        Cancelar Pix
      </Button>
    </div>
  )
}
