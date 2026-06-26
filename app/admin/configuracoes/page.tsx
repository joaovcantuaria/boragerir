import { createAdminClient } from "@/lib/supabase/admin"
import { AdminConfiguracoesClient } from "@/components/admin/admin-configuracoes-client"

export const dynamic = "force-dynamic"
export const metadata = { title: "Configurações — Admin" }

export default async function AdminConfiguracoesPage() {
  const supabase = createAdminClient()

  const { data: configs } = await supabase
    .from("configuracoes_sistema")
    .select("*")

  const planos = configs?.find((c) => c.chave === "planos")?.valor ?? {}
  const appConfig = configs?.find((c) => c.chave === "app_config")?.valor ?? {}

  return <AdminConfiguracoesClient planos={planos} appConfig={appConfig} />
}
