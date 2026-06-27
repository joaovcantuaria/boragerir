"use client"

import Image from "next/image"
import { AnimatePresence, motion } from "framer-motion"

// ─── Só o ícone (quadrado) ───────────────────────────────────
export function LogoIcon({ size = 36, className = "", forceLight = false }: { size?: number; className?: string; forceLight?: boolean }) {
  return (
    <div className={`relative shrink-0 ${className}`} style={{ width: size, height: size }}>
      {/* SVG inline — funciona em qualquer fundo */}
      <svg
        viewBox="0 0 40 40"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        width={size}
        height={size}
      >
        {/* Fundo quadrado arredondado laranja */}
        <rect width="40" height="40" rx="10" fill="#F26E1D" />
        {/* Letra B em branco */}
        <text
          x="20"
          y="28"
          textAnchor="middle"
          fontFamily="Arial, sans-serif"
          fontWeight="900"
          fontSize="24"
          fill="white"
        >
          B
        </text>
      </svg>
    </div>
  )
}

// ─── Sidebar: ícone + nome animado ──────────────────────────
export function LogoBG({ collapsed }: { collapsed?: boolean }) {
  return (
    <div className="flex items-center gap-2.5">
      <LogoIcon size={34} />
      <AnimatePresence>
        {!collapsed && (
          <motion.div
            initial={{ opacity: 0, x: -8 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -8 }}
            transition={{ duration: 0.13 }}
            className="flex items-baseline gap-0.5"
          >
            <span className="font-black text-xl text-foreground leading-none">Bora</span>
            <span className="font-black text-xl text-primary leading-none">Gerir</span>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

// ─── Logo horizontal completa (login, onboarding) ───────────
// Usa logo-full.png se existir, senão usa ícone + texto
export function LogoFull({ height = 52, className = "" }: { height?: number; className?: string }) {
  return (
    <div className={`relative ${className}`} style={{ height, width: "auto", minWidth: height * 3.2 }}>
      <Image
        src="/logo-full.png"
        alt="Bora Gerir"
        fill
        className="object-contain object-left"
        priority
      />
    </div>
  )
}

// ─── Versão texto (fallback se não tiver logo-full) ──────────
export function LogoText({ className = "" }: { className?: string }) {
  return (
    <div className={`flex items-center gap-3 ${className}`}>
      <LogoIcon size={44} />
      <div className="flex items-baseline gap-1">
        <span className="font-black text-3xl text-foreground leading-none">Bora</span>
        <span className="font-black text-3xl text-primary leading-none">Gerir</span>
      </div>
    </div>
  )
}
