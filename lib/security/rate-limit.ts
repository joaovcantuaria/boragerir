/**
 * Rate limiter simples baseado em memória (Edge-compatible).
 * Para produção com múltiplas instâncias, substituir por Redis/Upstash.
 */

const store = new Map<string, { count: number; resetAt: number }>()

interface RateLimitOptions {
  /** Número máximo de requisições no intervalo */
  limit: number
  /** Intervalo em milissegundos */
  windowMs: number
}

export function rateLimit(key: string, options: RateLimitOptions): { allowed: boolean; remaining: number } {
  const now = Date.now()
  const entry = store.get(key)

  if (!entry || now > entry.resetAt) {
    store.set(key, { count: 1, resetAt: now + options.windowMs })
    return { allowed: true, remaining: options.limit - 1 }
  }

  if (entry.count >= options.limit) {
    return { allowed: false, remaining: 0 }
  }

  entry.count++
  return { allowed: true, remaining: options.limit - entry.count }
}

/** Extrai o IP do request de forma segura */
export function getIP(req: Request): string {
  const forwarded = (req.headers as Headers).get("x-forwarded-for")
  if (forwarded) return forwarded.split(",")[0].trim()
  return "unknown"
}

/** Sanitiza strings removendo caracteres potencialmente perigosos */
export function sanitizarInput(input: string, maxLen = 500): string {
  return input
    .trim()
    .slice(0, maxLen)
    .replace(/[<>]/g, "") // remove < e > para prevenir XSS básico
}
