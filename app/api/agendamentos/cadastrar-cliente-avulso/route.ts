import { NextRequest, NextResponse } from "next/server"
import { createAdminClient } from "@/lib/supabase/admin"

// Cadastra automaticamente o cliente avulso do agendamento público
// na tabela clientes da empresa, evitando duplicatas por telefone.
// Como CPF não é coletado no agendamento público, usa-se um CPF fictício
// no formato "ONLINE-<telefone>" para satisfazer o constraint NOT NULL.

export async function POST(req: NextRequest) {
  try {
    const { empresa_id, nome, telefone, email, agendamento_id } = await req.json()

    if (!empresa_id || !nome || !telefone) {
      return NextResponse.json({ erro: "Dados insuficientes" }, { status: 400 })
    }

    // Usa admin client para bypass de RLS (operação de sistema, não de usuário)
    const supabase = createAdminClient()

    // Verificar se já existe cliente com mesmo telefone nessa empresa
    const telefoneLimpo = telefone.replace(/\D/g, "")
    const { data: existente } = await supabase
      .from("clientes")
      .select("id")
      .eq("empresa_id", empresa_id)
      .eq("telefone", telefoneLimpo)
      .maybeSingle()

    let clienteId: string

    if (existente) {
      // Cliente já existe — só atualiza email se vier preenchido e estiver vazio
      clienteId = existente.id
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

    // Vincular o cliente_id ao agendamento
    if (agendamento_id) {
      await supabase
        .from("agendamentos")
        .update({ cliente_id: clienteId })
        .eq("id", agendamento_id)
    }

    return NextResponse.json({ sucesso: true, cliente_id: clienteId })
  } catch (err) {
    console.error("Erro ao cadastrar cliente avulso:", err)
    return NextResponse.json({ erro: "Erro interno" }, { status: 500 })
  }
}
