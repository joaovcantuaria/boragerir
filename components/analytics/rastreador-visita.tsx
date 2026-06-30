"use client"

import { useRastrearVisita } from "@/hooks/use-rastrear-visita"

export function RastreadorVisita({ pagina }: { pagina: "site" | "login" | "cadastro" }) {
  useRastrearVisita(pagina)
  return null // não renderiza nada
}
