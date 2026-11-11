import type { SupabaseClient, User } from "@supabase/supabase-js"

/**
 * Busca um usuário do Supabase Auth pelo e-mail percorrendo TODAS as páginas.
 * (listUsers() sem parâmetros só devolve os primeiros 50 — quem estava depois
 *  disso "não existia" para recuperar senha, redefinir senha e login.)
 */
export async function buscarUsuarioPorEmail(admin: SupabaseClient, email: string): Promise<User | null> {
  const alvo = email.trim().toLowerCase()
  if (!alvo) return null
  const porPagina = 1000
  for (let pagina = 1; pagina <= 100; pagina++) {
    const { data, error } = await admin.auth.admin.listUsers({ page: pagina, perPage: porPagina })
    if (error) throw error
    const usuarios = data?.users ?? []
    const achado = usuarios.find((u) => u.email?.toLowerCase() === alvo)
    if (achado) return achado
    if (usuarios.length < porPagina) return null
  }
  return null
}
