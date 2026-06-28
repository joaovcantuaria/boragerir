import type { Metadata, Viewport } from "next"
import { Inter } from "next/font/google"
import { ThemeProvider } from "@/components/providers/theme-provider"
import { Toaster } from "sonner"
import "./globals.css"

const inter = Inter({ subsets: ["latin"], variable: "--font-inter", display: "swap" })

export const metadata: Metadata = {
  title: { default: "Bora Gerir", template: "%s | Bora Gerir" },
  description: "Gestão simples. Resultado de verdade. Sistema completo para salões, barbearias e pequenos negócios.",
  keywords: ["gestão", "salão de beleza", "barbearia", "caixa", "agendamento", "SaaS"],
  manifest: "/manifest.json",
  icons: {
    icon: [
      { url: "/favicon.svg", type: "image/svg+xml" },
      { url: "/logo-icon.png", type: "image/png" },
    ],
    apple: [
      { url: "/logo-icon.png", type: "image/png" },
    ],
    shortcut: "/favicon.svg",
  },
  appleWebApp: { capable: true, statusBarStyle: "default", title: "Bora Gerir" },
  openGraph: {
    type: "website", locale: "pt_BR",
    title: "Bora Gerir — Gestão simples. Resultado de verdade.",
    siteName: "Bora Gerir",
    images: [{ url: "/logo-icon.png" }],
  },
}

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#ffffff" },
    { media: "(prefers-color-scheme: dark)", color: "#141414" },
  ],
  width: "device-width", initialScale: 1, maximumScale: 1,
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR" suppressHydrationWarning>
      <head>
        <link rel="icon" href="/favicon.svg" type="image/svg+xml" />
        <link rel="icon" href="/logo-icon.png" type="image/png" />
        <link rel="apple-touch-icon" href="/logo-icon.png" />
        <script src="https://sdk.mercadopago.com/js/v2" async></script>
      </head>
      <body className={`${inter.variable} font-sans antialiased`} suppressHydrationWarning>
        <ThemeProvider
          attribute="class"
          defaultTheme="light"
          enableSystem
          disableTransitionOnChange
          nonce=""
        >
          {children}
          <Toaster
            richColors
            position="top-right"
            toastOptions={{ duration: 4000 }}
          />
        </ThemeProvider>
      </body>
    </html>
  )
}
