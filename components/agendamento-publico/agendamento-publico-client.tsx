"use client"

import { useState } from "react"
import { useForm } from "react-hook-form"
import { z } from "zod"
import { zodResolver } from "@hookform/resolvers/zod"
import { format, addDays, isBefore, startOfDay, addMinutes, setHours, setMinutes } from "date-fns"
import { ptBR } from "date-fns/locale"
import {
  Calendar, Clock, User, Scissors, Check,
  ChevronLeft, ChevronRight, Loader2, Phone, MapPin
} from "lucide-react"
import { toast } from "sonner"
import { createClient } from "@/lib/supabase/client"
import { formatarMoeda, formatarTelefone } from "@/lib/utils"
import { LogoIcon } from "@/components/ui/logo"

interface Servico { id: string; nome: string; preco: number; duracao_minutos: number | null; descricao: string | null }
interface Funcionario { id: string; nome: string; cargo: string }
interface Empresa { id: string; nome: string; area_atuacao: string; telefone: string; logo_url: string | null; endereco_cidade: string; endereco_estado: string }

const schema = z.object({
  nome: z.string().min(2, "Nome obrigatório"),
  telefone: z.string().min(10, "Telefone inválido"),
  email: z.string().email("E-mail inválido").optional().or(z.literal("")),
  observacoes: z.string().optional(),
})
type FormData = z.infer<typeof schema>

// Horários disponíveis padrão
const HORARIOS = Array.from({ length: 22 }, (_, i) => {
  const hora = Math.floor(i / 2) + 8
  const min = i % 2 === 0 ? 0 : 30
  return { hora, min, label: `${String(hora).padStart(2, "0")}:${String(min).padStart(2, "0")}` }
}).filter((h) => h.hora < 19)

export function AgendamentoPublicoClient({ empresa, servicos, funcionarios }: {
  empresa: Empresa
  servicos: Servico[]
  funcionarios: Funcionario[]
}) {
  const [etapa, setEtapa] = useState<"servico" | "data" | "horario" | "dados" | "sucesso">("servico")
  const [servicoSel, setServicoSel] = useState<Servico | null>(null)
  const [funcionarioSel, setFuncionarioSel] = useState<Funcionario | null>(null)
  const [dataSel, setDataSel] = useState<Date | null>(null)
  const [horarioSel, setHorarioSel] = useState<{ hora: number; min: number; label: string } | null>(null)
  const [mesAtual, setMesAtual] = useState(new Date())
  const [loading, setLoading] = useState(false)
  const [emailConfirmacao, setEmailConfirmacao] = useState<string | null>(null)
  const supabase = createClient()

  const { register, handleSubmit, setValue, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(schema),
  })

  // Gerar dias do mês
  const hoje = startOfDay(new Date())
  const diasDoMes = Array.from({ length: 31 }, (_, i) => {
    const dia = new Date(mesAtual.getFullYear(), mesAtual.getMonth(), i + 1)
    return dia.getMonth() === mesAtual.getMonth() ? dia : null
  }).filter(Boolean) as Date[]

  async function finalizarAgendamento(dados: FormData) {
    if (!servicoSel || !dataSel || !horarioSel) return
    setLoading(true)

    const dataHora = setMinutes(setHours(dataSel, horarioSel.hora), horarioSel.min)

    const { error } = await supabase.from("agendamentos").insert({
      empresa_id: empresa.id,
      servico_id: servicoSel.id,
      funcionario_id: funcionarioSel?.id ?? null,
      data_hora: dataHora.toISOString(),
      duracao_minutos: servicoSel.duracao_minutos ?? 60,
      status: "solicitado",   // entra como solicitação, aguarda confirmação
      origem: "online",
      nome_cliente_avulso: dados.nome,
      telefone_cliente_avulso: dados.telefone,
      email_cliente: dados.email || null,
      observacoes: dados.observacoes || null,
    })

    if (error) { toast.error("Erro ao agendar. Tente novamente."); setLoading(false); return }

    // Disparar e-mail de confirmação de solicitação para o cliente
    if (dados.email) {
      fetch("/api/agendamentos/notificar-solicitacao", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          nomeCliente: dados.nome,
          emailCliente: dados.email,
          nomeEmpresa: empresa.nome,
          telefoneEmpresa: empresa.telefone,
          servico: servicoSel.nome,
          dataHora: dataHora.toISOString(),
        }),
      }).catch(() => {}) // silencioso — não bloqueia o fluxo
    }

    setEmailConfirmacao(dados.email || null)
    setEtapa("sucesso")
    setLoading(false)
  }

  // ── Tela de sucesso ──────────────────────────────────────
  if (etapa === "sucesso") return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl p-8 shadow-sm max-w-sm w-full text-center space-y-5">
        <div className="w-20 h-20 rounded-full bg-emerald-50 flex items-center justify-center mx-auto">
          <Check className="w-10 h-10 text-emerald-500" />
        </div>
        <div>
          <h2 className="text-2xl font-black text-gray-900">Solicitação enviada! 🎉</h2>
          <p className="text-gray-500 mt-2 text-sm">
            Sua solicitação de agendamento foi recebida. O estabelecimento irá confirmar ou colocar na lista de espera em breve.
            {emailConfirmacao && <> Você receberá uma notificação no e-mail <strong>{emailConfirmacao}</strong>.</>}
          </p>
        </div>
        <div className="bg-gray-50 rounded-2xl p-4 text-sm space-y-2 text-left">
          <div className="flex items-center gap-2 text-gray-600">
            <Scissors className="w-4 h-4 text-[#F26E1D]" />
            <span className="font-semibold">{servicoSel?.nome}</span>
          </div>
          <div className="flex items-center gap-2 text-gray-600">
            <Calendar className="w-4 h-4 text-[#F26E1D]" />
            <span>{dataSel && format(dataSel, "EEEE, d 'de' MMMM", { locale: ptBR })}</span>
          </div>
          <div className="flex items-center gap-2 text-gray-600">
            <Clock className="w-4 h-4 text-[#F26E1D]" />
            <span>{horarioSel?.label}</span>
          </div>
          {funcionarioSel && (
            <div className="flex items-center gap-2 text-gray-600">
              <User className="w-4 h-4 text-[#F26E1D]" />
              <span>{funcionarioSel.nome}</span>
            </div>
          )}
        </div>
        <p className="text-xs text-gray-400">
          Em caso de dúvidas, entre em contato:<br />
          <span className="font-semibold text-gray-600">{formatarTelefone(empresa.telefone)}</span>
        </p>
      </div>
    </div>
  )

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header da empresa */}
      <div className="bg-white border-b border-gray-100">
        <div className="max-w-lg mx-auto px-4 py-4 flex items-center gap-3">
          {empresa.logo_url ? (
            <img src={empresa.logo_url} alt={empresa.nome}
              className="w-12 h-12 rounded-2xl object-cover border border-gray-100" />
          ) : (
            <div className="w-12 h-12 rounded-2xl bg-[#F26E1D]/10 flex items-center justify-center">
              <span className="text-lg font-black text-[#F26E1D]">{empresa.nome.charAt(0)}</span>
            </div>
          )}
          <div>
            <h1 className="font-black text-gray-900">{empresa.nome}</h1>
            <div className="flex items-center gap-3 text-xs text-gray-400">
              <span className="flex items-center gap-1">
                <MapPin className="w-3 h-3" />{empresa.endereco_cidade}/{empresa.endereco_estado}
              </span>
              <span className="flex items-center gap-1">
                <Phone className="w-3 h-3" />{formatarTelefone(empresa.telefone)}
              </span>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-lg mx-auto px-4 py-6 space-y-5">
        {/* Progress */}
        <div className="flex items-center gap-2">
          {[
            { id: "servico", label: "Serviço" },
            { id: "data", label: "Data" },
            { id: "horario", label: "Horário" },
            { id: "dados", label: "Seus dados" },
          ].map((p, i, arr) => {
            const etapas = ["servico", "data", "horario", "dados"]
            const idx = etapas.indexOf(etapa)
            const pIdx = etapas.indexOf(p.id)
            const done = pIdx < idx
            const active = pIdx === idx
            return (
              <div key={p.id} className="flex items-center gap-2 flex-1">
                <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold transition-all ${
                  done ? "bg-[#F26E1D] text-white" : active ? "bg-[#F26E1D] text-white" : "bg-gray-200 text-gray-400"
                }`}>
                  {done ? <Check className="w-3 h-3" /> : i + 1}
                </div>
                <span className={`text-xs font-medium hidden sm:block ${active ? "text-gray-900" : "text-gray-400"}`}>
                  {p.label}
                </span>
                {i < arr.length - 1 && <div className={`flex-1 h-0.5 ${done ? "bg-[#F26E1D]" : "bg-gray-200"}`} />}
              </div>
            )
          })}
        </div>

        {/* ── Etapa 1: Serviço ── */}
        {etapa === "servico" && (
          <div className="space-y-3">
            <h2 className="text-lg font-black text-gray-900">Escolha o serviço</h2>
            {servicos.map((s) => (
              <button key={s.id} onClick={() => { setServicoSel(s); setEtapa("data") }}
                className="w-full text-left bg-white rounded-2xl p-4 border border-gray-100 hover:border-[#F26E1D]/40 hover:shadow-sm transition-all">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-bold text-gray-900">{s.nome}</p>
                    {s.descricao && <p className="text-xs text-gray-400 mt-0.5">{s.descricao}</p>}
                    {s.duracao_minutos && (
                      <div className="flex items-center gap-1 mt-1 text-xs text-gray-400">
                        <Clock className="w-3 h-3" />{s.duracao_minutos} min
                      </div>
                    )}
                  </div>
                  <span className="text-lg font-black text-[#F26E1D]">{formatarMoeda(s.preco)}</span>
                </div>
              </button>
            ))}

            {funcionarios.length > 0 && (
              <div className="mt-4 space-y-2">
                <p className="text-sm font-semibold text-gray-600">Profissional (opcional)</p>
                <div className="flex gap-2 flex-wrap">
                  <button
                    onClick={() => setFuncionarioSel(null)}
                    className={`px-3 py-2 rounded-xl text-sm font-medium transition-all border ${
                      !funcionarioSel ? "border-[#F26E1D] bg-[#F26E1D]/5 text-[#F26E1D]" : "border-gray-200 text-gray-500"
                    }`}>
                    Qualquer um
                  </button>
                  {funcionarios.map((f) => (
                    <button key={f.id}
                      onClick={() => setFuncionarioSel(f)}
                      className={`px-3 py-2 rounded-xl text-sm font-medium transition-all border ${
                        funcionarioSel?.id === f.id ? "border-[#F26E1D] bg-[#F26E1D]/5 text-[#F26E1D]" : "border-gray-200 text-gray-500"
                      }`}>
                      {f.nome}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* ── Etapa 2: Data ── */}
        {etapa === "data" && (
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <button onClick={() => setEtapa("servico")} className="p-2 rounded-xl hover:bg-gray-100 text-gray-400">
                <ChevronLeft className="w-5 h-5" />
              </button>
              <h2 className="text-lg font-black text-gray-900">Escolha a data</h2>
            </div>

            <div className="bg-white rounded-2xl p-4 border border-gray-100">
              {/* Header calendário */}
              <div className="flex items-center justify-between mb-4">
                <button onClick={() => setMesAtual((m) => new Date(m.getFullYear(), m.getMonth() - 1))}
                  className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400">
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <p className="font-bold text-gray-900 capitalize">
                  {format(mesAtual, "MMMM yyyy", { locale: ptBR })}
                </p>
                <button onClick={() => setMesAtual((m) => new Date(m.getFullYear(), m.getMonth() + 1))}
                  className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400">
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
              {/* Dias da semana */}
              <div className="grid grid-cols-7 mb-2">
                {["D","S","T","Q","Q","S","S"].map((d, i) => (
                  <div key={i} className="text-center text-xs font-bold text-gray-300 py-1">{d}</div>
                ))}
              </div>
              {/* Dias */}
              <div className="grid grid-cols-7 gap-1">
                {Array.from({ length: diasDoMes[0]?.getDay() ?? 0 }).map((_, i) => <div key={`b${i}`} />)}
                {diasDoMes.map((dia) => {
                  const passado = isBefore(dia, hoje)
                  const isSel = dataSel && format(dia, "yyyy-MM-dd") === format(dataSel, "yyyy-MM-dd")
                  return (
                    <button key={dia.toISOString()} disabled={passado}
                      onClick={() => { setDataSel(dia); setEtapa("horario") }}
                      className={`aspect-square rounded-xl text-sm font-semibold transition-all ${
                        passado ? "text-gray-200 cursor-default"
                        : isSel ? "bg-[#F26E1D] text-white"
                        : "text-gray-700 hover:bg-[#F26E1D]/10 hover:text-[#F26E1D]"
                      }`}>
                      {format(dia, "d")}
                    </button>
                  )
                })}
              </div>
            </div>
          </div>
        )}

        {/* ── Etapa 3: Horário ── */}
        {etapa === "horario" && (
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <button onClick={() => setEtapa("data")} className="p-2 rounded-xl hover:bg-gray-100 text-gray-400">
                <ChevronLeft className="w-5 h-5" />
              </button>
              <div>
                <h2 className="text-lg font-black text-gray-900">Escolha o horário</h2>
                {dataSel && (
                  <p className="text-sm text-gray-400 capitalize">
                    {format(dataSel, "EEEE, d 'de' MMMM", { locale: ptBR })}
                  </p>
                )}
              </div>
            </div>
            <div className="grid grid-cols-4 gap-2">
              {HORARIOS.map((h) => (
                <button key={h.label}
                  onClick={() => { setHorarioSel(h); setEtapa("dados") }}
                  className={`py-3 rounded-xl text-sm font-bold transition-all border ${
                    horarioSel?.label === h.label
                      ? "bg-[#F26E1D] text-white border-[#F26E1D]"
                      : "bg-white border-gray-200 text-gray-700 hover:border-[#F26E1D]/40 hover:text-[#F26E1D]"
                  }`}>
                  {h.label}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* ── Etapa 4: Dados ── */}
        {etapa === "dados" && (
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <button onClick={() => setEtapa("horario")} className="p-2 rounded-xl hover:bg-gray-100 text-gray-400">
                <ChevronLeft className="w-5 h-5" />
              </button>
              <h2 className="text-lg font-black text-gray-900">Seus dados</h2>
            </div>

            {/* Resumo */}
            <div className="bg-[#F26E1D]/5 border border-[#F26E1D]/20 rounded-2xl p-4 space-y-2 text-sm">
              <div className="flex items-center gap-2 text-gray-700">
                <Scissors className="w-4 h-4 text-[#F26E1D]" />
                <span className="font-semibold">{servicoSel?.nome}</span>
                <span className="ml-auto font-black text-[#F26E1D]">{formatarMoeda(servicoSel?.preco ?? 0)}</span>
              </div>
              <div className="flex items-center gap-2 text-gray-600">
                <Calendar className="w-4 h-4 text-[#F26E1D]" />
                <span>{dataSel && format(dataSel, "dd/MM/yyyy")}</span>
                <Clock className="w-4 h-4 text-[#F26E1D] ml-2" />
                <span>{horarioSel?.label}</span>
              </div>
              {funcionarioSel && (
                <div className="flex items-center gap-2 text-gray-600">
                  <User className="w-4 h-4 text-[#F26E1D]" />
                  <span>{funcionarioSel.nome}</span>
                </div>
              )}
            </div>

            <form onSubmit={handleSubmit(finalizarAgendamento)} className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-sm font-semibold text-gray-700">Nome completo *</label>
                <input placeholder="Seu nome"
                  className="w-full h-11 rounded-xl border border-gray-200 bg-white px-3 text-sm text-gray-900 focus:outline-none focus:border-[#F26E1D]"
                  {...register("nome")} />
                {errors.nome && <p className="text-red-500 text-xs">{errors.nome.message}</p>}
              </div>
              <div className="space-y-1.5">
                <label className="text-sm font-semibold text-gray-700">Telefone/WhatsApp *</label>
                <input placeholder="(11) 99999-9999" maxLength={15}
                  className="w-full h-11 rounded-xl border border-gray-200 bg-white px-3 text-sm text-gray-900 focus:outline-none focus:border-[#F26E1D]"
                  {...register("telefone")}
                  onChange={(e) => { const f = formatarTelefone(e.target.value); e.target.value = f; setValue("telefone", f) }} />
                {errors.telefone && <p className="text-red-500 text-xs">{errors.telefone.message}</p>}
              </div>
              <div className="space-y-1.5">
                <label className="text-sm font-semibold text-gray-700">
                  E-mail <span className="text-gray-400 font-normal">(para receber confirmação)</span>
                </label>
                <input type="email" placeholder="seu@email.com"
                  className="w-full h-11 rounded-xl border border-gray-200 bg-white px-3 text-sm text-gray-900 focus:outline-none focus:border-[#F26E1D]"
                  {...register("email")} />
                {errors.email && <p className="text-red-500 text-xs">{errors.email.message}</p>}
              </div>
              <div className="space-y-1.5">
                <label className="text-sm font-semibold text-gray-700">Observações</label>
                <textarea placeholder="Algum detalhe importante?" rows={2}
                  className="w-full rounded-xl border border-gray-200 bg-white px-3 py-2.5 text-sm text-gray-900 focus:outline-none focus:border-[#F26E1D] resize-none"
                  {...register("observacoes")} />
              </div>
              <button type="submit" disabled={loading}
                className="w-full py-3.5 rounded-xl bg-[#F26E1D] text-white font-black text-base hover:bg-[#e05e10] transition-colors disabled:opacity-50 flex items-center justify-center gap-2">
                {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Check className="w-5 h-5" />}
                {loading ? "Agendando..." : "Confirmar agendamento"}
              </button>
            </form>
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="max-w-lg mx-auto px-4 pb-8 text-center">
        <div className="flex items-center justify-center gap-2 text-xs text-gray-300">
          <LogoIcon size={16} />
          <span>Agendamento online por <strong>Bora Gerir</strong></span>
        </div>
      </div>
    </div>
  )
}
