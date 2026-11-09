/**
 * Regras dos lembretes de tarefas pelo WhatsApp (sem banco/rede: usadas pelo motor e pelos testes).
 *
 *  - resumo  (manhã, no horário escolhido): tarefas de hoje + atrasadas, por prioridade
 *  - vespera (18h): tarefas que vencem amanhã
 *  - atraso  (14h): cobra atrasadas — urgente todo dia, alta a cada 2 dias (média/baixa só no resumo)
 */

export type Prioridade = "baixa" | "media" | "alta" | "urgente"
export type TipoLembrete = "resumo" | "vespera" | "atraso"

export interface TarefaLembrete {
  id: string
  titulo: string
  prioridade: Prioridade
  prazo: string | null // YYYY-MM-DD
  status: "pendente" | "iniciado" | "concluido"
}

export const PLANOS_COM_LEMBRETES = ["profissional"]
export const HORA_VESPERA = "18:00"
export const HORA_COBRANCA = "14:00"

const PESO: Record<Prioridade, number> = { urgente: 0, alta: 1, media: 2, baixa: 3 }
const EMOJI: Record<Prioridade, string> = { urgente: "🔴", alta: "🟠", media: "🟡", baixa: "⚪" }
export const ROTULO_PRIORIDADE: Record<Prioridade, string> = { urgente: "urgente", alta: "alta", media: "média", baixa: "baixa" }

// A Meta recusa variável de template com quebra de linha, tab ou mais de 4 espaços seguidos
export function limparVariavel(texto: string, maximo = 900): string {
  const limpo = texto.replace(/[\r\n\t]+/g, " ").replace(/ {4,}/g, "   ").trim()
  return limpo.length > maximo ? `${limpo.slice(0, maximo - 1)}…` : limpo || "-"
}

export function diasEntre(deISO: string, ateISO: string): number {
  return Math.round((Date.parse(`${ateISO}T00:00:00Z`) - Date.parse(`${deISO}T00:00:00Z`)) / 86_400_000)
}

export function somarDias(iso: string, dias: number): string {
  return new Date(Date.parse(`${iso}T00:00:00Z`) + dias * 86_400_000).toISOString().slice(0, 10)
}

const abertas = (tarefas: TarefaLembrete[]) => tarefas.filter((t) => t.status !== "concluido" && t.prazo)
const ordenar = (tarefas: TarefaLembrete[]) =>
  [...tarefas].sort((a, b) => PESO[a.prioridade] - PESO[b.prioridade] || (a.prazo || "").localeCompare(b.prazo || "") || a.titulo.localeCompare(b.titulo))

export function tarefasDeHoje(tarefas: TarefaLembrete[], hoje: string) {
  return ordenar(abertas(tarefas).filter((t) => t.prazo === hoje))
}

export function tarefasAtrasadas(tarefas: TarefaLembrete[], hoje: string) {
  return ordenar(abertas(tarefas).filter((t) => t.prazo! < hoje))
}

export function tarefasDeAmanha(tarefas: TarefaLembrete[], hoje: string) {
  const amanha = somarDias(hoje, 1)
  return ordenar(abertas(tarefas).filter((t) => t.prazo === amanha))
}

/** Atrasadas que merecem cobrança hoje: urgente todo dia; alta no 1º dia e depois a cada 2 dias. */
export function atrasadasParaCobrar(tarefas: TarefaLembrete[], hoje: string) {
  return tarefasAtrasadas(tarefas, hoje).filter((t) => {
    const dias = diasEntre(t.prazo!, hoje)
    if (t.prioridade === "urgente") return true
    if (t.prioridade === "alta") return dias % 2 === 1
    return false
  })
}

export function listaCompacta(tarefas: TarefaLembrete[], maximo = 6): string {
  if (tarefas.length === 0) return "nenhuma"
  const itens = tarefas.slice(0, maximo).map((t) => `${EMOJI[t.prioridade]} ${t.titulo.trim()}`)
  const resto = tarefas.length - maximo
  return itens.join(" • ") + (resto > 0 ? ` • e mais ${resto}` : "")
}

/** Já passou do horário (HH:MM) em Brasília? `agoraHHMM` vem de partesSaoPaulo. */
export function passouDoHorario(agoraHHMM: string, horario: string): boolean {
  const min = (h: string) => { const [a, b] = h.split(":").map(Number); return a * 60 + (b || 0) }
  return min(agoraHHMM) >= min(horario)
}

export function primeiroNome(nome: string): string {
  return nome.trim().split(/\s+/)[0] || "tudo bem"
}

/** Data (YYYY-MM-DD) e hora (HH:MM) agora em Brasília — o servidor roda em UTC. */
export function agoraSaoPaulo(agora = new Date()): { data: string; hhmm: string } {
  const p = new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Sao_Paulo", year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", hour12: false,
  }).formatToParts(agora)
  const v = (t: string) => p.find((x) => x.type === t)?.value || ""
  return { data: `${v("year")}-${v("month")}-${v("day")}`, hhmm: `${String(Number(v("hour")) % 24).padStart(2, "0")}:${v("minute")}` }
}
