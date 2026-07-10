"use client"

import { useState, useEffect, useRef, useCallback } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Loader2, Lock, Mail, ArrowLeft } from "lucide-react"
import { cn } from "@/lib/utils"
import { toast } from "sonner"

interface PinModalProps {
  aberto: boolean
  onClose: () => void
  onSuccess: () => void
  empresaId: string
  titulo?: string
  descricao?: string
  mostrarEsqueciPin?: boolean
  onPinResetado?: () => void
}

export function PinModal({
  aberto,
  onClose,
  onSuccess,
  empresaId,
  titulo = "PIN de Gerente",
  descricao = "Digite o PIN de gerente para continuar",
  mostrarEsqueciPin = true,
  onPinResetado,
}: PinModalProps) {
  const [pin, setPin] = useState<string[]>(Array(6).fill(""))
  const [erro, setErro] = useState("")
  const [loading, setLoading] = useState(false)
  const [shake, setShake] = useState(false)
  const inputsRef = useRef<(HTMLInputElement | null)[]>([])

  // Estado do fluxo "Esqueci o PIN"
  const [modoReset, setModoReset] = useState(false)
  const [resetEtapa, setResetEtapa] = useState<"enviar" | "codigo">("enviar")
  const [enviandoEmail, setEnviandoEmail] = useState(false)
  const [emailMascarado, setEmailMascarado] = useState("")
  const [codigoReset, setCodigoReset] = useState("")
  const [verificandoCodigo, setVerificandoCodigo] = useState(false)

  // Limpar estado ao abrir/fechar
  useEffect(() => {
    if (aberto) {
      setPin(Array(6).fill(""))
      setErro("")
      setShake(false)
      setModoReset(false)
      setResetEtapa("enviar")
      setCodigoReset("")
      setTimeout(() => {
        inputsRef.current[0]?.focus()
        setPin(Array(6).fill(""))
      }, 300)
    }
  }, [aberto])

  const verificarPin = useCallback(async (pinCompleto: string) => {
    if (pinCompleto.length < 4) { setErro("PIN deve ter no mínimo 4 dígitos"); return }
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
    if (value && index < 5) inputsRef.current[index + 1]?.focus()
  }

  function handleKeyDown(index: number, e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Backspace" && !pin[index] && index > 0) inputsRef.current[index - 1]?.focus()
    if (e.key === "Enter") { e.preventDefault(); const p = pin.join(""); if (p.length >= 4) verificarPin(p) }
    if (e.key === "Escape") { e.preventDefault(); onClose() }
  }

  function handlePaste(e: React.ClipboardEvent) {
    e.preventDefault()
    const pasted = e.clipboardData.getData("text").replace(/\D/g, "").slice(0, 6)
    if (!pasted) return
    const newPin = Array(6).fill("")
    for (let i = 0; i < pasted.length; i++) newPin[i] = pasted[i]
    setPin(newPin)
    const lastIndex = Math.min(pasted.length, 5)
    inputsRef.current[lastIndex]?.focus()
    if (pasted.length >= 4) setTimeout(() => verificarPin(pasted), 100)
  }

  async function enviarCodigoEmail() {
    setEnviandoEmail(true)
    setErro("")
    try {
      const res = await fetch("/api/configuracoes/reset-pin", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ empresa_id: empresaId, acao: "enviar" }),
      })
      const data = await res.json()
      if (data.sucesso) {
        setEmailMascarado(data.email)
        setResetEtapa("codigo")
        toast.success("Código enviado por e-mail!")
      } else {
        setErro(data.erro || "Erro ao enviar código")
      }
    } catch {
      setErro("Erro de conexão")
    } finally {
      setEnviandoEmail(false)
    }
  }

  async function verificarCodigoReset() {
    if (codigoReset.length !== 6) { setErro("Digite o código de 6 dígitos"); return }
    setVerificandoCodigo(true)
    setErro("")
    try {
      const res = await fetch("/api/configuracoes/reset-pin", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ empresa_id: empresaId, acao: "verificar", codigo: codigoReset }),
      })
      const data = await res.json()
      if (data.valido) {
        toast.success("PIN resetado com sucesso! Configure um novo PIN.")
        onPinResetado?.()
        onClose()
      } else {
        setErro(data.erro || "Código incorreto")
      }
    } catch {
      setErro("Erro de conexão")
    } finally {
      setVerificandoCodigo(false)
    }
  }

  return (
    <Dialog open={aberto} onOpenChange={(open) => { if (!open) onClose() }}>
      <DialogContent className="sm:max-w-[380px]">
        {/* Modo normal — digitar PIN */}
        {!modoReset && (
          <>
            <DialogHeader className="items-center">
              <div className="w-12 h-12 bg-orange-500/10 rounded-full flex items-center justify-center mb-2">
                <Lock className="w-6 h-6 text-orange-500" />
              </div>
              <DialogTitle>{titulo}</DialogTitle>
              <DialogDescription className="text-center">{descricao}</DialogDescription>
            </DialogHeader>

            <div className="flex flex-col items-center gap-4 py-4">
              <div className={cn("flex gap-2 transition-transform", shake && "animate-shake")} onPaste={handlePaste}>
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
                      "bg-background focus:border-orange-500 focus:ring-2 focus:ring-orange-500/20",
                      erro ? "border-red-400" : "border-border",
                      loading && "opacity-50 cursor-not-allowed"
                    )}
                    aria-label={`Dígito ${i + 1} do PIN`}
                  />
                ))}
              </div>

              {erro && <p className="text-sm text-red-500 font-medium">{erro}</p>}

              <div className="flex gap-2 w-full">
                <Button variant="outline" className="flex-1" onClick={onClose} disabled={loading}>
                  Cancelar
                </Button>
                <Button
                  className="flex-1 bg-orange-500 hover:bg-orange-600 text-white"
                  onClick={() => verificarPin(pin.join(""))}
                  disabled={loading || pin.join("").length < 4}
                >
                  {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : "Verificar"}
                </Button>
              </div>

              {mostrarEsqueciPin && (
                <button
                  type="button"
                  onClick={() => setModoReset(true)}
                  className="text-xs text-muted-foreground hover:text-orange-500 transition-colors mt-1"
                >
                  Esqueci o PIN
                </button>
              )}
            </div>
          </>
        )}

        {/* Modo reset — esqueci o PIN */}
        {modoReset && (
          <>
            <DialogHeader className="items-center">
              <div className="w-12 h-12 bg-blue-500/10 rounded-full flex items-center justify-center mb-2">
                <Mail className="w-6 h-6 text-blue-500" />
              </div>
              <DialogTitle>Recuperar PIN</DialogTitle>
              <DialogDescription className="text-center">
                {resetEtapa === "enviar"
                  ? "Enviaremos um código de verificação para o e-mail cadastrado da empresa."
                  : `Código enviado para ${emailMascarado}. Digite abaixo.`
                }
              </DialogDescription>
            </DialogHeader>

            <div className="flex flex-col items-center gap-4 py-4">
              {resetEtapa === "enviar" && (
                <>
                  <Button
                    onClick={enviarCodigoEmail}
                    disabled={enviandoEmail}
                    className="w-full gap-2 bg-blue-500 hover:bg-blue-600 text-white"
                  >
                    {enviandoEmail ? <Loader2 className="w-4 h-4 animate-spin" /> : <Mail className="w-4 h-4" />}
                    Enviar código por e-mail
                  </Button>
                  {erro && <p className="text-sm text-red-500 font-medium">{erro}</p>}
                </>
              )}

              {resetEtapa === "codigo" && (
                <>
                  <div className="w-full space-y-2">
                    <label className="text-xs font-medium text-muted-foreground">Código de 6 dígitos</label>
                    <input
                      type="text"
                      inputMode="numeric"
                      maxLength={6}
                      value={codigoReset}
                      onChange={(e) => setCodigoReset(e.target.value.replace(/\D/g, ""))}
                      placeholder="000000"
                      className="w-full h-12 text-center text-2xl font-bold tracking-[0.5em] rounded-lg border-2 border-border bg-background focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 outline-none transition-all"
                      autoFocus
                    />
                  </div>
                  {erro && <p className="text-sm text-red-500 font-medium">{erro}</p>}
                  <Button
                    onClick={verificarCodigoReset}
                    disabled={verificandoCodigo || codigoReset.length !== 6}
                    className="w-full gap-2 bg-blue-500 hover:bg-blue-600 text-white"
                  >
                    {verificandoCodigo ? <Loader2 className="w-4 h-4 animate-spin" /> : "Verificar código"}
                  </Button>
                  <button
                    type="button"
                    onClick={enviarCodigoEmail}
                    disabled={enviandoEmail}
                    className="text-xs text-muted-foreground hover:text-blue-500 transition-colors"
                  >
                    {enviandoEmail ? "Enviando..." : "Reenviar código"}
                  </button>
                </>
              )}

              <button
                type="button"
                onClick={() => { setModoReset(false); setErro("") }}
                className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
              >
                <ArrowLeft className="w-3 h-3" /> Voltar para o PIN
              </button>
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  )
}
