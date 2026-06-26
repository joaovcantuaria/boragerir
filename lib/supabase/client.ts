import { createBrowserClient } from "@supabase/ssr"
import type { Database } from "@/types/database"

// Cliente Supabase para uso no browser (Client Components)
export function createClient() {
  // Guard para evitar erro durante SSR/build sem variáveis configuradas
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "https://placeholder.supabase.co"
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "placeholder"
  return createBrowserClient<Database>(url, key)
}
