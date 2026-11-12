/**
 * Leitura de extrato bancário (OFX e CSV) para importar no Caixa.
 * Tudo roda no navegador: o arquivo não é enviado para lugar nenhum,
 * só as linhas que o usuário confirmar viram lançamentos.
 * Testado com o formato do Nubank (conta), mas aceita OFX/CSV de outros bancos.
 */

export type FormaExtrato = "pix" | "cartao_debito" | "transferencia" | "boleto" | "debito_conta" | "dinheiro"
export type CategoriaImportacao = "suprimento" | "despesa" | "sangria"

export interface LinhaExtrato {
  /** Identificador da transação no banco (FITID / Identificador) — evita importar duas vezes */
  id: string
  /** YYYY-MM-DD */
  data: string
  descricao: string
  /** Sempre positivo; o sentido está em `tipo` */
  valor: number
  tipo: "entrada" | "saida"
  forma: FormaExtrato
  categoria: CategoriaImportacao
}

export type ResultadoLeitura =
  | { ok: true; formato: "ofx" | "csv"; linhas: LinhaExtrato[]; avisos: string[] }
  | { ok: false; erro: string }

export const ROTULO_FORMA: Record<FormaExtrato, string> = {
  pix: "Pix",
  cartao_debito: "Débito",
  transferencia: "Transferência",
  boleto: "Boleto",
  debito_conta: "Débito em conta",
  dinheiro: "Dinheiro",
}

/** Decodifica o arquivo: UTF-8, ou Windows-1252 (comum em OFX de banco) se o UTF-8 vier quebrado. */
export function decodificarArquivo(buffer: ArrayBuffer): string {
  const utf8 = new TextDecoder("utf-8").decode(buffer)
  if (!utf8.includes("�")) return utf8.replace(/^﻿/, "")
  try {
    return new TextDecoder("windows-1252").decode(buffer)
  } catch {
    return utf8
  }
}

function semAcento(s: string) {
  return s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase()
}

function limparDescricao(s: string) {
  return s.replace(/\s+/g, " ").trim().slice(0, 200)
}

/** "−1.234,56" | "-1234.56" | "30,00" | "30.00" → número com sinal */
export function lerValor(bruto: string): number | null {
  let s = (bruto || "").trim().replace(/[R$\s]/g, "").replace(/−/g, "-")
  if (!s) return null
  let negativo = false
  if (s.startsWith("(") && s.endsWith(")")) { negativo = true; s = s.slice(1, -1) }
  if (s.startsWith("-")) { negativo = true; s = s.slice(1) } else if (s.startsWith("+")) s = s.slice(1)
  const temVirgula = s.includes(","), temPonto = s.includes(".")
  if (temVirgula && temPonto) {
    // o último separador é o decimal
    s = s.lastIndexOf(",") > s.lastIndexOf(".") ? s.replace(/\./g, "").replace(",", ".") : s.replace(/,/g, "")
  } else if (temVirgula) {
    s = s.replace(",", ".")
  } else if (temPonto && !/\.\d{1,2}$/.test(s)) {
    s = s.replace(/\./g, "") // 1.234 = milhar
  }
  if (!/^\d+(\.\d+)?$/.test(s)) return null
  const n = Math.round(parseFloat(s) * 100) / 100
  return negativo ? -n : n
}

/** "12/11/2026" | "2026-11-12" | "20261112..." → "2026-11-12" */
export function lerData(bruto: string): string | null {
  const s = (bruto || "").trim()
  let m = s.match(/^(\d{2})\/(\d{2})\/(\d{4})/)
  let ano: number, mes: number, dia: number
  if (m) { dia = +m[1]; mes = +m[2]; ano = +m[3] }
  else if ((m = s.match(/^(\d{4})-(\d{2})-(\d{2})/))) { ano = +m[1]; mes = +m[2]; dia = +m[3] }
  else if ((m = s.match(/^(\d{4})(\d{2})(\d{2})/))) { ano = +m[1]; mes = +m[2]; dia = +m[3] }
  else return null
  if (ano < 2000 || mes < 1 || mes > 12 || dia < 1 || dia > 31) return null
  const d = new Date(Date.UTC(ano, mes - 1, dia))
  if (d.getUTCMonth() !== mes - 1) return null
  return `${ano}-${String(mes).padStart(2, "0")}-${String(dia).padStart(2, "0")}`
}

/** Reconhece pelo texto do extrato se é Pix, débito, boleto etc. e sugere a categoria. */
export function classificar(descricao: string, valorComSinal: number): Pick<LinhaExtrato, "tipo" | "forma" | "categoria"> {
  const d = semAcento(descricao)
  const tipo: "entrada" | "saida" = valorComSinal >= 0 ? "entrada" : "saida"
  let forma: FormaExtrato = "transferencia"
  if (/\bpix\b/.test(d)) forma = "pix"
  else if (/compra no debito|compra debito|cartao de debito|debito visa|debito master|debito elo|\bdebito\b.*compra|maestro|visa electron/.test(d)) forma = "cartao_debito"
  else if (/boleto/.test(d)) forma = "boleto"
  else if (/tarifa|iof|juros|anuidade|mensalidade|debito automatico|debito em conta|pagamento de fatura|seguro/.test(d)) forma = "debito_conta"
  else if (/deposito|saque/.test(d)) forma = "dinheiro"
  else if (/transfer|\bted\b|\bdoc\b/.test(d)) forma = "transferencia"
  else if (tipo === "saida" && /compra/.test(d)) forma = "cartao_debito"

  let categoria: CategoriaImportacao = tipo === "entrada" ? "suprimento" : "despesa"
  // dinheiro saindo para guardar/investir ou sacar = sangria
  if (tipo === "saida" && /aplicacao|guardad|caixinha|investimento|saque|resgate para/.test(d)) categoria = "sangria"
  return { tipo, forma, categoria }
}

// ── OFX ─────────────────────────────────────────────────────

function tagOfx(bloco: string, tag: string): string {
  const m = bloco.match(new RegExp(`<${tag}>([^<\\r\\n]*)`, "i"))
  return m ? m[1].trim() : ""
}

function decodificarEntidades(s: string) {
  return s.replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&quot;/g, '"').replace(/&apos;/g, "'")
}

function lerOfx(texto: string): ResultadoLeitura {
  const blocos = texto.split(/<STMTTRN>/i).slice(1).map((b) => b.split(/<\/STMTTRN>/i)[0])
  if (blocos.length === 0) return { ok: false, erro: "O arquivo OFX não tem nenhuma movimentação." }
  const linhas: LinhaExtrato[] = []
  const avisos: string[] = []
  for (const bloco of blocos) {
    const data = lerData(tagOfx(bloco, "DTPOSTED"))
    const valor = lerValor(tagOfx(bloco, "TRNAMT"))
    const memo = decodificarEntidades(tagOfx(bloco, "MEMO") || tagOfx(bloco, "NAME") || tagOfx(bloco, "TRNTYPE"))
    if (!data || valor === null) { avisos.push(`Linha ignorada (data ou valor ilegível): ${memo || "sem descrição"}`); continue }
    if (valor === 0) continue
    const descricao = limparDescricao(memo) || "Movimentação do extrato"
    linhas.push({
      id: tagOfx(bloco, "FITID") || "",
      data,
      descricao,
      valor: Math.abs(valor),
      ...classificar(descricao, valor),
    })
  }
  return { ok: true, formato: "ofx", linhas: completarIds(linhas), avisos }
}

// ── CSV ─────────────────────────────────────────────────────

function separarCsv(linha: string, sep: string): string[] {
  const campos: string[] = []
  let atual = "", aspas = false
  for (let i = 0; i < linha.length; i++) {
    const c = linha[i]
    if (aspas) {
      if (c === '"' && linha[i + 1] === '"') { atual += '"'; i++ }
      else if (c === '"') aspas = false
      else atual += c
    } else if (c === '"') aspas = true
    else if (c === sep) { campos.push(atual); atual = "" }
    else atual += c
  }
  campos.push(atual)
  return campos.map((c) => c.trim())
}

function lerCsv(texto: string): ResultadoLeitura {
  const linhasTexto = texto.split(/\r?\n/).filter((l) => l.trim())
  if (linhasTexto.length < 2) return { ok: false, erro: "O arquivo CSV está vazio." }
  const cab = linhasTexto[0]
  const sep = (cab.match(/;/g)?.length ?? 0) > (cab.match(/,/g)?.length ?? 0) ? ";" : ","
  const colunas = separarCsv(cab, sep).map(semAcento)
  const achar = (...nomes: string[]) => colunas.findIndex((c) => nomes.some((n) => c === n || c.startsWith(n)))

  // CSV da fatura do cartão de crédito do Nubank: date,title,amount
  if (colunas.includes("title") && colunas.includes("amount") && colunas.includes("date")) {
    return { ok: false, erro: "Esse é o CSV da fatura do cartão de crédito. Exporte o extrato da CONTA (Nubank → Conta → Extrato → Exportar)." }
  }

  const iData = achar("data", "date", "dt")
  const iValor = achar("valor", "amount", "value", "quantia")
  const iDesc = achar("descricao", "historico", "description", "memo", "lancamento", "title")
  const iId = achar("identificador", "id", "fitid")
  if (iData < 0 || iValor < 0) {
    return { ok: false, erro: "Não encontrei as colunas de data e valor no CSV. Use o extrato da conta exportado pelo banco." }
  }

  const linhas: LinhaExtrato[] = []
  const avisos: string[] = []
  for (const bruta of linhasTexto.slice(1)) {
    const campos = separarCsv(bruta, sep)
    const data = lerData(campos[iData] ?? "")
    const valor = lerValor(campos[iValor] ?? "")
    const desc = iDesc >= 0 ? campos[iDesc] ?? "" : ""
    if (!data || valor === null) { avisos.push(`Linha ignorada (data ou valor ilegível): ${limparDescricao(bruta).slice(0, 80)}`); continue }
    if (valor === 0) continue
    const descricao = limparDescricao(desc) || "Movimentação do extrato"
    linhas.push({
      id: iId >= 0 ? (campos[iId] ?? "") : "",
      data,
      descricao,
      valor: Math.abs(valor),
      ...classificar(descricao, valor),
    })
  }
  return { ok: true, formato: "csv", linhas: completarIds(linhas), avisos }
}

/** Linhas sem identificador do banco ganham um id estável (data|valor|tipo|descrição|ordem). */
function completarIds(linhas: LinhaExtrato[]): LinhaExtrato[] {
  const vistos = new Map<string, number>()
  const usados = new Set<string>()
  return linhas.map((l) => {
    if (l.id && !usados.has(l.id)) { usados.add(l.id); return l }
    if (l.id) { // identificador repetido no mesmo arquivo: deixa único
      let n = 2
      while (usados.has(`${l.id}#${n}`)) n++
      usados.add(`${l.id}#${n}`)
      return { ...l, id: `${l.id}#${n}` }
    }
    const base = `${l.data}|${l.tipo}|${l.valor.toFixed(2)}|${semAcento(l.descricao)}`
    const n = (vistos.get(base) ?? 0) + 1
    vistos.set(base, n)
    return { ...l, id: `h:${base}|${n}` }
  })
}

export function lerExtrato(nomeArquivo: string, texto: string): ResultadoLeitura {
  const nome = nomeArquivo.toLowerCase()
  const pareceOfx = nome.endsWith(".ofx") || /<OFX>|OFXHEADER/i.test(texto.slice(0, 2000))
  if (pareceOfx) return lerOfx(texto)
  if (nome.endsWith(".csv") || nome.endsWith(".txt")) return lerCsv(texto)
  return { ok: false, erro: "Formato não suportado. Envie o extrato em OFX ou CSV." }
}
