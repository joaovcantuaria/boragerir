import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { enviarEmail, templateOrcamento } from "@/lib/email/brevo"
import { formatarMoeda, formatarData } from "@/lib/utils"
import { addDays } from "date-fns"

export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ erro: "Não autenticado" }, { status: 401 })

    const { orcamento_id, email_destino, nome_destino } = await req.json()

    // Buscar dados da empresa
    const { data: empresa } = await supabase
      .from("empresas").select("*").eq("user_id", user.id).single()
    if (!empresa) return NextResponse.json({ erro: "Empresa não encontrada" }, { status: 404 })

    // Buscar orçamento com itens
    const { data: orcamento } = await supabase
      .from("orcamentos")
      .select("*, itens_orcamento(*), clientes(nome_completo, email, telefone)")
      .eq("id", orcamento_id)
      .eq("empresa_id", empresa.id)
      .single()

    if (!orcamento) return NextResponse.json({ erro: "Orçamento não encontrado" }, { status: 404 })

    // Destinatário: cliente cadastrado ou e-mail informado
    const emailPara = email_destino ?? orcamento.clientes?.email
    const nomePara = nome_destino ?? orcamento.clientes?.nome_completo ?? "Cliente"

    if (!emailPara) {
      return NextResponse.json({
        erro: "Informe o e-mail do destinatário. O cliente não tem e-mail cadastrado."
      }, { status: 400 })
    }

    const validade = formatarData(addDays(new Date(orcamento.created_at), orcamento.validade_dias))

    // Gerar PDF do orçamento em base64 para anexar
    // Por enquanto enviamos sem PDF anexado (complexidade de gerar no servidor)
    // TODO: Gerar PDF no servidor com puppeteer ou react-pdf/renderer

    const { sucesso, erro } = await enviarEmail({
      para: { email: emailPara, nome: nomePara },
      assunto: `📋 Orçamento ${orcamento.titulo} — ${empresa.nome}`,
      html: templateOrcamento({
        nomeEmpresa: empresa.nome,
        nomeCliente: nomePara,
        numeroOrcamento: orcamento.numero_orcamento,
        titulo: orcamento.titulo,
        total: formatarMoeda(orcamento.total),
        validade,
        observacoes: orcamento.observacoes ?? undefined,
      }),
    })

    if (!sucesso) {
      return NextResponse.json({ erro: `Falha ao enviar e-mail: ${erro}` }, { status: 500 })
    }

    return NextResponse.json({
      sucesso: true,
      mensagem: `E-mail enviado para ${emailPara}`,
    })

  } catch (err) {
    console.error("Erro ao enviar orçamento:", err)
    return NextResponse.json({ erro: "Erro interno" }, { status: 500 })
  }
}
