import type { Viewport } from "next"
import { AdminLayoutClient } from "@/components/admin/admin-layout-client"

export const viewport: Viewport = {
  themeColor: "#111113",
}

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      {/* 
        Estilos injetados pelo servidor — garantem fundo escuro
        ANTES do React hidratar. Sem isso o browser pinta branco
        enquanto o JS carrega, causando o flash.
        
        O seletor [data-admin] é específico o suficiente para não vazar
        para outras partes do site.
      */}
      <style>{`
        /* Garante fundo escuro em toda a área do admin incluindo safe-area mobile */
        html { background-color: #0d0d0f !important; }
        body { background-color: #0d0d0f !important; }
        
        /* Header do admin sempre escuro até o React hidratar */
        header[data-admin-header] {
          background-color: #111113 !important;
        }
      `}</style>
      <AdminLayoutClient>{children}</AdminLayoutClient>
    </>
  )
}
