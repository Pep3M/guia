import type { NextConfig } from "next"

const nextConfig: NextConfig = {
  reactStrictMode: true,
  // Build autocontenido para la imagen Docker (ver Dockerfile)
  output: "standalone",
  // In Next.js 16, serverComponentsExternalPackages moved to serverExternalPackages (top-level)
  serverExternalPackages: ["thread-stream", "pino"],
  experimental: {
    optimizePackageImports: [
      "lucide-react",
      "motion/react",
      "@radix-ui/react-accordion",
      "@radix-ui/react-dialog",
      "@radix-ui/react-dropdown-menu",
      "@radix-ui/react-hover-card",
      "@radix-ui/react-tabs",
      "@radix-ui/react-tooltip",
    ],
  },
  compiler: {
    removeConsole: process.env.NODE_ENV === "production" ? { exclude: ["error"] } : undefined,
  },
}

export default nextConfig
