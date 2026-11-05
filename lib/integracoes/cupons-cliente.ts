import crypto from "crypto"
import { createAdminClient } from "@/lib/supabase/admin"
import { hojeEmSaoPaulo } from "@/lib/integracoes/dados-clientes"

/**
 * Cupons de desconto para os clientes da empresa (resgatados no PDV).
 * Criados pelo BoraGerir Chat (aniversário/reativação) via /api/integracoes/chat/v1/cupons.
 */

export type OrigemCupom = "aniversario" | "reativacao" | "manual"
export type TipoCupom = "percentual" | "fixo"

const PREFIXOS: Record<OrigemCupom, string> = { aniversario: "NIVER", reativacao: "VOLTA", manual: "CUPOM" }
// Sem 0/O/1/I para o cliente não confundir ao ditar o código
const ALFABETO = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"

export function gerarCodigo(origem: OrigemCupom): string {
  const bytes = crypto.randomBytes(5)
  const sufixo = Array.from(bytes, (b) => ALFABETO[b % ALFABETO.length]).join("")
  return `${PREFIXOS[origem]}-${sufixo}`
}

export function normalizarCodigo(codigo: string): string {
  return codigo.trim().toUpperCase().replace(/\s+/g, "")
}

// Hoje + N dias, no fuso de São Paulo, como YYYY-MM-DD
export function dataDaquiA(dias: number): string {
  const h = hojeEmSaoPaulo()
  return new Date(Date.UTC(h.ano, h.mes - 1, h.dia + dias)).toISOString().slice(0, 10)
}

export function descontoDoCupom(cupom: { tipo: TipoCupom; valor: number }, subtotal: number): number {
  const bruto = cupom.tipo === "percentual" ? (subtotal * cupom.valor) / 100 : cupom.valor
  return Math.round(Math.max(0, Math.min(bruto, subtotal)) * 100) / 100
}

/**
 * Cria (ou reaproveita) um cupom para o cliente. Se ele já tem um cupom válido e não usado
 * da mesma origem, devolve esse — o Chat pode chamar de novo sem gerar cupons em série.
 */
export async function criarCupomCliente(params: {
  empresaId: string
  clienteId: string
  origem: OrigemCupom
  tipo: TipoCupom
  valor: number
  validadeDias: number
}) {
  const admin = createAdminClient()
  const hoje = dataDaquiA(0)

  const { data: existente } = await admin
    .from("cupons_cliente")
    .select("codigo, tipo, valor, validade")
    .eq("empresa_id", params.empresaId)
    .eq("cliente_id", params.clienteId)
    .eq("origem", params.origem)
    .is("usado_em", null)
    .gte("validade", hoje)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle()
  if (existente) return { ok: true as const, cupom: existente, reaproveitado: true }

  for (let tentativa = 0; tentativa < 3; tentativa++) {
    const { data, error } = await admin
      .from("cupons_cliente")
      .insert({
        empresa_id: params.empresaId,
        cliente_id: params.clienteId,
        codigo: gerarCodigo(params.origem),
        tipo: params.tipo,
        valor: params.valor,
        validade: dataDaquiA(params.validadeDias),
        origem: params.origem,
      })
      .select("codigo, tipo, valor, validade")
      .single()
    if (!error && data) return { ok: true as const, cupom: data, reaproveitado: false }
    if (error?.code !== "23505") break // só repete se o código sorteado já existia
  }
  return { ok: false as const, erro: "Não foi possível criar o cupom" }
}

/** Confere se o cupom pode ser usado agora nesta empresa (e por este cliente, se for nominal). */
export async function validarCupom(empresaId: string, codigo: string, clienteId: string | null) {
  const { data: cupom } = await createAdminClient()
    .from("cupons_cliente")
    .select("id, codigo, tipo, valor, validade, usado_em, cliente_id, clientes(nome_completo)")
    .eq("empresa_id", empresaId)
    .eq("codigo", normalizarCodigo(codigo))
    .maybeSingle()

  if (!cupom) return { ok: false as const, erro: "Cupom não encontrado" }
  if (cupom.usado_em) return { ok: false as const, erro: "Este cupom já foi usado" }
  if (cupom.validade < dataDaquiA(0)) return { ok: false as const, erro: "Este cupom venceu" }
  if (cupom.cliente_id && cupom.cliente_id !== clienteId) {
    const rel = cupom.clientes as { nome_completo: string } | { nome_completo: string }[] | null
    const dono = (Array.isArray(rel) ? rel[0] : rel)?.nome_completo
    return { ok: false as const, erro: `Este cupom é de ${dono || "outro cliente"}. Selecione o cliente na venda.` }
  }
  return { ok: true as const, cupom: { codigo: cupom.codigo, tipo: cupom.tipo, valor: Number(cupom.valor), validade: cupom.validade } }
}

/**
 * Marca como usado numa única operação: o mesmo cupom não vale em duas vendas.
 * Cupom nominal só vale se a venda for do próprio cliente.
 */
export async function usarCupom(empresaId: string, codigo: string, vendaId: string, clienteDaVenda: string | null): Promise<boolean> {
  const { data } = await createAdminClient()
    .from("cupons_cliente")
    .update({ usado_em: new Date().toISOString(), venda_id: vendaId })
    .eq("empresa_id", empresaId)
    .eq("codigo", normalizarCodigo(codigo))
    .is("usado_em", null)
    .gte("validade", dataDaquiA(0))
    .or(clienteDaVenda ? `cliente_id.is.null,cliente_id.eq.${clienteDaVenda}` : "cliente_id.is.null")
    .select("id")
  return !!data && data.length > 0
}
