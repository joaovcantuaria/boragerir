"use client"

import { createContext, useContext } from "react"

// Tokens visuais para cada modo
const tokensEscuro = {
  // Backgrounds
  pageBg:      "bg-[#0d0d0f]",
  cardBg:      "bg-[#1a1a1a]",
  inputBg:     "bg-[#1a1a1a]",
  hoverBg:     "hover:bg-white/[0.03]",
  hoverBgBtn:  "hover:bg-white/10",
  // Borders
  border:      "border-white/10",
  borderLight: "border-white/5",
  // Textos
  text:        "text-white",
  textMuted:   "text-white/40",
  textMuted2:  "text-white/30",
  textMuted3:  "text-white/50",
  textMuted4:  "text-white/60",
  textMuted5:  "text-white/20",
  textMuted6:  "text-white/70",
  // Inputs
  inputText:   "text-white placeholder:text-white/30",
  inputBorder: "border-white/10 focus:border-primary",
  // Filtros inativos
  filterInativo: "bg-white/5 text-white/50 hover:bg-white/10",
  // Misc
  rowHover:    "hover:bg-white/[0.02]",
  subBg:       "bg-white/5",
  subBg2:      "bg-white/[0.03]",
  subBorder:   "border-white/[0.06]",
}

const tokensClaro = {
  pageBg:      "bg-gray-50",
  cardBg:      "bg-white",
  inputBg:     "bg-white",
  hoverBg:     "hover:bg-gray-50",
  hoverBgBtn:  "hover:bg-gray-100",
  border:      "border-gray-200",
  borderLight: "border-gray-100",
  text:        "text-gray-900",
  textMuted:   "text-gray-400",
  textMuted2:  "text-gray-400",
  textMuted3:  "text-gray-500",
  textMuted4:  "text-gray-600",
  textMuted5:  "text-gray-300",
  textMuted6:  "text-gray-700",
  inputText:   "text-gray-900 placeholder:text-gray-400",
  inputBorder: "border-gray-200 focus:border-[#F26E1D]",
  filterInativo: "bg-gray-100 text-gray-500 hover:bg-gray-200",
  rowHover:    "hover:bg-gray-50",
  subBg:       "bg-gray-50",
  subBg2:      "bg-gray-50",
  subBorder:   "border-gray-100",
}

export type AdminTokens = typeof tokensEscuro

const AdminTemaContext = createContext<AdminTokens>(tokensEscuro)

export function AdminTemaProvider({
  children,
  modoClaro,
}: {
  children: React.ReactNode
  modoClaro: boolean
}) {
  return (
    <AdminTemaContext.Provider value={modoClaro ? tokensClaro : tokensEscuro}>
      {children}
    </AdminTemaContext.Provider>
  )
}

export function useAdminTema() {
  return useContext(AdminTemaContext)
}
