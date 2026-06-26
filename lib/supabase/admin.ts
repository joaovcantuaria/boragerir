import { createClient } from "@supabase/supabase-js"

export function createAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  if (!url) throw new Error("NEXT_PUBLIC_SUPABASE_URL não configurada")

  // Usa service role se disponível, senão usa anon key
  const key = serviceKey ?? anonKey
  if (!key) throw new Error("Nenhuma chave Supabase configurada")

  return createClient(url, key, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  })
}
