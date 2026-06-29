import { MercadoPagoConfig, Payment, PreApproval, PreApprovalPlan } from "mercadopago"

// Cliente Mercado Pago — servidor apenas
export function getMPClient() {
  return new MercadoPagoConfig({
    accessToken: process.env.MERCADOPAGO_ACCESS_TOKEN!,
    options: { timeout: 5000 },
  })
}

// Planos e preços
export const PLANOS_MP = {
  agenda: {
    nome: "Bora Gerir — Agendamento Online",
    mensal: 29.00,
    anual: 290.00,   // 10x R$29 (2 meses grátis)
  },
  basico: {
    nome: "Bora Gerir — Plano Básico",
    mensal: 49.00,
    anual: 490.00,   // 10x R$49 (2 meses grátis)
  },
  profissional: {
    nome: "Bora Gerir — Plano Profissional",
    mensal: 99.00,
    anual: 990.00,   // 10x R$99 (2 meses grátis)
  },
} as const

export type PlanoMP = keyof typeof PLANOS_MP
export type Periodicidade = "mensal" | "anual"

export function calcularValor(plano: PlanoMP, periodicidade: Periodicidade) {
  const info = PLANOS_MP[plano]
  if (periodicidade === "anual") {
    return {
      valorTotal: info.anual,
      valorMensal: info.mensal,
      economia: info.mensal * 2,
      descricao: `${info.nome} — Anual (2 meses grátis)`,
    }
  }
  return {
    valorTotal: info.mensal,
    valorMensal: info.mensal,
    economia: 0,
    descricao: `${info.nome} — Mensal`,
  }
}
