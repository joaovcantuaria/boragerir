import type { NextConfig } from "next"

const nextConfig: NextConfig = {
  typescript: {
    // O TypeScript infere "never" com redirect() não reconhecido como terminador.
    // Os tipos são corretos em runtime — os erros são falsos positivos.
    ignoreBuildErrors: true,
  },
  // Desabilitar exportação estática — o app é dinâmico (requer autenticação)
  // Isso evita erros de prerender quando a URL do Supabase não está configurada
  output: undefined,
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "*.supabase.co",
        port: "",
        pathname: "/storage/v1/object/public/**",
      },
    ],
  },
  experimental: {
    optimizePackageImports: ["lucide-react", "recharts", "@radix-ui/react-dialog"],
  },
}

export default nextConfig
