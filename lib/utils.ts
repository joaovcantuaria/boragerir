import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

// ============================================================
// Configurações do App — Bora Gerir
// ============================================================
export const APP_CONFIG = {
  nome: "Bora Gerir",
  slogan: "Gestão simples. Resultado de verdade.",
  site: "https://app.boragerir.com",
  corPrimaria: "#F26E1D",
  corDestructive: "#EF4444",
  corSucesso: "#22C55E",
}

// Formatar moeda brasileira
export function formatarMoeda(valor: number): string {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(valor)
}

// Formatar CPF
export function formatarCPF(cpf: string): string {
  const n = cpf.replace(/\D/g, "")
  if (n.length !== 11) return cpf
  return n.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, "$1.$2.$3-$4")
}

// Validar CPF
export function validarCPF(cpf: string): boolean {
  const n = cpf.replace(/\D/g, "")
  if (n.length !== 11 || /^(\d)\1+$/.test(n)) return false
  let s = 0
  for (let i = 0; i < 9; i++) s += parseInt(n[i]) * (10 - i)
  let d1 = (s * 10) % 11
  if (d1 === 10 || d1 === 11) d1 = 0
  if (d1 !== parseInt(n[9])) return false
  s = 0
  for (let i = 0; i < 10; i++) s += parseInt(n[i]) * (11 - i)
  let d2 = (s * 10) % 11
  if (d2 === 10 || d2 === 11) d2 = 0
  return d2 === parseInt(n[10])
}

// Formatar CNPJ
export function formatarCNPJ(cnpj: string): string {
  const n = cnpj.replace(/\D/g, "")
  if (n.length !== 14) return cnpj
  return n.replace(/(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})/, "$1.$2.$3/$4-$5")
}

// Validar CNPJ
export function validarCNPJ(cnpj: string): boolean {
  const n = cnpj.replace(/\D/g, "")
  if (n.length !== 14 || /^(\d)\1+$/.test(n)) return false
  const calc = (c: string, arr: number[]) =>
    arr.reduce((s, m, i) => s + parseInt(c[i]) * m, 0)
  const r1 = calc(n, [5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2]) % 11
  const d1 = r1 < 2 ? 0 : 11 - r1
  const r2 = calc(n, [6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2]) % 11
  const d2 = r2 < 2 ? 0 : 11 - r2
  return d1 === parseInt(n[12]) && d2 === parseInt(n[13])
}

// Formatar telefone
export function formatarTelefone(t: string): string {
  const n = t.replace(/\D/g, "")
  if (n.length === 11) return n.replace(/(\d{2})(\d{5})(\d{4})/, "($1) $2-$3")
  if (n.length === 10) return n.replace(/(\d{2})(\d{4})(\d{4})/, "($1) $2-$3")
  return t
}

// Formatar CEP
export function formatarCEP(cep: string): string {
  const n = cep.replace(/\D/g, "")
  return n.replace(/(\d{5})(\d{3})/, "$1-$2")
}

// Margem de lucro
export function calcularMargem(preco: number, custo: number): number {
  if (!preco) return 0
  return ((preco - custo) / preco) * 100
}

// Formatar data
export function formatarData(data: string | Date): string {
  const d = typeof data === "string" ? new Date(data) : data
  return new Intl.DateTimeFormat("pt-BR").format(d)
}

// Formatar data e hora
export function formatarDataHora(data: string | Date): string {
  const d = typeof data === "string" ? new Date(data) : data
  return new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit", month: "2-digit", year: "numeric",
    hour: "2-digit", minute: "2-digit",
  }).format(d)
}

// Aniversário
export function eAniversarianteHoje(dataNascimento: string): boolean {
  if (!dataNascimento) return false
  const hoje = new Date()
  const n = new Date(dataNascimento)
  return n.getDate() === hoje.getDate() && n.getMonth() === hoje.getMonth()
}

export function eAniversarianteEstaSemana(dataNascimento: string): boolean {
  if (!dataNascimento) return false
  const hoje = new Date()
  const n = new Date(dataNascimento)
  const proxAno = new Date(hoje.getFullYear(), n.getMonth(), n.getDate())
  const diff = Math.ceil((proxAno.getTime() - hoje.getTime()) / (1000 * 60 * 60 * 24))
  return diff >= 0 && diff <= 7
}

// WhatsApp
export function gerarLinkWhatsApp(telefone: string, mensagem: string): string {
  const n = telefone.replace(/\D/g, "")
  const num = n.startsWith("55") ? n : `55${n}`
  return `https://wa.me/${num}?text=${encodeURIComponent(mensagem)}`
}

// Texto
export function truncar(texto: string, limite: number): string {
  return texto.length <= limite ? texto : `${texto.substring(0, limite)}...`
}

export function gerarIniciais(nome: string): string {
  return nome.split(" ").filter(Boolean).slice(0, 2).map((n) => n[0].toUpperCase()).join("")
}

// Cores de status
export const coresStatus: Record<string, string> = {
  agendado: "bg-blue-500/10 text-blue-600 border-blue-500/20",
  confirmado: "bg-green-500/10 text-green-600 border-green-500/20",
  concluido: "bg-emerald-500/10 text-emerald-600 border-emerald-500/20",
  cancelado: "bg-red-500/10 text-red-600 border-red-500/20",
  faltou: "bg-orange-500/10 text-orange-600 border-orange-500/20",
  pendente: "bg-yellow-500/10 text-yellow-600 border-yellow-500/20",
  aprovado: "bg-green-500/10 text-green-600 border-green-500/20",
  recusado: "bg-red-500/10 text-red-600 border-red-500/20",
  expirado: "bg-gray-500/10 text-gray-500 border-gray-500/20",
  aberto: "bg-orange-500/10 text-orange-600 border-orange-500/20",
  fechado: "bg-gray-500/10 text-gray-500 border-gray-500/20",
  concluida: "bg-emerald-500/10 text-emerald-600 border-emerald-500/20",
}

export const labelsStatus: Record<string, string> = {
  agendado: "Agendado", confirmado: "Confirmado", concluido: "Concluído",
  cancelado: "Cancelado", faltou: "Faltou", pendente: "Pendente",
  aprovado: "Aprovado", recusado: "Recusado", expirado: "Expirado",
  aberto: "Aberto", fechado: "Fechado", concluida: "Concluída",
}

export const labelsFormaPagamento: Record<string, string> = {
  dinheiro: "Dinheiro", cartao_credito: "Cartão de Crédito",
  cartao_debito: "Cartão de Débito", pix: "Pix", outro: "Outro",
}

// Áreas de atuação — Beleza, Serviços, Comércio, Tecnologia e mais
export const areasAtuacao = [
  // ── Beleza & Estética ──────────────────────────
  "Salão de Beleza",
  "Barbearia",
  "Estúdio de Estética",
  "Clínica de Estética",
  "Manicure e Pedicure",
  "Estúdio de Sobrancelha",
  "Estúdio de Tatuagem e Piercing",
  "Maquiagem e Caracterização",
  "Depilação",
  "Spa e Relaxamento",

  // ── Saúde & Bem-estar ──────────────────────────
  "Academia e Musculação",
  "Personal Trainer",
  "Nutricionista",
  "Psicólogo",
  "Fisioterapeuta",
  "Massoterapia",
  "Yoga e Pilates",
  "Studio de Dança",

  // ── Serviços domésticos & Construção ──────────
  "Eletricista",
  "Encanador",
  "Pintor",
  "Marceneiro / Carpinteiro",
  "Pedreiro / Construção",
  "Engenharia Civil",
  "Engenharia Elétrica",
  "Engenharia Mecânica",
  "Arquitetura e Urbanismo",
  "Jardineiro / Paisagismo",
  "Dedetizador",
  "Ar-condicionado / Refrigeração",
  "Chaveiro",
  "Limpeza Residencial / Comercial",
  "Mudança e Frete",
  "Marido de Aluguel",

  // ── Tecnologia & Criatividade ─────────────────
  "Fotógrafo",
  "Videomaker / Filmagem",
  "Designer Gráfico",
  "Publicitário / Marketing",
  "Desenvolvedor / TI",
  "Social Media",
  "Produtor de Conteúdo",
  "Assessoria de Imprensa",

  // ── Educação & Consultoria ────────────────────
  "Professor Particular / Reforço",
  "Escola de Idiomas",
  "Consultoria Empresarial",
  "Contador / Contabilidade",
  "Advogado",
  "Corretor de Imóveis",
  "Corretor de Seguros",
  "Coach / Mentoria",

  // ── Alimentação ───────────────────────────────
  "Restaurante / Lanchonete",
  "Confeitaria / Padaria",
  "Marmitex / Marmita Fitness",
  "Food Truck",
  "Bar / Pub",
  "Buffet / Eventos",
  "Delivery de Comida",

  // ── Comércio ──────────────────────────────────
  "Loja de Roupas / Moda",
  "Loja de Calçados",
  "Loja de Acessórios",
  "Mercadinho / Mercearia",
  "Farmácia / Drogaria",
  "Loja de Cosméticos",
  "Livraria / Papelaria",
  "Loja de Eletrônicos",
  "Loja de Presentes",

  // ── Veículos ──────────────────────────────────
  "Mecânico / Oficina",
  "Estética Automotiva",

  // ── Pets ──────────────────────────────────────
  "Pet Shop",
  "Banho e Tosa",
  "Veterinário",
  "Adestrador",

  // ── Eventos ───────────────────────────────────
  "Decoração de Festas",
  "DJ / Sonorização",
  "Cerimonialista",
  "Aluguel de Fantasias / Figurinos",

  // ── Outros ────────────────────────────────────
  "Outros",
]
