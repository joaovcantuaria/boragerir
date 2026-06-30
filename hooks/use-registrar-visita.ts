"use client"

import { useEffect } from "react"

export function useRegistrarVisita(pagina: string) {
  useEffect(() => {
    // Fire-and-forget — nunca bloqueia o carregamento
    fetch("/api/analytics/visita", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ pagina }),
    }).catch(() => {})
  }, [pagina])
}
