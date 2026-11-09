/**
 * Regras do cadastro de fornecedores (usadas pela API e pelos testes).
 */

export const CAMPOS_FORNECEDOR =
  "id, nome, documento, contato, telefone, email, categoria, chave_pix, endereco, observacoes, ativo, created_at"

export const CATEGORIAS_FORNECEDOR = [
  "aluguel", "energia", "agua", "fornecedor", "salario", "marketing", "manutencao", "outros",
] as const

export interface DadosFornecedor {
  nome: string
  documento: string | null
  contato: string | null
  telefone: string | null
  email: string | null
  categoria: string
  chave_pix: string | null
  endereco: string | null
  observacoes: string | null
}

const texto = (v: unknown, max: number): string | null => {
  if (typeof v !== "string") return null
  const t = v.trim()
  return t ? t.slice(0, max) : null
}

export function somenteDigitos(v: string | null): string | null {
  const d = (v ?? "").replace(/\D/g, "")
  return d || null
}

export function validarFornecedor(body: unknown): { dados: DadosFornecedor } | { erro: string } {
  if (!body || typeof body !== "object") return { erro: "Dados inválidos" }
  const b = body as Record<string, unknown>

  const nome = texto(b.nome, 120)
  if (!nome) return { erro: "Informe o nome do fornecedor" }

  const documento = somenteDigitos(texto(b.documento, 30))
  if (documento && documento.length !== 11 && documento.length !== 14) {
    return { erro: "CPF deve ter 11 dígitos e CNPJ 14 dígitos" }
  }

  const email = texto(b.email, 160)
  if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return { erro: "E-mail inválido" }

  const telefone = somenteDigitos(texto(b.telefone, 30))
  if (telefone && (telefone.length < 10 || telefone.length > 13)) return { erro: "Telefone inválido (informe com DDD)" }

  const categoria = typeof b.categoria === "string" && (CATEGORIAS_FORNECEDOR as readonly string[]).includes(b.categoria)
    ? b.categoria : "fornecedor"

  return {
    dados: {
      nome,
      documento,
      contato: texto(b.contato, 120),
      telefone,
      email,
      categoria,
      chave_pix: texto(b.chave_pix, 140),
      endereco: texto(b.endereco, 300),
      observacoes: texto(b.observacoes, 1000),
    },
  }
}

export function formatarDocumento(doc: string | null): string {
  if (!doc) return ""
  if (doc.length === 11) return doc.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, "$1.$2.$3-$4")
  if (doc.length === 14) return doc.replace(/(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})/, "$1.$2.$3/$4-$5")
  return doc
}

export function formatarTelefone(tel: string | null): string {
  if (!tel) return ""
  const d = tel.replace(/^55(?=\d{10,11}$)/, "")
  if (d.length === 11) return d.replace(/(\d{2})(\d{5})(\d{4})/, "($1) $2-$3")
  if (d.length === 10) return d.replace(/(\d{2})(\d{4})(\d{4})/, "($1) $2-$3")
  return tel
}

export interface TotaisFornecedor { em_aberto: number; pago: number; contas: number; proximo_vencimento: string | null }

export const TOTAIS_VAZIOS: TotaisFornecedor = { em_aberto: 0, pago: 0, contas: 0, proximo_vencimento: null }

/** Soma as contas a pagar de cada fornecedor: em aberto, pago e o próximo vencimento pendente. */
export function somarContasPorFornecedor(
  contas: { fornecedor_id: string | null; valor: number | string; valor_pago?: number | string | null; status: string; data_vencimento: string }[],
): Map<string, TotaisFornecedor> {
  const totais = new Map<string, TotaisFornecedor>()
  for (const conta of contas) {
    if (!conta.fornecedor_id) continue
    const t = totais.get(conta.fornecedor_id) ?? { ...TOTAIS_VAZIOS }
    t.contas++
    if (conta.status === "pago") t.pago += Number(conta.valor) || 0
    else {
      const jaPago = Number(conta.valor_pago) || 0
      t.pago += jaPago
      t.em_aberto += Math.max(0, (Number(conta.valor) || 0) - jaPago)
      if (!t.proximo_vencimento || conta.data_vencimento < t.proximo_vencimento) t.proximo_vencimento = conta.data_vencimento
    }
    totais.set(conta.fornecedor_id, t)
  }
  return totais
}
