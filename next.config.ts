import type { NextConfig } from "next"

const nextConfig: NextConfig = {
  typescript: { ignoreBuildErrors: true },

  // Otimização de imports — reduz o tamanho do bundle JS carregando só o que é usado
  experimental: {
    optimizePackageImports: [
      "lucide-react",
      "recharts",
      "date-fns",
      "framer-motion",
      "@radix-ui/react-dialog",
      "@radix-ui/react-dropdown-menu",
      "@radix-ui/react-select",
      "@radix-ui/react-tabs",
      "@radix-ui/react-popover",
      "@dnd-kit/core",
      "@dnd-kit/sortable",
    ],
  },

  // Compressão gzip das respostas
  compress: true,

  // Remove o header "X-Powered-By: Next.js" (menor overhead + segurança)
  poweredByHeader: false,

  // Otimização de imagens
  images: {
    formats: ["image/avif", "image/webp"],
    remotePatterns: [
      {
        protocol: "https",
        hostname: "*.supabase.co",
        pathname: "/storage/v1/object/public/**",
      },
      {
        protocol: "https",
        hostname: "api.qrserver.com",
      },
      {
        protocol: "https",
        hostname: "storage.googleapis.com",
      },
    ],
  },
}

export default nextConfig
