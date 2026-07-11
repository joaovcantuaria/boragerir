import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { createAdminClient } from "@/lib/supabase/admin"
import { addMonths, format } from "date-fns"
import { enviarEmail, templateAssinaturaConfirmada } from "@/lib/email/brevo"

export async function GET(req: NextRequest) {
  const payment_id = req.nextUrl.searchParams.get("payment_id")
  if (!payment_id) return NextResponse.json({ erro: "payment_id obrigatório" }, { status: 400 })

  const accessToken = process.env.MERCADOPAGO_ACCESS_TOKEN!

  // Tentar buscar como Order primeiro
  try {
    const resOrder = await fetch(`https://api.mercadopago.com/v1/orders/${payment_id}`, {
      headers: { "Authorization": `Bearer ${accessToken}` },
    })

    if (resOrder.ok) {
      const order = await resOrder.json()
      const orderStatus = order.status
      const payments = order.transactions?.payments ?? []
      const firstPayment = payments[0]

      // Se o pagamento dentro da order foi aprovado
      if (firstPayment?.status === "approved" || orderStatus === "processed") {
        // Ativar assinatura no banco
        await ativarAssinatura(payment_id, order.external_reference)
        return NextResponse.json({ status: "approved", status_detail: "accredited" })
      }

      if (orderStatus === "expired" || firstPayment?.status === "cancelled") {
        return NextResponse.json({ status: "cancelled" })
      }

      return NextResponse.json({ status: firstPayment?.status ?? "pending" })
    }
  } catch {}

  // Fallback: tentar como payment ID direto
  try {
    const resPay = await fetch(`https://api.mercadopago.com/v1/payments/${payment_id}`, {
      headers: { "Authorization": `Bearer ${accessToken}` },
    })

    if (resPay.ok) {
      const pay = await resPay.json()
      if (pay.status === "approved") {
        await ativarAssinatura(payment_id, pay.external_reference)
      }
      return NextResponse.json({ status: pay.status, status_detail: pay.status_detail })
    }
  } catch {}

  // Fallback: checar no banco se já foi ativada
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (user) {
      const admin = createAdminClient()
      const { data: assinatura } = await admin.from("assinaturas")
        .select("status")
        .eq("mp_pix_payment_id", payment_id)
        .single()

      if (assinatura?.status === "ativa") {
        return NextResponse.json({ status: "approved" })
      }
    }
  } catch {}

  return NextResponse.json({ status: "pending" })
}

async function ativarAssinatura(paymentId: string, externalReference?: string) {
  try {
    const admin = createAdminClient()

    // Tentar ativar por mp_pix_payment_id (orderId)
    const { data: updated, error: err1 } = await admin.from("assinaturas")
      .update({ status: "ativa", data_inicio: new Date().toISOString(), mp_payment_id: paymentId })
      .eq("mp_pix_payment_id", paymentId)
      .eq("status", "pendente")
      .select("empresa_id, plano")

    console.log("ativarAssinatura por paymentId:", { paymentId, updated, err1 })

    if (updated?.length) {
      const { empresa_id, plano } = updated[0]
      const { error: errEmp } = await admin.from("empresas").update({ plano, plano_ativo: true }).eq("id", empresa_id)
      console.log("Empresa atualizada:", { empresa_id, plano, errEmp })
      // Enviar email de confirmação
      await enviarEmailAssinatura(admin, empresa_id, plano)
      return
    }

    // Tentar por external_reference (empresa_id)
    if (externalReference) {
      const empresaId = externalReference
      const { data: ass } = await admin.from("assinaturas")
        .select("id, plano")
        .eq("empresa_id", empresaId)
        .eq("status", "pendente")
        .order("created_at", { ascending: false })
        .limit(1)
        .single()

      console.log("ativarAssinatura por extRef:", { empresaId, ass })

      if (ass) {
        await admin.from("assinaturas")
          .update({ status: "ativa", data_inicio: new Date().toISOString(), mp_payment_id: paymentId })
          .eq("id", ass.id)

        await admin.from("empresas").update({ plano: ass.plano, plano_ativo: true }).eq("id", empresaId)
        // Enviar email de confirmação
        await enviarEmailAssinatura(admin, empresaId, ass.plano)
        return
      }
    }

    console.warn("ativarAssinatura: nenhuma assinatura encontrada para ativar")
  } catch (e) {
    console.error("Erro ao ativar assinatura:", e)
  }
}

async function enviarEmailAssinatura(admin: ReturnType<typeof createAdminClient>, empresaId: string, plano: string) {
  try {
    const { data: empresa } = await admin.from("empresas").select("nome, email, user_id").eq("id", empresaId).single()
    if (!empresa) return

    const { data: assinatura } = await admin.from("assinaturas")
      .select("valor_total, periodicidade, proximo_vencimento")
      .eq("empresa_id", empresaId)
      .eq("status", "ativa")
      .order("created_at", { ascending: false })
      .limit(1)
      .single()

    const { data: userData } = await admin.auth.admin.getUserById(empresa.user_id)
    const emailDestino = userData?.user?.email || empresa.email
    const planoNome = plano.charAt(0).toUpperCase() + plano.slice(1)
    const valor = assinatura?.valor_total ? `R$ ${Number(assinatura.valor_total).toFixed(2)}` : "—"
    const periodicidade = assinatura?.periodicidade === "anual" ? "Anual" : "Mensal"
    const vencimento = assinatura?.proximo_vencimento
      ? format(new Date(assinatura.proximo_vencimento), "dd/MM/yyyy")
      : format(addMonths(new Date(), 1), "dd/MM/yyyy")

    await enviarEmail({
      para: { email: emailDestino, nome: empresa.nome },
      assunto: `✅ Assinatura confirmada — Plano ${planoNome} | Bora Gerir`,
      html: templateAssinaturaConfirmada({
        nomeEmpresa: empresa.nome,
        plano: planoNome,
        valor,
        periodicidade,
        dataVencimento: vencimento,
      }),
    })
  } catch (e) {
    console.error("Erro ao enviar email de assinatura:", e)
  }
}
