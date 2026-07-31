import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"

interface CoraStatusBadgeProps {
  status: string
  className?: string
}

const STATUS_CONFIG: Record<string, { label: string; classes: string }> = {
  // Boleto statuses
  aberto: {
    label: "Aberto",
    classes: "bg-amber-100 text-amber-700 dark:bg-amber-950/30 dark:text-amber-400",
  },
  pago: {
    label: "Pago",
    classes: "bg-emerald-100 text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-400",
  },
  vencido: {
    label: "Vencido",
    classes: "bg-red-100 text-red-700 dark:bg-red-950/30 dark:text-red-400",
  },
  cancelado: {
    label: "Cancelado",
    classes: "bg-gray-100 text-gray-700 dark:bg-gray-800/50 dark:text-gray-400",
  },
  // Transfer statuses
  iniciada: {
    label: "Iniciada",
    classes: "bg-amber-100 text-amber-700 dark:bg-amber-950/30 dark:text-amber-400",
  },
  aprovada: {
    label: "Aprovada",
    classes: "bg-blue-100 text-blue-700 dark:bg-blue-950/30 dark:text-blue-400",
  },
  concluida: {
    label: "Concluída",
    classes: "bg-emerald-100 text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-400",
  },
  cancelada: {
    label: "Cancelada",
    classes: "bg-gray-100 text-gray-700 dark:bg-gray-800/50 dark:text-gray-400",
  },
  estornada: {
    label: "Estornada",
    classes: "bg-red-100 text-red-700 dark:bg-red-950/30 dark:text-red-400",
  },
}

export function CoraStatusBadge({ status, className }: CoraStatusBadgeProps) {
  const config = STATUS_CONFIG[status.toLowerCase()]

  if (!config) {
    return (
      <Badge variant="secondary" className={className}>
        {status}
      </Badge>
    )
  }

  return (
    <Badge
      variant="secondary"
      className={cn("border-transparent", config.classes, className)}
    >
      {config.label}
    </Badge>
  )
}
