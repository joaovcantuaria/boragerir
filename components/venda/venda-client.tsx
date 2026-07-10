"use client"

import { useState, useEffect, useRef } from "react"
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
import type { Empresa } from "@/types"
import { gerarReciboPDF } from "@/lib/pdf/recibo"

interface ItemVendaLocal {
  produto_servico_id: string
  nome_item: string
  quantidade: number
  preco_unitario: number
  comissao_percentual: number | null
  subtotal: number
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
  cpf: string
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
  const [tipoDesconto, setTipoDesconto] = useState<"reais" | "percentual">("reais")
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
  const [vendaFinalizada, setVendaFinalizada] = useState<{ id: string; numero: number; total: number } | null>(null)
  const [valorRecebido, setValorRecebido] = useState("")
  const supabase = createClient()
  const inputBuscaRef = useRef<HTMLInputElement>(null)
  const inputClienteRef = useRef<HTMLInputElement>(null)
  const inputDescontoRef = useRef<HTMLInputElement>(null)
  const inputQtdRef = useRef<HTMLInputElement>(null)

  // Recompensas/brindes disponíveis
  const [recompensas, setRecompensas] = useState<RecompensaDisponivel[]>([])
  const [recompensaSelecionada, setRecompensaSelecionada] = useState<RecompensaDisponivel | null>(null)

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

  // Atalhos de teclado do PDV
  useEffect(() => {
    function handler(e: KeyboardEvent) {
      const tag = (e.target as HTMLElement).tagName
      const isInput = ["INPUT", "TEXTAREA", "SELECT"].includes(tag)

      // F2 — Focar busca de produto
      if (e.key === "F2") {
        e.preventDefault()
        inputBuscaRef.current?.focus()
        return
      }
      // F3 — Focar busca de cliente
      if (e.key === "F3") {
        e.preventDefault()
        inputClienteRef.current?.focus()
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
  const descontoValor = tipoDesconto === "reais"
    ? parseFloat(desconto) || 0
    : (subtotal * (parseFloat(desconto) || 0)) / 100
  const pontosPorReal = empresa.pontos_para_desconto ?? 100
  const descontoPontos = pontosUsar > 0 ? pontosUsar / pontosPorReal : 0
  const pontosResgateBrinde = recompensaSelecionada?.pontos_necessarios ?? 0
  const total = Math.max(0, subtotal - descontoValor - descontoPontos)
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
            ? { ...i, quantidade: i.quantidade + qtd, subtotal: (i.quantidade + qtd) * i.preco_unitario }
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
        ? { ...i, quantidade: Math.max(1, i.quantidade + delta), subtotal: Math.max(1, i.quantidade + delta) * i.preco_unitario }
        : i
    ))
  }

  function alterarPreco(id: string, novoPreco: string) {
    const preco = parseFloat(novoPreco) || 0
    setItens((prev) => prev.map((i) =>
      i.produto_servico_id === id
        ? { ...i, preco_unitario: preco, subtotal: i.quantidade * preco }
        : i
    ))
  }

  function removerItem(id: string) {
    setItens((prev) => prev.filter((i) => i.produto_servico_id !== id))
  }

  async function finalizarVenda() {
    if (itens.length === 0) { toast.error("Adicione ao menos um item."); return }
    if (!formaPagamento) { toast.error("Selecione a forma de pagamento."); return }
    if (formaPagamento === "debito_cliente" && !clienteSelecionado) {
      toast.error("Selecione um cliente para lançar o débito."); return
    }
    if (recompensaSelecionada && clienteSelecionado) {
      const totalPontosNecessarios = pontosUsar + pontosResgateBrinde
      if (totalPontosNecessarios > clienteSelecionado.pontos_fidelidade) {
        toast.error("Pontos insuficientes para desconto + brinde."); return
      }
    }
    if (!caixaId) { toast.error("Abra o caixa antes de realizar vendas.", { action: { label: "Ir para o caixa", onClick: () => window.location.href = "/caixa" } }); return }

    setLoading(true)

    const isDebito = formaPagamento === "debito_cliente"
    const valorPagoAgora = isDebito ? (parseFloat(valorRecebido) || 0) : total
    const formaPagFinal = isDebito
      ? (valorPagoAgora > 0 ? "dinheiro" : "outro")
      : formaPagamento as "dinheiro" | "cartao_credito" | "cartao_debito" | "pix" | "outro"

    const { data: venda, error: errVenda } = await supabase
      .from("vendas")
      .insert({
        empresa_id: empresa.id,
        caixa_id: caixaId,
        cliente_id: clienteSelecionado?.id ?? null,
        funcionario_id: funcionarioId || null,
        subtotal,
        desconto: descontoValor,
        total,
        forma_pagamento: formaPagFinal,
        parcelas: parseInt(parcelas) || 1,
        status: "concluida",
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

    await supabase.from("movimentacoes_caixa").insert({
      empresa_id: empresa.id,
      caixa_id: caixaId,
      tipo: "entrada",
      categoria: "venda",
      descricao: `Venda #${venda.numero_venda} - ${clienteSelecionado?.nome_completo ?? "Sem cliente"}`,
      valor: isDebito ? valorPagoAgora : total,
      venda_id: venda.id,
    })

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
        await supabase
          .from("produtos_servicos")
          .update({ estoque_atual: Math.max(0, prod.estoque_atual - item.quantidade) })
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

    setVendaFinalizada({ id: venda.id, numero: venda.numero_venda, total })
    setModalSucesso(true)
    setLoading(false)
  }

  function novaVenda() {
    setItens([])
    setClienteSelecionado(null)
    setFuncionarioId("")
    setDesconto("0")
    setPontosUsar(0)
    setRecompensaSelecionada(null)
    setFormaPagamento("")
    setParcelas("1")
    setObservacoes("")
    setValorRecebido("")
    setVendaFinalizada(null)
    setModalSucesso(false)
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
    }

    recibo += sep + "\n"
    recibo += linha("Subtotal:", formatarMoeda(subtotal)) + "\n"
    if (descontoValor > 0) recibo += linha("Desconto:", `-${formatarMoeda(descontoValor)}`) + "\n"
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

  async function imprimirRecibo() {
    if (!vendaFinalizada) return
    setLoadingRecibo(true)
    try {
      await gerarReciboPDF({
        empresa,
        venda: {
          numero: vendaFinalizada.numero,
          total: vendaFinalizada.total,
          subtotal,
          desconto: descontoValor,
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

  return (
    <div className="h-[calc(100vh-4rem)] flex flex-col overflow-hidden">
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
                    const match = produtos.find((p) => p.codigo_barras && p.codigo_barras === valor.trim())
                    if (match) {
                      setBuscaProduto("")
                      setTimeout(() => adicionarItem(match), 50)
                    }
                  }}
                  onFocus={() => { setMostrarBuscaProduto(true); setIndiceProduto(0) }}
                  onKeyDown={(e) => {
                    if (e.key === "ArrowDown") {
                      e.preventDefault()
                      setIndiceProduto((prev) => Math.min(prev + 1, produtosFiltrados.length - 1))
                    } else if (e.key === "ArrowUp") {
                      e.preventDefault()
                      setIndiceProduto((prev) => Math.max(prev - 1, 0))
                    } else if (e.key === "Enter") {
                      e.preventDefault()
                      if (mostrarBuscaProduto && produtosFiltrados.length > 0) {
                        adicionarItem(produtosFiltrados[indiceProduto])
                        setBuscaProduto("")
                      }
                    } else if (e.key === "Escape") {
                      setMostrarBuscaProduto(false)
                    }
                  }}
                />
                <Kbd>F2</Kbd>

                {mostrarBuscaProduto && (
                  <div className="absolute top-full left-0 right-0 z-50 bg-white dark:bg-zinc-900 border border-border rounded-lg shadow-2xl mt-1 max-h-56 overflow-y-auto">
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
                <div className="grid grid-cols-[1fr_100px_80px_80px_32px] gap-2 px-4 py-2 bg-zinc-50 dark:bg-zinc-900/80 text-[10px] font-semibold text-muted-foreground uppercase tracking-wider sticky top-0">
                  <span>Produto</span>
                  <span className="text-center">Qtd</span>
                  <span className="text-right">Unit.</span>
                  <span className="text-right">Subtotal</span>
                  <span></span>
                </div>

                {itens.map((item) => (
                  <div key={item.produto_servico_id} className="grid grid-cols-[1fr_100px_80px_80px_32px] gap-2 px-4 py-2.5 items-center hover:bg-zinc-50/50 dark:hover:bg-zinc-800/30 transition-colors">
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
                        onChange={(e) => alterarPreco(item.produto_servico_id, e.target.value)}
                        className="h-6 w-full text-xs text-right px-1 [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none"
                      />
                    </div>
                    <span className="text-sm font-semibold text-right text-orange-600">{formatarMoeda(item.subtotal)}</span>
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
                {descontoValor > 0 && (
                  <span className="text-red-500">Desc: -{formatarMoeda(descontoValor)}</span>
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
        <div className="w-80 lg:w-96 shrink-0 flex flex-col overflow-y-auto bg-zinc-50/30 dark:bg-zinc-900/30">
          <div className="flex-1 p-4 space-y-4">
            {/* Cliente */}
            <div className="space-y-2">
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
                  onFocus={() => { setMostrarBuscaCliente(true); setIndiceCliente(0) }}
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
                  <div className="absolute top-full left-0 right-0 z-50 bg-white dark:bg-zinc-900 border border-border rounded-lg shadow-xl mt-1 max-h-40 overflow-y-auto">
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
              <div className="space-y-2">
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
            <div className="space-y-2">
              <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Desconto <Kbd>F6</Kbd></label>
              <div className="flex gap-1.5">
                <Input
                  ref={inputDescontoRef}
                  type="number"
                  min="0"
                  step="0.01"
                  placeholder="0"
                  value={desconto}
                  onChange={(e) => setDesconto(e.target.value)}
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
                <Select value={tipoDesconto} onValueChange={(v: "reais" | "percentual") => setTipoDesconto(v)}>
                  <SelectTrigger className="w-16 h-8 text-xs"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="reais">R$</SelectItem>
                    <SelectItem value="percentual">%</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Pontos de fidelidade */}
            {clienteSelecionado && clienteSelecionado.pontos_fidelidade > 0 && (
              <div className="rounded-lg border border-amber-200 dark:border-amber-700/40 bg-amber-50/80 dark:bg-amber-900/20 p-3 space-y-2">
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
              <div className="rounded-lg border border-purple-200 dark:border-purple-700/40 bg-purple-50/80 dark:bg-purple-900/20 p-3 space-y-2">
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
            <div className="space-y-2">
              <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider flex items-center">
                Pagamento <Kbd>F8</Kbd>
              </label>
              <div className="grid grid-cols-3 gap-1.5">
                {(["dinheiro", "pix", "cartao_debito", "cartao_credito", "outro"] as const).map((fp) => (
                  <button
                    key={fp}
                    onClick={() => setFormaPagamento(fp)}
                    className={`py-2 px-2 rounded-lg border text-[11px] font-bold transition-all ${
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
                  className={`py-2 px-2 rounded-lg border text-[11px] font-bold transition-all ${
                    formaPagamento === "debito_cliente"
                      ? "bg-orange-500 text-white border-orange-500 shadow-sm"
                      : "border-dashed border-amber-400 text-amber-600 hover:bg-amber-50 dark:hover:bg-amber-500/10"
                  }`}
                >
                  📋 Débito
                </button>
              </div>
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

            {/* Observações e data */}
            <div className="space-y-2">
              <Textarea
                placeholder="Observações (opcional)"
                value={observacoes}
                onChange={(e) => setObservacoes(e.target.value)}
                className="text-xs resize-none"
                rows={2}
              />
              <div className="flex items-center gap-2">
                <Input
                  type="date"
                  value={dataVenda}
                  max={new Date().toISOString().slice(0, 10)}
                  onChange={(e) => setDataVenda(e.target.value)}
                  className="h-7 text-xs flex-1"
                />
                {dataVenda !== new Date().toISOString().slice(0, 10) && (
                  <Badge variant="secondary" className="text-[9px] text-amber-600 bg-amber-50 dark:bg-amber-900/30 shrink-0">Retroativa</Badge>
                )}
              </div>
            </div>
          </div>

          {/* Botões de ação fixos no rodapé da coluna direita */}
          <div className="shrink-0 p-4 border-t border-border bg-white dark:bg-zinc-950 space-y-2">
            <Button
              className="w-full gap-2 h-12 text-sm font-bold bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 shadow-lg shadow-orange-500/20"
              disabled={loading || itens.length === 0 || !formaPagamento}
              onClick={finalizarVenda}
            >
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
              Finalizar — {formatarMoeda(total)}
              <Kbd>F4</Kbd>
            </Button>
            <Button
              variant="outline"
              className="w-full gap-2 h-8 text-xs"
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
      <Dialog open={modalSucesso} onOpenChange={setModalSucesso}>
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
            {clienteSelecionado && (
              <p className="text-sm">Cliente: <span className="font-medium">{clienteSelecionado.nome_completo}</span></p>
            )}
            {troco !== null && troco > 0 && (
              <p className="text-emerald-500 font-bold text-lg">Troco: {formatarMoeda(troco)}</p>
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
    </div>
  )
}
