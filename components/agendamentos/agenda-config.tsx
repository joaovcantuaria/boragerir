"use client"

import { useState } from "react"
import { Loader2, Save, Settings } from "lucide-react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { createClient } from "@/lib/supabase/client"

const DIAS = [
  { value: 0, label: "Dom" },
  { value: 1, label: "Seg" },
  { value: 2, label: "Ter" },
  { value: 3, label: "Qua" },
  { value: 4, label: "Qui" },
  { value: 5, label: "Sex" },
  { value: 6, label: "Sáb" },
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
    if (!horaInicio || !horaFim) { toast.error("Informe os horários de início e fim."); return }
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
        // Já existe, faz upsert
        const { error: errUpdate } = await supabase
          .from("agenda_config")
          .update(payload)
          .eq("empresa_id", empresaId)
        if (errUpdate) { toast.error("Erro ao salvar."); setLoading(false); return }
      } else {
        toast.error("Erro ao salvar configuração.")
        setLoading(false)
        return
      }
    }

    toast.success("Configuração salva! Os horários disponíveis foram atualizados.")
    setLoading(false)
  }

  // Preview dos slots que serão gerados
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

  return (
    <div className="space-y-5">
      <div className="flex items-center gap-2">
        <Settings className="w-5 h-5 text-primary" />
        <h2 className="text-lg font-bold">Configuração da Agenda</h2>
      </div>

      {/* Dias da semana */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-semibold text-muted-foreground">Dias de atendimento</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex gap-2 flex-wrap">
            {DIAS.map((d) => (
              <button key={d.value} type="button" onClick={() => toggleDia(d.value)}
                className={`px-4 py-2 rounded-xl text-sm font-bold transition-all border ${
                  dias.includes(d.value)
                    ? "bg-primary text-white border-primary"
                    : "border-border text-muted-foreground hover:border-primary/40"
                }`}>
                {d.label}
              </button>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Horários */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-semibold text-muted-foreground">Horário de funcionamento</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label>Início</Label>
              <Input type="time" value={horaInicio} onChange={(e) => setHoraInicio(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label>Fim</Label>
              <Input type="time" value={horaFim} onChange={(e) => setHoraFim(e.target.value)} />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label>Intervalo entre slots (min)</Label>
              <select value={intervalo} onChange={(e) => setIntervalo(e.target.value)}
                className="w-full h-10 rounded-md border border-input bg-background px-3 text-sm">
                <option value="15">15 minutos</option>
                <option value="30">30 minutos</option>
                <option value="45">45 minutos</option>
                <option value="60">1 hora</option>
              </select>
            </div>
            <div className="space-y-1.5">
              <Label>Duração padrão (min)</Label>
              <select value={duracaoPadrao} onChange={(e) => setDuracaoPadrao(e.target.value)}
                className="w-full h-10 rounded-md border border-input bg-background px-3 text-sm">
                <option value="30">30 minutos</option>
                <option value="45">45 minutos</option>
                <option value="60">1 hora</option>
                <option value="90">1h30</option>
                <option value="120">2 horas</option>
              </select>
            </div>
          </div>

          <div className="space-y-1.5">
            <Label className="flex items-center gap-2">
              Horário de almoço <span className="text-xs text-muted-foreground font-normal">(opcional)</span>
            </Label>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label className="text-xs text-muted-foreground">Início</Label>
                <Input type="time" value={almocoInicio} onChange={(e) => setAlmocoInicio(e.target.value)} className="mt-1" />
              </div>
              <div>
                <Label className="text-xs text-muted-foreground">Fim</Label>
                <Input type="time" value={almocoFim} onChange={(e) => setAlmocoFim(e.target.value)} className="mt-1" />
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Preview dos slots */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-semibold text-muted-foreground">
            Preview — {preview.length} horários disponíveis por dia
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-1.5">
            {preview.map((slot) => (
              <span key={slot} className="text-xs bg-primary/10 text-primary font-semibold px-2 py-1 rounded-lg">
                {slot}
              </span>
            ))}
          </div>
        </CardContent>
      </Card>

      <Button onClick={salvar} disabled={loading} className="w-full gap-2 font-bold">
        {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
        Salvar configuração
      </Button>
    </div>
  )
}
