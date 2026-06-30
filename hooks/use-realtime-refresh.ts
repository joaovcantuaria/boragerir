"use client"

import { useState, useEffect, useRef } from "react"
import { useRouter, usePathname } from "next/navigation"
import { createClient } from "@/lib/supabase/client"

// Rotas onde o refresh automático causa problemas (têm estado local gerenciado)
const ROTAS_SEM_REFRESH = ["/venda", "/caixa", "/agendamentos", "/tarefas", "/contratos"]

export function useRealtimeRefresh(empresaId: string | null | undefined) {
  const router = useRouter()
  const pathname = usePathname()
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const [mounted, setMounted] = useState(false)

  useEffect(() => { setMounted(true) }, [])

  useEffect(() => {
    if (!mounted || !empresaId) return

    const supabase = createClient()

    function scheduleRefresh() {
      // Não faz refresh em rotas que gerenciam estado local —
      // evita o flash/reset da tela durante operações
      if (ROTAS_SEM_REFRESH.some((r) => pathname.startsWith(r))) return

      if (timerRef.current) clearTimeout(timerRef.current)
      // 800ms de debounce — aguarda estabilizar antes de refrescar
      timerRef.current = setTimeout(() => router.refresh(), 800)
    }

    const tabelas = [
      "vendas", "agendamentos", "clientes", "movimentacoes_caixa",
      "caixas", "produtos_servicos", "funcionarios", "debitos_clientes",
      "orcamentos", "tarefas", "contratos", "contratos_parcelas", "agenda_config",
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
  }, [mounted, empresaId, pathname])
}
