"use client"

import { useState } from "react"
import { Loader2, Save, Clock, Calendar, Coffee, Zap } from "lucide-react"
import { toast } from "sonner"
import { createClient } from "@/lib/supabase/client"

const DIAS = [
  { value: 0, label: "Dom", abrev: "D" },
  { value: 1, label: "Seg", abrev: "S" },
  { value: 2, label: "Ter", abrev: "T" },
  { value: 3, label: "Qua", abrev: "Q" },
  { value: 4, label: "Qui", abrev: "Q" },
  { value: 5, label: "Sex", abrev: "S" },
  { value: 6, label: "Sáb", abrev: "S" },
]

interface AgendaConfigProps {
  empresaId: string
  config: {
    id?: string
    dias_semana: number[]
    hora_inicio: string
    hora_fim: string
    intervalo_minutos: number
    duracao_padrao: number
    almoco_inicio: string | null
    almoco_fim: string | null
  } | null
}

export function AgendaConfig({ empresaId, config: configInicial }: AgendaConfigProps) {
  const [dias, setDias] = useState<number[]>(configInicial?.dias_semana ?? [1, 2, 3, 4, 5])
  const [horaInicio, setHoraInicio] = useState(configInicial?.hora_inicio ?? "08:00")
  const [horaFim, setHoraFim] = useState(configInicial?.hora_fim ?? "18:00")
  const [intervalo, setIntervalo] = useState(String(configInicial?.intervalo_minutos ?? 30))
  const [duracaoPadrao, setDuracaoPadrao] = useState(String(configInicial?.duracao_padrao ?? 60))
  const [almocoInicio, setAlmocoInicio] = useState(configInicial?.almoco_inicio ?? "")
  const [almocoFim, setAlmocoFim] = useState(configInicial?.almoco_fim ?? "")
  const [loading, setLoading] = useState(false)
  const supabase = createClient()

  function toggleDia(dia: number) {
    setDias((prev) =>
      prev.includes(dia) ? prev.filter((d) => d !== dia) : [...prev, dia].sort()
    )
  }

  async function salvar() {
    if (dias.length === 0) { toast.error("Selecione ao menos um dia de atendimento."); return }
    setLoading(true)

    const payload = {
      empresa_id: empresaId,
      dias_semana: dias,
      hora_inicio: horaInicio,
      hora_fim: horaFim,
      intervalo_minutos: parseInt(intervalo) || 30,
      duracao_padrao: parseInt(duracaoPadrao) || 60,
      almoco_inicio: almocoInicio || null,
      almoco_fim: almocoFim || null,
      updated_at: new Date().toISOString(),
    }

    const { error } = configInicial?.id
      ? await supabase.from("agenda_config").update(payload).eq("id", configInicial.id)
      : await supabase.from("agenda_config").insert(payload)

    if (error) {
      if (error.code === "23505") {
        const { error: errUpdate } = await supabase
          .from("agenda_config").update(payload).eq("empresa_id", empresaId)
        if (errUpdate) { toast.error("Erro ao salvar."); setLoading(false); return }
      } else {
        toast.error("Erro ao salvar configuração.")
        setLoading(false)
        return
      }
    }

    toast.success("Configuração salva com sucesso!")
    setLoading(false)
  }

  // Preview dos slots
  function gerarPreview(): string[] {
    const [hIni, mIni] = horaInicio.split(":").map(Number)
    const [hFim, mFim] = horaFim.split(":").map(Number)
    const minInicio = hIni * 60 + mIni
    const minFim = hFim * 60 + mFim
    const intv = parseInt(intervalo) || 30
    const almocoIniMin = almocoInicio ? (() => { const [h, m] = almocoInicio.split(":").map(Number); return h * 60 + m })() : null
    const almocoFimMin = almocoFim ? (() => { const [h, m] = almocoFim.split(":").map(Number); return h * 60 + m })() : null

    const slots: string[] = []
    for (let min = minInicio; min < minFim; min += intv) {
      if (almocoIniMin !== null && almocoFimMin !== null && min >= almocoIniMin && min < almocoFimMin) continue
      const h = Math.floor(min / 60)
      const m = min % 60
      slots.push(`${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`)
    }
    return slots
  }

  const preview = gerarPreview()

  const inputClass = "w-full h-11 rounded-xl border border-border bg-background px-3 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-all"
  const selectClass = "w-full h-11 rounded-xl border border-border bg-background px-3 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-all cursor-pointer"

  return (
    <div className="max-w-2xl space-y-6">

      {/* Dias da semana */}
      <div className="rounded-2xl border border-border bg-card p-5 space-y-4">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
            <Calendar className="w-4 h-4 text-primary" />
          </div>
          <div>
            <p className="font-semibold text-sm">Dias de atendimento</p>
            <p className="text-xs text-muted-foreground">Selecione os dias em que você atende</p>
          </div>
        </div>
        <div className="grid grid-cols-7 gap-2">
          {DIAS.map((d) => {
            const ativo = dias.includes(d.value)
            return (
              <button key={d.value} type="button" onClick={() => toggleDia(d.value)}
                style={ativo ? { backgroundColor: "#F26E1D", color: "#ffffff" } : {}}
                className={`flex flex-col items-center gap-1 py-3 rounded-xl text-xs font-bold transition-all ${
                  ativo
                    ? "shadow-sm"
                    : "bg-muted text-muted-foreground hover:text-foreground"
                }`}>
                <span className="text-base leading-none">{d.abrev}</span>
                <span className="text-[10px] font-medium opacity-80">{d.label}</span>
              </button>
            )
          })}
        </div>
        <p className="text-xs text-muted-foreground">
          {dias.length === 0
            ? "Nenhum dia selecionado"
            : `${dias.length} dia${dias.length > 1 ? "s" : ""} selecionado${dias.length > 1 ? "s" : ""}`}
        </p>
      </div>

      {/* Horário de funcionamento */}
      <div className="rounded-2xl border border-border bg-card p-5 space-y-4">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
            <Clock className="w-4 h-4 text-primary" />
          </div>
          <div>
            <p className="font-semibold text-sm">Horário de funcionamento</p>
            <p className="text-xs text-muted-foreground">Defina o início e fim do expediente</p>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Abertura</label>
            <input type="time" value={horaInicio} onChange={(e) => setHoraInicio(e.target.value)} className={inputClass} />
          </div>
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Encerramento</label>
            <input type="time" value={horaFim} onChange={(e) => setHoraFim(e.target.value)} className={inputClass} />
          </div>
        </div>
      </div>

      {/* Slots */}
      <div className="rounded-2xl border border-border bg-card p-5 space-y-4">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
            <Zap className="w-4 h-4 text-primary" />
          </div>
          <div>
            <p className="font-semibold text-sm">Slots de agendamento</p>
            <p className="text-xs text-muted-foreground">Controle o tempo entre horários disponíveis</p>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Intervalo entre slots</label>
            <select value={intervalo} onChange={(e) => setIntervalo(e.target.value)} className={selectClass}>
              <option value="15">15 minutos</option>
              <option value="30">30 minutos</option>
              <option value="45">45 minutos</option>
              <option value="60">1 hora</option>
            </select>
          </div>
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Duração padrão</label>
            <select value={duracaoPadrao} onChange={(e) => setDuracaoPadrao(e.target.value)} className={selectClass}>
              <option value="30">30 minutos</option>
              <option value="45">45 minutos</option>
              <option value="60">1 hora</option>
              <option value="90">1h30</option>
              <option value="120">2 horas</option>
            </select>
          </div>
        </div>
      </div>

      {/* Almoço */}
      <div className="rounded-2xl border border-border bg-card p-5 space-y-4">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
            <Coffee className="w-4 h-4 text-primary" />
          </div>
          <div>
            <p className="font-semibold text-sm">Pausa para almoço <span className="text-muted-foreground font-normal">(opcional)</span></p>
            <p className="text-xs text-muted-foreground">Bloqueie horários de almoço automaticamente</p>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Início</label>
            <input type="time" value={almocoInicio} onChange={(e) => setAlmocoInicio(e.target.value)} className={inputClass} />
          </div>
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Fim</label>
            <input type="time" value={almocoFim} onChange={(e) => setAlmocoFim(e.target.value)} className={inputClass} />
          </div>
        </div>
      </div>

      {/* Preview */}
      <div className="rounded-2xl border border-border bg-card p-5 space-y-4">
        <div className="flex items-center justify-between">
          <p className="font-semibold text-sm">Preview dos horários</p>
          <span className="text-xs bg-primary/10 text-primary font-bold px-2.5 py-1 rounded-full">
            {preview.length} slots por dia
          </span>
        </div>
        {preview.length > 0 ? (
          <div className="flex flex-wrap gap-1.5">
            {preview.map((slot) => (
              <span key={slot} className="text-xs bg-muted text-foreground font-semibold px-2.5 py-1 rounded-lg border border-border">
                {slot}
              </span>
            ))}
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">Configure os horários acima para ver o preview</p>
        )}
      </div>

      {/* Botão salvar */}
      <button onClick={salvar} disabled={loading}
        className="w-full h-12 rounded-xl bg-primary hover:bg-primary/90 text-white font-bold text-sm transition-all flex items-center justify-center gap-2 disabled:opacity-50 shadow-sm shadow-primary/20">
        {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
        {loading ? "Salvando..." : "Salvar configuração"}
      </button>
    </div>
  )
}
