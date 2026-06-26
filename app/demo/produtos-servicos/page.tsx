"use client"

import { useState } from "react"
import { Search, Plus, Package, Scissors, Edit, AlertTriangle } from "lucide-react"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { toast } from "sonner"
import { formatarMoeda, calcularMargem } from "@/lib/utils"
import { produtosServicosDemo, categoriasDemo } from "@/lib/demo/dados-demo"

export default function DemoProdutosServicos() {
  const [busca, setBusca] = useState("")

  const produtos = produtosServicosDemo.filter((p) => p.tipo === "produto" && p.nome.toLowerCase().includes(busca.toLowerCase()))
  const servicos = produtosServicosDemo.filter((p) => p.tipo === "servico" && p.nome.toLowerCase().includes(busca.toLowerCase()))

  function renderItem(item: typeof produtosServicosDemo[0]) {
    const estoqueBaixo = item.tipo === "produto" && item.estoque_minimo !== null && (item.estoque_atual ?? 0) <= item.estoque_minimo
    const margem = item.custo ? calcularMargem(item.preco, item.custo) : null
    const cat = categoriasDemo.find((c) => c.id === item.categoria_id)
    return (
      <Card key={item.id} className="hover:border-primary/50 transition-colors">
        <CardContent className="p-4">
          <div className="flex items-center justify-between gap-3">
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="font-medium text-sm">{item.nome}</span>
                {cat && <Badge variant="secondary" className="text-xs">{cat.nome}</Badge>}
                {estoqueBaixo && <Badge variant="destructive" className="text-xs gap-1"><AlertTriangle className="w-3 h-3" />Estoque baixo</Badge>}
              </div>
              <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground flex-wrap">
                <span className="text-foreground font-semibold">{formatarMoeda(item.preco)}</span>
                {item.custo && <span>Custo: {formatarMoeda(item.custo)}</span>}
                {margem !== null && <span className="text-emerald-500">Margem: {margem.toFixed(0)}%</span>}
                {item.tipo === "produto" && item.estoque_atual !== null && <span>Estoque: {item.estoque_atual} un</span>}
                {item.tipo === "servico" && item.duracao_minutos && <span>{item.duracao_minutos} min</span>}
                {item.comissao_percentual && <span>Comissão: {item.comissao_percentual}%</span>}
              </div>
            </div>
            <Button variant="ghost" size="icon" onClick={() => toast.info("Modo demo — crie uma conta para editar!")}>
              <Edit className="w-4 h-4" />
            </Button>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Produtos e Serviços</h1>
        <p className="text-muted-foreground">{produtosServicosDemo.length} itens cadastrados</p>
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input placeholder="Buscar..." className="pl-9" value={busca} onChange={(e) => setBusca(e.target.value)} />
      </div>

      <Tabs defaultValue="servicos">
        <div className="flex items-center justify-between gap-4">
          <TabsList>
            <TabsTrigger value="servicos" className="gap-2"><Scissors className="w-4 h-4" />Serviços ({servicos.length})</TabsTrigger>
            <TabsTrigger value="produtos" className="gap-2"><Package className="w-4 h-4" />Produtos ({produtos.length})</TabsTrigger>
          </TabsList>
        </div>
        <TabsContent value="servicos" className="mt-4 space-y-2">
          <Button className="gap-2 w-full sm:w-auto" onClick={() => toast.info("Modo demo — crie uma conta para usar!")}>
            <Plus className="w-4 h-4" />Novo Serviço
          </Button>
          {servicos.map(renderItem)}
        </TabsContent>
        <TabsContent value="produtos" className="mt-4 space-y-2">
          <Button className="gap-2 w-full sm:w-auto" onClick={() => toast.info("Modo demo — crie uma conta para usar!")}>
            <Plus className="w-4 h-4" />Novo Produto
          </Button>
          {produtos.map(renderItem)}
        </TabsContent>
      </Tabs>
    </div>
  )
}
