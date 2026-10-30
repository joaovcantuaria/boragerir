import { NextResponse } from "next/server"
import type { User } from "@supabase/supabase-js"
import { createClient } from "@/lib/supabase/server"
import { createAdminClient } from "@/lib/supabase/admin"

export type PerfilAdmin = "super_admin" | "quase_admin" | "vendas" | "atendimento"

type ResultadoAdmin =
  | { ok: true; user: User; perfil: PerfilAdmin }
  | { ok: false; resposta: NextResponse }

// Perfil do admin ativo com esse email, ou null se não for admin (ou estiver inativo).
export async function buscarPerfilAdmin(email: string): Promise<PerfilAdmin | null> {
  const { data } = await createAdminClient()
    .from("usuarios_admin")
    .select("perfil, ativo")
    .eq("email", email)
    .maybeSingle()
  return data?.ativo ? (data.perfil as PerfilAdmin) : null
}

// Verifica se o usuário logado está ativo em usuarios_admin.
// Sem `perfis`, aceita qualquer admin ativo; com `perfis`, exige um deles.
// Uso nas rotas: const auth = await exigirAdmin(["super_admin"]); if (!auth.ok) return auth.resposta
export async function exigirAdmin(perfis?: PerfilAdmin[]): Promise<ResultadoAdmin> {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user?.email) {
      return { ok: false, resposta: NextResponse.json({ erro: "Não autenticado" }, { status: 401 }) }
    }

    const perfil = await buscarPerfilAdmin(user.email)
    if (!perfil || (perfis && !perfis.includes(perfil))) {
      return { ok: false, resposta: NextResponse.json({ erro: "Sem permissão" }, { status: 403 }) }
    }

    return { ok: true, user, perfil }
  } catch {
    return { ok: false, resposta: NextResponse.json({ erro: "Erro ao verificar permissão" }, { status: 500 }) }
  }
}
