import type { Metadata, Viewport } from "next"
import { Inter } from "next/font/google"
import Script from "next/script"
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
    { media: "(prefers-color-scheme: dark)", color: "#0a0b0f" },
  ],
  width: "device-width", initialScale: 1, maximumScale: 1,
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR" suppressHydrationWarning>
      <head>
        {/* Impede que browsers forcam dark mode na pagina — Opera, Chrome flag, etc */}
        <meta name="color-scheme" content="light only" />
        <link rel="icon" href="/favicon.svg" type="image/svg+xml" />
        <link rel="icon" href="/logo-icon.png" type="image/png" />
        <link rel="apple-touch-icon" href="/logo-icon.png" />
        {/* theme-color para barra de status mobile — dark mode escuro, light mode branco */}
        <meta name="theme-color" content="#ffffff" media="(prefers-color-scheme: light)" />
        <meta name="theme-color" content="#0a0b0f" media="(prefers-color-scheme: dark)" />
        <script src="https://sdk.mercadopago.com/js/v2" async></script>
      </head>
      <body className={`${inter.variable} font-sans antialiased`} suppressHydrationWarning>
        {/* Meta Pixel Code */}
        <Script id="meta-pixel" strategy="afterInteractive">{`
          !function(f,b,e,v,n,t,s)
          {if(f.fbq)return;n=f.fbq=function(){n.callMethod?
          n.callMethod.apply(n,arguments):n.queue.push(arguments)};
          if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';
          n.queue=[];t=b.createElement(e);t.async=!0;
          t.src=v;s=b.getElementsByTagName(e)[0];
          s.parentNode.insertBefore(t,s)}(window, document,'script',
          'https://connect.facebook.net/en_US/fbevents.js');
          fbq('init', '1094360926583632');
          fbq('track', 'PageView');
        `}</Script>
        <noscript><img height="1" width="1" style={{display:'none'}} src="https://www.facebook.com/tr?id=1094360926583632&ev=PageView&noscript=1" /></noscript>
        <ThemeProvider
          attribute="class"
          defaultTheme="light"
          enableSystem={false}
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
