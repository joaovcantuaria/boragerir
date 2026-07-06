import { createAdminClient } from "@/lib/supabase/admin"
import { AdminEmpresaDetalhe } from "@/components/admin/admin-empresa-detalhe"
import { notFound } from "next/navigation"

export const dynamic = "force-dynamic"

export default async function AdminEmpresaDetalhePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = createAdminClient()

  const [{ data: empresa }, { data: assinaturas }, { data: notas }, { data: tickets }] =
    await Promise.all([
      supabase.from("empresas").select("*").eq("id", id).single(),
      supabase.from("assinaturas").select("id, plano, periodicidade, status, valor_total, forma_pagamento, created_at, data_fim").eq("empresa_id", id).order("created_at", { ascending: false }),
      supabase.from("notas_admin").select("*").eq("empresa_id", id).order("created_at", { ascending: false }),
      supabase.from("tickets_suporte").select("*").eq("empresa_id", id).order("created_at", { ascending: false }),
    ])

  if (!empresa) notFound()

  // Buscar sub-empresas do mesmo user_id (dependentes)
  const { data: subEmpresas } = await supabase
    .from("empresas")
    .select("*")
    .eq("user_id", empresa.user_id)
    .neq("id", id)
    .order("created_at", { ascending: true })

  return <AdminEmpresaDetalhe empresa={empresa} assinaturas={assinaturas ?? []} notas={notas ?? []} tickets={tickets ?? []} subEmpresas={subEmpresas ?? []} />
}
