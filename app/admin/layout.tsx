// Server Component wrapper — exporta viewport para controlar
// a cor da barra de status mobile no painel admin
import type { Viewport } from "next"
import { AdminLayoutClient } from "@/components/admin/admin-layout-client"

// Força a barra de status do Android/iOS para escuro no admin
// Isso é renderizado no servidor ANTES do JS chegar no browser
export const viewport: Viewport = {
  themeColor: "#111113",
}

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return <AdminLayoutClient>{children}</AdminLayoutClient>
}
