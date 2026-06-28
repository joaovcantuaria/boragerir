import type { Viewport } from "next"
import { AdminLayoutClient } from "@/components/admin/admin-layout-client"

export const viewport: Viewport = {
  themeColor: "#111113",
}

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <style>{`
        /* Header escuro por padrão — o JS sobrescreve para branco quando modoClaro=true */
        header[data-admin-header] {
          background-color: #111113;
        }
      `}</style>
      <AdminLayoutClient>{children}</AdminLayoutClient>
    </>
  )
}
