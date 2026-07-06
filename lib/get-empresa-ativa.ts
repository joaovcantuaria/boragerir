import { cookies } from "next/headers"
import { createClient } from "@/lib/supabase/server"

/**
 * Busca a empresa ativa do usuário logado para uso em server components.
 * Lê o cookie "empresa_ativa_id" para saber qual empresa o usuário selecionou.
 * Valida que a empresa pertence ao usuário antes de retornar.
 */
export async function getEmpresaAtiva() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { user: null, empresa: null }

  const cookieStore = await cookies()
  const empresaIdCookie = cookieStore.get("empresa_ativa_id")?.value

  // Se tem cookie, buscar diretamente essa empresa (validando que pertence ao user)
  if (empresaIdCookie) {
    const { data: empresa } = await supabase
      .from("empresas")
      .select("*")
      .eq("id", empresaIdCookie)
      .eq("user_id", user.id)
      .maybeSingle()

    if (empresa) return { user, empresa }
  }

  // Fallback: buscar a primeira empresa do usuário
  const { data: empresas } = await supabase
    .from("empresas")
    .select("*")
    .eq("user_id", user.id)
    .order("created_at", { ascending: true })

  if (!empresas || empresas.length === 0) return { user, empresa: null }

  // Para plano gestão: a primeira é o container, preferir a segunda
  const isGestao = empresas[0]?.plano === "gestao"
  if (isGestao && empresas.length > 1) {
    return { user, empresa: empresas[1] }
  }

  return { user, empresa: empresas[0] }
}
