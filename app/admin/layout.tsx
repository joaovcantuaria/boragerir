import type { Viewport } from "next"
import { AdminLayoutClient } from "@/components/admin/admin-layout-client"

export const viewport: Viewport = {
  themeColor: "#111113",
}

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return <AdminLayoutClient>{children}</AdminLayoutClient>
}
