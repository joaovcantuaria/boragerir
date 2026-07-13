"use client"

import { useState, useRef } from "react"
import { Search, Plus, Minus, Trash2, ShoppingCart, Check, Loader2, X, User, Gift } from "lucide-react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { formatarMoeda, labelsFormaPagamento } from "@/lib/utils"
import type { Empresa } from "@/types"

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

type MobileTab = "produtos" | "carrinho" | "pagamento"

interface VendaMobileProps {
  empresa: Empresa
  caixaId: string | null
  clientes: ClienteSimples[]
  produtos: ProdutoSimples[]
  funcionarios: FuncionarioSimples[]
  // State e handlers compartilhados com o componente pai
  itens: ItemVendaLocal[]
  setItens: React.Dispatch<React.SetStateAction<ItemVendaLocal[]>>
  clienteSelecionado: ClienteSimples | null
  setClienteSelecionado: (c: ClienteSimples | null) => void
  funcionarioId: string
  setFuncionarioId: (id: string) => void
  desconto: string
  setDesconto: (v: string) => void
  tipoDesconto: "reais" | "percentual"
  setTipoDesconto: (v: "reais" | "percentual") => void
  pontosUsar: number
  setPontosUsar: (v: number) => void
  formaPagamento: string
  setFormaPagamento: (v: string) => void
  parcelas: string
  setParcelas: (v: string) => void
  observacoes: string
  setObservacoes: (v: string) => void
  dataVenda: string
  setDataVenda: (v: string) => void
  valorRecebido: string
  setValorRecebido: (v: string) => void
  recompensas: RecompensaDisponivel[]
  recompensaSelecionada: RecompensaDisponivel | null
  setRecompensaSelecionada: (r: RecompensaDisponivel | null) => void
  // Computados
  subtotal: number
  descontoValor: number
  descontoPontos: number
  total: number
  troco: number | null
  pontosResgateBrinde: number
  // Ações
  adicionarItem: (produto: ProdutoSimples) => void
  alterarQuantidade: (id: string, delta: number) => void
  removerItem: (id: string) => void
  finalizarVenda: () => void
  novaVenda: () => void
  loading: boolean
  // Modal sucesso
  modalSucesso: boolean
  setModalSucesso: (v: boolean) => void
  vendaFinalizada: { id: string; numero: number; total: number } | null
  imprimirRecibo: () => void
  imprimirReciboTermica: () => void
  enviarWhatsApp: () => void
  loadingRecibo: boolean
}

export function VendaMobile(props: VendaMobileProps) {
  const {
    empresa, caixaId, clientes, produtos, funcionarios,
    itens, setItens, clienteSelecionado, setClienteSelecionado,
    funcionarioId, setFuncionarioId, desconto, setDesconto,
    tipoDesconto, setTipoDesconto, pontosUsar, setPontosUsar,
    formaPagamento, setFormaPagamento, parcelas, setParcelas,
    observacoes, setObservacoes, dataVenda, setDataVenda,
    valorRecebido, setValorRecebido, recompensas,
    recompensaSelecionada, setRecompensaSelecionada,
    subtotal, descontoValor, descontoPontos, total, troco, pontosResgateBrinde,
    adicionarItem, alterarQuantidade, removerItem,
    finalizarVenda, novaVenda, loading,
    modalSucesso, setModalSucesso, vendaFinalizada,
    imprimirRecibo, imprimirReciboTermica, enviarWhatsApp, loadingRecibo,
  } = props

  const [tab, setTab] = useState<MobileTab>("produtos")
  const [buscaProduto, setBuscaProduto] = useState("")
  const [buscaCliente, setBuscaCliente] = useState("")
  const [mostrarBuscaCliente, setMostrarBuscaCliente] = useState(false)
  const inputBuscaRef = useRef<HTMLInputElement>(null)
  const clienteDropdownRef = useRef<HTMLDivElement>(null)

  const produtosFiltrados = produtos.filter((p) => {
    const termo = buscaProduto.toLowerCase()
    if (!termo) return true
    return p.nome.toLowerCase().includes(termo) ||
      (p.codigo_barras ?? "").includes(buscaProduto)
  }).slice(0, 20)

  const clientesFiltrados = clientes.filter((c) => {
    const t = buscaCliente.toLowerCase()
    return c.nome_completo.toLowerCase().includes(t) || (c.cpf ?? "").includes(t) || (c.telefone ?? "").includes(t)
  }).slice(0, 8)

  return (
    <div className="flex flex-col h-[calc(100vh-4rem)] md:hidden">
      {/* Header Mobile */}
      <div className="shrink-0 flex items-center justify-between px-3 py-2 border-b border-border bg-white dark:bg-zinc-950">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-orange-500 to-orange-600 flex items-center justify-center">
            <ShoppingCart className="w-3.5 h-3.5 text-white" />
          </div>
          <div>
            <h1 className="text-sm font-bold leading-tight">PDV</h1>
            <p className="text-[9px] text-muted-foreground leading-none">{empresa.nome}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {!caixaId && (
            <a href="/caixa" className="text-[10px] px-2 py-0.5 bg-yellow-500/10 border border-yellow-500/30 rounded-full text-yellow-600 font-medium">
              ⚠️ Caixa fechado
            </a>
          )}
          <div className="text-right">
            <p className="text-[9px] text-muted-foreground">Total</p>
            <p className="text-sm font-black text-orange-600 leading-none">{formatarMoeda(total)}</p>
          </div>
        </div>
      </div>

      {/* Tabs de navegação */}
      <div className="shrink-0 flex border-b border-border bg-zinc-50 dark:bg-zinc-900/50">
        <button
          onClick={() => setTab("produtos")}
          className={`flex-1 py-2.5 text-xs font-semibold text-center transition-colors relative ${
            tab === "produtos" ? "text-orange-600" : "text-muted-foreground"
          }`}
        >
          Produtos
          {tab === "produtos" && <div className="absolute bottom-0 left-2 right-2 h-0.5 bg-orange-500 rounded-full" />}
        </button>
        <button
          onClick={() => setTab("carrinho")}
          className={`flex-1 py-2.5 text-xs font-semibold text-center transition-colors relative ${
            tab === "carrinho" ? "text-orange-600" : "text-muted-foreground"
          }`}
        >
          Carrinho {itens.length > 0 && (
            <Badge className="ml-1 text-[9px] px-1.5 py-0 bg-orange-500 text-white">{itens.length}</Badge>
          )}
          {tab === "carrinho" && <div className="absolute bottom-0 left-2 right-2 h-0.5 bg-orange-500 rounded-full" />}
        </button>
        <button
          onClick={() => setTab("pagamento")}
          className={`flex-1 py-2.5 text-xs font-semibold text-center transition-colors relative ${
            tab === "pagamento" ? "text-orange-600" : "text-muted-foreground"
          }`}
        >
          Pagamento
          {tab === "pagamento" && <div className="absolute bottom-0 left-2 right-2 h-0.5 bg-orange-500 rounded-full" />}
        </button>
      </div>

      {/* Conteúdo por aba */}
      <div className="flex-1 overflow-y-auto">
        {/* ─── ABA PRODUTOS ─── */}
        {tab === "produtos" && (
          <div className="flex flex-col h-full">
            {/* Busca */}
            <div className="sticky top-0 z-10 p-3 bg-white dark:bg-zinc-950 border-b border-border">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  ref={inputBuscaRef}
                  placeholder="Buscar produto ou código..."
                  className="pl-9 h-10 text-sm"
                  value={buscaProduto}
                  onChange={(e) => setBuscaProduto(e.target.value)}
                />
                {buscaProduto && (
                  <button
                    onClick={() => setBuscaProduto("")}
                    className="absolute right-3 top-1/2 -translate-y-1/2"
                  >
                    <X className="w-4 h-4 text-muted-foreground" />
                  </button>
                )}
              </div>
            </div>

            {/* Grid de produtos */}
            <div className="flex-1 overflow-y-auto p-3">
              <div className="grid grid-cols-2 gap-2">
                {produtosFiltrados.map((p) => (
                  <button
                    key={p.id}
                    onClick={() => { adicionarItem(p); setTab("carrinho") }}
                    className="flex flex-col items-start p-3 rounded-xl border border-border bg-white dark:bg-zinc-900 hover:border-orange-300 hover:shadow-sm active:scale-[0.97] transition-all text-left"
                  >
                    <span className="text-xs font-medium text-foreground line-clamp-2 leading-tight">{p.nome}</span>
                    <div className="mt-auto pt-2 flex items-center justify-between w-full">
                      <span className="text-sm font-bold text-orange-600">{formatarMoeda(p.preco)}</span>
                      <Badge variant="secondary" className="text-[9px]">{p.tipo === "produto" ? "Prod" : "Serv"}</Badge>
                    </div>
                  </button>
                ))}
              </div>
              {produtosFiltrados.length === 0 && (
                <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
                  <Search className="w-8 h-8 opacity-20 mb-2" />
                  <p className="text-sm">Nenhum produto encontrado</p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* ─── ABA CARRINHO ─── */}
        {tab === "carrinho" && (
          <div className="flex flex-col h-full">
            {itens.length > 0 ? (
              <div className="flex-1 overflow-y-auto divide-y divide-border">
                {itens.map((item) => (
                  <div key={item.produto_servico_id} className="flex items-center gap-3 px-3 py-3">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{item.nome_item}</p>
                      <p className="text-xs text-muted-foreground">
                        {formatarMoeda(item.preco_unitario)} un.
                      </p>
                    </div>
                    <div className="flex items-center gap-1.5 shrink-0">
                      <button
                        onClick={() => alterarQuantidade(item.produto_servico_id, -1)}
                        className="w-7 h-7 rounded-full border border-border flex items-center justify-center active:bg-zinc-100 dark:active:bg-zinc-800"
                      >
                        <Minus className="w-3 h-3" />
                      </button>
                      <span className="w-6 text-center text-sm font-bold">{item.quantidade}</span>
                      <button
                        onClick={() => alterarQuantidade(item.produto_servico_id, 1)}
                        className="w-7 h-7 rounded-full border border-border flex items-center justify-center active:bg-zinc-100 dark:active:bg-zinc-800"
                      >
                        <Plus className="w-3 h-3" />
                      </button>
                    </div>
                    <span className="text-sm font-bold text-orange-600 shrink-0 w-16 text-right">
                      {formatarMoeda(item.subtotal)}
                    </span>
                    <button
                      onClick={() => removerItem(item.produto_servico_id)}
                      className="w-7 h-7 rounded-full flex items-center justify-center text-red-400 active:bg-red-50 dark:active:bg-red-500/10 shrink-0"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            ) : (
              <div className="flex-1 flex flex-col items-center justify-center text-muted-foreground py-16">
                <ShoppingCart className="w-12 h-12 opacity-20 mb-3" />
                <p className="text-sm font-medium">Carrinho vazio</p>
                <p className="text-xs mt-1">Adicione produtos na aba anterior</p>
                <Button
                  variant="outline"
                  size="sm"
                  className="mt-4"
                  onClick={() => setTab("produtos")}
                >
                  Ir para Produtos
                </Button>
              </div>
            )}
          </div>
        )}

        {/* ─── ABA PAGAMENTO ─── */}
        {tab === "pagamento" && (
          <div className="p-3 space-y-4">
            {/* Cliente */}
            <div className="space-y-2">
              <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Cliente</label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  placeholder="Buscar cliente..."
                  className="pl-9 h-10 text-sm"
                  value={clienteSelecionado ? clienteSelecionado.nome_completo : buscaCliente}
                  onChange={(e) => { setBuscaCliente(e.target.value); setClienteSelecionado(null); setMostrarBuscaCliente(true) }}
                  onFocus={() => setMostrarBuscaCliente(true)}
                />
                {clienteSelecionado && (
                  <button
                    onClick={() => { setClienteSelecionado(null); setBuscaCliente("") }}
                    className="absolute right-3 top-1/2 -translate-y-1/2"
                  >
                    <X className="w-4 h-4 text-muted-foreground" />
                  </button>
                )}
                {mostrarBuscaCliente && buscaCliente && !clienteSelecionado && (
                  <div ref={clienteDropdownRef} className="absolute top-full left-0 right-0 z-50 bg-white dark:bg-zinc-900 border border-border rounded-xl shadow-xl mt-1 max-h-48 overflow-y-auto">
                    {clientesFiltrados.map((c) => (
                      <button
                        key={c.id}
                        className="w-full text-left px-3 py-2.5 text-sm border-b border-border/50 last:border-0 active:bg-orange-50 dark:active:bg-orange-500/10"
                        onClick={() => { setClienteSelecionado(c); setBuscaCliente(""); setMostrarBuscaCliente(false) }}
                      >
                        <p className="font-medium text-foreground">{c.nome_completo}</p>
                        <p className="text-[11px] text-muted-foreground">{c.telefone} {c.pontos_fidelidade > 0 && `· ⭐ ${c.pontos_fidelidade} pts`}</p>
                      </button>
                    ))}
                    {clientesFiltrados.length === 0 && <p className="px-3 py-3 text-xs text-muted-foreground text-center">Nenhum resultado</p>}
                  </div>
                )}
              </div>
            </div>

            {/* Funcionário */}
            {funcionarios.length > 0 && (
              <div className="space-y-2">
                <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Atendente</label>
                <Select value={funcionarioId} onValueChange={setFuncionarioId}>
                  <SelectTrigger className="h-10 text-sm"><SelectValue placeholder="Selecionar atendente..." /></SelectTrigger>
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
              <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Desconto</label>
              <div className="flex gap-2">
                <Input
                  type="number"
                  min="0"
                  step="0.01"
                  placeholder="0"
                  value={desconto}
                  onChange={(e) => setDesconto(e.target.value)}
                  className="h-10 text-sm flex-1"
                />
                <Select value={tipoDesconto} onValueChange={(v: "reais" | "percentual") => setTipoDesconto(v)}>
                  <SelectTrigger className="w-20 h-10 text-sm"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="reais">R$</SelectItem>
                    <SelectItem value="percentual">%</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Pontos de fidelidade */}
            {clienteSelecionado && clienteSelecionado.pontos_fidelidade > 0 && (
              <div className="rounded-xl border border-amber-200 dark:border-amber-700/40 bg-amber-50/80 dark:bg-amber-900/20 p-3 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-amber-700 dark:text-amber-300">⭐ Pontos disponíveis</span>
                  <span className="text-sm font-bold text-amber-600">{clienteSelecionado.pontos_fidelidade} pts</span>
                </div>
                <div className="flex items-center gap-2">
                  <Input
                    type="number"
                    min="0"
                    max={clienteSelecionado.pontos_fidelidade}
                    value={pontosUsar || ""}
                    onChange={(e) => setPontosUsar(Math.min(parseInt(e.target.value) || 0, clienteSelecionado.pontos_fidelidade))}
                    placeholder="0"
                    className="h-9 text-sm flex-1"
                  />
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => setPontosUsar(clienteSelecionado.pontos_fidelidade)}
                    className="text-xs text-amber-600 border-amber-300"
                  >
                    Todos
                  </Button>
                </div>
                {pontosUsar > 0 && (
                  <p className="text-xs text-amber-700 dark:text-amber-400">
                    = <strong>{formatarMoeda(descontoPontos)}</strong> de desconto
                  </p>
                )}
              </div>
            )}

            {/* Recompensas/brindes */}
            {clienteSelecionado && clienteSelecionado.pontos_fidelidade > 0 && recompensas.length > 0 && (
              <div className="rounded-xl border border-purple-200 dark:border-purple-700/40 bg-purple-50/80 dark:bg-purple-900/20 p-3 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-purple-700 dark:text-purple-300 flex items-center gap-1">
                    <Gift className="w-3.5 h-3.5" /> Brinde
                  </span>
                  {recompensaSelecionada && (
                    <button onClick={() => setRecompensaSelecionada(null)} className="text-xs text-purple-500">
                      Cancelar
                    </button>
                  )}
                </div>
                {recompensaSelecionada ? (
                  <div className="flex items-center gap-2 bg-purple-100 dark:bg-purple-900/40 rounded-lg p-2.5">
                    <Gift className="w-4 h-4 text-purple-600 shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-semibold text-purple-800 dark:text-purple-200 truncate">{recompensaSelecionada.nome}</p>
                      <p className="text-[10px] text-purple-600">-{recompensaSelecionada.pontos_necessarios} pts</p>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-1.5 max-h-28 overflow-y-auto">
                    {recompensas.filter((r) => r.estoque === null || r.estoque > 0).map((rec) => {
                      const pontosDisponiveis = clienteSelecionado.pontos_fidelidade - pontosUsar
                      const podeResgatar = pontosDisponiveis >= rec.pontos_necessarios
                      return (
                        <button
                          key={rec.id}
                          type="button"
                          disabled={!podeResgatar}
                          onClick={() => setRecompensaSelecionada(rec)}
                          className={`w-full flex items-center justify-between p-2 rounded-lg text-left text-xs transition-colors ${
                            podeResgatar ? "active:bg-purple-100 dark:active:bg-purple-900/30" : "opacity-40"
                          }`}
                        >
                          <span className="truncate">{rec.nome}</span>
                          <span className="font-bold text-purple-600 shrink-0 ml-2">{rec.pontos_necessarios} pts</span>
                        </button>
                      )
                    })}
                  </div>
                )}
              </div>
            )}

            {/* Forma de pagamento */}
            <div className="space-y-2">
              <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Forma de pagamento</label>
              <div className="grid grid-cols-3 gap-2">
                {(["dinheiro", "pix", "cartao_debito", "cartao_credito", "outro"] as const).map((fp) => (
                  <button
                    key={fp}
                    onClick={() => setFormaPagamento(fp)}
                    className={`py-2.5 px-2 rounded-xl border text-xs font-bold transition-all ${
                      formaPagamento === fp
                        ? "bg-orange-500 text-white border-orange-500 shadow-sm"
                        : "border-border text-foreground active:border-orange-300"
                    }`}
                  >
                    {labelsFormaPagamento[fp]}
                  </button>
                ))}
                <button
                  onClick={() => setFormaPagamento("debito_cliente")}
                  className={`py-2.5 px-2 rounded-xl border text-xs font-bold transition-all ${
                    formaPagamento === "debito_cliente"
                      ? "bg-orange-500 text-white border-orange-500 shadow-sm"
                      : "border-dashed border-amber-400 text-amber-600 active:bg-amber-50"
                  }`}
                >
                  📋 Débito
                </button>
              </div>
            </div>

            {/* Campos condicionais */}
            {formaPagamento === "dinheiro" && (
              <div className="space-y-2">
                <label className="text-xs font-medium text-muted-foreground">Valor recebido</label>
                <Input
                  type="number"
                  step="0.01"
                  min={total}
                  placeholder={formatarMoeda(total)}
                  value={valorRecebido}
                  onChange={(e) => setValorRecebido(e.target.value)}
                  className="h-10 text-sm"
                />
                {troco !== null && troco > 0 && (
                  <p className="text-sm font-bold text-emerald-500">Troco: {formatarMoeda(troco)}</p>
                )}
              </div>
            )}

            {formaPagamento === "debito_cliente" && (
              <div className="space-y-2">
                {!clienteSelecionado && (
                  <p className="text-xs text-amber-600 bg-amber-50 dark:bg-amber-500/10 px-3 py-2 rounded-lg">⚠️ Selecione um cliente acima</p>
                )}
                <label className="text-xs font-medium text-muted-foreground">Valor pago agora</label>
                <Input
                  type="number"
                  step="0.01"
                  min="0"
                  max={total}
                  placeholder="0,00"
                  value={valorRecebido}
                  onChange={(e) => setValorRecebido(e.target.value)}
                  className="h-10 text-sm"
                />
                {total > 0 && (
                  <p className="text-xs text-amber-600 font-medium">
                    Em débito: {formatarMoeda(total - (parseFloat(valorRecebido) || 0))}
                  </p>
                )}
              </div>
            )}

            {formaPagamento === "cartao_credito" && (
              <div className="space-y-2">
                <label className="text-xs font-medium text-muted-foreground">Parcelas</label>
                <Select value={parcelas} onValueChange={setParcelas}>
                  <SelectTrigger className="h-10 text-sm"><SelectValue /></SelectTrigger>
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
                className="text-sm resize-none"
                rows={2}
              />
              <div className="flex items-center gap-2">
                <Input
                  type="date"
                  value={dataVenda}
                  max={new Date().toISOString().slice(0, 10)}
                  onChange={(e) => setDataVenda(e.target.value)}
                  className="h-9 text-xs flex-1"
                />
                {dataVenda !== new Date().toISOString().slice(0, 10) && (
                  <Badge variant="secondary" className="text-[9px] text-amber-600 bg-amber-50 dark:bg-amber-900/30 shrink-0">Retroativa</Badge>
                )}
              </div>
            </div>

            {/* Resumo */}
            <div className="rounded-xl border border-border bg-white dark:bg-zinc-900 p-3 space-y-1.5">
              <div className="flex items-center justify-between text-xs text-muted-foreground">
                <span>{itens.length} {itens.length === 1 ? "item" : "itens"}</span>
                <span>Subtotal: {formatarMoeda(subtotal)}</span>
              </div>
              {descontoValor > 0 && (
                <div className="flex items-center justify-between text-xs">
                  <span className="text-red-500">Desconto</span>
                  <span className="text-red-500">-{formatarMoeda(descontoValor)}</span>
                </div>
              )}
              {descontoPontos > 0 && (
                <div className="flex items-center justify-between text-xs">
                  <span className="text-amber-600">Pontos</span>
                  <span className="text-amber-600">-{formatarMoeda(descontoPontos)}</span>
                </div>
              )}
              <div className="flex items-center justify-between pt-1.5 border-t border-border">
                <span className="text-sm font-bold">Total</span>
                <span className="text-lg font-black text-orange-600">{formatarMoeda(total)}</span>
              </div>
            </div>

            {/* Espaço extra para não ficar atrás do botão fixo */}
            <div className="h-20" />
          </div>
        )}
      </div>

      {/* Barra fixa inferior — Ação principal */}
      <div className="shrink-0 px-3 py-2 border-t border-border bg-white dark:bg-zinc-950 safe-bottom">
        {tab === "produtos" && itens.length > 0 && (
          <Button
            className="w-full h-12 text-sm font-bold bg-orange-500 hover:bg-orange-600 shadow-lg"
            onClick={() => setTab("carrinho")}
          >
            <ShoppingCart className="w-4 h-4 mr-2" />
            Ver Carrinho ({itens.length}) — {formatarMoeda(total)}
          </Button>
        )}
        {tab === "carrinho" && itens.length > 0 && (
          <Button
            className="w-full h-12 text-sm font-bold bg-orange-500 hover:bg-orange-600 shadow-lg"
            onClick={() => setTab("pagamento")}
          >
            Ir para Pagamento — {formatarMoeda(total)}
          </Button>
        )}
        {tab === "pagamento" && (
          <div className="flex gap-2">
            <Button
              variant="outline"
              className="h-12 px-4"
              onClick={novaVenda}
            >
              <Plus className="w-4 h-4" />
            </Button>
            <Button
              className="flex-1 h-12 text-sm font-bold bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 shadow-lg"
              disabled={loading || itens.length === 0 || !formaPagamento}
              onClick={finalizarVenda}
            >
              {loading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Check className="w-4 h-4 mr-2" />}
              Finalizar — {formatarMoeda(total)}
            </Button>
          </div>
        )}
        {tab === "produtos" && itens.length === 0 && (
          <p className="text-center text-xs text-muted-foreground py-3">Selecione produtos para começar</p>
        )}
        {tab === "carrinho" && itens.length === 0 && (
          <Button
            variant="outline"
            className="w-full h-12 text-sm"
            onClick={() => setTab("produtos")}
          >
            Adicionar Produtos
          </Button>
        )}
      </div>

      {/* Modal de sucesso */}
      <Dialog open={modalSucesso} onOpenChange={setModalSucesso}>
        <DialogContent className="max-w-[92vw] rounded-2xl">
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
            <Button variant="outline" className="w-full gap-2" onClick={imprimirReciboTermica}>
              🧾 Imprimir (Térmica)
            </Button>
            <Button variant="outline" className="w-full gap-2" onClick={imprimirRecibo} disabled={loadingRecibo}>
              {loadingRecibo ? <Loader2 className="w-4 h-4 animate-spin" /> : "🖨️"} Recibo PDF
            </Button>
            {clienteSelecionado?.telefone && (
              <Button variant="outline" className="w-full gap-2" onClick={enviarWhatsApp}>
                💬 Enviar WhatsApp
              </Button>
            )}
            <Button className="w-full gap-2 bg-orange-500 hover:bg-orange-600" onClick={novaVenda}>
              <Plus className="w-4 h-4" /> Nova Venda
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
