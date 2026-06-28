"use client"

import { useEffect, useRef } from "react"
import { useRouter } from "next/navigation"
import { createClient } from "@/lib/supabase/client"

/**
 * Hook que escuta mudanças em tempo real nas tabelas críticas do Supabase
 * e chama router.refresh() automaticamente para recarregar os dados do servidor.
 *
 * Funciona com Next.js App Router: refresh() re-executa os Server Components
 * sem recarregar a página inteira — apenas os dados são atualizados.
 */
export function useRealtimeRefresh(empresaId: string | null | undefined) {
  const router = useRouter()
  const supabase = createClient()
  // Debounce: evita múltiplos refreshes em cascata
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  function scheduleRefresh() {
    if (timerRef.current) clearTimeout(timerRef.current)
    timerRef.current = setTimeout(() => {
      router.refresh()
    }, 600)
  }

  useEffect(() => {
    if (!empresaId) return

    // Tabelas que disparam refresh quando há mudanças
    const tabelas = [
      "vendas",
      "agendamentos",
      "clientes",
      "movimentacoes_caixa",
      "caixas",
      "produtos_servicos",
      "funcionarios",
      "debitos_clientes",
      "contas_pagar",
    ]

    const canais = tabelas.map((tabela) =>
      supabase
        .channel(`realtime:${tabela}:${empresaId}`)
        .on(
          "postgres_changes",
          {
            event: "*", // INSERT, UPDATE, DELETE
            schema: "public",
            table: tabela,
            filter: `empresa_id=eq.${empresaId}`,
          },
          () => scheduleRefresh()
        )
        .subscribe()
    )

    return () => {
      canais.forEach((canal) => supabase.removeChannel(canal))
      if (timerRef.current) clearTimeout(timerRef.current)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [empresaId])
}
