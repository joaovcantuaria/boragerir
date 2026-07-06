import { createClient } from "@/lib/supabase/server"
import { TarefasClient } from "@/components/tarefas/tarefas-client"
import { redirect } from "next/navigation"
import Link from "next/link"

export const dynamic = "force-dynamic"
export const metadata = { title: "Tarefas" }

export default async function TarefasPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect("/login")

  const { data: empresas } = await supabase
    .from("empresas").select("id, plano, plano_ativo").eq("user_id", user.id).order("created_at", { ascending: true })
  const empresa = empresas?.[0] ?? null
  if (!empresa) redirect("/onboarding")

  // Tarefas disponível apenas nos planos pagos: agenda, basico, profissional
  const planosComTarefas = ["agenda", "basico", "profissional"]
  if (!planosComTarefas.includes(empresa.plano) || !empresa.plano_ativo) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-6 text-center px-4">
        <div className="w-16 h-16 rounded-2xl bg-muted flex items-center justify-center text-3xl">📋</div>
        <div>
          <h2 className="text-2xl font-black">Módulo Tarefas</h2>
          <p className="text-muted-foreground mt-2 max-w-sm">
            O módulo de Tarefas está disponível a partir dos planos pagos <strong>Agenda</strong>, <strong>Básico</strong> e <strong>Profissional</strong>.
          </p>
        </div>
        <Link href="/planos"
          className="px-6 py-3 rounded-xl font-bold text-white text-sm hover:opacity-90 transition-opacity"
          style={{ backgroundColor: "#F26E1D" }}>
          Ver planos →
        </Link>
      </div>
    )
  }

  const [{ data: blocos }, { data: tarefas }] = await Promise.all([
    supabase
      .from("blocos_tarefas")
      .select("*")
      .eq("empresa_id", empresa.id)
      .order("posicao", { ascending: true }),
    supabase
      .from("tarefas")
      .select("*")
      .eq("empresa_id", empresa.id)
      .order("posicao", { ascending: true }),
  ])

  return (
    <TarefasClient
      empresaId={empresa.id}
      blocosInit={blocos ?? []}
      tarefasInit={tarefas ?? []}
    />
  )
}
