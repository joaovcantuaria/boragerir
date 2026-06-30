"use client"

import { useEffect } from "react"

/**
 * Registra uma visita silenciosamente.
 * pagina: "site" | "login" | "cadastro"
 */
export function useRastrearVisita(pagina: "site" | "login" | "cadastro") {
  useEffect(() => {
    // Fire-and-forget — nunca bloqueia o carregamento
    fetch("/api/analytics/visita", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ pagina }),
    }).catch(() => {})
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])
}
