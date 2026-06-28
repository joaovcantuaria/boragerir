// Server Component — renderizado no servidor, HTML chega ao browser já com estilos corretos
import type { Viewport } from "next"
import { AdminLayoutClient } from "@/components/admin/admin-layout-client"

// theme-color controla a cor da barra de status do Android
export const viewport: Viewport = {
  themeColor: "#111113",
}

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      {/*
        Este <style> é injetado diretamente no HTML pelo servidor.
        Ele roda ANTES de qualquer JS, garantindo que html e body
        tenham fundo escuro desde o primeiro byte — eliminando o flash branco
        na área superior do mobile (safe-area / status bar area).
        Só afeta rotas /admin.
      */}
      <style dangerouslySetInnerHTML={{ __html: `
        html, body {
          background-color: #111113 !important;
          color-scheme: dark;
        }
      `}} />
      <AdminLayoutClient>{children}</AdminLayoutClient>
    </>
  )
}
