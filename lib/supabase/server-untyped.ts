import { createServerClient } from "@supabase/ssr"
import { cookies } from "next/headers"

/**
 * Cliente Supabase sem tipagem genérica estrita.
 * Use nas Server Pages para evitar problemas de inferência "never"
 * com redirect() não reconhecido como terminador de fluxo pelo TypeScript.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function createUntypedClient(): Promise<any> {
  const cookieStore = await cookies()

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll()
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }: { name: string; value: string; options: object }) =>
              cookieStore.set(name, value, options)
            )
          } catch {
            // ignorado em Server Components
          }
        },
      },
    }
  )
}
