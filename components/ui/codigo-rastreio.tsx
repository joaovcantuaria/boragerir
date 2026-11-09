"use client"

import { Fingerprint } from "lucide-react"
import { toast } from "sonner"
import { cn } from "@/lib/utils"

/** Código de rastreio da operação financeira (clique copia). */
export function CodigoRastreio({ codigo, className }: { codigo?: string | null; className?: string }) {
  if (!codigo) return null
  return (
    <button
      type="button"
      title="Código de rastreio — clique para copiar"
      onClick={(e) => {
        e.stopPropagation()
        navigator.clipboard?.writeText(codigo).then(
          () => toast.success(`Código ${codigo} copiado`),
          () => toast.error("Não foi possível copiar"),
        )
      }}
      className={cn(
        "inline-flex items-center gap-1 font-mono text-[10px] tracking-tight text-muted-foreground hover:text-primary transition-colors",
        className,
      )}
    >
      <Fingerprint className="w-3 h-3 shrink-0" />
      {codigo}
    </button>
  )
}
