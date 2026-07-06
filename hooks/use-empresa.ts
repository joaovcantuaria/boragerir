"use client"

import { useEffect, useState, useCallback } from "react"
import { createClient } from "@/lib/supabase/client"
import type { Empresa } from "@/types"

const STORAGE_KEY = "boragerir_empresa_selecionada"
const COOKIE_KEY = "empresa_ativa_id"

function setCookie(name: string, value: string) {
  document.cookie = `${name}=${value};path=/;max-age=${60 * 60 * 24 * 365};SameSite=Lax`
}

function getCookie(name: string): string | null {
  const match = document.cookie.match(new RegExp(`(^| )${name}=([^;]+)`))
  return match ? match[2] : null
}

export function useEmpresa() {
  const [empresa, setEmpresa] = useState<Empresa | null>(null)
  const [empresas, setEmpresas] = useState<Empresa[]>([])
  const [loading, setLoading] = useState(true)
  const supabase = createClient()

  useEffect(() => {
    async function carregarEmpresas() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        setLoading(false)
        return
      }

      // Carregar todas as empresas do usuário
      const { data } = await supabase
        .from("empresas")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: true })

      const lista = data ?? []
      setEmpresas(lista)

      if (lista.length === 0) {
        setLoading(false)
        return
      }

      // Para plano gestão: a primeira empresa é o container, selecionar a segunda se existir
      const isGestao = lista[0]?.plano === "gestao"
      const empresasVisiveis = isGestao ? lista.filter((_, i) => i > 0) : lista

      if (empresasVisiveis.length > 0) {
        const salvoId = getCookie(COOKIE_KEY) || localStorage.getItem(STORAGE_KEY)
        const salva = empresasVisiveis.find((e) => e.id === salvoId)
        const selecionada = salva ?? empresasVisiveis[0]
        setEmpresa(selecionada)
        // Garantir que cookie está sincronizado
        setCookie(COOKIE_KEY, selecionada.id)
      } else {
        // Gestão sem empresas reais ainda — usar o container pra não quebrar
        setEmpresa(lista[0])
        setCookie(COOKIE_KEY, lista[0].id)
      }

      setLoading(false)
    }

    carregarEmpresas()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const selecionarEmpresa = useCallback((id: string) => {
    const allEmpresas = empresas
    const found = allEmpresas.find((e) => e.id === id)
    if (found) {
      setEmpresa(found)
      localStorage.setItem(STORAGE_KEY, id)
      setCookie(COOKIE_KEY, id)
    }
  }, [empresas])

  // Para plano gestão, excluir o container da lista visível
  const isGestao = empresas[0]?.plano === "gestao"
  const empresasVisiveis = isGestao ? empresas.filter((_, i) => i > 0) : empresas

  // Limite de empresas (pega do campo max_empresas da primeira empresa ou default 1)
  const maxEmpresas = empresas[0]?.max_empresas ?? 1

  return { empresa, empresas: empresasVisiveis, loading, selecionarEmpresa, maxEmpresas }
}
