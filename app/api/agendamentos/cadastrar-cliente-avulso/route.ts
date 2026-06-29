import { NextRequest, NextResponse } from "next/server"
import { createAdminClient } from "@/lib/supabase/admin"
import { rateLimit, getIP, sanitizarInput } from "@/lib/security/rate-limit"

export async function POST(req: NextRequest) {
  // Rate limit: máx 20 cadastros por IP por minuto
  const ip = getIP(req)
  const { allowed } = rateLimit(`cadastrar-cliente:${ip}`, { limit: 20, windowMs: 60_000 })
  if (!allowed) {
    return NextResponse.json({ erro: "Muitas requisições. Tente novamente em breve." }, { status: 429 })
  }

  try {
    const body = await req.json()
    const { empresa_id, email, data_hora } = body

    // Sanitizar inputs de texto livre
    const nome = sanitizarInput(String(body.nome ?? ""), 100)
    const telefone = String(body.telefone ?? "").replace(/\D/g, "").slice(0, 15)

    if (!empresa_id || !nome || !telefone) {
      return NextResponse.json({ erro: "Dados insuficientes" }, { status: 400 })
    }

    // Validar que empresa_id é um UUID válido para evitar injection
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
    if (!uuidRegex.test(empresa_id)) {
      return NextResponse.json({ erro: "Dados inválidos" }, { status: 400 })
    }

    const supabase = createAdminClient()

    const telefoneLimpo = telefone
    const telefoneFormatado = telefoneLimpo.length === 11
      ? `(${telefoneLimpo.slice(0,2)}) ${telefoneLimpo.slice(2,7)}-${telefoneLimpo.slice(7)}`
      : telefoneLimpo.length === 10
      ? `(${telefoneLimpo.slice(0,2)}) ${telefoneLimpo.slice(2,6)}-${telefoneLimpo.slice(6)}`
      : telefoneLimpo

    let { data: existente } = await supabase
      .from("clientes")
      .select("id, email")
      .eq("empresa_id", empresa_id)
      .or(`telefone.eq.${telefoneLimpo},telefone.eq.${telefoneFormatado}`)
      .maybeSingle()

    if (!existente && email) {
      const emailSanitizado = sanitizarInput(String(email), 200)
      const { data: porEmail } = await supabase
        .from("clientes")
        .select("id, email")
        .eq("empresa_id", empresa_id)
        .eq("email", emailSanitizado)
        .maybeSingle()
      existente = porEmail
    }

    let clienteId: string

    if (existente) {
      clienteId = existente.id
      if (email) {
        await supabase
          .from("clientes")
          .update({ email: sanitizarInput(String(email), 200) })
          .eq("id", clienteId)
          .is("email", null)
      }
    } else {
      const cpfFicticio = `ONLINE-${telefoneLimpo}`
      const { data: novoCliente, error } = await supabase
        .from("clientes")
        .insert({
          empresa_id,
          nome_completo: nome,
          cpf: cpfFicticio,
          telefone: telefoneLimpo,
          email: email ? sanitizarInput(String(email), 200) : null,
          observacoes: "Cadastrado automaticamente via agendamento online.",
          ativo: true,
          pontos_fidelidade: 0,
        })
        .select("id")
        .single()

      if (error) {
        console.error("Erro ao cadastrar cliente avulso:", error.code)
        return NextResponse.json({ erro: "Erro ao cadastrar" }, { status: 500 })
      }

      clienteId = novoCliente.id
    }

    if (data_hora) {
      const { data: agendamento } = await supabase
        .from("agendamentos")
        .select("id")
        .eq("empresa_id", empresa_id)
        .or(`telefone_cliente_avulso.eq.${telefoneLimpo},telefone_cliente_avulso.eq.${telefoneFormatado}`)
        .eq("data_hora", data_hora)
        .is("cliente_id", null)
        .maybeSingle()

      if (agendamento) {
        await supabase
          .from("agendamentos")
          .update({ cliente_id: clienteId })
          .eq("id", agendamento.id)
      }
    }

    return NextResponse.json({ sucesso: true, cliente_id: clienteId })
  } catch (err) {
    console.error("Erro ao cadastrar cliente avulso")
    return NextResponse.json({ erro: "Erro interno" }, { status: 500 })
  }
}
