"use client"

import { useState, useEffect, useRef, useSyncExternalStore } from "react"

// A versão de celular do PDV fica escondida por CSS (md:hidden), mas as janelas (Dialog)
// abrem fora dela. Este teste garante que só a janela da tela atual abra.
const CONSULTA_CELULAR = "(max-width: 767.98px)"
function useEhCelular() {
  return useSyncExternalStore(
    (avisar) => {
      const m = window.matchMedia(CONSULTA_CELULAR)
      m.addEventListener("change", avisar)
      return () => m.removeEventListener("change", avisar)
    },
    () => window.matchMedia(CONSULTA_CELULAR).matches,
    () => false
  )
}
import { Search, Plus, Minus, Trash2, ShoppingCart, Check, Loader2, X, User, Gift, Keyboard } from "lucide-react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { createClient } from "@/lib/supabase/client"
import { formatarMoeda, gerarLinkWhatsApp, labelsFormaPagamento } from "@/lib/utils"
import type { Empresa, Venda } from "@/types"
import { gerarReciboPDF } from "@/lib/pdf/recibo"
import { PinModal } from "@/components/ui/pin-modal"
import { VendaMobile } from "@/components/venda/venda-mobile"
import { BoletoResultModal } from "@/components/venda/boleto-result-modal"
import { PixOnlinePanel } from "@/components/venda/pix-online-panel"
import { useColaborador } from "@/contexts/colaborador-context"

interface ItemVendaLocal {
  produto_servico_id: string
  nome_item: string
  quantidade: number
  preco_unitario: number
  comissao_percentual: number | null
  subtotal: number
  /** Desconto do item: o que foi digitado, o tipo e o valor em R$ já calculado (subtotal = bruto - desconto) */
  desconto_item_input?: string
  desconto_item_tipo?: "reais" | "percentual"
  desconto_item?: number
}

/** Recalcula o subtotal da linha aplicando o desconto do item (nunca passa do valor da linha) */
function calcularLinha(i: ItemVendaLocal): ItemVendaLocal {
  const bruto = i.quantidade * i.preco_unitario
  const v = Math.max(0, parseFloat(i.desconto_item_input ?? "") || 0)
  const desc = Math.min(bruto, (i.desconto_item_tipo ?? "percentual") === "percentual" ? (bruto * v) / 100 : v)
  const descArred = Math.round(desc * 100) / 100
  return { ...i, desconto_item: descArred, subtotal: Math.round((bruto - descArred) * 100) / 100 }
}

interface ProdutoSimples {
  id: string
  nome: string
  tipo: string
  preco: number
  comissao_percentual: number | null
  estoque_atual: number | null
  codigo_barras?: string | null
}

interface ClienteSimples {
  id: string
  nome_completo: string
  cpf: string | null
  telefone: string
  pontos_fidelidade: number
}

interface FuncionarioSimples {
  id: string
  nome: string
}

interface RecompensaDisponivel {
  id: string
  nome: string
  descricao: string | null
  pontos_necessarios: number
  estoque: number | null
}

export function VendaClient({
  empresa,
  caixaId,
  clientes,
  produtos,
  funcionarios,
}: {
  empresa: Empresa
  caixaId: string | null
  clientes: ClienteSimples[]
  produtos: ProdutoSimples[]
  funcionarios: FuncionarioSimples[]
}) {
  const [itens, setItens] = useState<ItemVendaLocal[]>([])
  const [clienteSelecionado, setClienteSelecionado] = useState<ClienteSimples | null>(null)
  const [funcionarioId, setFuncionarioId] = useState<string>("")
  const [desconto, setDesconto] = useState<string>("0")
  const [tipoDesconto, setTipoDesconto] = useState<"reais" | "percentual">("percentual") // padrão: %
  // Preço do item: com PIN cadastrado, só muda depois do PIN (vale para aquele item nesta venda)
  const [precoLiberado, setPrecoLiberado] = useState<string[]>([])
  const [pinPrecoItem, setPinPrecoItem] = useState<string | null>(null)
  const [pontosUsar, setPontosUsar] = useState<number>(0)
  const [formaPagamento, setFormaPagamento] = useState<string>("")
  const [parcelas, setParcelas] = useState<string>("1")
  const [observacoes, setObservacoes] = useState("")
  const [dataVenda, setDataVenda] = useState<string>(new Date().toISOString().slice(0, 10))
  const [buscaCliente, setBuscaCliente] = useState("")
  const [buscaProduto, setBuscaProduto] = useState("")
  const [qtdProduto, setQtdProduto] = useState<number>(1)
  const [mostrarBuscaCliente, setMostrarBuscaCliente] = useState(false)
  const [mostrarBuscaProduto, setMostrarBuscaProduto] = useState(false)
  const [indiceProduto, setIndiceProduto] = useState(0)
  const [indiceCliente, setIndiceCliente] = useState(0)
  const [loading, setLoading] = useState(false)
  const [loadingRecibo, setLoadingRecibo] = useState(false)
  const [modalSucesso, setModalSucesso] = useState(false)
  const ehCelular = useEhCelular()
  const [vendaFinalizada, setVendaFinalizada] = useState<{ id: string; numero: number; total: number; codigo?: string | null } | null>(null)
  const [valorRecebido, setValorRecebido] = useState("")
  const [formaPagEntrada, setFormaPagEntrada] = useState<string>("dinheiro")
  const [autoprint, setAutoprint] = useState(false)
  const [pinModalAberto, setPinModalAberto] = useState(false)
  // Desconto acima do limite: o PIN de gerente é pedido ao aplicar o desconto.
  // Guarda até quantos % o gerente autorizou (refs: valor sempre atual, sem pedir o PIN de novo).
  const descontoAutorizadoAteRef = useRef(0)
  const pinDescontoPendenteRef = useRef(0)
  const pinDescontoOrigemRef = useRef<"desconto" | "finalizar">("desconto")
  const pinDescontoAprovadoRef = useRef(false)
  const pinDescontoItemRef = useRef<string | null>(null) // item cujo desconto pediu o PIN
  const itemTrocouTipoRef = useRef<string | null>(null) // item que trocou R$/% (confere o limite depois de recalcular)
  // Cupom do cliente (gerado pelo BoraGerir Chat no aniversário/reativação)
  const [cupom, setCupom] = useState<{ codigo: string; tipo: "percentual" | "fixo"; valor: number } | null>(null)
  const [codigoCupom, setCodigoCupom] = useState("")
  const [validandoCupom, setValidandoCupom] = useState(false)
  const supabase = createClient()
  const { colaborador } = useColaborador()
  const inputBuscaRef = useRef<HTMLInputElement>(null)
  const inputClienteRef = useRef<HTMLInputElement>(null)
  const inputDescontoRef = useRef<HTMLInputElement>(null)
  const inputQtdRef = useRef<HTMLInputElement>(null)
  const produtoDropdownRef = useRef<HTMLDivElement>(null)
  const clienteDropdownRef = useRef<HTMLDivElement>(null)

  // Recompensas/brindes disponíveis
  const [recompensas, setRecompensas] = useState<RecompensaDisponivel[]>([])
  const [recompensaSelecionada, setRecompensaSelecionada] = useState<RecompensaDisponivel | null>(null)

  // Cora Pagamentos
  const [coraAtiva, setCoraAtiva] = useState(false)
  const [coraResult, setCoraResult] = useState<{ qrCode?: string; copiaCola?: string; linhaDigitavel?: string; urlPdf?: string } | null>(null)

  // Boleto Cora — seleção de vencimento e resultado
  const [boletoDataVencimento, setBoletoDataVencimento] = useState("")
  const [boletoResultData, setBoletoResultData] = useState<{
    codigoBarras?: string
    linhaDigitavel?: string
    qrCodePix?: string
    urlPdf?: string
    valor: number
    dataVencimento: string
    clienteNome?: string
    clienteTelefone?: string
  } | null>(null)
  const [showBoletoResult, setShowBoletoResult] = useState(false)

  // Pix Online — QR Code antes de confirmar a venda
  const [pixOnlineData, setPixOnlineData] = useState<{
    boletoId: string
    qrCode: string
    copiaCola: string
    vendaIdTemp: string | null
  } | null>(null)

  // Carregar preferência de impressão automática
  useEffect(() => {
    const saved = localStorage.getItem("pdv_autoprint")
    if (saved === "true") setAutoprint(true)
  }, [])

  // Auto-selecionar o colaborador logado como atendente
  useEffect(() => {
    if (colaborador && colaborador.id !== "owner" && funcionarios.length > 0) {
      const match = funcionarios.find((f) => f.id === colaborador.id)
      if (match && !funcionarioId) {
        setFuncionarioId(match.id)
      }
    }
  }, [colaborador, funcionarios])

  // Carregar recompensas disponíveis
  useEffect(() => {
    async function carregarRecompensas() {
      const { data } = await supabase
        .from("recompensas_fidelidade")
        .select("id, nome, descricao, pontos_necessarios, estoque")
        .eq("empresa_id", empresa.id)
        .eq("ativo", true)
        .order("pontos_necessarios", { ascending: true })
      setRecompensas(data ?? [])
    }
    carregarRecompensas()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Verificar se empresa tem Conta Cora ativa
  useEffect(() => {
    if (empresa.plano !== "profissional") return
    async function checkCora() {
      const { data } = await supabase
        .from("cora_contas")
        .select("id, status")
        .eq("empresa_id", empresa.id)
        .eq("status", "ativo")
        .maybeSingle()
      if (data) setCoraAtiva(true)
    }
    checkCora()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [empresa.id, empresa.plano])

  // Fechar dropdowns ao clicar fora
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      const target = e.target as Node
      if (produtoDropdownRef.current && !produtoDropdownRef.current.contains(target) &&
          inputBuscaRef.current && !inputBuscaRef.current.contains(target)) {
        setMostrarBuscaProduto(false)
      }
      if (clienteDropdownRef.current && !clienteDropdownRef.current.contains(target) &&
          inputClienteRef.current && !inputClienteRef.current.contains(target)) {
        setMostrarBuscaCliente(false)
      }
    }
    document.addEventListener("mousedown", handleClickOutside)
    return () => document.removeEventListener("mousedown", handleClickOutside)
  }, [])

  // Atalhos de teclado do PDV
  useEffect(() => {
    function handler(e: KeyboardEvent) {
      const tag = (e.target as HTMLElement).tagName
      const isInput = ["INPUT", "TEXTAREA", "SELECT"].includes(tag)

      // F2 — Focar busca de produto
      if (e.key === "F2") {
        e.preventDefault()
        inputBuscaRef.current?.focus()
        setMostrarBuscaProduto(true)
        return
      }
      // F3 — Focar busca de cliente
      if (e.key === "F3") {
        e.preventDefault()
        inputClienteRef.current?.focus()
        setMostrarBuscaCliente(true)
        return
      }
      // F4 — Finalizar venda (funciona em qualquer contexto)
      if (e.key === "F4") {
        e.preventDefault()
        if (itens.length > 0 && formaPagamento) finalizarVenda()
        return
      }
      // F5 — Nova venda
      if (e.key === "F5") {
        e.preventDefault()
        novaVenda()
        return
      }
      // F6 — Focar campo de desconto (muda pra percentual)
      if (e.key === "F6") {
        e.preventDefault()
        setTipoDesconto("percentual")
        setTimeout(() => inputDescontoRef.current?.focus(), 50)
        return
      }
      // F7 — Focar seleção de colaborador
      if (e.key === "F7") {
        e.preventDefault()
        const selectTrigger = document.querySelector('[data-funcionario-trigger]') as HTMLElement | null
        selectTrigger?.click()
        return
      }
      // F8 — Formas de pagamento rápidas (funciona em qualquer contexto)
      if (e.key === "F8") {
        e.preventDefault()
        const formas = ["dinheiro", "pix", "cartao_debito", "cartao_credito", "outro"]
        const idx = formas.indexOf(formaPagamento)
        setFormaPagamento(formas[(idx + 1) % formas.length])
        return
      }
      // Escape — Limpar busca
      if (e.key === "Escape") {
        setMostrarBuscaProduto(false)
        setMostrarBuscaCliente(false)
        return
      }
      // 1-5 para seleção rápida de pagamento quando não está em input
      if (!isInput && ["1", "2", "3", "4", "5"].includes(e.key)) {
        const formas = ["dinheiro", "pix", "cartao_debito", "cartao_credito", "outro"]
        setFormaPagamento(formas[parseInt(e.key) - 1])
        return
      }
    }
    document.addEventListener("keydown", handler)
    return () => document.removeEventListener("keydown", handler)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [itens, formaPagamento])

  // Calcular totais
  const subtotal = itens.reduce((s, i) => s + i.subtotal, 0)
  // Valor dos itens antes do desconto por item, e quanto foi dado de desconto nos itens
  const subtotalBruto = itens.reduce((s, i) => s + i.quantidade * i.preco_unitario, 0)
  const descontoItens = itens.reduce((s, i) => s + (i.desconto_item ?? 0), 0)
  const descontoValor = tipoDesconto === "reais"
    ? parseFloat(desconto) || 0
    : (subtotal * (parseFloat(desconto) || 0)) / 100
  const pontosPorReal = empresa.pontos_para_desconto ?? 100
  const descontoPontos = pontosUsar > 0 ? pontosUsar / pontosPorReal : 0
  const pontosResgateBrinde = recompensaSelecionada?.pontos_necessarios ?? 0
  // Cupom não conta para o limite de desconto do colaborador: foi concedido pela empresa
  const descontoCupom = cupom
    ? Math.round(Math.max(0, Math.min(cupom.tipo === "percentual" ? (subtotal * cupom.valor) / 100 : cupom.valor, subtotal - descontoValor)) * 100) / 100
    : 0
  const descontoTotal = descontoValor + descontoCupom
  const total = Math.max(0, subtotal - descontoTotal - descontoPontos)
  const troco = formaPagamento === "dinheiro" && valorRecebido
    ? Math.max(0, (parseFloat(valorRecebido) || 0) - total)
    : null

  // Busca de clientes
  const clientesFiltrados = clientes.filter((c) => {
    const t = buscaCliente.toLowerCase()
    return c.nome_completo.toLowerCase().includes(t) || (c.cpf ?? "").includes(t) || (c.telefone ?? "").includes(t)
  }).slice(0, 8)

  // Busca de produtos — por nome OU código de barras
  const produtosFiltrados = produtos.filter((p) => {
    const termo = buscaProduto.toLowerCase()
    if (!termo) return true
    return p.nome.toLowerCase().includes(termo) ||
      (p.codigo_barras ?? "").includes(buscaProduto)
  }).slice(0, 15)

  function adicionarItem(produto: ProdutoSimples) {
    const qtd = qtdProduto || 1
    setItens((prev) => {
      const existente = prev.find((i) => i.produto_servico_id === produto.id)
      if (existente) {
        return prev.map((i) =>
          i.produto_servico_id === produto.id
            ? calcularLinha({ ...i, quantidade: i.quantidade + qtd })
            : i
        )
      }
      return [...prev, {
        produto_servico_id: produto.id,
        nome_item: produto.nome,
        quantidade: qtd,
        preco_unitario: produto.preco,
        comissao_percentual: produto.comissao_percentual,
        subtotal: produto.preco * qtd,
      }]
    })
    setBuscaProduto("")
    setQtdProduto(1)
    setMostrarBuscaProduto(false)
  }

  function alterarQuantidade(id: string, delta: number) {
    setItens((prev) => prev.map((i) =>
      i.produto_servico_id === id
        ? calcularLinha({ ...i, quantidade: Math.max(1, i.quantidade + delta) })
        : i
    ))
  }

  function alterarPreco(id: string, novoPreco: string) {
    const preco = parseFloat(novoPreco) || 0
    setItens((prev) => prev.map((i) =>
      i.produto_servico_id === id
        ? calcularLinha({ ...i, preco_unitario: preco })
        : i
    ))
  }

  function alterarDescontoItem(id: string, valor: string, tipo?: "reais" | "percentual") {
    setItens((prev) => prev.map((i) =>
      i.produto_servico_id === id
        ? calcularLinha({ ...i, desconto_item_input: valor, desconto_item_tipo: tipo ?? i.desconto_item_tipo ?? "percentual" })
        : i
    ))
  }

  function removerItem(id: string) {
    setItens((prev) => prev.filter((i) => i.produto_servico_id !== id))
  }

  async function aplicarCupom() {
    if (!codigoCupom.trim()) return
    setValidandoCupom(true)
    try {
      const params = new URLSearchParams({ codigo: codigoCupom.trim() })
      if (clienteSelecionado) params.set("cliente_id", clienteSelecionado.id)
      const res = await fetch(`/api/cupons-cliente/validar?${params}`)
      const data = await res.json().catch(() => ({}))
      if (!res.ok) { toast.error(data.erro || "Cupom inválido"); return }
      setCupom(data.cupom)
      setCodigoCupom("")
      toast.success(`Cupom ${data.cupom.codigo} aplicado!`)
    } finally {
      setValidandoCupom(false)
    }
  }

  function percentualDoDesconto(valor: string = desconto, tipo: "reais" | "percentual" = tipoDesconto) {
    // % total de desconto (itens + venda) sobre o valor original dos itens
    const v = parseFloat(valor) || 0
    const descVenda = tipo === "percentual" ? (subtotal * v) / 100 : v
    return subtotalBruto > 0 ? ((descontoItens + descVenda) / subtotalBruto) * 100 : 0
  }

  /** true se este % de desconto precisa do PIN de gerente (acima do limite e ainda não autorizado) */
  function descontoPrecisaPin(pct: number) {
    if (colaborador && colaborador.perfil !== "admin") return false // colaborador usa o próprio limite
    if (!empresa.pin_gerente) return false
    const restricoes = empresa.restricoes_acesso as { limite_desconto_sem_pin?: number } | null
    const limite = restricoes?.limite_desconto_sem_pin ?? 100
    return pct > limite + 0.0001 && pct > descontoAutorizadoAteRef.current + 0.0001
  }

  function pedirPinDesconto(pct: number, origem: "desconto" | "finalizar", itemId: string | null = null) {
    pinDescontoItemRef.current = itemId
    pinDescontoPendenteRef.current = pct
    pinDescontoOrigemRef.current = origem
    pinDescontoAprovadoRef.current = false
    setPinModalAberto(true)
  }

  /** Ao sair do campo de desconto (ou trocar R$/%): acima do limite pede o PIN na hora */
  function verificarDescontoAplicado(valor: string = desconto, tipo: "reais" | "percentual" = tipoDesconto) {
    const pct = percentualDoDesconto(valor, tipo)
    if (descontoPrecisaPin(pct)) pedirPinDesconto(pct, "desconto")
  }

  /** Ao sair do campo de desconto de um item: mesmo limite/PIN do desconto da venda */
  function verificarDescontoItem(itemId: string) {
    const pct = percentualDoDesconto()
    if (colaborador && colaborador.perfil !== "admin") {
      const limiteMax = (colaborador.permissoes?.venda_limite_desconto as number) ?? 0
      if (pct > limiteMax + 0.0001) toast.error(`Desconto inválido, máximo permitido é ${limiteMax}%.`)
      return
    }
    if (descontoPrecisaPin(pct)) pedirPinDesconto(pct, "desconto", itemId)
  }

  // Trocou R$/% num item: confere o limite já com o valor recalculado
  useEffect(() => {
    const id = itemTrocouTipoRef.current
    if (!id) return
    itemTrocouTipoRef.current = null
    verificarDescontoItem(id)
  })

  async function finalizarVenda() {
    if (itens.length === 0) { toast.error("Adicione ao menos um item."); return }
    if (!formaPagamento) { toast.error("Selecione a forma de pagamento."); return }

    // Verificar se desconto excede o limite do colaborador logado
    const descontoPercentual = percentualDoDesconto()

    const limiteColaborador = colaborador?.permissoes?.venda_limite_desconto as number | undefined

    // Se tem colaborador logado, usa o limite do colaborador
    if (colaborador && colaborador.perfil !== "admin") {
      const limiteMax = limiteColaborador ?? 0
      if (descontoPercentual > limiteMax) {
        toast.error(`Desconto inválido, máximo permitido é ${limiteMax}%.`)
        return
      }
    } else if (descontoPrecisaPin(descontoPercentual)) {
      // Só por segurança (ex.: itens removidos depois de autorizar): normalmente o PIN já foi pedido ao aplicar o desconto
      pedirPinDesconto(descontoPercentual, "finalizar")
      return
    }

    if (formaPagamento === "debito_cliente" && !clienteSelecionado) {
      toast.error("Selecione um cliente para lançar o débito."); return
    }
    if ((formaPagamento === "boleto_cora" || formaPagamento === "pix_cora") && !clienteSelecionado) {
      toast.error("Selecione um cliente para pagamentos via Cora."); return
    }
    if (recompensaSelecionada && clienteSelecionado) {
      const totalPontosNecessarios = pontosUsar + pontosResgateBrinde
      if (totalPontosNecessarios > clienteSelecionado.pontos_fidelidade) {
        toast.error("Pontos insuficientes para desconto + brinde."); return
      }
    }
    if (!caixaId) { toast.error("Abra o caixa antes de realizar vendas.", { action: { label: "Ir para o caixa", onClick: () => window.location.href = "/caixa" } }); return }

    // Revalida o cupom com o cliente desta venda antes de gravar (pode ter trocado o cliente)
    if (cupom) {
      const params = new URLSearchParams({ codigo: cupom.codigo })
      if (clienteSelecionado) params.set("cliente_id", clienteSelecionado.id)
      const res = await fetch(`/api/cupons-cliente/validar?${params}`).catch(() => null)
      if (!res?.ok) {
        const data = await res?.json().catch(() => ({}))
        toast.error(data?.erro || "O cupom não vale para esta venda. Remova-o ou troque o cliente.")
        return
      }
    }

    setLoading(true)

    const isDebito = formaPagamento === "debito_cliente"
    const valorPagoAgora = isDebito ? Math.min(parseFloat(valorRecebido) || 0, total) : total
    const formaPagFinal = isDebito
      ? (valorPagoAgora > 0 ? formaPagEntrada as Venda["forma_pagamento"] : "outro")
      : formaPagamento as "dinheiro" | "cartao_credito" | "cartao_debito" | "pix" | "outro" | "boleto_cora" | "pix_cora"

    const { data: venda, error: errVenda } = await supabase
      .from("vendas")
      .insert({
        empresa_id: empresa.id,
        caixa_id: caixaId,
        cliente_id: clienteSelecionado?.id ?? null,
        funcionario_id: funcionarioId || null,
        colaborador_id: colaborador?.id !== "owner" ? colaborador?.id : null,
        subtotal,
        desconto: descontoTotal,
        total,
        forma_pagamento: formaPagFinal,
        parcelas: parseInt(parcelas) || 1,
        status: (formaPagamento === "boleto_cora" || formaPagamento === "pix_cora") ? "pendente_boleto" : "concluida",
        observacoes: observacoes || null,
        created_at: new Date(`${dataVenda}T12:00:00`).toISOString(),
      })
      .select()
      .single()

    if (errVenda) { toast.error("Erro ao registrar venda."); setLoading(false); return }

    const itensPayload = itens.map((i) => ({
      venda_id: venda.id,
      empresa_id: empresa.id,
      produto_servico_id: i.produto_servico_id,
      nome_item: i.nome_item,
      quantidade: i.quantidade,
      preco_unitario: i.preco_unitario,
      comissao_percentual: i.comissao_percentual,
      comissao_valor: i.comissao_percentual ? (i.subtotal * i.comissao_percentual) / 100 : null,
      subtotal: i.subtotal,
    }))

    await supabase.from("itens_venda").insert(itensPayload)

    if (cupom) {
      const res = await fetch("/api/cupons-cliente/usar", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ codigo: cupom.codigo, venda_id: venda.id }),
      }).catch(() => null)
      if (!res?.ok) toast.warning(`Venda registrada, mas o cupom ${cupom.codigo} não pôde ser marcado como usado.`)
    }

    // Registrar movimentação no caixa — só se houve pagamento efetivo e não é boleto pendente
    const valorMovimentacao = isDebito ? valorPagoAgora : total
    if (valorMovimentacao > 0 && formaPagamento !== "boleto_cora" && formaPagamento !== "pix_cora") {
      await supabase.from("movimentacoes_caixa").insert({
        empresa_id: empresa.id,
        caixa_id: caixaId,
        tipo: "entrada",
        categoria: "venda",
        descricao: `Venda #${venda.numero_venda} - ${clienteSelecionado?.nome_completo ?? "Sem cliente"}`,
        valor: valorMovimentacao,
        venda_id: venda.id,
        colaborador_id: colaborador?.id !== "owner" ? colaborador?.id : null,
      })
    }

    if (isDebito && clienteSelecionado) {
      const valorAberto = total - valorPagoAgora
      if (valorAberto > 0) {
        await supabase.from("debitos_clientes").insert({
          empresa_id: empresa.id,
          cliente_id: clienteSelecionado.id,
          venda_id: venda.id,
          valor_total: total,
          valor_pago: valorPagoAgora,
          valor_aberto: valorAberto,
          descricao: `Venda #${venda.numero_venda}`,
          status: valorPagoAgora > 0 ? "parcial" : "aberto",
        })
      }
    }

    for (const item of itens) {
      const prod = produtos.find((p) => p.id === item.produto_servico_id)
      if (prod?.tipo === "produto" && prod.estoque_atual !== null) {
        // Lê o estoque atual do banco (o da tela pode estar desatualizado após outras vendas)
        const { data: atual } = await supabase
          .from("produtos_servicos").select("estoque_atual").eq("id", prod.id).single()
        const estoqueAtual = atual?.estoque_atual ?? prod.estoque_atual
        await supabase
          .from("produtos_servicos")
          .update({ estoque_atual: Math.max(0, estoqueAtual - item.quantidade) })
          .eq("id", prod.id)
      }
    }

    if (clienteSelecionado) {
      const pontosGanhos = Math.floor(total * (empresa.pontos_por_real ?? 1))
      const { data: clienteAtual } = await supabase
        .from("clientes")
        .select("pontos_fidelidade")
        .eq("id", clienteSelecionado.id)
        .single()
      const pontosAtuais = clienteAtual?.pontos_fidelidade ?? 0
      const totalPontosUsados = pontosUsar + pontosResgateBrinde
      const novoSaldo = Math.max(0, pontosAtuais - totalPontosUsados + pontosGanhos)
      await supabase
        .from("clientes")
        .update({ pontos_fidelidade: novoSaldo })
        .eq("id", clienteSelecionado.id)

      if (recompensaSelecionada) {
        await supabase.from("resgates_recompensas").insert({
          empresa_id: empresa.id,
          cliente_id: clienteSelecionado.id,
          recompensa_id: recompensaSelecionada.id,
          venda_id: venda.id,
          pontos_usados: recompensaSelecionada.pontos_necessarios,
          nome_recompensa: recompensaSelecionada.nome,
        })
        if (recompensaSelecionada.estoque !== null) {
          await supabase
            .from("recompensas_fidelidade")
            .update({ estoque: Math.max(0, recompensaSelecionada.estoque - 1) })
            .eq("id", recompensaSelecionada.id)
        }
      }
    }

    // Emissão automática de cobrança Cora
    if (formaPagamento === "boleto_cora" && clienteSelecionado) {
      try {
        const vencimento = boletoDataVencimento || calcular3DiasUteis()
        const boletoRes = await fetch("/api/cora/boletos", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            pagador: {
              nome: clienteSelecionado.nome_completo || "Cliente",
              documento: clienteSelecionado.cpf?.replace(/\D/g, "") || "00000000000",
              email: "noreply@boragerir.com",
              tipo: (clienteSelecionado.cpf?.replace(/\D/g, "")?.length === 14) ? "BUSINESS" : "PERSON",
              endereco: { rua: "Rua Exemplo", numero: "100", bairro: "Centro", cidade: "Sao Paulo", estado: "SP", cep: "01001000" }
            },
            valor: total,
            dataVencimento: vencimento,
            descricaoServico: `Venda #${venda.numero_venda}`,
            clienteId: clienteSelecionado?.id || undefined,
            vendaId: venda.id,
          }),
        })

        if (!boletoRes.ok) {
          const falha = await boletoRes.json().catch(() => ({}))
          await supabase.from("vendas").delete().eq("id", venda.id)
          toast.error(`Erro ao gerar boleto${falha?.error ? `: ${falha.error}` : ""}. Venda cancelada.`)
          setLoading(false)
          return
        }

        const boletoData = await boletoRes.json()
        setBoletoResultData({
          codigoBarras: boletoData.codigoBarras,
          linhaDigitavel: boletoData.linhaDigitavel,
          qrCodePix: boletoData.qrCodePix,
          urlPdf: boletoData.urlPdf,
          valor: total,
          dataVencimento: vencimento,
          clienteNome: clienteSelecionado?.nome_completo,
          clienteTelefone: clienteSelecionado?.telefone,
        })
        setShowBoletoResult(true)
        setModalSucesso(false)
        setVendaFinalizada({ id: venda.id, numero: venda.numero_venda, total, codigo: venda.codigo_rastreio ?? null })
        setLoading(false)
        if (autoprint) {
          setTimeout(() => imprimirReciboSilencioso(venda.numero_venda, total, venda.codigo_rastreio ?? null), 500)
        }
        return
      } catch {
        await supabase.from("vendas").delete().eq("id", venda.id)
        toast.error("Erro ao gerar boleto. Venda cancelada.")
        setLoading(false)
        return
      }
    }

    if (formaPagamento === "pix_cora" && clienteSelecionado) {
      try {
        const pixRes = await fetch("/api/cora/pix", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            pagador: {
              nome: clienteSelecionado.nome_completo || "Cliente",
              documento: clienteSelecionado.cpf?.replace(/\D/g, "") || "00000000000",
              email: "noreply@boragerir.com",
              tipo: (clienteSelecionado.cpf?.replace(/\D/g, "")?.length === 14) ? "BUSINESS" : "PERSON",
              endereco: { rua: "Rua Exemplo", numero: "100", bairro: "Centro", cidade: "Sao Paulo", estado: "SP", cep: "01001000" }
            },
            valor: total,
            descricaoServico: `Venda #${venda.numero_venda}`,
            clienteId: clienteSelecionado?.id,
            vendaId: venda.id,
          }),
        })

        if (!pixRes.ok) {
          const falha = await pixRes.json().catch(() => ({}))
          await supabase.from("vendas").delete().eq("id", venda.id)
          toast.error(`Erro ao gerar Pix${falha?.error ? `: ${falha.error}` : ""}. Tente novamente.`)
          setLoading(false)
          return
        }

        const pixData = await pixRes.json()
        setPixOnlineData({
          boletoId: pixData.id,
          qrCode: pixData.qrCode || "",
          copiaCola: pixData.copiaCola || "",
          vendaIdTemp: venda.id,
        })
        setVendaFinalizada({ id: venda.id, numero: venda.numero_venda, total, codigo: venda.codigo_rastreio ?? null })
        setModalSucesso(false)
        setLoading(false)
        return
      } catch {
        await supabase.from("vendas").delete().eq("id", venda.id)
        toast.error("Erro ao gerar Pix Online.")
        setLoading(false)
        return
      }
    }

    setVendaFinalizada({ id: venda.id, numero: venda.numero_venda, total, codigo: venda.codigo_rastreio ?? null })
    setModalSucesso(true)
    setLoading(false)

    // Autoprint — imprime recibo térmico automaticamente
    if (autoprint) {
      setTimeout(() => imprimirReciboSilencioso(venda.numero_venda, total, venda.codigo_rastreio ?? null), 500)
    }
  }

  function novaVenda() {
    setItens([])
    setClienteSelecionado(null)
    // Manter o colaborador logado como atendente padrão
    const colabId = (colaborador && colaborador.id !== "owner") ? colaborador.id : ""
    const match = funcionarios.find((f) => f.id === colabId)
    setFuncionarioId(match ? match.id : "")
    setDesconto("0")
    setTipoDesconto("percentual")
    setPrecoLiberado([])
    descontoAutorizadoAteRef.current = 0
    setCupom(null)
    setCodigoCupom("")
    setPontosUsar(0)
    setRecompensaSelecionada(null)
    setFormaPagamento("")
    setParcelas("1")
    setObservacoes("")
    setValorRecebido("")
    setFormaPagEntrada("dinheiro")
    setVendaFinalizada(null)
    setModalSucesso(false)
    setCoraResult(null)
    setBoletoDataVencimento("")
    setBoletoResultData(null)
    setShowBoletoResult(false)
    setPixOnlineData(null)
    setBuscaCliente("")
    setBuscaProduto("")
    setTimeout(() => inputBuscaRef.current?.focus(), 100)
  }

  async function imprimirReciboTermica() {
    if (!vendaFinalizada) return
    const largura = 48
    const sep = "-".repeat(largura)
    const centro = (txt: string) => {
      const pad = Math.max(0, Math.floor((largura - txt.length) / 2))
      return " ".repeat(pad) + txt
    }
    const linha = (esq: string, dir: string) => {
      const espacos = Math.max(1, largura - esq.length - dir.length)
      return esq + " ".repeat(espacos) + dir
    }

    const agora = new Date()
    const dataStr = agora.toLocaleDateString("pt-BR")
    const horaStr = agora.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })

    let recibo = ""
    recibo += centro(empresa.nome) + "\n"
    if (empresa.documento) recibo += centro(`CNPJ: ${empresa.documento}`) + "\n"
    if (empresa.telefone) recibo += centro(`Tel: ${empresa.telefone}`) + "\n"
    recibo += sep + "\n"
    recibo += centro("CUPOM NÃO FISCAL") + "\n"
    recibo += sep + "\n"
    recibo += `Venda #${vendaFinalizada.numero}\n`
    if (vendaFinalizada.codigo) recibo += `Rastreio: ${vendaFinalizada.codigo}\n`
    recibo += `Data: ${dataStr} ${horaStr}\n`
    if (clienteSelecionado) recibo += `Cliente: ${clienteSelecionado.nome_completo}\n`
    if (funcionarioId) {
      const func = funcionarios.find(f => f.id === funcionarioId)
      if (func) recibo += `Atendente: ${func.nome}\n`
    }
    recibo += sep + "\n"
    recibo += linha("ITEM", "SUBTOTAL") + "\n"
    recibo += sep + "\n"

    for (const item of itens) {
      recibo += `${item.nome_item}\n`
      recibo += linha(`  ${item.quantidade}x ${formatarMoeda(item.preco_unitario)}`, formatarMoeda(item.subtotal)) + "\n"
      if ((item.desconto_item ?? 0) > 0) recibo += linha("  Desc. item:", `-${formatarMoeda(item.desconto_item ?? 0)}`) + "\n"
    }

    recibo += sep + "\n"
    recibo += linha("Subtotal:", formatarMoeda(subtotal)) + "\n"
    if (descontoTotal > 0) recibo += linha("Desconto:", `-${formatarMoeda(descontoTotal)}`) + "\n"
    if (descontoPontos > 0) recibo += linha("Desc. Pontos:", `-${formatarMoeda(descontoPontos)}`) + "\n"
    recibo += linha("TOTAL:", formatarMoeda(vendaFinalizada.total)) + "\n"
    recibo += sep + "\n"
    recibo += `Pagamento: ${labelsFormaPagamento[formaPagamento] ?? formaPagamento}\n`
    if (troco !== null && troco > 0) recibo += `Troco: ${formatarMoeda(troco)}\n`
    recibo += sep + "\n"
    recibo += centro("Obrigado pela preferência!") + "\n"
    recibo += centro(empresa.nome) + "\n"
    recibo += "\n\n\n"

    const win = window.open("", "_blank", "width=350,height=600")
    if (win) {
      win.document.write(`<html><head><title>Recibo #${vendaFinalizada.numero}</title>
        <style>body{font-family:monospace;font-size:12px;margin:8px;white-space:pre-wrap;word-wrap:break-word;}
        @media print{@page{margin:0;size:80mm auto;}body{margin:2mm;}}</style>
        </head><body>${recibo.replace(/\n/g, "<br>")}</body></html>`)
      win.document.close()
      setTimeout(() => { win.print() }, 300)
    }
  }

  // Impressão silenciosa via iframe oculto (autoprint)
  function imprimirReciboSilencioso(numero: number, valorTotal: number, codigo: string | null = null) {
    const largura = 48
    const sep = "-".repeat(largura)
    const centro = (txt: string) => {
      const pad = Math.max(0, Math.floor((largura - txt.length) / 2))
      return " ".repeat(pad) + txt
    }
    const linha = (esq: string, dir: string) => {
      const espacos = Math.max(1, largura - esq.length - dir.length)
      return esq + " ".repeat(espacos) + dir
    }

    const agora = new Date()
    const dataStr = agora.toLocaleDateString("pt-BR")
    const horaStr = agora.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })

    let recibo = ""
    recibo += centro(empresa.nome) + "\n"
    if (empresa.documento) recibo += centro(`CNPJ: ${empresa.documento}`) + "\n"
    if (empresa.telefone) recibo += centro(`Tel: ${empresa.telefone}`) + "\n"
    recibo += sep + "\n"
    recibo += centro("CUPOM NÃO FISCAL") + "\n"
    recibo += sep + "\n"
    recibo += `Venda #${numero}\n`
    if (codigo) recibo += `Rastreio: ${codigo}\n`
    recibo += `Data: ${dataStr} ${horaStr}\n`
    if (clienteSelecionado) recibo += `Cliente: ${clienteSelecionado.nome_completo}\n`
    if (funcionarioId) {
      const func = funcionarios.find(f => f.id === funcionarioId)
      if (func) recibo += `Atendente: ${func.nome}\n`
    }
    recibo += sep + "\n"
    recibo += linha("ITEM", "SUBTOTAL") + "\n"
    recibo += sep + "\n"

    for (const item of itens) {
      recibo += `${item.nome_item}\n`
      recibo += linha(`  ${item.quantidade}x ${formatarMoeda(item.preco_unitario)}`, formatarMoeda(item.subtotal)) + "\n"
      if ((item.desconto_item ?? 0) > 0) recibo += linha("  Desc. item:", `-${formatarMoeda(item.desconto_item ?? 0)}`) + "\n"
    }

    recibo += sep + "\n"
    recibo += linha("Subtotal:", formatarMoeda(subtotal)) + "\n"
    if (descontoTotal > 0) recibo += linha("Desconto:", `-${formatarMoeda(descontoTotal)}`) + "\n"
    if (descontoPontos > 0) recibo += linha("Desc. Pontos:", `-${formatarMoeda(descontoPontos)}`) + "\n"
    recibo += linha("TOTAL:", formatarMoeda(valorTotal)) + "\n"
    recibo += sep + "\n"
    recibo += `Pagamento: ${labelsFormaPagamento[formaPagamento] ?? formaPagamento}\n`
    if (troco !== null && troco > 0) recibo += `Troco: ${formatarMoeda(troco)}\n`
    recibo += sep + "\n"
    recibo += centro("Obrigado pela preferência!") + "\n"
    recibo += centro(empresa.nome) + "\n"
    recibo += "\n\n\n"

    // Usa iframe oculto para impressão silenciosa
    const iframe = document.createElement("iframe")
    iframe.style.position = "fixed"
    iframe.style.top = "-9999px"
    iframe.style.left = "-9999px"
    iframe.style.width = "0"
    iframe.style.height = "0"
    iframe.style.border = "none"
    document.body.appendChild(iframe)

    const doc = iframe.contentDocument || iframe.contentWindow?.document
    if (doc) {
      doc.open()
      doc.write(`<html><head><title>Recibo #${numero}</title>
        <style>body{font-family:monospace;font-size:12px;margin:4px;white-space:pre-wrap;word-wrap:break-word;}
        @media print{@page{margin:0;size:80mm auto;}body{margin:2mm;}}</style>
        </head><body>${recibo.replace(/\n/g, "<br>")}</body></html>`)
      doc.close()
      setTimeout(() => {
        iframe.contentWindow?.print()
        setTimeout(() => document.body.removeChild(iframe), 2000)
      }, 300)
    }
  }

  function toggleAutoprint() {
    const novo = !autoprint
    setAutoprint(novo)
    localStorage.setItem("pdv_autoprint", novo.toString())
    toast.success(novo ? "Impressão automática ativada" : "Impressão automática desativada")
  }

  async function imprimirRecibo() {
    if (!vendaFinalizada) return
    setLoadingRecibo(true)
    try {
      await gerarReciboPDF({
        empresa,
        venda: {
          numero: vendaFinalizada.numero,
          codigo_rastreio: vendaFinalizada.codigo ?? null,
          total: vendaFinalizada.total,
          subtotal,
          desconto: descontoTotal,
          forma_pagamento: formaPagamento,
          parcelas: parseInt(parcelas),
          created_at: new Date().toISOString(),
        },
        cliente: clienteSelecionado,
        itens,
      })
    } catch (err) {
      console.error("Erro ao gerar recibo:", err)
      toast.error("Erro ao gerar o recibo PDF.")
    } finally {
      setLoadingRecibo(false)
    }
  }

  function enviarWhatsApp() {
    if (!clienteSelecionado?.telefone) { toast.error("Cliente sem telefone cadastrado."); return }
    const msg = `Olá ${clienteSelecionado.nome_completo}! 😊\n\nSeu atendimento foi concluído.\n\n✅ Venda #${vendaFinalizada?.numero}\n💰 Total: ${formatarMoeda(vendaFinalizada?.total ?? 0)}\n\nObrigado pela preferência! 🙏\n\n— ${empresa.nome}`
    window.open(gerarLinkWhatsApp(clienteSelecionado.telefone, msg), "_blank")
  }

  // Atalhos do modal de sucesso
  useEffect(() => {
    if (!modalSucesso) return
    function handler(e: KeyboardEvent) {
      if (e.key === "F1") {
        e.preventDefault()
        imprimirReciboTermica()
      } else if (e.key === "F2") {
        e.preventDefault()
        imprimirRecibo()
      } else if (e.key === "F3") {
        e.preventDefault()
        enviarWhatsApp()
      } else if (e.key === "Enter" || e.key === "F5") {
        e.preventDefault()
        novaVenda()
      }
    }
    document.addEventListener("keydown", handler)
    return () => document.removeEventListener("keydown", handler)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [modalSucesso, vendaFinalizada])

  // Componente de badge de atalho
  const Kbd = ({ children }: { children: React.ReactNode }) => (
    <kbd className="hidden lg:inline-flex items-center px-1.5 py-0.5 text-[10px] font-mono font-semibold text-zinc-500 bg-zinc-100 dark:bg-zinc-800 dark:text-zinc-400 border border-zinc-200 dark:border-zinc-700 rounded ml-1.5 leading-none">
      {children}
    </kbd>
  )

  function calcular3DiasUteis(): string {
    const date = new Date()
    let diasAdicionados = 0
    while (diasAdicionados < 3) {
      date.setDate(date.getDate() + 1)
      const dia = date.getDay()
      if (dia !== 0 && dia !== 6) diasAdicionados++
    }
    return date.toISOString().split("T")[0]
  }

  return (
    <>
    {/* ─── MOBILE ─── */}
    <VendaMobile
      empresa={empresa}
      caixaId={caixaId}
      clientes={clientes}
      produtos={produtos}
      funcionarios={funcionarios}
      itens={itens}
      setItens={setItens}
      clienteSelecionado={clienteSelecionado}
      setClienteSelecionado={setClienteSelecionado}
      funcionarioId={funcionarioId}
      setFuncionarioId={setFuncionarioId}
      desconto={desconto}
      setDesconto={setDesconto}
      tipoDesconto={tipoDesconto}
      setTipoDesconto={setTipoDesconto}
      pontosUsar={pontosUsar}
      setPontosUsar={setPontosUsar}
      formaPagamento={formaPagamento}
      setFormaPagamento={setFormaPagamento}
      parcelas={parcelas}
      setParcelas={setParcelas}
      observacoes={observacoes}
      setObservacoes={setObservacoes}
      dataVenda={dataVenda}
      setDataVenda={setDataVenda}
      valorRecebido={valorRecebido}
      setValorRecebido={setValorRecebido}
      recompensas={recompensas}
      recompensaSelecionada={recompensaSelecionada}
      setRecompensaSelecionada={setRecompensaSelecionada}
      subtotal={subtotal}
      descontoValor={descontoTotal}
      descontoPontos={descontoPontos}
      total={total}
      troco={troco}
      pontosResgateBrinde={pontosResgateBrinde}
      adicionarItem={adicionarItem}
      alterarQuantidade={alterarQuantidade}
      removerItem={removerItem}
      finalizarVenda={finalizarVenda}
      novaVenda={novaVenda}
      loading={loading}
      modalSucesso={modalSucesso && ehCelular}
      setModalSucesso={setModalSucesso}
      vendaFinalizada={vendaFinalizada}
      imprimirRecibo={imprimirRecibo}
      imprimirReciboTermica={imprimirReciboTermica}
      enviarWhatsApp={enviarWhatsApp}
      loadingRecibo={loadingRecibo}
    />

    {/* ─── DESKTOP ─── */}
    <div className="h-[calc(100vh-4rem)] hidden md:flex flex-col overflow-hidden">
      {/* Header do PDV */}
      <div className="shrink-0 flex items-center justify-between px-4 py-2 border-b border-border bg-white dark:bg-zinc-950">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-orange-500 to-orange-600 flex items-center justify-center">
              <ShoppingCart className="w-4 h-4 text-white" />
            </div>
            <div>
              <h1 className="text-base font-bold leading-tight">PDV</h1>
              <p className="text-[10px] text-muted-foreground leading-none">{empresa.nome}</p>
            </div>
          </div>
          {!caixaId && (
            <a href="/caixa" className="text-[11px] px-2.5 py-1 bg-yellow-500/10 border border-yellow-500/30 rounded-full text-yellow-600 dark:text-yellow-400 font-medium hover:bg-yellow-500/20 transition-colors">
              ⚠️ Caixa fechado
            </a>
          )}
        </div>
        <div className="flex items-center gap-2 text-[10px] text-muted-foreground">
          <button
            onClick={toggleAutoprint}
            className={`flex items-center gap-1 px-2 py-1 rounded transition-colors ${
              autoprint
                ? "bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400"
                : "bg-zinc-100 dark:bg-zinc-800 text-muted-foreground hover:text-foreground"
            }`}
            title="Impressão automática de recibo após finalizar venda"
          >
            🖨️ Auto {autoprint ? "ON" : "OFF"}
          </button>
          <span className="hidden md:flex items-center gap-1 px-2 py-1 rounded bg-zinc-100 dark:bg-zinc-800">
            <Keyboard className="w-3 h-3" /> F2 Buscar · F3 Cliente · F4 Finalizar · F5 Nova · F6 Desc% · F7 Atendente · F8 Pagamento
          </span>
        </div>
      </div>

      {/* Corpo principal — 2 colunas fixas */}
      <div className="flex-1 flex overflow-hidden">
        {/* COLUNA ESQUERDA — Produtos e lista de itens */}
        <div className="flex-1 flex flex-col border-r border-border min-w-0">
          {/* Barra de busca de produto */}
          <div className="shrink-0 p-3 border-b border-border bg-zinc-50/50 dark:bg-zinc-900/50">
            <div className="flex gap-2 items-center">
              <div className="w-16">
                <Input
                  ref={inputQtdRef}
                  type="number"
                  min="1"
                  value={qtdProduto}
                  onChange={(e) => setQtdProduto(Math.max(1, parseInt(e.target.value) || 1))}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault()
                      inputBuscaRef.current?.focus()
                    }
                  }}
                  className="text-center font-bold h-9 text-sm"
                  title="Quantidade"
                  aria-label="Quantidade"
                />
              </div>
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  ref={inputBuscaRef}
                  placeholder="Buscar produto ou escanear código de barras..."
                  className="pl-9 h-9 text-sm"
                  value={buscaProduto}
                  onChange={(e) => {
                    const valor = e.target.value
                    setBuscaProduto(valor)
                    setMostrarBuscaProduto(true)
                    setIndiceProduto(0)
                  }}
                  onFocus={() => { setIndiceProduto(0) }}
                  onKeyDown={(e) => {
                    if (e.key === "ArrowDown") {
                      e.preventDefault()
                      setIndiceProduto((prev) => Math.min(prev + 1, produtosFiltrados.length - 1))
                    } else if (e.key === "ArrowUp") {
                      e.preventDefault()
                      setIndiceProduto((prev) => Math.max(prev - 1, 0))
                    } else if (e.key === "Enter") {
                      e.preventDefault()
                      const valorAtual = buscaProduto.trim()
                      if (!valorAtual) return
                      // Verificar match exato por código de barras primeiro
                      const matchBarcode = produtos.find((p) => p.codigo_barras && p.codigo_barras === valorAtual)
                      if (matchBarcode) {
                        adicionarItem(matchBarcode)
                        setBuscaProduto("")
                        setMostrarBuscaProduto(false)
                      } else if (mostrarBuscaProduto && produtosFiltrados.length > 0) {
                        adicionarItem(produtosFiltrados[indiceProduto])
                        setBuscaProduto("")
                        setMostrarBuscaProduto(false)
                      }
                    } else if (e.key === "Escape") {
                      setMostrarBuscaProduto(false)
                    }
                  }}
                />
                <Kbd>F2</Kbd>

                {mostrarBuscaProduto && (
                  <div ref={produtoDropdownRef} className="absolute top-full left-0 right-0 z-50 bg-white dark:bg-zinc-900 border border-border rounded-lg shadow-2xl mt-1 max-h-56 overflow-y-auto">
                    {produtosFiltrados.length > 0 ? produtosFiltrados.map((p, idx) => (
                      <button
                        key={p.id}
                        className={`w-full text-left px-3 py-2 flex items-center justify-between text-sm transition-colors border-b border-border/50 last:border-0 ${
                          idx === indiceProduto ? "bg-orange-50 dark:bg-orange-500/10" : "hover:bg-orange-50 dark:hover:bg-orange-500/10"
                        }`}
                        onClick={() => adicionarItem(p)}
                        onMouseEnter={() => setIndiceProduto(idx)}
                      >
                        <div className="flex items-center gap-2 min-w-0">
                          <span className="font-medium text-foreground truncate">{p.nome}</span>
                          <Badge variant="secondary" className="text-[10px] shrink-0">{p.tipo}</Badge>
                          {p.codigo_barras && <span className="text-[10px] text-muted-foreground shrink-0">{p.codigo_barras}</span>}
                        </div>
                        <span className="font-bold text-orange-600 shrink-0 ml-2">{formatarMoeda(p.preco)}</span>
                      </button>
                    )) : (
                      <p className="px-3 py-3 text-sm text-muted-foreground text-center">Nenhum produto encontrado</p>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Lista de itens — área com scroll */}
          <div className="flex-1 overflow-y-auto">
            {itens.length > 0 ? (
              <div className="divide-y divide-border">
                {/* Header da tabela */}
                <div className="grid grid-cols-[1fr_100px_80px_112px_88px_32px] gap-2 px-4 py-2 bg-zinc-50 dark:bg-zinc-900/80 text-[10px] font-semibold text-muted-foreground uppercase tracking-wider sticky top-0">
                  <span>Produto</span>
                  <span className="text-center">Qtd</span>
                  <span className="text-right">Unit.</span>
                  <span className="text-right">Desc.</span>
                  <span className="text-right">Subtotal</span>
                  <span></span>
                </div>

                {itens.map((item) => (
                  <div key={item.produto_servico_id} className="grid grid-cols-[1fr_100px_80px_112px_88px_32px] gap-2 px-4 py-2.5 items-center hover:bg-zinc-50/50 dark:hover:bg-zinc-800/30 transition-colors">
                    <span className="text-sm font-medium truncate">{item.nome_item}</span>
                    <div className="flex items-center justify-center gap-0.5">
                      <button
                        onClick={() => alterarQuantidade(item.produto_servico_id, -1)}
                        className="w-6 h-6 rounded flex items-center justify-center hover:bg-zinc-200 dark:hover:bg-zinc-700 transition-colors"
                      >
                        <Minus className="w-3 h-3" />
                      </button>
                      <span className="w-8 text-center text-sm font-bold">{item.quantidade}</span>
                      <button
                        onClick={() => alterarQuantidade(item.produto_servico_id, 1)}
                        className="w-6 h-6 rounded flex items-center justify-center hover:bg-zinc-200 dark:hover:bg-zinc-700 transition-colors"
                      >
                        <Plus className="w-3 h-3" />
                      </button>
                    </div>
                    <div className="text-right">
                      <Input
                        type="number"
                        step="0.01"
                        min="0"
                        value={item.preco_unitario}
                        data-preco-item={item.produto_servico_id}
                        readOnly={!!empresa.pin_gerente && !precoLiberado.includes(item.produto_servico_id)}
                        title={!!empresa.pin_gerente && !precoLiberado.includes(item.produto_servico_id) ? "Alterar o preço pede o PIN de gerente" : undefined}
                        onFocus={(e) => {
                          if (empresa.pin_gerente && !precoLiberado.includes(item.produto_servico_id)) {
                            e.currentTarget.blur()
                            setPinPrecoItem(item.produto_servico_id)
                          }
                        }}
                        onChange={(e) => alterarPreco(item.produto_servico_id, e.target.value)}
                        className="h-6 w-full text-xs text-right px-1 [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none"
                      />
                    </div>
                    <div className="flex items-center gap-1">
                      <Input
                        type="number"
                        step="0.01"
                        min="0"
                        placeholder="0"
                        value={item.desconto_item_input ?? ""}
                        onChange={(e) => alterarDescontoItem(item.produto_servico_id, e.target.value)}
                        onBlur={() => verificarDescontoItem(item.produto_servico_id)}
                        onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); (e.target as HTMLElement).blur() } }}
                        aria-label={`Desconto do item ${item.nome_item}`}
                        className="h-6 w-full min-w-0 text-xs text-right px-1 [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none"
                      />
                      <button
                        type="button"
                        onClick={() => {
                          const novo = (item.desconto_item_tipo ?? "percentual") === "percentual" ? "reais" : "percentual"
                          itemTrocouTipoRef.current = item.produto_servico_id
                          alterarDescontoItem(item.produto_servico_id, item.desconto_item_input ?? "", novo)
                        }}
                        title="Alternar entre R$ e %"
                        className="h-6 w-8 shrink-0 rounded border border-border text-[10px] font-semibold text-muted-foreground hover:text-foreground"
                      >
                        {item.desconto_item_tipo === "reais" ? "R$" : "%"}
                      </button>
                    </div>
                    <div className="text-right leading-tight">
                      {(item.desconto_item ?? 0) > 0 && (
                        <span className="block text-[10px] text-muted-foreground line-through">{formatarMoeda(item.quantidade * item.preco_unitario)}</span>
                      )}
                      <span className="text-sm font-semibold text-orange-600">{formatarMoeda(item.subtotal)}</span>
                    </div>
                    <button
                      onClick={() => removerItem(item.produto_servico_id)}
                      className="w-6 h-6 rounded flex items-center justify-center text-red-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-500/10 transition-colors"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            ) : (
              <div className="flex-1 flex flex-col items-center justify-center h-full text-muted-foreground py-16">
                <ShoppingCart className="w-12 h-12 opacity-20 mb-3" />
                <p className="text-sm font-medium">Nenhum item adicionado</p>
                <p className="text-xs mt-1">Escaneie um código ou pressione <Kbd>F2</Kbd> para buscar</p>
              </div>
            )}
          </div>

          {/* Rodapé com totais na coluna esquerda */}
          <div className="shrink-0 border-t border-border bg-white dark:bg-zinc-950 px-4 py-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4 text-sm">
                <span className="text-muted-foreground">{itens.length} {itens.length === 1 ? "item" : "itens"}</span>
                {descontoTotal + descontoItens > 0 && (
                  <span className="text-red-500">Desc: -{formatarMoeda(descontoTotal + descontoItens)}</span>
                )}
                {descontoPontos > 0 && (
                  <span className="text-amber-600">Pontos: -{formatarMoeda(descontoPontos)}</span>
                )}
              </div>
              <div className="text-right">
                <p className="text-xs text-muted-foreground">Total</p>
                <p className="text-2xl font-black text-orange-600 leading-none">{formatarMoeda(total)}</p>
              </div>
            </div>
          </div>
        </div>

        {/* COLUNA DIREITA — Pagamento e opções */}
        <div className="w-80 lg:w-96 shrink-0 flex flex-col overflow-hidden bg-zinc-50/30 dark:bg-zinc-900/30">
          <div className="flex-1 overflow-y-auto p-3 space-y-2.5">
            {/* Cliente */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Cliente <Kbd>F3</Kbd></label>
                {clienteSelecionado && (
                  <button onClick={() => { setClienteSelecionado(null); setBuscaCliente("") }} className="text-[10px] text-red-400 hover:text-red-500">
                    Remover
                  </button>
                )}
              </div>
              <div className="relative">
                <User className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
                <Input
                  ref={inputClienteRef}
                  placeholder="Buscar cliente..."
                  className="pl-8 h-8 text-sm"
                  value={clienteSelecionado ? clienteSelecionado.nome_completo : buscaCliente}
                  onChange={(e) => { setBuscaCliente(e.target.value); setClienteSelecionado(null); setMostrarBuscaCliente(true); setIndiceCliente(0) }}
                  onFocus={() => { setIndiceCliente(0) }}
                  onKeyDown={(e) => {
                    if (e.key === "ArrowDown") {
                      e.preventDefault()
                      setIndiceCliente((prev) => Math.min(prev + 1, clientesFiltrados.length - 1))
                    } else if (e.key === "ArrowUp") {
                      e.preventDefault()
                      setIndiceCliente((prev) => Math.max(prev - 1, 0))
                    } else if (e.key === "Enter") {
                      e.preventDefault()
                      if (mostrarBuscaCliente && clientesFiltrados.length > 0) {
                        const c = clientesFiltrados[indiceCliente]
                        setClienteSelecionado(c)
                        setBuscaCliente("")
                        setMostrarBuscaCliente(false)
                      }
                    } else if (e.key === "Escape") {
                      setMostrarBuscaCliente(false)
                    }
                  }}
                />
                {mostrarBuscaCliente && buscaCliente && !clienteSelecionado && (
                  <div ref={clienteDropdownRef} className="absolute top-full left-0 right-0 z-50 bg-white dark:bg-zinc-900 border border-border rounded-lg shadow-xl mt-1 max-h-40 overflow-y-auto">
                    {clientesFiltrados.map((c, idx) => (
                      <button key={c.id} className={`w-full text-left px-3 py-2 text-sm transition-colors ${
                        idx === indiceCliente ? "bg-orange-50 dark:bg-orange-500/10" : "hover:bg-muted"
                      }`}
                        onClick={() => { setClienteSelecionado(c); setBuscaCliente(""); setMostrarBuscaCliente(false) }}
                        onMouseEnter={() => setIndiceCliente(idx)}>
                        <p className="font-medium text-foreground text-xs">{c.nome_completo}</p>
                        <p className="text-[10px] text-muted-foreground">{c.telefone} {c.pontos_fidelidade > 0 && `· ⭐ ${c.pontos_fidelidade} pts`}</p>
                      </button>
                    ))}
                    {clientesFiltrados.length === 0 && <p className="px-3 py-2 text-xs text-muted-foreground">Nenhum resultado</p>}
                  </div>
                )}
              </div>
            </div>

            {/* Funcionário */}
            {funcionarios.length > 0 && (
              <div className="space-y-1">
                <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Atendente <Kbd>F7</Kbd></label>
                <Select value={funcionarioId} onValueChange={setFuncionarioId}>
                  <SelectTrigger data-funcionario-trigger className="h-8 text-sm"><SelectValue placeholder="Selecionar..." /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">Nenhum</SelectItem>
                    {funcionarios.map((f) => (
                      <SelectItem key={f.id} value={f.id}>{f.nome}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            {/* Desconto */}
            <div className="space-y-1">
              <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Desconto <Kbd>F6</Kbd></label>
              <div className="flex gap-1.5">
                <Input
                  ref={inputDescontoRef}
                  type="number"
                  min="0"
                  step="0.01"
                  placeholder="0"
                  value={desconto}
                  onChange={(e) => {
                    setDesconto(e.target.value)
                    // Validação em tempo real do limite de desconto
                    if (colaborador && colaborador.perfil !== "admin") {
                      const limiteMax = (colaborador.permissoes?.venda_limite_desconto as number) ?? 0
                      const pct = percentualDoDesconto(e.target.value)
                      if (pct > limiteMax) {
                        toast.error(`Desconto inválido, máximo permitido é ${limiteMax}%.`)
                      }
                    }
                  }}
                  onBlur={() => verificarDescontoAplicado()}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault()
                      // Avança para forma de pagamento — seleciona dinheiro como padrão se nada selecionado
                      if (!formaPagamento) setFormaPagamento("dinheiro")
                      ;(e.target as HTMLElement).blur()
                    }
                  }}
                  className="h-8 text-sm flex-1"
                />
                <Select value={tipoDesconto} onValueChange={(v: "reais" | "percentual") => { setTipoDesconto(v); verificarDescontoAplicado(desconto, v) }}>
                  <SelectTrigger className="w-16 h-8 text-xs"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="reais">R$</SelectItem>
                    <SelectItem value="percentual">%</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Resumo do desconto: valor original, desconto (R$ e %) e valor com desconto */}
            {descontoTotal + descontoItens + descontoPontos > 0 && subtotalBruto > 0 && (
              <div className="rounded-lg border border-border bg-muted/30 px-3 py-2 text-xs space-y-1">
                <div className="flex justify-between text-muted-foreground">
                  <span>Valor original</span>
                  <span>{formatarMoeda(subtotalBruto)}</span>
                </div>
                {descontoTotal + descontoItens > 0 && (
                  <div className="flex justify-between text-red-500">
                    <span>
                      Desconto ({(((descontoTotal + descontoItens) / subtotalBruto) * 100).toLocaleString("pt-BR", { maximumFractionDigits: 2 })}%)
                      {descontoItens > 0 && descontoTotal > 0 && (
                        <span className="block text-[10px] text-muted-foreground">
                          itens {formatarMoeda(descontoItens)} · venda {formatarMoeda(descontoTotal)}
                        </span>
                      )}
                    </span>
                    <span>-{formatarMoeda(descontoTotal + descontoItens)}</span>
                  </div>
                )}
                {descontoPontos > 0 && (
                  <div className="flex justify-between text-amber-600">
                    <span>Pontos</span>
                    <span>-{formatarMoeda(descontoPontos)}</span>
                  </div>
                )}
                <div className="flex justify-between border-t border-border pt-1 font-semibold">
                  <span>Valor com desconto</span>
                  <span className="text-orange-600">{formatarMoeda(total)}</span>
                </div>
              </div>
            )}

            {/* Cupom do cliente */}
            <div className="space-y-1">
              <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Cupom</label>
              {cupom ? (
                <div className="flex items-center justify-between rounded-md border border-emerald-200 bg-emerald-50 px-2 py-1.5 text-xs text-emerald-800 dark:border-emerald-800 dark:bg-emerald-950/30 dark:text-emerald-300">
                  <span>
                    🎟️ <strong>{cupom.codigo}</strong> · {cupom.tipo === "percentual" ? `${cupom.valor}%` : formatarMoeda(cupom.valor)} (-{formatarMoeda(descontoCupom)})
                  </span>
                  <button className="text-emerald-700 hover:underline" onClick={() => setCupom(null)}>remover</button>
                </div>
              ) : (
                <div className="flex gap-1.5">
                  <Input
                    placeholder="Ex.: NIVER-AB12C"
                    value={codigoCupom}
                    onChange={(e) => setCodigoCupom(e.target.value.toUpperCase())}
                    onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); aplicarCupom() } }}
                    className="h-8 text-sm flex-1 uppercase"
                  />
                  <Button type="button" variant="outline" className="h-8 text-xs" disabled={validandoCupom || !codigoCupom.trim()} onClick={aplicarCupom}>
                    {validandoCupom ? "..." : "Aplicar"}
                  </Button>
                </div>
              )}
            </div>

            {/* Pontos de fidelidade */}
            {clienteSelecionado && clienteSelecionado.pontos_fidelidade > 0 && (
              <div className="rounded-lg border border-amber-200 dark:border-amber-700/40 bg-amber-50/80 dark:bg-amber-900/20 p-2 space-y-1.5">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-bold text-amber-700 dark:text-amber-300 uppercase tracking-wider">⭐ Pontos</span>
                  <span className="text-xs font-bold text-amber-600">{clienteSelecionado.pontos_fidelidade} pts</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <Input
                    type="number"
                    min="0"
                    max={clienteSelecionado.pontos_fidelidade}
                    step="1"
                    value={pontosUsar || ""}
                    onChange={(e) => {
                      const val = Math.min(parseInt(e.target.value) || 0, clienteSelecionado.pontos_fidelidade)
                      setPontosUsar(val)
                    }}
                    placeholder="0"
                    className="h-7 text-xs flex-1"
                  />
                  <button
                    type="button"
                    onClick={() => setPontosUsar(clienteSelecionado.pontos_fidelidade)}
                    className="text-[9px] font-bold text-amber-600 hover:text-amber-700 px-2 py-1 rounded bg-amber-100 dark:bg-amber-900/40 transition-colors whitespace-nowrap"
                  >
                    Todos
                  </button>
                </div>
                {pontosUsar > 0 && (
                  <p className="text-[10px] text-amber-700 dark:text-amber-400">
                    = <strong>{formatarMoeda(descontoPontos)}</strong> de desconto
                  </p>
                )}
              </div>
            )}

            {/* Recompensas/brindes */}
            {clienteSelecionado && clienteSelecionado.pontos_fidelidade > 0 && recompensas.length > 0 && (
              <div className="rounded-lg border border-purple-200 dark:border-purple-700/40 bg-purple-50/80 dark:bg-purple-900/20 p-2 space-y-1.5">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-bold text-purple-700 dark:text-purple-300 uppercase tracking-wider flex items-center gap-1">
                    <Gift className="w-3 h-3" /> Brinde
                  </span>
                  {recompensaSelecionada && (
                    <button type="button" onClick={() => setRecompensaSelecionada(null)} className="text-[10px] text-purple-500 hover:text-purple-700">
                      Cancelar
                    </button>
                  )}
                </div>
                {recompensaSelecionada ? (
                  <div className="flex items-center gap-2 bg-purple-100 dark:bg-purple-900/40 rounded p-2">
                    <Gift className="w-3.5 h-3.5 text-purple-600 shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="text-[11px] font-semibold text-purple-800 dark:text-purple-200 truncate">{recompensaSelecionada.nome}</p>
                      <p className="text-[9px] text-purple-600">-{recompensaSelecionada.pontos_necessarios} pts</p>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-1 max-h-24 overflow-y-auto">
                    {recompensas.filter((r) => r.estoque === null || r.estoque > 0).map((rec) => {
                      const pontosDisponiveis = clienteSelecionado.pontos_fidelidade - pontosUsar
                      const podeResgatar = pontosDisponiveis >= rec.pontos_necessarios
                      return (
                        <button
                          key={rec.id}
                          type="button"
                          disabled={!podeResgatar}
                          onClick={() => setRecompensaSelecionada(rec)}
                          className={`w-full flex items-center justify-between p-1.5 rounded text-left text-[11px] transition-colors ${
                            podeResgatar ? "hover:bg-purple-100 dark:hover:bg-purple-900/30 cursor-pointer" : "opacity-40 cursor-not-allowed"
                          }`}
                        >
                          <span className="truncate">{rec.nome}</span>
                          <span className="font-bold text-purple-600 shrink-0 ml-1">{rec.pontos_necessarios} pts</span>
                        </button>
                      )
                    })}
                  </div>
                )}
              </div>
            )}

            {/* Forma de pagamento */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider flex items-center">
                Pagamento <Kbd>F8</Kbd>
              </label>
              <div className="grid grid-cols-3 gap-1">
                {(["dinheiro", "pix", "cartao_debito", "cartao_credito", "outro"] as const).map((fp) => (
                  <button
                    key={fp}
                    onClick={() => setFormaPagamento(fp)}
                    className={`py-1.5 px-1.5 rounded-lg border text-[10px] font-bold transition-all ${
                      formaPagamento === fp
                        ? "bg-orange-500 text-white border-orange-500 shadow-sm shadow-orange-500/20"
                        : "border-border text-foreground hover:border-orange-300 hover:text-orange-600"
                    }`}
                  >
                    {labelsFormaPagamento[fp]}
                  </button>
                ))}
                <button
                  onClick={() => setFormaPagamento("debito_cliente")}
                  className={`py-1.5 px-1.5 rounded-lg border text-[10px] font-bold transition-all ${
                    formaPagamento === "debito_cliente"
                      ? "bg-orange-500 text-white border-orange-500 shadow-sm"
                      : "border-dashed border-amber-400 text-amber-600 hover:bg-amber-50 dark:hover:bg-amber-500/10"
                  }`}
                >
                  📋 Débito
                </button>
              </div>
              {coraAtiva && (
                <div className="grid grid-cols-2 gap-1 mt-1">
                  <button
                    onClick={() => setFormaPagamento("boleto_cora")}
                    className={`py-1.5 px-1.5 rounded-lg border text-[10px] font-bold transition-all ${
                      formaPagamento === "boleto_cora"
                        ? "bg-orange-500 text-white border-orange-500 shadow-sm"
                        : "border-teal-400 text-teal-600 hover:bg-teal-50 dark:hover:bg-teal-500/10"
                    }`}
                  >
                    🏦 Boleto
                  </button>
                  <button
                    onClick={() => setFormaPagamento("pix_cora")}
                    className={`py-1.5 px-1.5 rounded-lg border text-[10px] font-bold transition-all ${
                      formaPagamento === "pix_cora"
                        ? "bg-orange-500 text-white border-orange-500 shadow-sm"
                        : "border-teal-400 text-teal-600 hover:bg-teal-50 dark:hover:bg-teal-500/10"
                    }`}
                  >
                    📱 Pix Online
                  </button>
                </div>
              )}
              {/* Data de vencimento para boleto */}
              {coraAtiva && formaPagamento === "boleto_cora" && (
                <div className="space-y-1 mt-1">
                  <label className="text-[10px] font-medium text-muted-foreground">Vencimento do boleto</label>
                  <Input
                    type="date"
                    value={boletoDataVencimento || calcular3DiasUteis()}
                    onChange={(e) => setBoletoDataVencimento(e.target.value)}
                    className="h-8 text-xs"
                  />
                </div>
              )}
            </div>

            {/* Campos condicionais de pagamento */}
            {formaPagamento === "dinheiro" && (
              <div className="space-y-1.5">
                <label className="text-[10px] font-medium text-muted-foreground">Valor recebido</label>
                <Input
                  type="number"
                  step="0.01"
                  min={total}
                  placeholder={formatarMoeda(total)}
                  value={valorRecebido}
                  onChange={(e) => setValorRecebido(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault()
                      if (itens.length > 0 && formaPagamento) finalizarVenda()
                    }
                  }}
                  className="h-8 text-sm"
                />
                {troco !== null && troco > 0 && (
                  <p className="text-xs font-bold text-emerald-500">Troco: {formatarMoeda(troco)}</p>
                )}
              </div>
            )}

            {formaPagamento === "debito_cliente" && (
              <div className="space-y-1.5">
                {!clienteSelecionado && (
                  <p className="text-[10px] text-amber-600 bg-amber-50 dark:bg-amber-500/10 px-2 py-1.5 rounded">⚠️ Selecione um cliente</p>
                )}
                <label className="text-[10px] font-medium text-muted-foreground">Valor pago agora</label>
                <Input
                  type="number"
                  step="0.01"
                  min="0"
                  max={total}
                  placeholder="0,00"
                  value={valorRecebido}
                  onChange={(e) => setValorRecebido(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault()
                      if (itens.length > 0 && formaPagamento) finalizarVenda()
                    }
                  }}
                  className="h-8 text-sm"
                />
                {parseFloat(valorRecebido) > 0 && (
                  <div>
                    <label className="text-[10px] font-medium text-muted-foreground">Forma da entrada</label>
                    <select value={formaPagEntrada} onChange={(e) => setFormaPagEntrada(e.target.value)}
                      className="w-full h-8 rounded-lg border border-input bg-background px-2 text-xs mt-0.5">
                      <option value="dinheiro">Dinheiro</option>
                      <option value="pix">Pix</option>
                      <option value="cartao_debito">Cartão Débito</option>
                      <option value="cartao_credito">Cartão Crédito</option>
                    </select>
                  </div>
                )}
                {total > 0 && (
                  <p className="text-[10px] text-amber-600 font-medium">
                    Em débito: {formatarMoeda(total - (parseFloat(valorRecebido) || 0))}
                  </p>
                )}
              </div>
            )}

            {formaPagamento === "cartao_credito" && (
              <div className="space-y-1.5">
                <label className="text-[10px] font-medium text-muted-foreground">Parcelas</label>
                <Select value={parcelas} onValueChange={setParcelas}>
                  <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {[1,2,3,4,5,6,7,8,9,10,11,12].map((n) => (
                      <SelectItem key={n} value={n.toString()}>{n}x de {formatarMoeda(total / n)}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            {/* Pix Online — pop-up por cima da tela enquanto aguarda o pagamento */}
            {pixOnlineData && (
              <PixOnlinePanel
                boletoId={pixOnlineData.boletoId}
                qrCode={pixOnlineData.qrCode}
                copiaCola={pixOnlineData.copiaCola}
                valor={total}
                onPaid={() => {
                  setPixOnlineData(null)
                  setVendaFinalizada((prev) => prev ?? { id: pixOnlineData.vendaIdTemp!, numero: 0, total })
                  setModalSucesso(true)
                }}
                onCancel={async () => {
                  if (pixOnlineData.vendaIdTemp) {
                    await supabase.from("vendas").delete().eq("id", pixOnlineData.vendaIdTemp)
                  }
                  setPixOnlineData(null)
                }}
              />
            )}

            {/* Observações e data */}
            <div className="space-y-1.5">
              <Textarea
                placeholder="Observações (opcional)"
                value={observacoes}
                onChange={(e) => setObservacoes(e.target.value)}
                className="text-xs resize-none"
                rows={1}
              />
              <div className="flex items-center gap-2">
                <Input
                  type="date"
                  value={dataVenda}
                  max={new Date().toISOString().slice(0, 10)}
                  onChange={(e) => setDataVenda(e.target.value)}
                  className="h-6 text-[10px] flex-1"
                />
                {dataVenda !== new Date().toISOString().slice(0, 10) && (
                  <Badge variant="secondary" className="text-[9px] text-amber-600 bg-amber-50 dark:bg-amber-900/30 shrink-0">Retroativa</Badge>
                )}
              </div>
            </div>
          </div>

          {/* Botões de ação fixos no rodapé da coluna direita */}
          <div className="shrink-0 px-3 py-2 border-t border-border bg-white dark:bg-zinc-950 space-y-1.5">
            <Button
              className="w-full gap-2 h-10 text-sm font-bold bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 shadow-lg shadow-orange-500/20"
              disabled={loading || itens.length === 0 || !formaPagamento}
              onClick={finalizarVenda}
            >
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
              Finalizar — {formatarMoeda(total)}
              <Kbd>F4</Kbd>
            </Button>
            <Button
              variant="outline"
              className="w-full gap-2 h-7 text-[11px]"
              onClick={novaVenda}
            >
              <Plus className="w-3 h-3" />
              Nova Venda
              <Kbd>F5</Kbd>
            </Button>
          </div>
        </div>
      </div>

      {/* Modal de sucesso */}
      {/* Fechar (X, Esc ou clique fora) já começa uma nova venda */}
      <Dialog open={modalSucesso && !ehCelular} onOpenChange={(aberto) => { if (!aberto) novaVenda() }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-emerald-500">
              <div className="w-8 h-8 rounded-full bg-emerald-500/10 flex items-center justify-center">
                <Check className="w-4 h-4" />
              </div>
              Venda Concluída!
            </DialogTitle>
          </DialogHeader>
          <div className="py-4 text-center space-y-2">
            <p className="text-3xl font-black text-orange-600">{formatarMoeda(vendaFinalizada?.total ?? 0)}</p>
            <p className="text-muted-foreground text-sm">Venda #{vendaFinalizada?.numero}</p>
            {vendaFinalizada?.codigo && <p className="text-[11px] font-mono text-muted-foreground">Rastreio: {vendaFinalizada.codigo}</p>}
            {clienteSelecionado && (
              <p className="text-sm">Cliente: <span className="font-medium">{clienteSelecionado.nome_completo}</span></p>
            )}
            {troco !== null && troco > 0 && (
              <p className="text-emerald-500 font-bold text-lg">Troco: {formatarMoeda(troco)}</p>
            )}
            {coraResult && (
              <div className="mt-3 p-3 rounded-lg border border-teal-200 bg-teal-50 dark:bg-teal-900/20 dark:border-teal-800 space-y-2 text-left">
                {coraResult.qrCode && (
                  <>
                    <p className="text-xs font-semibold text-teal-700 dark:text-teal-300">Pix Cora gerado:</p>
                    <img src={`data:image/png;base64,${coraResult.qrCode}`} alt="QR Code Pix" className="w-40 h-40 mx-auto" />
                  </>
                )}
                {coraResult.copiaCola && (
                  <div>
                    <p className="text-xs text-muted-foreground">Código copia e cola:</p>
                    <p className="text-xs font-mono bg-white dark:bg-gray-800 p-2 rounded break-all">{coraResult.copiaCola}</p>
                  </div>
                )}
                {coraResult.linhaDigitavel && (
                  <div>
                    <p className="text-xs font-semibold text-teal-700 dark:text-teal-300">Boleto Cora emitido:</p>
                    <p className="text-xs font-mono bg-white dark:bg-gray-800 p-2 rounded break-all">{coraResult.linhaDigitavel}</p>
                  </div>
                )}
                {coraResult.urlPdf && (
                  <a href={coraResult.urlPdf} target="_blank" rel="noopener noreferrer" className="text-xs text-teal-600 underline">
                    Abrir PDF do boleto
                  </a>
                )}
              </div>
            )}
          </div>
          <DialogFooter className="flex-col gap-2 sm:flex-col">
            <Button variant="outline" className="w-full gap-2 justify-between" onClick={imprimirReciboTermica}>
              <span>🧾 Imprimir Recibo (Térmica)</span>
              <Kbd>F1</Kbd>
            </Button>
            <Button variant="outline" className="w-full gap-2 justify-between" onClick={imprimirRecibo} disabled={loadingRecibo}>
              <span>{loadingRecibo ? <Loader2 className="w-4 h-4 animate-spin inline" /> : "🖨️"} Imprimir Recibo (PDF)</span>
              <Kbd>F2</Kbd>
            </Button>
            {clienteSelecionado?.telefone && (
              <Button variant="outline" className="w-full gap-2 justify-between" onClick={enviarWhatsApp}>
                <span>💬 Enviar por WhatsApp</span>
                <Kbd>F3</Kbd>
              </Button>
            )}
            <Button className="w-full gap-2 justify-between bg-orange-500 hover:bg-orange-600" onClick={novaVenda}>
              <span className="flex items-center gap-2"><Plus className="w-4 h-4" /> Nova Venda</span>
              <Kbd>Enter</Kbd>
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* PIN Modal para desconto acima do limite */}
      <PinModal
        aberto={pinModalAberto}
        onClose={() => {
          setPinModalAberto(false)
          // Fechou sem o PIN: o desconto acima do limite não vale
          if (!pinDescontoAprovadoRef.current && pinDescontoOrigemRef.current === "desconto") {
            if (pinDescontoItemRef.current) alterarDescontoItem(pinDescontoItemRef.current, "")
            else setDesconto("0")
            toast.info("Desconto removido: acima do limite precisa do PIN de gerente.")
          }
        }}
        onSuccess={() => {
          pinDescontoAprovadoRef.current = true
          descontoAutorizadoAteRef.current = pinDescontoPendenteRef.current
          setPinModalAberto(false)
          toast.success("Desconto autorizado")
          // Se o PIN foi pedido ao finalizar, continua a finalização
          if (pinDescontoOrigemRef.current === "finalizar") setTimeout(() => finalizarVenda(), 100)
        }}
        empresaId={empresa.id}
        titulo="Desconto acima do limite"
        descricao="Este desconto excede o limite permitido. Digite o PIN de gerente para autorizar."
      />

      {/* PIN para alterar o preço de um item */}
      <PinModal
        aberto={!!pinPrecoItem}
        onClose={() => setPinPrecoItem(null)}
        onSuccess={() => {
          const id = pinPrecoItem
          setPinPrecoItem(null)
          if (!id) return
          setPrecoLiberado((prev) => (prev.includes(id) ? prev : [...prev, id]))
          setTimeout(() => {
            const campo = document.querySelector<HTMLInputElement>(`[data-preco-item="${id}"]`)
            campo?.focus()
            campo?.select()
          }, 150)
        }}
        empresaId={empresa.id}
        titulo="Alterar preço do item"
        descricao="Digite o PIN de gerente para alterar o preço deste item."
      />

      {/* Boleto Result Modal */}
      <BoletoResultModal
        open={showBoletoResult}
        onOpenChange={setShowBoletoResult}
        boleto={boletoResultData}
        onNovaVenda={() => {
          setShowBoletoResult(false)
          novaVenda()
        }}
      />
    </div>
    </>
  )
}
