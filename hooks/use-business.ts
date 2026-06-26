"use client"

import { useState, useEffect } from "react"
import { useSupabase } from "@/hooks/use-supabase"
import type { Business } from "@/types"

export function useBusiness(businessId?: string) {
  const supabase = useSupabase()
  const [business, setBusiness] = useState<Business | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)

  useEffect(() => {
    if (!businessId) {
      setLoading(false)
      return
    }

    async function fetchBusiness() {
      try {
        setLoading(true)
        const { data, error } = await supabase
          .from("businesses")
          .select("*")
          .eq("id", businessId)
          .single()

        if (error) throw error
        setBusiness(data as unknown as Business)
      } catch (err) {
        setError(err instanceof Error ? err : new Error("Unknown error"))
      } finally {
        setLoading(false)
      }
    }

    fetchBusiness()
  }, [supabase, businessId])

  return { business, loading, error }
}
