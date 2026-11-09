/**
 * Código de rastreio das operações financeiras: PP-AAMMDD-NNNNN-D
 * (gerado pelo banco — migration 20261111_codigo_rastreio.sql; aqui só lemos e conferimos).
 */

export const TIPOS_RASTREIO = {
  VD: { tabela: "vendas", rotulo: "Venda", link: "/financeiro" },
  EN: { tabela: "movimentacoes_caixa", rotulo: "Entrada no caixa", link: "/caixa" },
  SA: { tabela: "movimentacoes_caixa", rotulo: "Saída do caixa", link: "/caixa" },
  CX: { tabela: "caixas", rotulo: "Abertura de caixa", link: "/caixa" },
  CP: { tabela: "contas_pagar", rotulo: "Conta a pagar", link: "/financeiro?tab=contaspagar" },
  CR: { tabela: "valores_receber", rotulo: "Valor a receber", link: "/financeiro" },
  DB: { tabela: "debitos_clientes", rotulo: "Débito de cliente", link: "/clientes" },
  PC: { tabela: "contratos_parcelas", rotulo: "Parcela de contrato", link: "/contratos" },
} as const

export type PrefixoRastreio = keyof typeof TIPOS_RASTREIO

/** Mesmo cálculo do banco: pesos 2..9 da direita para a esquerda, módulo 11. */
export function digitoRastreio(numeros: string): string {
  let soma = 0
  let peso = 2
  for (let i = numeros.length - 1; i >= 0; i--) {
    soma += Number(numeros[i]) * peso
    peso = peso === 9 ? 2 : peso + 1
  }
  const resto = 11 - (soma % 11)
  return resto >= 10 ? "0" : String(resto)
}

export type LeituraRastreio =
  | { ok: true; codigo: string; prefixo: PrefixoRastreio }
  | { ok: false; erro: string }

/** Aceita com ou sem traços/espaços e minúsculas; confere tipo e dígito verificador. */
export function lerCodigoRastreio(entrada: string): LeituraRastreio {
  const limpo = (entrada || "").toUpperCase().replace(/[^A-Z0-9]/g, "")
  const m = limpo.match(/^([A-Z]{2})(\d{6})(\d{5})(\d)$/)
  if (!m) return { ok: false, erro: "Formato inválido. Exemplo: VD-261109-00001-4" }
  const [, prefixo, data, seq, digito] = m
  if (!(prefixo in TIPOS_RASTREIO)) return { ok: false, erro: `Tipo "${prefixo}" não existe` }
  if (digitoRastreio(data + seq) !== digito) {
    return { ok: false, erro: "Código não confere (dígito verificador). Confira se foi digitado certo." }
  }
  return { ok: true, codigo: `${prefixo}-${data}-${seq}-${digito}`, prefixo: prefixo as PrefixoRastreio }
}
