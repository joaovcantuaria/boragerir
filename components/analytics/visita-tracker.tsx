"use client"

import { useEffect } from "react"

/**
 * Registra uma visita silenciosamente.
 * Não renderiza nada — apenas dispara o tracking.
 */
export function VisitaTracker({ pagina }: { pagina: "site" | "login" | "cadastro" }) {
  useEffect(() => {
    fetch("/api/analytics/visita", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ pagina }),
    }).catch(() => {})
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])
  return null
}
