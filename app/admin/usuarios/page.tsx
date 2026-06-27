import { createAdminClient } from "@/lib/supabase/admin"
import { UsuariosAdminClient } from "@/components/admin/usuarios-admin-client"

export const dynamic = "force-dynamic"
export const metadata = { title: "Usuários Admin — Bora Gerir" }

export default async function UsuariosAdminPage() {
  const supabase = createAdminClient()
  const { data: usuarios } = await supabase
    .from("usuarios_admin")
    .select("*")
    .order("created_at", { ascending: false })

  return <UsuariosAdminClient usuarios={usuarios ?? []} />
}
