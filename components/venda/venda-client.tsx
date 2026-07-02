"use client"

import { useState, useCallback } from "react"
import { useRouter } from "next/navigation"
import { Search, Plus, Minus, Trash2, ShoppingCart, Check, Loader2, X, User, ChevronDown } from "lucide-react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
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
  const [mostrarBuscaCliente, setMostrarBuscaCliente] = useState(false)
  const [mostrarBuscaProduto, setMostrarBuscaProduto] = useState(false)
  const [loading, setLoading] = useState(false)
  const [loadingRecibo, setLoadingRecibo] = useState(false)
  const [modalSucesso, setModalSucesso] = useState(false)
  const [vendaFinalizada, setVendaFinalizada] = useState<{ id: string; numero: number; total: number } | null>(null)
  const [valorRecebido, setValorRecebido] = useState("")
  const supabase = createClient()

  // Calcular totais
  const subtotal = itens.reduce((s, i) => s + i.subtotal, 0)
  const descontoValor = tipoDesconto === "reais"
    ? parseFloat(desconto) || 0
    : (subtotal * (parseFloat(desconto) || 0)) / 100
  // Desconto de pontos de fidelidade
  const pontosPorReal = empresa.pontos_para_desconto ?? 100
  const descontoPontos = pontosUsar > 0 ? pontosUsar / pontosPorReal : 0
  const total = Math.max(0, subtotal - descontoValor - descontoPontos)
  const troco = formaPagamento === "dinheiro" && valorRecebido
    ? Math.max(0, (parseFloat(valorRecebido) || 0) - total)
    : null

  // Busca de clientes
  const clientesFiltrados = clientes.filter((c) => {
    const t = buscaCliente.toLowerCase()
    return c.nome_completo.toLowerCase().includes(t) || (c.cpf ?? "").includes(t) || (c.telefone ?? "").includes(t)
  }).slice(0, 8)

  // Busca de produtos
  const produtosFiltrados = produtos.filter((p) =>
    p.nome.toLowerCase().includes(buscaProduto.toLowerCase())
  ).slice(0, 10)

  function adicionarItem(produto: ProdutoSimples) {
    setItens((prev) => {
      const existente = prev.find((i) => i.produto_servico_id === produto.id)
      if (existente) {
        return prev.map((i) =>
          i.produto_servico_id === produto.id
            ? { ...i, quantidade: i.quantidade + 1, subtotal: (i.quantidade + 1) * i.preco_unitario }
            : i
        )
      }
      return [...prev, {
        produto_servico_id: produto.id,
        nome_item: produto.nome,
        quantidade: 1,
        preco_unitario: produto.preco,
        comissao_percentual: produto.comissao_percentual,
        subtotal: produto.preco,
      }]
    })
    setBuscaProduto("")
    setMostrarBuscaProduto(false)
  }

  function alterarQuantidade(id: string, delta: number) {
    setItens((prev) => prev
      .map((i) => i.produto_servico_id === id
        ? { ...i, quantidade: Math.max(1, i.quantidade + delta), subtotal: Math.max(1, i.quantidade + delta) * i.preco_unitario }
        : i
      )
    )
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
    if (!caixaId) { toast.error("Abra o caixa antes de realizar vendas.", { action: { label: "Ir para o caixa", onClick: () => window.location.href = "/caixa" } }); return }

    setLoading(true)

    const isDebito = formaPagamento === "debito_cliente"
    const valorPagoAgora = isDebito ? (parseFloat(valorRecebido) || 0) : total
    const formaPagFinal = isDebito
      ? (valorPagoAgora > 0 ? "dinheiro" : "outro")
      : formaPagamento as "dinheiro" | "cartao_credito" | "cartao_debito" | "pix" | "outro"
    // Criar venda
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

    // Criar itens
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

    // Registrar movimentação no caixa
    await supabase.from("movimentacoes_caixa").insert({
      empresa_id: empresa.id,
      caixa_id: caixaId,
      tipo: "entrada",
      categoria: "venda",
      descricao: `Venda #${venda.numero_venda} - ${clienteSelecionado?.nome_completo ?? "Sem cliente"}`,
      valor: isDebito ? valorPagoAgora : total,
      venda_id: venda.id,
    })

    // Registrar débito do cliente se for pagamento em débito
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

    // Atualizar estoque de produtos
    for (const item of itens) {
      const prod = produtos.find((p) => p.id === item.produto_servico_id)
      if (prod?.tipo === "produto" && prod.estoque_atual !== null) {
        await supabase
          .from("produtos_servicos")
          .update({ estoque_atual: Math.max(0, prod.estoque_atual - item.quantidade) })
          .eq("id", prod.id)
      }
    }

    // Atualizar pontos de fidelidade do cliente
    if (clienteSelecionado) {
      const pontosGanhos = Math.floor(total * (empresa.pontos_por_real ?? 1))
      const { data: clienteAtual } = await supabase
        .from("clientes")
        .select("pontos_fidelidade")
        .eq("id", clienteSelecionado.id)
        .single()
      const pontosAtuais = clienteAtual?.pontos_fidelidade ?? 0
      // Subtrai pontos usados e soma pontos ganhos
      const novoSaldo = Math.max(0, pontosAtuais - pontosUsar + pontosGanhos)
      await supabase
        .from("clientes")
        .update({ pontos_fidelidade: novoSaldo })
        .eq("id", clienteSelecionado.id)
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
    setFormaPagamento("")
    setParcelas("1")
    setObservacoes("")
    setValorRecebido("")
    setVendaFinalizada(null)
    setModalSucesso(false)
    setBuscaCliente("")
    setBuscaProduto("")
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

  return (
    <div className="space-y-4 max-w-4xl mx-auto">
      <div>
        <h1 className="text-2xl font-bold">Nova Venda</h1>
        {!caixaId && (
          <div className="mt-2 p-3 bg-yellow-500/10 border border-yellow-500/30 rounded-lg text-sm text-yellow-600 dark:text-yellow-400 flex items-center gap-2">
            ⚠️ Caixa fechado. <a href="/caixa" className="underline font-medium">Abrir caixa</a>
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Coluna esquerda — itens */}
        <div className="lg:col-span-2 space-y-4">
          {/* Busca de produto */}
          <Card>
            <CardContent className="p-4">
              <Label className="text-sm font-medium mb-2 block">Adicionar produto/serviço</Label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  placeholder="Buscar produto ou serviço..."
                  className="pl-9"
                  value={buscaProduto}
                  onChange={(e) => { setBuscaProduto(e.target.value); setMostrarBuscaProduto(true) }}
                  onFocus={() => setMostrarBuscaProduto(true)}
                />
                {mostrarBuscaProduto && buscaProduto && (
                  <div className="absolute top-full left-0 right-0 z-50 bg-white dark:bg-zinc-900 border border-border rounded-xl shadow-xl mt-1 max-h-60 overflow-y-auto">
                    {produtosFiltrados.length > 0 ? produtosFiltrados.map((p) => (
                      <button
                        key={p.id}
                        className="w-full text-left px-3 py-2.5 hover:bg-muted flex items-center justify-between text-sm transition-colors"
                        onClick={() => adicionarItem(p)}
                      >
                        <div>
                          <span className="font-semibold text-foreground">{p.nome}</span>
                          <span className="ml-2 text-xs text-muted-foreground capitalize">({p.tipo})</span>
                        </div>
                        <span className="font-bold text-primary">{formatarMoeda(p.preco)}</span>
                      </button>
                    )) : (
                      <p className="px-3 py-2 text-sm text-muted-foreground">Nenhum resultado</p>
                    )}
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Lista de itens */}
          {itens.length > 0 ? (
            <Card>
              <CardContent className="p-0">
                {itens.map((item, idx) => (
                  <div key={item.produto_servico_id} className={`p-4 ${idx < itens.length - 1 ? "border-b border-border" : ""}`}>
                    <div className="flex items-center gap-3">
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-sm truncate">{item.nome_item}</p>
                        <div className="flex items-center gap-2 mt-1">
                          <span className="text-xs text-muted-foreground">Preço unit.:</span>
                          <Input
                            type="number"
                            step="0.01"
                            min="0"
                            value={item.preco_unitario}
                            onChange={(e) => alterarPreco(item.produto_servico_id, e.target.value)}
                            className="h-7 w-24 text-xs px-2"
                          />
                        </div>
                      </div>
                      <div className="flex items-center gap-1">
                        <Button variant="outline" size="xs" onClick={() => alterarQuantidade(item.produto_servico_id, -1)}>
                          <Minus className="w-3 h-3" />
                        </Button>
                        <span className="w-8 text-center text-sm font-medium">{item.quantidade}</span>
                        <Button variant="outline" size="xs" onClick={() => alterarQuantidade(item.produto_servico_id, 1)}>
                          <Plus className="w-3 h-3" />
                        </Button>
                      </div>
                      <span className="font-semibold text-sm w-20 text-right">{formatarMoeda(item.subtotal)}</span>
                      <Button variant="ghost" size="xs" onClick={() => removerItem(item.produto_servico_id)} className="text-destructive hover:text-destructive">
                        <Trash2 className="w-3.5 h-3.5" />
                      </Button>
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
          ) : (
            <div className="py-12 text-center text-muted-foreground border border-dashed border-border rounded-xl">
              <ShoppingCart className="w-10 h-10 mx-auto mb-2 opacity-40" />
              <p className="text-sm">Nenhum item adicionado</p>
            </div>
          )}
        </div>

        {/* Coluna direita — resumo e pagamento */}
        <div className="space-y-4">
          {/* Cliente */}
          <Card>
            <CardContent className="p-4 space-y-3">
              <Label className="text-sm font-medium">Cliente (opcional)</Label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  placeholder="Buscar cliente..."
                  className="pl-9"
                  value={clienteSelecionado ? clienteSelecionado.nome_completo : buscaCliente}
                  onChange={(e) => { setBuscaCliente(e.target.value); setClienteSelecionado(null); setMostrarBuscaCliente(true) }}
                  onFocus={() => setMostrarBuscaCliente(true)}
                />
                {clienteSelecionado && (
                  <button onClick={() => { setClienteSelecionado(null); setBuscaCliente("") }} className="absolute right-3 top-1/2 -translate-y-1/2">
                    <X className="w-3.5 h-3.5 text-muted-foreground" />
                  </button>
                )}
                {mostrarBuscaCliente && buscaCliente && !clienteSelecionado && (
                  <div className="absolute top-full left-0 right-0 z-50 bg-white dark:bg-zinc-900 border border-border rounded-xl shadow-xl mt-1 max-h-48 overflow-y-auto">
                    {clientesFiltrados.map((c) => (
                      <button key={c.id} className="w-full text-left px-3 py-2.5 hover:bg-muted text-sm transition-colors"
                        onClick={() => { setClienteSelecionado(c); setBuscaCliente(""); setMostrarBuscaCliente(false) }}>
                        <p className="font-semibold text-foreground">{c.nome_completo}</p>
                        <p className="text-xs text-muted-foreground">{c.telefone}</p>
                      </button>
                    ))}
                    {clientesFiltrados.length === 0 && <p className="px-3 py-2 text-sm text-muted-foreground">Nenhum resultado</p>}
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Funcionário */}
          {funcionarios.length > 0 && (
            <Card>
              <CardContent className="p-4">
                <Label className="text-sm font-medium mb-2 block">Funcionário (opcional)</Label>
                <Select value={funcionarioId} onValueChange={setFuncionarioId}>
                  <SelectTrigger><SelectValue placeholder="Selecionar..." /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">Nenhum</SelectItem>
                    {funcionarios.map((f) => (
                      <SelectItem key={f.id} value={f.id}>{f.nome}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </CardContent>
            </Card>
          )}

          {/* Resumo */}
          <Card>
            <CardContent className="p-4 space-y-3">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Subtotal</span>
                <span>{formatarMoeda(subtotal)}</span>
              </div>

              {/* Desconto */}
              <div className="flex items-center gap-2">
                <div className="flex-1">
                  <Input
                    type="number"
                    min="0"
                    step="0.01"
                    placeholder="Desconto"
                    value={desconto}
                    onChange={(e) => setDesconto(e.target.value)}
                    className="h-8 text-sm"
                  />
                </div>
                <Select value={tipoDesconto} onValueChange={(v: "reais" | "percentual") => setTipoDesconto(v)}>
                  <SelectTrigger className="w-20 h-8 text-xs"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="reais">R$</SelectItem>
                    <SelectItem value="percentual">%</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              {descontoValor > 0 && (
                <div className="flex justify-between text-sm text-red-500">
                  <span>Desconto</span>
                  <span>- {formatarMoeda(descontoValor)}</span>
                </div>
              )}

              {/* Pontos de fidelidade */}
              {clienteSelecionado && clienteSelecionado.pontos_fidelidade > 0 && (
                <div className="rounded-lg border border-amber-200 dark:border-amber-700/40 bg-amber-50 dark:bg-amber-900/20 p-3 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-amber-800 dark:text-amber-300 flex items-center gap-1.5">
                      ⭐ Pontos disponíveis
                    </span>
                    <span className="text-sm font-bold text-amber-600">
                      {clienteSelecionado.pontos_fidelidade} pts
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Input
                      type="number"
                      min="0"
                      max={clienteSelecionado.pontos_fidelidade}
                      step="1"
                      value={pontosUsar || ""}
                      onChange={(e) => {
                        const val = Math.min(
                          parseInt(e.target.value) || 0,
                          clienteSelecionado.pontos_fidelidade
                        )
                        setPontosUsar(val)
                      }}
                      placeholder="0"
                      className="h-8 text-sm flex-1"
                    />
                    <button
                      type="button"
                      onClick={() => setPontosUsar(clienteSelecionado.pontos_fidelidade)}
                      className="text-[10px] font-bold text-amber-600 hover:text-amber-700 px-2 py-1 rounded bg-amber-100 dark:bg-amber-900/40 hover:bg-amber-200 transition-colors whitespace-nowrap"
                    >
                      Usar todos
                    </button>
                  </div>
                  {pontosUsar > 0 && (
                    <p className="text-xs text-amber-700 dark:text-amber-400">
                      {pontosUsar} pts = <strong>{formatarMoeda(descontoPontos)}</strong> de desconto
                      <span className="text-amber-500 ml-1">({pontosPorReal} pts = R$ 1,00)</span>
                    </p>
                  )}
                </div>
              )}

              {descontoPontos > 0 && (
                <div className="flex justify-between text-sm text-amber-600">
                  <span>Desconto (pontos)</span>
                  <span>- {formatarMoeda(descontoPontos)}</span>
                </div>
              )}

              <Separator />
              <div className="flex justify-between font-bold text-lg">
                <span>Total</span>
                <span className="text-primary">{formatarMoeda(total)}</span>
              </div>
            </CardContent>
          </Card>

          {/* Forma de pagamento */}
          <Card>
            <CardContent className="p-4 space-y-3">
              <Label className="text-sm font-medium">Forma de pagamento *</Label>
              <div className="grid grid-cols-2 gap-2">
                {(["dinheiro", "pix", "cartao_debito", "cartao_credito", "outro"] as const).map((fp) => (
                  <button
                    key={fp}
                    onClick={() => setFormaPagamento(fp)}
                    style={formaPagamento === fp ? { backgroundColor: "#F26E1D", color: "#ffffff", borderColor: "#F26E1D" } : {}}
                    className={`py-2.5 px-3 rounded-xl border text-xs font-bold transition-all ${
                      formaPagamento === fp
                        ? "shadow-sm"
                        : "border-border text-foreground hover:border-primary/50 hover:text-primary"
                    }`}
                  >
                    {labelsFormaPagamento[fp]}
                  </button>
                ))}
                <button
                  onClick={() => setFormaPagamento("debito_cliente")}
                  style={formaPagamento === "debito_cliente" ? { backgroundColor: "#F26E1D", color: "#ffffff", borderColor: "#F26E1D" } : {}}
                  className={`py-2.5 px-3 rounded-xl border text-xs font-bold transition-all col-span-2 ${
                    formaPagamento === "debito_cliente"
                      ? "shadow-sm"
                      : "border-dashed border-amber-400 text-amber-600 hover:bg-amber-50 dark:hover:bg-amber-500/10"
                  }`}
                >
                  📋 Lançar como débito do cliente
                </button>
              </div>

              {formaPagamento === "dinheiro" && (
                <div>
                  <Label className="text-xs">Valor recebido</Label>
                  <Input
                    type="number"
                    step="0.01"
                    min={total}
                    placeholder={formatarMoeda(total)}
                    value={valorRecebido}
                    onChange={(e) => setValorRecebido(e.target.value)}
                    className="mt-1 h-8 text-sm"
                  />
                  {troco !== null && troco > 0 && (
                    <p className="text-xs text-emerald-500 mt-1">Troco: {formatarMoeda(troco)}</p>
                  )}
                </div>
              )}

              {formaPagamento === "debito_cliente" && (
                <div className="space-y-2">
                  {!clienteSelecionado && (
                    <p className="text-xs text-amber-600 bg-amber-50 dark:bg-amber-500/10 px-3 py-2 rounded-lg">
                      ⚠️ Selecione um cliente para lançar o débito
                    </p>
                  )}
                  <div>
                    <Label className="text-xs">Valor pago agora (opcional)</Label>
                    <Input
                      type="number"
                      step="0.01"
                      min="0"
                      max={total}
                      placeholder="0,00 — deixe vazio para débito total"
                      value={valorRecebido}
                      onChange={(e) => setValorRecebido(e.target.value)}
                      className="mt-1 h-8 text-sm"
                    />
                  </div>
                  {total > 0 && (
                    <div className="flex justify-between text-xs px-1">
                      <span className="text-muted-foreground">Valor em débito:</span>
                      <span className="font-bold text-amber-600">
                        {formatarMoeda(total - (parseFloat(valorRecebido) || 0))}
                      </span>
                    </div>
                  )}
                </div>
              )}

              {formaPagamento === "cartao_credito" && (
                <div>
                  <Label className="text-xs">Parcelas</Label>
                  <Select value={parcelas} onValueChange={setParcelas}>
                    <SelectTrigger className="mt-1 h-8 text-xs"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {[1,2,3,4,5,6,7,8,9,10,11,12].map((n) => (
                        <SelectItem key={n} value={n.toString()}>{n}x de {formatarMoeda(total / n)}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}
            </CardContent>
          </Card>

          <div className="space-y-2">
            <Textarea
              placeholder="Observações (opcional)"
              value={observacoes}
              onChange={(e) => setObservacoes(e.target.value)}
              className="text-sm"
              rows={2}
            />

            {/* Data da venda — padrão hoje, permite retroativa */}
            <div className="space-y-1">
              <Label className="text-xs text-muted-foreground flex items-center gap-1.5">
                <span>Data da venda</span>
                {dataVenda !== new Date().toISOString().slice(0, 10) && (
                  <span className="text-[10px] font-bold text-amber-600 bg-amber-50 dark:bg-amber-900/30 px-1.5 py-0.5 rounded-full">
                    Retroativa
                  </span>
                )}
              </Label>
              <Input
                type="date"
                value={dataVenda}
                max={new Date().toISOString().slice(0, 10)}
                onChange={(e) => setDataVenda(e.target.value)}
                className="h-8 text-sm"
              />
            </div>

            <Button
              className="w-full gap-2"
              size="lg"
              disabled={loading || itens.length === 0 || !formaPagamento}
              onClick={finalizarVenda}
            >
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
              Finalizar Venda — {formatarMoeda(total)}
            </Button>
          </div>
        </div>
      </div>

      {/* Modal de sucesso */}
      <Dialog open={modalSucesso} onOpenChange={setModalSucesso}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-emerald-500">
              <Check className="w-5 h-5" />
              Venda Concluída!
            </DialogTitle>
          </DialogHeader>
          <div className="py-4 text-center space-y-2">
            <p className="text-3xl font-bold text-primary">{formatarMoeda(vendaFinalizada?.total ?? 0)}</p>
            <p className="text-muted-foreground text-sm">Venda #{vendaFinalizada?.numero}</p>
            {clienteSelecionado && (
              <p className="text-sm">Cliente: <span className="font-medium">{clienteSelecionado.nome_completo}</span></p>
            )}
            {troco !== null && troco > 0 && (
              <p className="text-emerald-500 font-medium">Troco: {formatarMoeda(troco)}</p>
            )}
          </div>
          <DialogFooter className="flex-col gap-2 sm:flex-col">
            <Button variant="outline" className="w-full gap-2" onClick={imprimirRecibo} disabled={loadingRecibo}>
              {loadingRecibo ? <Loader2 className="w-4 h-4 animate-spin" /> : "🖨️"} Imprimir Recibo (PDF)
            </Button>
            {clienteSelecionado?.telefone && (
              <Button variant="outline" className="w-full gap-2" onClick={enviarWhatsApp}>
                💬 Enviar por WhatsApp
              </Button>
            )}
            <Button className="w-full gap-2" onClick={novaVenda}>
              <Plus className="w-4 h-4" />
              Nova Venda
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
