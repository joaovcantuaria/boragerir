import { createClient } from "@supabase/supabase-js"

// Cliente com service role — acesso total ao banco (sem RLS)
// Usado apenas nas rotas /admin — NUNCA expor no frontend
export function createAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!
  // Tenta service role primeiro, cai na anon se não tiver (acesso limitado)
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
    ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

  return createClient(url, key, {
    auth: { autoRefreshToken: false, persistSession: false },
  })
}
