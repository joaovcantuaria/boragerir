import { createClient } from "@supabase/supabase-js"

export function createAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!url) throw new Error("NEXT_PUBLIC_SUPABASE_URL não configurada")
  // Nunca faz fallback para anon key — service role é obrigatória para operações admin
  if (!serviceKey) throw new Error("SUPABASE_SERVICE_ROLE_KEY não configurada")

  return createClient(url, serviceKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  })
}
