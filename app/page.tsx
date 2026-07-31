import { redirect } from "next/navigation"
import { createClient } from "@/lib/supabase/server"
import { LandingPage } from "@/components/landing/landing-page"
import { VisitaTracker } from "@/components/analytics/visita-tracker"

export const metadata = {
  title: "Bora Gerir — Gestão simples para pequenos negócios",
  description: "Caixa, agendamentos, clientes, vendas e relatórios em um só lugar. Comece grátis hoje.",
}

export default async function HomePage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (user) {
    const { data: empresa } = await supabase
      .from("empresas").select("id").eq("user_id", user.id).single()
    redirect(empresa ? "/dashboard" : "/onboarding")
  }

  // Visitante não logado → landing page
  return (
    <>
      <VisitaTracker pagina="site" />
      <LandingPage />
    </>
  )
}
