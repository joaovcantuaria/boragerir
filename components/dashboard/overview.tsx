"use client"

import {
  Calendar,
  Users,
  DollarSign,
  TrendingUp,
  Clock,
  CheckCircle2,
} from "lucide-react"

interface StatCardProps {
  title: string
  value: string
  subtitle: string
  icon: React.ElementType
  color: string
  bgColor: string
}

function StatCard({ title, value, subtitle, icon: Icon, color, bgColor }: StatCardProps) {
  return (
    <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 p-5">
      <div className="flex items-center justify-between mb-3">
        <div className={`w-10 h-10 ${bgColor} rounded-lg flex items-center justify-center`}>
          <Icon className={`w-5 h-5 ${color}`} />
        </div>
      </div>
      <div>
        <p className="text-2xl font-bold text-gray-900 dark:text-white">{value}</p>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">{title}</p>
        <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">{subtitle}</p>
      </div>
    </div>
  )
}

export function DashboardOverview() {
  const stats = [
    {
      title: "Agendamentos hoje",
      value: "12",
      subtitle: "3 pendentes de confirmação",
      icon: Calendar,
      color: "text-purple-600",
      bgColor: "bg-purple-50 dark:bg-purple-950",
    },
    {
      title: "Clientes ativos",
      value: "248",
      subtitle: "+8 este mês",
      icon: Users,
      color: "text-blue-600",
      bgColor: "bg-blue-50 dark:bg-blue-950",
    },
    {
      title: "Receita hoje",
      value: "R$ 890",
      subtitle: "Meta: R$ 1.200",
      icon: DollarSign,
      color: "text-green-600",
      bgColor: "bg-green-50 dark:bg-green-950",
    },
    {
      title: "Receita do mês",
      value: "R$ 18.450",
      subtitle: "+12% vs mês anterior",
      icon: TrendingUp,
      color: "text-orange-600",
      bgColor: "bg-orange-50 dark:bg-orange-950",
    },
  ]

  const recentAppointments = [
    { client: "Ana Silva", service: "Corte + Escova", time: "09:00", status: "completed" },
    { client: "Maria Santos", service: "Coloração", time: "10:30", status: "in_progress" },
    { client: "Carla Oliveira", service: "Manicure", time: "11:00", status: "scheduled" },
    { client: "Paula Costa", service: "Hidratação", time: "14:00", status: "scheduled" },
    { client: "Fernanda Lima", service: "Corte", time: "15:30", status: "scheduled" },
  ]

  const statusLabels: Record<string, { label: string; className: string }> = {
    completed: { label: "Concluído", className: "bg-green-100 dark:bg-green-950 text-green-700 dark:text-green-400" },
    in_progress: { label: "Em andamento", className: "bg-blue-100 dark:bg-blue-950 text-blue-700 dark:text-blue-400" },
    scheduled: { label: "Agendado", className: "bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400" },
    cancelled: { label: "Cancelado", className: "bg-red-100 dark:bg-red-950 text-red-700 dark:text-red-400" },
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
          Bom dia! 👋
        </h1>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
          Aqui está o resumo do seu negócio hoje
        </p>
      </div>

      {/* Stats grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        {stats.map((stat) => (
          <StatCard key={stat.title} {...stat} />
        ))}
      </div>

      {/* Content grid */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        {/* Recent appointments */}
        <div className="xl:col-span-2 bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800">
          <div className="px-5 py-4 border-b border-gray-200 dark:border-gray-800 flex items-center justify-between">
            <h2 className="text-sm font-semibold text-gray-900 dark:text-white">
              Agendamentos de hoje
            </h2>
            <a href="/agenda" className="text-xs text-purple-600 hover:text-purple-700 font-medium">
              Ver todos →
            </a>
          </div>
          <div className="divide-y divide-gray-100 dark:divide-gray-800">
            {recentAppointments.map((appt, i) => {
              const status = statusLabels[appt.status]
              return (
                <div key={i} className="px-5 py-3.5 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-purple-100 dark:bg-purple-900 flex items-center justify-center text-purple-600 dark:text-purple-300 text-xs font-semibold">
                      {appt.client.charAt(0)}
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-900 dark:text-white">
                        {appt.client}
                      </p>
                      <p className="text-xs text-gray-500 dark:text-gray-400">
                        {appt.service}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="flex items-center gap-1 text-xs text-gray-500 dark:text-gray-400">
                      <Clock className="w-3 h-3" />
                      {appt.time}
                    </div>
                    <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${status.className}`}>
                      {status.label}
                    </span>
                  </div>
                </div>
              )
            })}
          </div>
        </div>

        {/* Quick actions / summary */}
        <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800">
          <div className="px-5 py-4 border-b border-gray-200 dark:border-gray-800">
            <h2 className="text-sm font-semibold text-gray-900 dark:text-white">
              Ações rápidas
            </h2>
          </div>
          <div className="p-5 space-y-3">
            <button className="w-full flex items-center gap-3 px-4 py-3 bg-purple-600 hover:bg-purple-700 text-white text-sm font-medium rounded-lg transition-colors">
              <Calendar className="w-4 h-4" />
              Novo agendamento
            </button>
            <button className="w-full flex items-center gap-3 px-4 py-3 bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300 text-sm font-medium rounded-lg transition-colors">
              <Users className="w-4 h-4" />
              Novo cliente
            </button>
            <button className="w-full flex items-center gap-3 px-4 py-3 bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300 text-sm font-medium rounded-lg transition-colors">
              <DollarSign className="w-4 h-4" />
              Registrar pagamento
            </button>
            <button className="w-full flex items-center gap-3 px-4 py-3 bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300 text-sm font-medium rounded-lg transition-colors">
              <CheckCircle2 className="w-4 h-4" />
              Fechar caixa
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
