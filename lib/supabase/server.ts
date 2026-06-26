import { createServerClient } from "@supabase/ssr"
import { cookies } from "next/headers"
import type { Database } from "@/types/database"

// Cliente Supabase para uso no servidor (Server Components, API Routes)
export async function createClient() {
  const cookieStore = await cookies()
  // Guard para SSR/build sem variáveis configuradas
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "https://placeholder.supabase.co"
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "placeholder"

  return createServerClient<Database>(url, key, {
      cookies: {
        getAll() {
          return cookieStore.getAll()
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            )
          } catch {
            // Ignorado em Server Components (sem capacidade de setar cookies)
          }
        },
      },
    }
  )
}
