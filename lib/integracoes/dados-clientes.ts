import { createAdminClient } from "@/lib/supabase/admin"
import { normalizarTelefoneDDI } from "@/lib/webhook/n8n"

/**
 * Consultas usadas pela API /api/integracoes/chat/v1/* (lidas pelo BoraGerir Chat).
 * Sempre filtradas por empresa_id e sem CPF, e-mail ou valores da empresa.
 */

const DIA_MS = 24 * 60 * 60 * 1000
const PAGINA = 1000 // limite de linhas por requisição do PostgREST

type Admin = ReturnType<typeof createAdminClient>

// ─── Datas (fuso de São Paulo, o servidor roda em UTC) ───────

export interface DataSimples { ano: number; mes: number; dia: number }

export function hojeEmSaoPaulo(agora = new Date()): DataSimples {
  const partes = new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Sao_Paulo", year: "numeric", month: "2-digit", day: "2-digit",
  }).formatToParts(agora)
  const valor = (tipo: string) => Number(partes.find((p) => p.type === tipo)?.value)
  return { ano: valor("year"), mes: valor("month"), dia: valor("day") }
}

const ehBissexto = (ano: number) => (ano % 4 === 0 && ano % 100 !== 0) || ano % 400 === 0

// Dias até o próximo aniversário (0 = hoje). Nascidos em 29/02 comemoram em 28/02 nos anos comuns.
export function diasAteAniversario(dataNascimento: string, hoje: DataSimples): number {
  const [, mes, dia] = dataNascimento.split("-").map(Number)
  const dataNoAno = (ano: number) =>
    Date.UTC(ano, mes - 1, mes === 2 && dia === 29 && !ehBissexto(ano) ? 28 : dia)
  const hojeUtc = Date.UTC(hoje.ano, hoje.mes - 1, hoje.dia)
  let proximo = dataNoAno(hoje.ano)
  if (proximo < hojeUtc) proximo = dataNoAno(hoje.ano + 1)
  return Math.round((proximo - hojeUtc) / DIA_MS)
}

// Idade que a pessoa completa no próximo aniversário
export function idadeNoProximoAniversario(dataNascimento: string, hoje: DataSimples): number {
  const [ano] = dataNascimento.split("-").map(Number)
  const dias = diasAteAniversario(dataNascimento, hoje)
  const anoDoAniversario = new Date(Date.UTC(hoje.ano, hoje.mes - 1, hoje.dia) + dias * DIA_MS).getUTCFullYear()
  return anoDoAniversario - ano
}

export function diasDesde(iso: string, agora = new Date()): number {
  return Math.floor((agora.getTime() - new Date(iso).getTime()) / DIA_MS)
}

// ─── Leitura paginada ────────────────────────────────────────

// O PostgREST devolve no máximo 1000 linhas por vez; percorre todas as páginas
async function buscarTodos<T>(
  pagina: (de: number, ate: number) => PromiseLike<{ data: T[] | null; error: { message: string } | null }>
): Promise<T[]> {
  const todos: T[] = []
  for (let de = 0; ; de += PAGINA) {
    const { data, error } = await pagina(de, de + PAGINA - 1)
    if (error) throw new Error(error.message)
    todos.push(...(data ?? []))
    if (!data || data.length < PAGINA) return todos
  }
}

type ClienteBase = { id: string; nome_completo: string; telefone: string; data_nascimento: string | null; pontos_fidelidade: number }

function buscarClientesAtivos(admin: Admin, empresaId: string) {
  return buscarTodos<ClienteBase>((de, ate) => admin
    .from("clientes")
    .select("id, nome_completo, telefone, data_nascimento, pontos_fidelidade")
    .eq("empresa_id", empresaId)
    .eq("ativo", true)
    .order("id")
    .range(de, ate))
}

// Celular válido para WhatsApp: 55 + DDD + 9 dígitos
function telefoneWhatsApp(telefone: string): string | null {
  const numero = normalizarTelefoneDDI(telefone ?? "")
  return /^55\d{2}9\d{8}$/.test(numero) ? numero : null
}

// Histórico de visitas (vendas concluídas + agendamentos concluídos) por cliente
async function historicoPorCliente(admin: Admin, empresaId: string) {
  const [vendas, agendamentos] = await Promise.all([
    buscarTodos<{ cliente_id: string | null; total: number; created_at: string }>((de, ate) => admin
      .from("vendas")
      .select("cliente_id, total, created_at")
      .eq("empresa_id", empresaId)
      .eq("status", "concluida")
      .not("cliente_id", "is", null)
      .order("id")
      .range(de, ate)),
    buscarTodos<{ cliente_id: string | null; data_hora: string; status: string }>((de, ate) => admin
      .from("agendamentos")
      .select("cliente_id, data_hora, status")
      .eq("empresa_id", empresaId)
      .in("status", ["concluido", "agendado", "confirmado", "solicitado", "espera"])
      .not("cliente_id", "is", null)
      .order("id")
      .range(de, ate)),
  ])

  const agora = Date.now()
  const historico = new Map<string, { ultimaVisita: string | null; totalGasto: number; diasComVisita: Set<string>; temAgendamentoFuturo: boolean }>()
  const doCliente = (id: string) => {
    let h = historico.get(id)
    if (!h) historico.set(id, h = { ultimaVisita: null, totalGasto: 0, diasComVisita: new Set(), temAgendamentoFuturo: false })
    return h
  }
  // Agendamento concluído + venda no mesmo dia contam como uma visita
  const registrarVisita = (h: { ultimaVisita: string | null; diasComVisita: Set<string> }, quando: string) => {
    h.diasComVisita.add(quando.slice(0, 10))
    if (!h.ultimaVisita || quando > h.ultimaVisita) h.ultimaVisita = quando
  }

  for (const v of vendas) {
    const h = doCliente(v.cliente_id!)
    h.totalGasto += Number(v.total) || 0
    registrarVisita(h, v.created_at)
  }
  for (const a of agendamentos) {
    const h = doCliente(a.cliente_id!)
    if (a.status === "concluido") registrarVisita(h, a.data_hora)
    else if (new Date(a.data_hora).getTime() >= agora) h.temAgendamentoFuturo = true
  }
  return historico
}

// ─── Endpoints ───────────────────────────────────────────────

export async function buscarAniversariantes(empresaId: string, dias: number) {
  const admin = createAdminClient()
  const hoje = hojeEmSaoPaulo()
  const clientes = await buscarClientesAtivos(admin, empresaId)

  return clientes
    .filter((c) => c.data_nascimento)
    .map((c) => ({ c, telefone: telefoneWhatsApp(c.telefone), dias: diasAteAniversario(c.data_nascimento!, hoje) }))
    .filter(({ telefone, dias: d }) => telefone && d <= dias)
    .sort((a, b) => a.dias - b.dias || a.c.nome_completo.localeCompare(b.c.nome_completo))
    .map(({ c, telefone, dias: d }) => ({
      id: c.id,
      nome: c.nome_completo,
      telefone,
      data_nascimento: c.data_nascimento,
      dias_ate_aniversario: d,
      idade: idadeNoProximoAniversario(c.data_nascimento!, hoje),
      pontos_fidelidade: c.pontos_fidelidade,
    }))
}

export async function buscarInativos(empresaId: string, dias: number, limite: number) {
  const admin = createAdminClient()
  const [clientes, historico] = await Promise.all([
    buscarClientesAtivos(admin, empresaId),
    historicoPorCliente(admin, empresaId),
  ])

  return clientes
    .map((c) => ({ c, h: historico.get(c.id), telefone: telefoneWhatsApp(c.telefone) }))
    // Só quem já veio alguma vez, sumiu há "dias" ou mais e não tem horário marcado
    .filter(({ h, telefone }) => telefone && h?.ultimaVisita && !h.temAgendamentoFuturo && diasDesde(h.ultimaVisita) >= dias)
    .sort((a, b) => b.h!.ultimaVisita!.localeCompare(a.h!.ultimaVisita!))
    .slice(0, limite)
    .map(({ c, h, telefone }) => ({
      id: c.id,
      nome: c.nome_completo,
      telefone,
      ultima_visita: h!.ultimaVisita,
      dias_sem_visita: diasDesde(h!.ultimaVisita!),
      total_visitas: h!.diasComVisita.size,
      total_gasto: Math.round(h!.totalGasto * 100) / 100,
      pontos_fidelidade: c.pontos_fidelidade,
    }))
}

// Relação embutida: o PostgREST devolve objeto (muitos-para-um), mas o tipo gerado pode vir como lista
function nomeServico(rel: { nome: string } | { nome: string }[] | null): string | null {
  return (Array.isArray(rel) ? rel[0]?.nome : rel?.nome) ?? null
}

export async function buscarResumoCliente(empresaId: string, telefone: string) {
  const admin = createAdminClient()
  const alvo = normalizarTelefoneDDI(telefone)
  const clientes = await buscarClientesAtivos(admin, empresaId)
  const cliente = clientes.find((c) => normalizarTelefoneDDI(c.telefone ?? "") === alvo)
  if (!cliente) return null

  const [{ data: vendas }, { data: agendamentos }] = await Promise.all([
    admin.from("vendas")
      .select("id, total, created_at")
      .eq("empresa_id", empresaId).eq("cliente_id", cliente.id).eq("status", "concluida")
      .order("created_at", { ascending: false }),
    admin.from("agendamentos")
      .select("data_hora, status, produtos_servicos(nome)")
      .eq("empresa_id", empresaId).eq("cliente_id", cliente.id)
      .in("status", ["concluido", "agendado", "confirmado", "solicitado", "espera"])
      .order("data_hora", { ascending: false }),
  ])

  const idsVendas = (vendas ?? []).map((v) => v.id)
  const { data: itens } = idsVendas.length
    ? await admin.from("itens_venda").select("nome_item, quantidade").eq("empresa_id", empresaId).in("venda_id", idsVendas)
    : { data: [] as { nome_item: string; quantidade: number }[] }

  // Favoritos: itens comprados + serviços de agendamentos concluídos
  const contagem = new Map<string, number>()
  for (const i of itens ?? []) contagem.set(i.nome_item, (contagem.get(i.nome_item) ?? 0) + (Number(i.quantidade) || 1))
  const agora = Date.now()
  const concluidos = (agendamentos ?? []).filter((a) => a.status === "concluido")
  for (const a of concluidos) {
    const nome = nomeServico(a.produtos_servicos)
    if (nome) contagem.set(nome, (contagem.get(nome) ?? 0) + 1)
  }
  const favoritos = [...contagem.entries()].sort((a, b) => b[1] - a[1]).slice(0, 3).map(([nome]) => nome)

  const visitas = [...(vendas ?? []).map((v) => v.created_at), ...concluidos.map((a) => a.data_hora)].sort()
  const ultimaVisita = visitas.at(-1) ?? null
  const proximo = (agendamentos ?? [])
    .filter((a) => a.status !== "concluido" && new Date(a.data_hora).getTime() >= agora)
    .sort((a, b) => a.data_hora.localeCompare(b.data_hora))[0]
  const hoje = hojeEmSaoPaulo()

  return {
    id: cliente.id,
    nome: cliente.nome_completo,
    telefone: telefoneWhatsApp(cliente.telefone) ?? alvo,
    data_nascimento: cliente.data_nascimento,
    dias_ate_aniversario: cliente.data_nascimento ? diasAteAniversario(cliente.data_nascimento, hoje) : null,
    pontos_fidelidade: cliente.pontos_fidelidade,
    total_visitas: new Set(visitas.map((v) => v.slice(0, 10))).size,
    total_gasto: Math.round((vendas ?? []).reduce((s, v) => s + (Number(v.total) || 0), 0) * 100) / 100,
    ultima_visita: ultimaVisita,
    dias_sem_visita: ultimaVisita ? diasDesde(ultimaVisita) : null,
    servicos_favoritos: favoritos,
    proximo_agendamento: proximo
      ? { data_hora: proximo.data_hora, servico: nomeServico(proximo.produtos_servicos), status: proximo.status }
      : null,
  }
}
