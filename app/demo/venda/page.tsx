"use client"

import { useState } from "react"
import { Search, Plus, Minus, Trash2, ShoppingCart, Check, X } from "lucide-react"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { toast } from "sonner"
import { formatarMoeda, labelsFormaPagamento } from "@/lib/utils"
import { clientesDemo, produtosServicosDemo, funcionariosDemo } from "@/lib/demo/dados-demo"

interface ItemLocal {
  id: string; nome: string; quantidade: number; preco: number
}

export default function DemoVenda() {
  const [itens, setItens] = useState<ItemLocal[]>([])
  const [clienteSel, setClienteSel] = useState<typeof clientesDemo[0] | null>(null)
  const [buscaCliente, setBuscaCliente] = useState("")
  const [buscaProduto, setBuscaProduto] = useState("")
  const [desconto, setDesconto] = useState("0")
  const [formaPag, setFormaPag] = useState("")
  const [valorRecebido, setValorRecebido] = useState("")
  const [sucesso, setSucesso] = useState(false)

  const subtotal = itens.reduce((s, i) => s + i.preco * i.quantidade, 0)
  const descontoVal = parseFloat(desconto) || 0
  const total = Math.max(0, subtotal - descontoVal)
  const troco = formaPag === "dinheiro" && valorRecebido ? Math.max(0, parseFloat(valorRecebido) - total) : null

  const clientesFiltrados = clientesDemo.filter((c) => c.nome_completo.toLowerCase().includes(buscaCliente.toLowerCase())).slice(0, 5)
  const produtosFiltrados = produtosServicosDemo.filter((p) => p.nome.toLowerCase().includes(buscaProduto.toLowerCase())).slice(0, 8)

  function adicionarItem(p: typeof produtosServicosDemo[0]) {
    setItens((prev) => {
      const ex = prev.find((i) => i.id === p.id)
      if (ex) return prev.map((i) => i.id === p.id ? { ...i, quantidade: i.quantidade + 1 } : i)
      return [...prev, { id: p.id, nome: p.nome, quantidade: 1, preco: p.preco }]
    })
    setBuscaProduto("")
  }

  function finalizar() {
    if (itens.length === 0) { toast.error("Adicione ao menos um item."); return }
    if (!formaPag) { toast.error("Selecione a forma de pagamento."); return }
    setSucesso(true)
  }

  return (
    <div className="space-y-4 max-w-4xl mx-auto">
      <div>
        <h1 className="text-2xl font-bold">Nova Venda</h1>
        <p className="text-muted-foreground text-sm">Modo demo — nenhuma venda é salva</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Coluna itens */}
        <div className="lg:col-span-2 space-y-4">
          {/* Busca produto */}
          <Card>
            <CardContent className="p-4">
              <Label className="text-sm font-medium mb-2 block">Adicionar produto/serviço</Label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input placeholder="Buscar..." className="pl-9" value={buscaProduto}
                  onChange={(e) => setBuscaProduto(e.target.value)} />
                {buscaProduto && (
                  <div className="absolute top-full left-0 right-0 z-10 bg-popover border border-border rounded-md shadow-lg mt-1 max-h-60 overflow-y-auto">
                    {produtosFiltrados.map((p) => (
                      <button key={p.id} className="w-full text-left px-3 py-2.5 hover:bg-muted flex justify-between text-sm"
                        onClick={() => adicionarItem(p)}>
                        <span className="font-medium">{p.nome} <span className="text-xs text-muted-foreground capitalize">({p.tipo})</span></span>
                        <span className="text-primary font-semibold">{formatarMoeda(p.preco)}</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
              {/* Atalhos rápidos */}
              <div className="flex flex-wrap gap-2 mt-3">
                {produtosServicosDemo.filter((p) => p.tipo === "servico").slice(0, 4).map((p) => (
                  <button key={p.id} onClick={() => adicionarItem(p)}
                    className="text-xs px-3 py-1.5 rounded-full border border-border hover:border-primary/50 hover:bg-primary/5 transition-colors">
                    {p.nome}
                  </button>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Lista de itens */}
          {itens.length > 0 ? (
            <Card>
              <CardContent className="p-0">
                {itens.map((item, idx) => (
                  <div key={item.id} className={`p-4 flex items-center gap-3 ${idx < itens.length - 1 ? "border-b border-border" : ""}`}>
                    <div className="flex-1">
                      <p className="font-medium text-sm">{item.nome}</p>
                      <p className="text-xs text-muted-foreground">{formatarMoeda(item.preco)} / un</p>
                    </div>
                    <div className="flex items-center gap-1">
                      <Button variant="outline" size="xs" onClick={() => setItens((p) => p.map((i) => i.id === item.id && i.quantidade > 1 ? { ...i, quantidade: i.quantidade - 1 } : i))}>
                        <Minus className="w-3 h-3" />
                      </Button>
                      <span className="w-8 text-center text-sm font-medium">{item.quantidade}</span>
                      <Button variant="outline" size="xs" onClick={() => setItens((p) => p.map((i) => i.id === item.id ? { ...i, quantidade: i.quantidade + 1 } : i))}>
                        <Plus className="w-3 h-3" />
                      </Button>
                    </div>
                    <span className="font-semibold text-sm w-20 text-right">{formatarMoeda(item.preco * item.quantidade)}</span>
                    <Button variant="ghost" size="xs" className="text-destructive" onClick={() => setItens((p) => p.filter((i) => i.id !== item.id))}>
                      <Trash2 className="w-3.5 h-3.5" />
                    </Button>
                  </div>
                ))}
              </CardContent>
            </Card>
          ) : (
            <div className="py-12 text-center text-muted-foreground border border-dashed border-border rounded-xl">
              <ShoppingCart className="w-10 h-10 mx-auto mb-2 opacity-40" />
              <p className="text-sm">Busque um serviço ou produto acima</p>
            </div>
          )}
        </div>

        {/* Coluna resumo */}
        <div className="space-y-4">
          {/* Cliente */}
          <Card>
            <CardContent className="p-4">
              <Label className="text-sm font-medium mb-2 block">Cliente (opcional)</Label>
              <div className="relative">
                <Input placeholder="Buscar cliente..." value={clienteSel ? clienteSel.nome_completo : buscaCliente}
                  onChange={(e) => { setBuscaCliente(e.target.value); setClienteSel(null) }} />
                {buscaCliente && !clienteSel && (
                  <div className="absolute top-full left-0 right-0 z-10 bg-popover border border-border rounded-md shadow-lg mt-1 max-h-48 overflow-y-auto">
                    {clientesFiltrados.map((c) => (
                      <button key={c.id} className="w-full text-left px-3 py-2 hover:bg-muted text-sm"
                        onClick={() => { setClienteSel(c); setBuscaCliente("") }}>
                        <p className="font-medium">{c.nome_completo}</p>
                        <p className="text-xs text-muted-foreground">{c.telefone}</p>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Resumo */}
          <Card>
            <CardContent className="p-4 space-y-3">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Subtotal</span>
                <span>{formatarMoeda(subtotal)}</span>
              </div>
              <div className="flex items-center gap-2">
                <Input type="number" placeholder="Desconto R$" value={desconto}
                  onChange={(e) => setDesconto(e.target.value)} className="h-8 text-sm flex-1" />
              </div>
              {descontoVal > 0 && (
                <div className="flex justify-between text-sm text-red-500">
                  <span>Desconto</span><span>- {formatarMoeda(descontoVal)}</span>
                </div>
              )}
              <Separator />
              <div className="flex justify-between font-bold text-lg">
                <span>Total</span>
                <span className="text-primary">{formatarMoeda(total)}</span>
              </div>
            </CardContent>
          </Card>

          {/* Pagamento */}
          <Card>
            <CardContent className="p-4 space-y-3">
              <Label className="text-sm font-medium">Forma de pagamento *</Label>
              <div className="grid grid-cols-2 gap-2">
                {(["dinheiro", "pix", "cartao_debito", "cartao_credito"] as const).map((fp) => (
                  <button key={fp} onClick={() => setFormaPag(fp)}
                    className={`py-2 px-3 rounded-lg border text-xs font-medium transition-colors ${formaPag === fp ? "border-primary bg-primary/10 text-primary" : "border-border hover:border-primary/50"}`}>
                    {labelsFormaPagamento[fp]}
                  </button>
                ))}
              </div>
              {formaPag === "dinheiro" && (
                <div>
                  <Input type="number" placeholder="Valor recebido" value={valorRecebido}
                    onChange={(e) => setValorRecebido(e.target.value)} className="h-8 text-sm" />
                  {troco !== null && troco > 0 && <p className="text-xs text-emerald-500 mt-1">Troco: {formatarMoeda(troco)}</p>}
                </div>
              )}
            </CardContent>
          </Card>

          <Button className="w-full gap-2" size="lg" disabled={itens.length === 0 || !formaPag} onClick={finalizar}>
            <Check className="w-4 h-4" />
            Finalizar Venda — {formatarMoeda(total)}
          </Button>
        </div>
      </div>

      {/* Modal sucesso */}
      <Dialog open={sucesso} onOpenChange={setSucesso}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-emerald-500">
              <Check className="w-5 h-5" />Venda Concluída! (Demo)
            </DialogTitle>
          </DialogHeader>
          <div className="py-4 text-center space-y-2">
            <p className="text-3xl font-bold text-primary">{formatarMoeda(total)}</p>
            {clienteSel && <p className="text-sm">Cliente: <span className="font-medium">{clienteSel.nome_completo}</span></p>}
            {troco !== null && troco > 0 && <p className="text-emerald-500 font-medium">Troco: {formatarMoeda(troco)}</p>}
            <p className="text-xs text-muted-foreground mt-2">No sistema real, o recibo seria gerado em PDF e o histórico do cliente atualizado.</p>
          </div>
          <DialogFooter className="flex-col gap-2 sm:flex-col">
            <Button variant="outline" className="w-full" onClick={() => toast.info("PDFs disponíveis no sistema real!")}>
              🖨️ Imprimir Recibo (PDF)
            </Button>
            <Button className="w-full" onClick={() => { setSucesso(false); setItens([]); setFormaPag(""); setClienteSel(null); setDesconto("0") }}>
              <Plus className="w-4 h-4 mr-2" />Nova Venda
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
