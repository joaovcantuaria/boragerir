"use client"

import { cn } from "@/lib/utils"

interface Metrica {
  label: string
  valor: string | number
}

interface PageHeaderProps {
  titulo: string
  subtitulo?: string
  metricas?: Metrica[]
  children?: React.ReactNode // botões de ação no canto superior direito
}

export function PageHeader({ titulo, subtitulo, metricas, children }: PageHeaderProps) {
  return (
    <div className="rounded-2xl bg-gradient-to-r from-[#F26E1D] to-[#ff8c42] p-5 sm:p-6 shadow-lg shadow-orange-500/10">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-xl sm:text-2xl font-black tracking-tight text-white">{titulo}</h1>
          {subtitulo && <p className="text-white/70 text-sm mt-1">{subtitulo}</p>}
        </div>
        {children && <div className="flex gap-2 flex-wrap">{children}</div>}
      </div>
      {metricas && metricas.length > 0 && (
        <div className={cn("grid gap-3 mt-4", metricas.length <= 2 ? "grid-cols-2" : metricas.length === 3 ? "grid-cols-3" : "grid-cols-2 sm:grid-cols-4")}>
          {metricas.map((m) => (
            <div key={m.label} className="rounded-xl bg-white/15 backdrop-blur-sm px-3 py-2 border border-white/10">
              <p className="text-[10px] text-white/60 font-semibold uppercase tracking-wider">{m.label}</p>
              <p className="text-lg sm:text-xl font-black text-white mt-0.5">{m.valor}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

// Botão branco para usar dentro do PageHeader
export function PageHeaderButton({ children, onClick, variant = "primary" }: {
  children: React.ReactNode; onClick?: () => void; variant?: "primary" | "outline"
}) {
  return (
    <button onClick={onClick} className={cn(
      "flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-sm font-bold transition-all",
      variant === "primary"
        ? "bg-white text-[#F26E1D] hover:opacity-90 shadow-md"
        : "border border-white/30 text-white hover:bg-white/10 backdrop-blur-sm"
    )}>
      {children}
    </button>
  )
}
