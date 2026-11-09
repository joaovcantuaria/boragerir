import { redirect } from "next/navigation"
import { createClient } from "@/lib/supabase/server"
import { getEmpresaAtiva } from "@/lib/get-empresa-ativa"
import { CAMPOS_FORNECEDOR, TOTAIS_VAZIOS, somarContasPorFornecedor } from "@/lib/fornecedores"
import { FornecedoresClient, type FornecedorLista } from "@/components/fornecedores/fornecedores-client"

export const dynamic = "force-dynamic"
export const metadata = { title: "Fornecedores" }

export default async function FornecedoresPage() {
  const { user, empresa } = await getEmpresaAtiva()
  if (!user) redirect("/login")
  if (!empresa) redirect("/onboarding")

  const supabase = await createClient()
  let fornecedores: FornecedorLista[] = []
  let tabelaPronta = true
  const [{ data, error }, { data: contas }] = await Promise.all([
    supabase.from("fornecedores").select(CAMPOS_FORNECEDOR).eq("empresa_id", empresa.id).order("nome"),
    supabase.from("contas_pagar").select("fornecedor_id, valor, status, data_vencimento")
      .eq("empresa_id", empresa.id).not("fornecedor_id", "is", null).limit(5000),
  ])
  if (error) tabelaPronta = false // migration ainda não aplicada
  else {
    const totais = somarContasPorFornecedor(contas ?? [])
    fornecedores = (data ?? []).map((f) => ({ ...f, ...(totais.get(f.id) ?? TOTAIS_VAZIOS) }))
  }

  return <FornecedoresClient fornecedoresIniciais={fornecedores} tabelaPronta={tabelaPronta} />
}
