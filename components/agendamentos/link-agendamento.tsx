"use client"

import { useState } from "react"
import { Link2, Copy, Check, ExternalLink, Share2 } from "lucide-react"
import { toast } from "sonner"
import { APP_CONFIG } from "@/lib/utils"

interface LinkAgendamentoProps {
  empresaSlug: string | null
  empresaId: string
  plano: string
}

export function LinkAgendamento({ empresaSlug, empresaId, plano }: LinkAgendamentoProps) {
  const [copiado, setCopiado] = useState(false)

  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "https://app.boragerir.com"
  const link = empresaSlug
    ? `${appUrl}/agendar/${empresaSlug}`
    : null

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
      navigator.share({
        title: "Faça seu agendamento",
        text: "Agende online de forma rápida e fácil!",
        url: link,
      })
    } else {
      copiar()
    }
  }

  if (plano === "gratuito") {
    return (
      <div className="p-4 rounded-2xl border border-dashed border-border bg-muted/40 text-center">
        <Link2 className="w-8 h-8 mx-auto mb-2 text-muted-foreground opacity-40" />
        <p className="text-sm font-semibold text-foreground">Agendamento online</p>
        <p className="text-xs text-muted-foreground mt-1">
          Disponível a partir do Plano Básico.
        </p>
        <a href="/planos"
          className="mt-3 inline-block text-xs text-primary font-bold hover:underline">
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
      <div className="flex items-center gap-2">
        <div className="w-8 h-8 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
          <Link2 className="w-4 h-4 text-primary" />
        </div>
        <div>
          <p className="text-sm font-bold text-foreground">Seu link de agendamento</p>
          <p className="text-xs text-muted-foreground">Compartilhe com seus clientes</p>
        </div>
      </div>

      {/* URL */}
      <div className="flex items-center gap-2 bg-background rounded-xl border border-border px-3 py-2">
        <span className="text-xs text-muted-foreground flex-1 truncate font-mono">{link}</span>
        <button onClick={copiar}
          className="shrink-0 text-primary hover:text-primary/80 transition-colors">
          {copiado ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
        </button>
      </div>

      {/* Ações */}
      <div className="flex gap-2">
        <button onClick={compartilhar}
          className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl bg-primary text-white text-sm font-bold hover:bg-primary/90 transition-colors">
          <Share2 className="w-4 h-4" />
          Compartilhar
        </button>
        <a href={link} target="_blank" rel="noopener noreferrer"
          className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl border border-border text-sm font-semibold text-muted-foreground hover:bg-muted transition-colors">
          <ExternalLink className="w-4 h-4" />
          Visualizar
        </a>
      </div>

      {/* QR Code hint */}
      <p className="text-xs text-muted-foreground text-center">
        💡 Cole no WhatsApp, Instagram ou imprima o QR Code para os clientes escanearem
      </p>
    </div>
  )
}
