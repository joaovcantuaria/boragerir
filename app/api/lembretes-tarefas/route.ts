import { NextRequest, NextResponse } from "next/server"
import { createAdminClient } from "@/lib/supabase/admin"
import { getEmpresaAtiva } from "@/lib/get-empresa-ativa"
import { rateLimit } from "@/lib/security/rate-limit"
import { normalizarTelefoneDDI } from "@/lib/webhook/n8n"
import { enviarTipo } from "@/lib/lembretes-tarefas/motor"
import { PLANOS_COM_LEMBRETES, agoraSaoPaulo } from "@/lib/lembretes-tarefas/regras"

// Lembretes de tarefas pelo WhatsApp do Bora Gerir (Tarefas → "Lembretes no WhatsApp")

async function contexto() {
  const { user, empresa } = await getEmpresaAtiva()
  if (!user) return { erro: NextResponse.json({ erro: "Não autenticado" }, { status: 401 }) }
  if (!empresa) return { erro: NextResponse.json({ erro: "Empresa não encontrada" }, { status: 404 }) }
  return { user, empresa, disponivel: PLANOS_COM_LEMBRETES.includes(empresa.plano) && empresa.plano_ativo }
}

// GET — configuração atual e últimos envios
export async function GET() {
  const c = await contexto()
  if ("erro" in c) return c.erro
  const admin = createAdminClient()
  const [{ data: config }, { data: envios }] = await Promise.all([
    admin.from("lembretes_tarefas_config").select("ativo, telefone, nome, hora_resumo, resumo, vespera, atraso").eq("empresa_id", c.empresa.id).maybeSingle(),
    admin.from("lembretes_tarefas_envios").select("tipo, status, detalhe, created_at").eq("empresa_id", c.empresa.id).order("created_at", { ascending: false }).limit(10),
  ])
  return NextResponse.json({
    disponivel: c.disponivel,
    config: config ?? { ativo: false, telefone: c.empresa.telefone || "", nome: "", hora_resumo: "08:00", resumo: true, vespera: true, atraso: true },
    envios: envios || [],
  })
}

// PUT — salvar (ativar exige aceite)
export async function PUT(req: NextRequest) {
  const c = await contexto()
  if ("erro" in c) return c.erro
  if (!c.disponivel) return NextResponse.json({ erro: "Disponível no plano Profissional" }, { status: 403 })

  const body = await req.json().catch(() => ({}))
  const telefone = normalizarTelefoneDDI(String(body.telefone || ""))
  if (!/^55\d{2}9\d{8}$/.test(telefone)) return NextResponse.json({ erro: "Informe um celular com DDD (ex.: 38 99999-9999)" }, { status: 400 })
  const nome = String(body.nome || "").trim().slice(0, 60)
  if (!nome) return NextResponse.json({ erro: "Informe como devemos te chamar" }, { status: 400 })
  const hora = typeof body.hora_resumo === "string" && /^([01]\d|2[0-3]):[0-5]\d$/.test(body.hora_resumo) ? body.hora_resumo : "08:00"
  const ativo = !!body.ativo
  if (ativo && !body.aceite) return NextResponse.json({ erro: "Confirme que aceita receber os lembretes" }, { status: 400 })

  const { error } = await createAdminClient().from("lembretes_tarefas_config").upsert({
    empresa_id: c.empresa.id,
    ativo,
    telefone,
    nome,
    hora_resumo: hora,
    resumo: body.resumo !== false,
    vespera: body.vespera !== false,
    atraso: body.atraso !== false,
    ...(ativo ? { aceite_em: new Date().toISOString() } : {}),
    updated_at: new Date().toISOString(),
  }, { onConflict: "empresa_id" })
  if (error) return NextResponse.json({ erro: "Erro ao salvar" }, { status: 500 })
  return NextResponse.json({ sucesso: true })
}

// POST — enviar agora o resumo de teste (para conferir o número e o texto)
export async function POST() {
  const c = await contexto()
  if ("erro" in c) return c.erro
  if (!c.disponivel) return NextResponse.json({ erro: "Disponível no plano Profissional" }, { status: 403 })
  const { allowed } = rateLimit(`teste-lembrete-tarefas:${c.user.id}`, { limit: 3, windowMs: 60 * 60_000 })
  if (!allowed) return NextResponse.json({ erro: "Limite de testes atingido. Tente em 1 hora." }, { status: 429 })

  const admin = createAdminClient()
  const { data: config } = await admin.from("lembretes_tarefas_config")
    .select("empresa_id, telefone, nome, hora_resumo, resumo, vespera, atraso").eq("empresa_id", c.empresa.id).maybeSingle()
  if (!config) return NextResponse.json({ erro: "Salve a configuração antes de testar" }, { status: 400 })

  const { data: tarefas } = await admin.from("tarefas").select("id, titulo, prioridade, prazo, status")
    .eq("empresa_id", c.empresa.id).neq("status", "concluido").not("prazo", "is", null).limit(500)
  // Referência própria do teste: o resumo automático do dia continua saindo normalmente
  const r = await enviarTipo(admin, config, "resumo", (tarefas || []) as never, agoraSaoPaulo().data, `:teste:${Date.now()}`)
  if (!r.enviados) {
    return NextResponse.json({ erro: r.falhas ? "Não foi possível enviar (confira o número e se o template está aprovado)" : "Nenhuma tarefa com prazo para hoje ou atrasada — crie uma para testar" }, { status: 400 })
  }
  return NextResponse.json({ sucesso: true })
}
