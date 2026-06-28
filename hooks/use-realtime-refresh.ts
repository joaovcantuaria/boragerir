"use client"

import { useState, useEffect, useRef } from "react"
import { useRouter } from "next/navigation"
import { createClient } from "@/lib/supabase/client"

export function useRealtimeRefresh(empresaId: string | null | undefined) {
  const router = useRouter()
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const [mounted, setMounted] = useState(false)

  useEffect(() => { setMounted(true) }, [])

  useEffect(() => {
    if (!mounted || !empresaId) return

    const supabase = createClient()

    function scheduleRefresh() {
      if (timerRef.current) clearTimeout(timerRef.current)
      timerRef.current = setTimeout(() => router.refresh(), 800)
    }

    const tabelas = [
      "vendas", "agendamentos", "clientes",
      "movimentacoes_caixa", "caixas",
      "produtos_servicos", "funcionarios", "debitos_clientes",
    ]

    const canais = tabelas.map((tabela) =>
      supabase
        .channel(`realtime:${tabela}:${empresaId}`)
        .on("postgres_changes", {
          event: "*",
          schema: "public",
          table: tabela,
          filter: `empresa_id=eq.${empresaId}`,
        }, scheduleRefresh)
        .subscribe()
    )

    return () => {
      canais.forEach((c) => supabase.removeChannel(c))
      if (timerRef.current) clearTimeout(timerRef.current)
    }
  }, [mounted, empresaId])
}
