import { NextRequest, NextResponse } from "next/server"
import { createAdminClient } from "@/lib/supabase/admin"

// Retorna os slots de horário disponíveis para uma empresa em uma data específica
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const empresa_id = searchParams.get("empresa_id")
    const data = searchParams.get("data") // formato: YYYY-MM-DD

    if (!empresa_id || !data) {
      return NextResponse.json({ erro: "empresa_id e data são obrigatórios" }, { status: 400 })
    }

    const supabase = createAdminClient()

    // Buscar configuração da agenda
    const { data: config } = await supabase
      .from("agenda_config")
      .select("*")
      .eq("empresa_id", empresa_id)
      .maybeSingle()

    // Configuração padrão se não houver
    const horaInicio = config?.hora_inicio ?? "08:00"
    const horaFim = config?.hora_fim ?? "18:00"
    const intervalo = config?.intervalo_minutos ?? 30
    const diasSemana: number[] = config?.dias_semana ?? [1, 2, 3, 4, 5]
    const almocoInicio = config?.almoco_inicio ?? null
    const almocoFim = config?.almoco_fim ?? null

    // Verificar se o dia da semana está disponível
    const dataObj = new Date(data + "T12:00:00")
    const diaSemana = dataObj.getDay() // 0=Dom, 6=Sáb
    if (!diasSemana.includes(diaSemana)) {
      return NextResponse.json({ slots: [], motivo: "dia_indisponivel" })
    }

    // Gerar todos os slots do dia
    const [hIni, mIni] = horaInicio.split(":").map(Number)
    const [hFim, mFim] = horaFim.split(":").map(Number)
    const minInicio = hIni * 60 + mIni
    const minFim = hFim * 60 + mFim

    const almocoInicioMin = almocoInicio
      ? (() => { const [h, m] = almocoInicio.split(":").map(Number); return h * 60 + m })()
      : null
    const almocoFimMin = almocoFim
      ? (() => { const [h, m] = almocoFim.split(":").map(Number); return h * 60 + m })()
      : null

    const todos: string[] = []
    for (let min = minInicio; min < minFim; min += intervalo) {
      // Pular horário de almoço
      if (almocoInicioMin !== null && almocoFimMin !== null) {
        if (min >= almocoInicioMin && min < almocoFimMin) continue
      }
      const h = Math.floor(min / 60)
      const m = min % 60
      todos.push(`${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`)
    }

    // Buscar agendamentos já existentes neste dia
    const inicioDia = `${data}T00:00:00.000Z`
    const fimDia = `${data}T23:59:59.999Z`

    const { data: agendamentosExistentes } = await supabase
      .from("agendamentos")
      .select("data_hora, duracao_minutos, status")
      .eq("empresa_id", empresa_id)
      .gte("data_hora", inicioDia)
      .lte("data_hora", fimDia)
      .not("status", "in", '("cancelado","faltou")')

    // Marcar slots ocupados
    const ocupados = new Set<string>()
    for (const ag of agendamentosExistentes ?? []) {
      const horaAg = new Date(ag.data_hora)
      const minAg = horaAg.getUTCHours() * 60 + horaAg.getUTCMinutes()
      const duracao = ag.duracao_minutos ?? 60
      // Bloquear todos os slots que se sobrepõem a este agendamento
      for (let m = minAg; m < minAg + duracao; m += intervalo) {
        const h = Math.floor(m / 60)
        const min = m % 60
        ocupados.add(`${String(h).padStart(2, "0")}:${String(min).padStart(2, "0")}`)
      }
    }

    const slots = todos.map((hora) => ({
      hora,
      disponivel: !ocupados.has(hora),
    }))

    return NextResponse.json({ slots, config: {
      hora_inicio: horaInicio,
      hora_fim: horaFim,
      intervalo,
      dias_semana: diasSemana,
    }})
  } catch (err) {
    console.error("Erro ao buscar horários:", err)
    return NextResponse.json({ erro: "Erro interno" }, { status: 500 })
  }
}
