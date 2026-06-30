"use client"

import { useState, useEffect } from "react"
import { Link2, Copy, Check, ExternalLink, Share2, QrCode, Download, X } from "lucide-react"
import { toast } from "sonner"

interface LinkAgendamentoProps {
  empresaSlug: string | null
  empresaId: string
  plano: string
}

export function LinkAgendamento({ empresaSlug, empresaId, plano }: LinkAgendamentoProps) {
  const [copiado, setCopiado] = useState(false)
  const [mostrarQR, setMostrarQR] = useState(false)
  const [qrUrl, setQrUrl] = useState<string | null>(null)

  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "https://app.boragerir.com"
  const link = empresaSlug ? `${appUrl}/agendar/${empresaSlug}` : null

  // Gerar QR Code usando API gratuita do QR Code Generator
  useEffect(() => {
    if (link && mostrarQR) {
      const encodedUrl = encodeURIComponent(link)
      setQrUrl(`https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodedUrl}&bgcolor=ffffff&color=1a1a1a&margin=10&format=png`)
    }
  }, [link, mostrarQR])

  function copiar() {
    if (!link) return
    navigator.clipboard.writeText(link)
    setCopiado(true)
    toast.success("Link copiado! Compartilhe com seus clientes.")
    setTimeout(() => setCopiado(false), 3000)
  }

  function compartilhar() {
    if (!link) return
    if (navigator.share) {
      navigator.share({ title: "Faça seu agendamento", text: "Agende online de forma rápida!", url: link })
    } else {
      copiar()
    }
  }

  async function baixarQR() {
    if (!qrUrl || !empresaSlug) return
    try {
      const response = await fetch(qrUrl)
      const blob = await response.blob()
      const url = URL.createObjectURL(blob)
      const a = document.createElement("a")
      a.href = url
      a.download = `qrcode-agendamento-${empresaSlug}.png`
      a.click()
      URL.revokeObjectURL(url)
      toast.success("QR Code baixado!")
    } catch {
      toast.error("Erro ao baixar QR Code.")
    }
  }

  // Link público de agendamento online: apenas planos Agenda e Profissional
  const planosComAgendamentoOnline = ["agenda", "profissional"]
  if (!planosComAgendamentoOnline.includes(plano)) {
    return (
      <div className="p-4 rounded-2xl border border-dashed border-border bg-muted/40 text-center">
        <Link2 className="w-8 h-8 mx-auto mb-2 text-muted-foreground opacity-40" />
        <p className="text-sm font-semibold text-foreground">Agendamento online público</p>
        <p className="text-xs text-muted-foreground mt-1">
          {plano === "basico"
            ? "O Plano Básico inclui gestão de agenda interna. O link público está disponível no Plano Profissional."
            : "Disponível nos planos Agendamento Online e Profissional."}
        </p>
        <a href="/planos" className="mt-3 inline-block text-xs text-primary font-bold hover:underline">
          Fazer upgrade →
        </a>
      </div>
    )
  }

  if (!link) {
    return (
      <div className="p-4 rounded-2xl border border-dashed border-border bg-muted/40 text-center">
        <p className="text-sm text-muted-foreground">Gerando seu link de agendamento...</p>
      </div>
    )
  }

  return (
    <div className="p-4 rounded-2xl border border-primary/20 bg-primary/5 space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
            <Link2 className="w-4 h-4 text-primary" />
          </div>
          <div>
            <p className="text-sm font-bold text-foreground">Link de agendamento online</p>
            <p className="text-xs text-muted-foreground">Compartilhe com seus clientes</p>
          </div>
        </div>
      </div>

      {/* URL copiável */}
      <div className="flex items-center gap-2 bg-background rounded-xl border border-border px-3 py-2">
        <span className="text-xs text-muted-foreground flex-1 truncate font-mono">{link}</span>
        <button onClick={copiar} className="shrink-0 text-primary hover:text-primary/80 transition-colors" title="Copiar link">
          {copiado ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
        </button>
      </div>

      {/* Botões de ação */}
      <div className="grid grid-cols-3 gap-2">
        <button onClick={compartilhar}
          className="flex items-center justify-center gap-1.5 py-2.5 rounded-xl bg-primary text-white text-xs font-bold hover:bg-primary/90 transition-colors">
          <Share2 className="w-3.5 h-3.5" />Compartilhar
        </button>
        <button onClick={() => setMostrarQR(!mostrarQR)}
          className={`flex items-center justify-center gap-1.5 py-2.5 rounded-xl border text-xs font-bold transition-colors ${
            mostrarQR
              ? "bg-primary text-white border-primary"
              : "border-border text-muted-foreground hover:bg-muted"
          }`}>
          <QrCode className="w-3.5 h-3.5" />QR Code
        </button>
        <a href={link} target="_blank" rel="noopener noreferrer"
          className="flex items-center justify-center gap-1.5 py-2.5 rounded-xl border border-border text-xs font-semibold text-muted-foreground hover:bg-muted transition-colors">
          <ExternalLink className="w-3.5 h-3.5" />Visualizar
        </a>
      </div>

      {/* QR Code expandido */}
      {mostrarQR && (
        <div className="border border-border rounded-xl p-4 bg-background space-y-3">
          <div className="flex items-center justify-between">
            <p className="text-sm font-bold">QR Code do agendamento</p>
            <button onClick={() => setMostrarQR(false)} className="text-muted-foreground hover:text-foreground">
              <X className="w-4 h-4" />
            </button>
          </div>
          {qrUrl ? (
            <div className="flex flex-col items-center gap-3">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={qrUrl}
                alt="QR Code de agendamento"
                className="w-48 h-48 rounded-xl border border-border"
                onError={() => toast.error("Erro ao gerar QR Code. Verifique sua conexão.")}
              />
              <p className="text-xs text-muted-foreground text-center">
                Escaneie para agendar direto pelo celular
              </p>
              <button onClick={baixarQR}
                className="flex items-center gap-2 px-4 py-2 rounded-xl bg-primary text-white text-xs font-bold hover:bg-primary/90 transition-colors">
                <Download className="w-3.5 h-3.5" />Baixar QR Code
              </button>
            </div>
          ) : (
            <div className="w-48 h-48 mx-auto rounded-xl bg-muted flex items-center justify-center">
              <QrCode className="w-12 h-12 text-muted-foreground opacity-40" />
            </div>
          )}
        </div>
      )}

      <p className="text-xs text-muted-foreground text-center">
        💡 Cole no WhatsApp, Instagram ou imprima o QR Code para os clientes escanearem
      </p>
    </div>
  )
}
