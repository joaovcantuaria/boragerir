"use client"

import { useEffect, useState } from "react"
import { createClient } from "@/lib/supabase/client"
import type { Empresa } from "@/types"

export function useEmpresa() {
  const [empresa, setEmpresa] = useState<Empresa | null>(null)
  const [loading, setLoading] = useState(true)
  const supabase = createClient()

  useEffect(() => {
    async function carregarEmpresa() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        setLoading(false)
        return
      }
      const { data } = await supabase
        .from("empresas")
        .select("*")
        .eq("user_id", user.id)
        .single()

      setEmpresa(data)
      setLoading(false)
    }

    carregarEmpresa()
  }, [])

  return { empresa, loading }
}
