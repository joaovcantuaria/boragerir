import { redirect } from "next/navigation"
import { createClient } from "@/lib/supabase/server"
import { LandingPage } from "@/components/landing/landing-page"
import { headers } from "next/headers"

export const metadata = {
  title: "Bora Gerir — Gestão simples para pequenos negócios",
  description: "Caixa, agendamentos, clientes, vendas e relatórios em um só lugar. Comece grátis hoje.",
}

export default async function HomePage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  // Detectar o domínio atual
  const headersList = await headers()
  const host = headersList.get("host") ?? ""
  const isAppDomain = host.startsWith("app.")

  if (user) {
    const { data: empresa } = await supabase
      .from("empresas").select("id").eq("user_id", user.id).single()
    redirect(empresa ? "/dashboard" : "/onboarding")
  }

  // Se acessou pelo app.boragerir.com → vai pro login
  if (isAppDomain) {
    redirect("/login")
  }

  // Se acessou pelo boragerir.com ou www.boragerir.com → landing page
  return <LandingPage />
}
