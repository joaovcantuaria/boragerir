import crypto from "crypto"
import { promisify } from "util"
import { createAdminClient } from "@/lib/supabase/admin"

/**
 * PIN de gerente, senha de administrador local e senhas de colaborador.
 *  - Hash forte: scrypt com sal ("scrypt$N$r$p$sal$hash").
 *  - Hashes antigos (SHA-256 puro) ainda são aceitos e trocados no próximo uso.
 *  - Os hashes ficam em tabelas que só o servidor lê (migration 20261117);
 *    nas colunas antigas fica só um marcador. Antes dessa migration, cai no
 *    comportamento antigo (coluna com o hash) — nada quebra em nenhuma ordem.
 */

const scryptAsync = promisify(crypto.scrypt) as (senha: string, sal: Buffer, tamanho: number, opcoes: crypto.ScryptOptions) => Promise<Buffer>
const N = 16384, R = 8, P = 1, TAMANHO = 32

export const MARCADOR_PIN = "configurado"
export const MARCADOR_SENHA_ADMIN = "configurada"
export const MARCADOR_SENHA_FUNCIONARIO = "definida"

export async function gerarHash(segredo: string): Promise<string> {
  const sal = crypto.randomBytes(16)
  const hash = await scryptAsync(segredo, sal, TAMANHO, { N, r: R, p: P })
  return `scrypt$${N}$${R}$${P}$${sal.toString("base64")}$${hash.toString("base64")}`
}

function iguais(a: Buffer, b: Buffer) {
  return a.length === b.length && crypto.timingSafeEqual(a, b)
}

/** Confere o segredo. `atualizar` = era hash antigo e deve ser regravado no formato novo. */
export async function conferirHash(segredo: string, salvo: string | null | undefined): Promise<{ ok: boolean; atualizar: boolean }> {
  if (!salvo) return { ok: false, atualizar: false }
  if (salvo.startsWith("scrypt$")) {
    const [, n, r, p, salB64, hashB64] = salvo.split("$")
    const esperado = Buffer.from(hashB64 ?? "", "base64")
    if (!esperado.length) return { ok: false, atualizar: false }
    const calculado = await scryptAsync(segredo, Buffer.from(salB64 ?? "", "base64"), esperado.length, { N: Number(n), r: Number(r), p: Number(p) })
    return { ok: iguais(calculado, esperado), atualizar: false }
  }
  // legado: SHA-256 hex sem sal
  const antigo = crypto.createHash("sha256").update(segredo).digest("hex")
  const ok = iguais(Buffer.from(antigo), Buffer.from(salvo))
  return { ok, atualizar: ok }
}

const legado = (valor: string | null | undefined, marcador: string) => (valor && valor !== marcador ? valor : null)

// ── Empresa: PIN de gerente, senha admin local, código de reset do PIN ──

export interface SegredosEmpresa {
  pinHash: string | null
  senhaAdminHash: string | null
  reset: { hash: string; expira: Date } | null
}

export async function lerSegredosEmpresa(empresaId: string): Promise<SegredosEmpresa> {
  const admin = createAdminClient()
  const [{ data: seg }, { data: emp }] = await Promise.all([
    admin.from("empresa_segredos").select("pin_hash, senha_admin_hash, reset_pin_hash, reset_pin_expira").eq("empresa_id", empresaId).maybeSingle(),
    admin.from("empresas").select("pin_gerente, senha_admin, restricoes_acesso").eq("id", empresaId).maybeSingle(),
  ])
  const restricoes = (emp?.restricoes_acesso ?? {}) as Record<string, unknown>
  const resetAntigo = restricoes._reset_pin as { hash?: string; expira?: number } | undefined
  return {
    pinHash: seg?.pin_hash ?? legado(emp?.pin_gerente, MARCADOR_PIN),
    senhaAdminHash: seg?.senha_admin_hash ?? legado(emp?.senha_admin, MARCADOR_SENHA_ADMIN),
    reset: seg?.reset_pin_hash && seg.reset_pin_expira
      ? { hash: seg.reset_pin_hash, expira: new Date(seg.reset_pin_expira) }
      : resetAntigo?.hash && resetAntigo.expira
        ? { hash: resetAntigo.hash, expira: new Date(resetAntigo.expira) }
        : null,
  }
}

/**
 * Grava segredos da empresa. Campo ausente = não mexe; `null` = apaga.
 * Retorna o que deve ir nas colunas antigas de `empresas` (marcador, ou o hash se a tabela nova ainda não existir).
 */
export async function salvarSegredosEmpresa(
  empresaId: string,
  campos: { pinHash?: string | null; senhaAdminHash?: string | null; reset?: { hash: string; expira: Date } | null },
): Promise<void> {
  const admin = createAdminClient()
  const linha: Record<string, unknown> = { empresa_id: empresaId, updated_at: new Date().toISOString() }
  if ("pinHash" in campos) linha.pin_hash = campos.pinHash
  if ("senhaAdminHash" in campos) linha.senha_admin_hash = campos.senhaAdminHash
  if ("reset" in campos) {
    linha.reset_pin_hash = campos.reset?.hash ?? null
    linha.reset_pin_expira = campos.reset?.expira.toISOString() ?? null
  }
  const { error } = await admin.from("empresa_segredos").upsert(linha, { onConflict: "empresa_id" })
  const tabelaNova = !error

  const empresa: Record<string, unknown> = {}
  if ("pinHash" in campos) empresa.pin_gerente = campos.pinHash ? (tabelaNova ? MARCADOR_PIN : campos.pinHash) : null
  if ("senhaAdminHash" in campos) empresa.senha_admin = campos.senhaAdminHash ? (tabelaNova ? MARCADOR_SENHA_ADMIN : campos.senhaAdminHash) : null
  if ("reset" in campos) {
    // remove o formato antigo; sem a tabela nova, guarda nele
    const { data: emp } = await admin.from("empresas").select("restricoes_acesso").eq("id", empresaId).maybeSingle()
    const { _reset_pin: _antigo, ...resto } = ((emp?.restricoes_acesso ?? {}) as Record<string, unknown>)
    void _antigo
    empresa.restricoes_acesso = !tabelaNova && campos.reset
      ? { ...resto, _reset_pin: { hash: campos.reset.hash, expira: campos.reset.expira.getTime() } }
      : resto
  }
  if (Object.keys(empresa).length > 0) {
    const { error: erroEmpresa } = await admin.from("empresas").update(empresa).eq("id", empresaId)
    if (erroEmpresa) throw new Error(erroEmpresa.message)
  }
}

// ── Colaborador ──

export async function lerSenhaFuncionario(funcionarioId: string, valorColuna: string | null | undefined): Promise<string | null> {
  const { data } = await createAdminClient().from("funcionario_senhas").select("senha_hash").eq("funcionario_id", funcionarioId).maybeSingle()
  return data?.senha_hash ?? legado(valorColuna, MARCADOR_SENHA_FUNCIONARIO)
}

/** Grava a senha do colaborador e devolve o valor para a coluna funcionarios.senha_hash. */
export async function salvarSenhaFuncionario(funcionarioId: string, empresaId: string, senha: string): Promise<string> {
  const hash = await gerarHash(senha)
  const { error } = await createAdminClient().from("funcionario_senhas").upsert(
    { funcionario_id: funcionarioId, empresa_id: empresaId, senha_hash: hash, updated_at: new Date().toISOString() },
    { onConflict: "funcionario_id" },
  )
  return error ? hash : MARCADOR_SENHA_FUNCIONARIO
}
