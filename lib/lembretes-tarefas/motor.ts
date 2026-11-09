import { createAdminClient } from "@/lib/supabase/admin"
import { enviarTemplateBoraGerir } from "@/lib/whatsapp/boragerir-chat"
import { payloadDoBotao } from "@/lib/lembretes-tarefas/acoes"
import {
  HORA_COBRANCA, HORA_VESPERA, PLANOS_COM_LEMBRETES, ROTULO_PRIORIDADE,
  agoraSaoPaulo, atrasadasParaCobrar, diasEntre, limparVariavel, listaCompacta, passouDoHorario,
  primeiroNome, tarefasAtrasadas, tarefasDeAmanha, tarefasDeHoje,
  type TarefaLembrete, type TipoLembrete,
} from "@/lib/lembretes-tarefas/regras"

/**
 * Motor dos lembretes de tarefas (chamado a cada 15 min por /api/cron/lembretes-tarefas).
 * Envia pelo WhatsApp do Bora Gerir, por template aprovado (categoria Utilidade):
 *   tarefas_resumo_diario  {{1}} nome · {{2}} tarefas de hoje · {{3}} atrasadas
 *   tarefas_vespera        {{1}} nome · {{2}} tarefas de amanhã
 *   tarefas_atraso         {{1}} nome · {{2}} tarefa · {{3}} prioridade · {{4}} dias  + botões Concluí / Adiar 1 dia
 */

export const TEMPLATES: Record<TipoLembrete, string> = {
  resumo: "tarefas_resumo_diario",
  vespera: "tarefas_vespera",
  atraso: "tarefas_atraso",
}

const MAX_COBRANCAS_POR_DIA = 3

type Admin = ReturnType<typeof createAdminClient>

interface Config {
  empresa_id: string
  telefone: string
  nome: string
  hora_resumo: string
  resumo: boolean
  vespera: boolean
  atraso: boolean
}

export async function processarLembretesTarefas(prazo: number) {
  const admin = createAdminClient()
  const resumo = { empresas: 0, enviados: 0, falhas: 0 }
  const agora = agoraSaoPaulo()

  const { data: configs } = await admin
    .from("lembretes_tarefas_config")
    .select("empresa_id, telefone, nome, hora_resumo, resumo, vespera, atraso, empresas!inner(plano, plano_ativo)")
    .eq("ativo", true)
    .in("empresas.plano", PLANOS_COM_LEMBRETES)
    .eq("empresas.plano_ativo", true)

  for (const config of (configs || []) as unknown as Config[]) {
    if (Date.now() > prazo) break
    const devidos: TipoLembrete[] = []
    if (config.resumo && passouDoHorario(agora.hhmm, config.hora_resumo)) devidos.push("resumo")
    if (config.atraso && passouDoHorario(agora.hhmm, HORA_COBRANCA)) devidos.push("atraso")
    if (config.vespera && passouDoHorario(agora.hhmm, HORA_VESPERA)) devidos.push("vespera")
    if (devidos.length === 0) continue

    resumo.empresas++
    const tarefas = await carregarTarefas(admin, config.empresa_id)
    for (const tipo of devidos) {
      const r = await enviarTipo(admin, config, tipo, tarefas, agora.data)
      resumo.enviados += r.enviados
      resumo.falhas += r.falhas
    }
  }
  return resumo
}

async function carregarTarefas(admin: Admin, empresaId: string): Promise<TarefaLembrete[]> {
  const { data } = await admin
    .from("tarefas")
    .select("id, titulo, prioridade, prazo, status")
    .eq("empresa_id", empresaId)
    .neq("status", "concluido")
    .not("prazo", "is", null)
    .limit(500)
  return (data || []) as TarefaLembrete[]
}

/**
 * Envia (no máximo uma vez por referência) os lembretes de um tipo para a empresa.
 * `sufixoReferencia` diferencia envios manuais (teste) dos automáticos do dia.
 */
export async function enviarTipo(admin: Admin, config: Config, tipo: TipoLembrete, tarefas: TarefaLembrete[], hoje: string, sufixoReferencia = "") {
  const conta = { enviados: 0, falhas: 0 }
  const nome = limparVariavel(primeiroNome(config.nome), 40)

  const mensagens: { referencia: string; variaveis: string[]; botoes?: string[] }[] = []
  if (tipo === "resumo") {
    const deHoje = tarefasDeHoje(tarefas, hoje)
    const atrasadas = tarefasAtrasadas(tarefas, hoje)
    if (deHoje.length || atrasadas.length) {
      mensagens.push({ referencia: hoje, variaveis: [nome, limparVariavel(listaCompacta(deHoje)), limparVariavel(listaCompacta(atrasadas))] })
    }
  } else if (tipo === "vespera") {
    const amanha = tarefasDeAmanha(tarefas, hoje)
    if (amanha.length) mensagens.push({ referencia: hoje, variaveis: [nome, limparVariavel(listaCompacta(amanha))] })
  } else {
    for (const t of atrasadasParaCobrar(tarefas, hoje).slice(0, MAX_COBRANCAS_POR_DIA)) {
      mensagens.push({
        referencia: `${t.id}:${hoje}`,
        variaveis: [nome, limparVariavel(t.titulo, 200), ROTULO_PRIORIDADE[t.prioridade], String(diasEntre(t.prazo!, hoje))],
        botoes: [payloadDoBotao("concluir", t.id), payloadDoBotao("adiar", t.id)],
      })
    }
  }

  for (const m of mensagens) {
    // Reserva o envio: a chave única (empresa, tipo, referência) impede repetir
    const referencia = m.referencia + sufixoReferencia
    const { error: reserva } = await admin.from("lembretes_tarefas_envios").insert({
      empresa_id: config.empresa_id, tipo, referencia, status: "enviando",
    })
    if (reserva) continue

    const r = await enviarTemplateBoraGerir(config.telefone, TEMPLATES[tipo], m.variaveis, m.botoes)
    await admin.from("lembretes_tarefas_envios")
      .update({ status: r.sucesso ? "enviado" : "falhou", detalhe: r.sucesso ? null : r.erro })
      .eq("empresa_id", config.empresa_id).eq("tipo", tipo).eq("referencia", referencia)

    if (r.descadastrado) {
      // Respondeu SAIR para o número do Bora Gerir: desliga para não insistir
      await admin.from("lembretes_tarefas_config").update({ ativo: false, updated_at: new Date().toISOString() }).eq("empresa_id", config.empresa_id)
      break
    }
    if (r.sucesso) conta.enviados++
    else conta.falhas++
  }
  return conta
}
