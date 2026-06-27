import { NextRequest, NextResponse } from "next/server"
import { createAdminClient } from "@/lib/supabase/admin"

// Cadastra automaticamente o cliente avulso do agendamento público
// na tabela clientes da empresa, evitando duplicatas por telefone.
// Como CPF não é coletado no agendamento público, usa-se um CPF fictício
// no formato "ONLINE-<telefone>" para satisfazer o constraint NOT NULL.

export async function POST(req: NextRequest) {
  try {
    const { empresa_id, nome, telefone, email, data_hora } = await req.json()

    if (!empresa_id || !nome || !telefone) {
      return NextResponse.json({ erro: "Dados insuficientes" }, { status: 400 })
    }

    // Usa admin client para bypass de RLS (operação de sistema, não de usuário)
    const supabase = createAdminClient()

    const telefoneLimpo = telefone.replace(/\D/g, "")
    // Telefone formatado no padrão brasileiro para match com cadastros manuais
    const telefoneFormatado = telefoneLimpo.length === 11
      ? `(${telefoneLimpo.slice(0,2)}) ${telefoneLimpo.slice(2,7)}-${telefoneLimpo.slice(7)}`
      : telefoneLimpo.length === 10
      ? `(${telefoneLimpo.slice(0,2)}) ${telefoneLimpo.slice(2,6)}-${telefoneLimpo.slice(6)}`
      : telefoneLimpo

    // Buscar cliente existente por telefone (limpo ou formatado) ou email
    let { data: existente } = await supabase
      .from("clientes")
      .select("id, email")
      .eq("empresa_id", empresa_id)
      .or(`telefone.eq.${telefoneLimpo},telefone.eq.${telefoneFormatado}`)
      .maybeSingle()

    // Se não achou por telefone, tenta por email
    if (!existente && email) {
      const { data: porEmail } = await supabase
        .from("clientes")
        .select("id, email")
        .eq("empresa_id", empresa_id)
        .eq("email", email)
        .maybeSingle()
      existente = porEmail
    }

    let clienteId: string

    if (existente) {
      clienteId = existente.id
      // Atualiza email se vier preenchido e estiver vazio
      if (email) {
        await supabase
          .from("clientes")
          .update({ email })
          .eq("id", clienteId)
          .is("email", null)
      }
    } else {
      // Criar novo cliente com CPF fictício baseado no telefone
      const cpfFicticio = `ONLINE-${telefoneLimpo}`

      const { data: novoCliente, error } = await supabase
        .from("clientes")
        .insert({
          empresa_id,
          nome_completo: nome,
          cpf: cpfFicticio,
          telefone: telefoneLimpo,
          email: email || null,
          observacoes: "Cadastrado automaticamente via agendamento online.",
          ativo: true,
          pontos_fidelidade: 0,
        })
        .select("id")
        .single()

      if (error) {
        console.error("Erro ao cadastrar cliente avulso:", error)
        return NextResponse.json({ erro: error.message }, { status: 500 })
      }

      clienteId = novoCliente.id
    }

    // Localizar o agendamento pelo telefone + empresa + data e vincular cliente_id
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
    console.error("Erro ao cadastrar cliente avulso:", err)
    return NextResponse.json({ erro: "Erro interno" }, { status: 500 })
  }
}
