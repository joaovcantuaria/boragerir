"use client"

import { useState } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { Plus, Search, Package, Scissors, Edit, AlertTriangle, Loader2 } from "lucide-react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { createClient } from "@/lib/supabase/client"
import { formatarMoeda, calcularMargem } from "@/lib/utils"
import type { ProdutoServico, Categoria } from "@/types"

const schemaProduto = z.object({
  nome: z.string().min(1, "Nome obrigatório"),
  tipo: z.enum(["produto", "servico"]),
  categoria_id: z.string().optional(),
  descricao: z.string().optional(),
  codigo: z.string().optional(),
  codigo_barras: z.string().optional(),
  unidade_medida: z.string().optional(),
  preco: z.string().min(1, "Preço obrigatório"),
  custo: z.string().optional(),
  estoque_atual: z.string().optional(),
  estoque_minimo: z.string().optional(),
  comissao_percentual: z.string().optional(),
  duracao_minutos: z.string().optional(),
})

type FormProduto = z.infer<typeof schemaProduto>

const UNIDADES = [
  { value: "unidade", label: "Unidade (un)" },
  { value: "pacote", label: "Pacote (pct)" },
  { value: "kilo", label: "Quilo (kg)" },
  { value: "litro", label: "Litro (L)" },
  { value: "hora", label: "Hora (h)" },
  { value: "sessao", label: "Sessão" },
  { value: "metro", label: "Metro (m)" },
  { value: "caixa", label: "Caixa (cx)" },
  { value: "par", label: "Par" },
  { value: "outro", label: "Outro" },
]

export function ProdutosServicosClient({
  empresaId,
  plano,
  produtos: produtosIniciais,
  categorias: categoriasIniciais,
}: {
  empresaId: string
  plano: string
  produtos: ProdutoServico[]
  categorias: Categoria[]
}) {
  const [produtos, setProdutos] = useState(produtosIniciais)
  const [categorias, setCategorias] = useState(categoriasIniciais)
  const [busca, setBusca] = useState("")
  const [modalAberto, setModalAberto] = useState(false)
  const [tipoModal, setTipoModal] = useState<"produto" | "servico">("produto")
  const [editando, setEditando] = useState<ProdutoServico | null>(null)
  const [loading, setLoading] = useState(false)
  const [criandoCategoria, setCriandoCategoria] = useState(false)
  const [nomeNovaCategoria, setNomeNovaCategoria] = useState("")
  const [loadingCategoria, setLoadingCategoria] = useState(false)

  const { register, handleSubmit, reset, setValue, watch, formState: { errors } } = useForm<FormProduto>({
    resolver: zodResolver(schemaProduto),
  })

  const produtosFiltrados = produtos.filter((p) =>
    p.tipo === "produto" &&
    p.ativo &&
    p.nome.toLowerCase().includes(busca.toLowerCase())
  )
  const servicosFiltrados = produtos.filter((p) =>
    p.tipo === "servico" &&
    p.ativo &&
    p.nome.toLowerCase().includes(busca.toLowerCase())
  )

  const supabase = createClient()

  async function criarCategoria() {
    if (!nomeNovaCategoria.trim()) return
    setLoadingCategoria(true)
    const { data: nova, error } = await supabase
      .from("categorias")
      .insert({ empresa_id: empresaId, nome: nomeNovaCategoria.trim(), tipo: tipoModal })
      .select()
      .single()
    if (error) { toast.error("Erro ao criar categoria."); setLoadingCategoria(false); return }
    setCategorias((prev) => [...prev, nova])
    setValue("categoria_id", nova.id)
    setNomeNovaCategoria("")
    setCriandoCategoria(false)
    setLoadingCategoria(false)
    toast.success("Categoria criada!")
  }

  function abrirModalNovo(tipo: "produto" | "servico") {
    if (plano === "gratuito") {
      const qtdAtiva = produtos.filter((p) => p.ativo).length
      if (qtdAtiva >= 10) {
        toast.error("Limite de 10 produtos/serviços no plano gratuito.")
        return
      }
    }
    setTipoModal(tipo)
    setEditando(null)
    reset({ tipo })
    setCriandoCategoria(false)
    setNomeNovaCategoria("")
    setModalAberto(true)
  }

  function abrirModalEditar(produto: ProdutoServico) {
    setEditando(produto)
    setTipoModal(produto.tipo)
    setCriandoCategoria(false)
    setNomeNovaCategoria("")
    reset({
      nome: produto.nome,
      tipo: produto.tipo,
      categoria_id: produto.categoria_id ?? "",
      descricao: produto.descricao ?? "",
      codigo_barras: produto.codigo_barras ?? "",
      preco: produto.preco.toString(),
      custo: produto.custo?.toString() ?? "",
      estoque_atual: produto.estoque_atual?.toString() ?? "",
      estoque_minimo: produto.estoque_minimo?.toString() ?? "",
      comissao_percentual: produto.comissao_percentual?.toString() ?? "",
      duracao_minutos: produto.duracao_minutos?.toString() ?? "",
    })
    setModalAberto(true)
  }

  async function onSubmit(data: FormProduto) {
    setLoading(true)

    // Gerar código de barras automaticamente se não informado
    let codigoBarras = data.codigo_barras?.trim() || null
    if (!codigoBarras && !editando) {
      // Buscar o maior código numérico existente para essa empresa
      const { data: ultimoProduto } = await supabase
        .from("produtos_servicos")
        .select("codigo_barras")
        .eq("empresa_id", empresaId)
        .not("codigo_barras", "is", null)
        .order("created_at", { ascending: false })
        .limit(50)

      let maiorCodigo = 100000
      if (ultimoProduto) {
        for (const p of ultimoProduto) {
          const num = parseInt(p.codigo_barras ?? "0")
          if (!isNaN(num) && num >= maiorCodigo) maiorCodigo = num
        }
      }
      codigoBarras = String(maiorCodigo + 1).padStart(6, "0")
    }

    const payload = {
      empresa_id: empresaId,
      nome: data.nome,
      tipo: data.tipo,
      categoria_id: data.categoria_id || null,
      descricao: data.descricao || null,
      codigo: data.codigo || null,
      codigo_barras: codigoBarras,
      unidade_medida: data.unidade_medida || "unidade",
      preco: parseFloat(data.preco),
      custo: data.custo ? parseFloat(data.custo) : null,
      estoque_atual: data.estoque_atual ? parseInt(data.estoque_atual) : null,
      estoque_minimo: data.estoque_minimo ? parseInt(data.estoque_minimo) : null,
      comissao_percentual: data.comissao_percentual ? parseFloat(data.comissao_percentual) : null,
      duracao_minutos: data.duracao_minutos ? parseInt(data.duracao_minutos) : null,
      ativo: true,
    }

    if (editando) {
      const { error } = await supabase.from("produtos_servicos").update(payload).eq("id", editando.id)
      if (error) { toast.error("Erro ao atualizar."); setLoading(false); return }
      setProdutos((prev) => prev.map((p) => p.id === editando.id ? { ...p, ...payload } : p))
      toast.success("Atualizado com sucesso!")
    } else {
      const { data: novo, error } = await supabase.from("produtos_servicos").insert(payload).select().single()
      if (error) { toast.error("Erro ao cadastrar."); setLoading(false); return }
      setProdutos((prev) => [...prev, novo])
      toast.success(`${data.tipo === "produto" ? "Produto" : "Serviço"} cadastrado!`)
    }
    setModalAberto(false)
    setLoading(false)
  }

  function renderItem(item: ProdutoServico) {
    const estoqueBaixo = item.tipo === "produto" && item.estoque_minimo !== null && (item.estoque_atual ?? 0) <= item.estoque_minimo
    const margem = item.custo ? calcularMargem(item.preco, item.custo) : null
    return (
      <Card key={item.id} className="hover:border-primary/50 transition-colors">
        <CardContent className="p-4">
          <div className="flex items-center justify-between gap-3">
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="font-medium text-sm">{item.nome}</span>
                {estoqueBaixo && (
                  <Badge variant="destructive" className="text-xs gap-1">
                    <AlertTriangle className="w-3 h-3" />Estoque baixo
                  </Badge>
                )}
              </div>
              <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground flex-wrap">
                <span className="text-foreground font-semibold">{formatarMoeda(item.preco)}</span>
                {item.custo && <span>Custo: {formatarMoeda(item.custo)}</span>}
                {margem !== null && <span className="text-emerald-500">Margem: {margem.toFixed(0)}%</span>}
                {item.tipo === "produto" && item.estoque_atual !== null && (
                  <span>Estoque: {item.estoque_atual} un</span>
                )}
                {item.tipo === "servico" && item.duracao_minutos && (
                  <span>{item.duracao_minutos} min</span>
                )}
                {item.comissao_percentual && <span>Comissão: {item.comissao_percentual}%</span>}
              </div>
            </div>
            <Button variant="ghost" size="icon" onClick={() => abrirModalEditar(item)}>
              <Edit className="w-4 h-4" />
            </Button>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Produtos e Serviços</h1>
          <p className="text-muted-foreground">{produtos.filter((p) => p.ativo).length} item(ns) cadastrado(s)</p>
        </div>
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input placeholder="Buscar..." className="pl-9" value={busca} onChange={(e) => setBusca(e.target.value)} />
      </div>

      <Tabs defaultValue="produtos">
        <div className="flex items-center justify-between gap-4">
          <TabsList>
            <TabsTrigger value="produtos" className="gap-2">
              <Package className="w-4 h-4" />Produtos ({produtosFiltrados.length})
            </TabsTrigger>
            <TabsTrigger value="servicos" className="gap-2">
              <Scissors className="w-4 h-4" />Serviços ({servicosFiltrados.length})
            </TabsTrigger>
          </TabsList>
        </div>

        <TabsContent value="produtos" className="mt-4 space-y-2">
          <Button onClick={() => abrirModalNovo("produto")} className="gap-2 w-full sm:w-auto">
            <Plus className="w-4 h-4" />Novo Produto
          </Button>
          {produtosFiltrados.length > 0 ? produtosFiltrados.map(renderItem) : (
            <div className="py-12 text-center text-muted-foreground">
              <Package className="w-10 h-10 mx-auto mb-2 opacity-40" />
              <p>Nenhum produto cadastrado</p>
            </div>
          )}
        </TabsContent>

        <TabsContent value="servicos" className="mt-4 space-y-2">
          <Button onClick={() => abrirModalNovo("servico")} className="gap-2 w-full sm:w-auto">
            <Plus className="w-4 h-4" />Novo Serviço
          </Button>
          {servicosFiltrados.length > 0 ? servicosFiltrados.map(renderItem) : (
            <div className="py-12 text-center text-muted-foreground">
              <Scissors className="w-10 h-10 mx-auto mb-2 opacity-40" />
              <p>Nenhum serviço cadastrado</p>
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* Modal */}
      <Dialog open={modalAberto} onOpenChange={(open) => { if (!open) { setModalAberto(false); reset(); setCriandoCategoria(false); setNomeNovaCategoria("") } }}>
        <DialogContent onInteractOutside={(e) => e.preventDefault()}>
          <DialogHeader>
            <DialogTitle>
              {editando ? "Editar" : "Novo"} {tipoModal === "produto" ? "Produto" : "Serviço"}
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <input type="hidden" {...register("tipo")} value={tipoModal} />
            <div className="space-y-2">
              <Label>Nome *</Label>
              <Input placeholder="Nome do item" {...register("nome")} />
              {errors.nome && <p className="text-destructive text-xs">{errors.nome.message}</p>}
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label>Código de barras</Label>
                <Input placeholder="EAN ou código interno" {...register("codigo_barras")} />
                <p className="text-xs text-muted-foreground">Deixe vazio para gerar automaticamente</p>
              </div>
              <div className="space-y-2">
                <Label>Vendido por</Label>
                <Select defaultValue="unidade" onValueChange={(v) => setValue("unidade_medida", v)}>
                  <SelectTrigger><SelectValue placeholder="Selecionar" /></SelectTrigger>
                  <SelectContent>
                    {UNIDADES.map((u) => (
                      <SelectItem key={u.value} value={u.value}>{u.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-2">
              <Label>Categoria</Label>
              <div className="flex gap-2">
                <Select
                  value={watch("categoria_id") ?? ""}
                  onValueChange={(v) => setValue("categoria_id", v)}
                >
                  <SelectTrigger className="flex-1"><SelectValue placeholder="Selecionar categoria" /></SelectTrigger>
                  <SelectContent>
                    {categorias.filter((c) => c.tipo === tipoModal).map((c) => (
                      <SelectItem key={c.id} value={c.id}>{c.nome}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  title="Criar nova categoria"
                  onClick={() => setCriandoCategoria((v) => !v)}
                >
                  <Plus className="w-4 h-4" />
                </Button>
              </div>
              {criandoCategoria && (
                <div className="flex gap-2 mt-1">
                  <Input
                    placeholder="Nome da nova categoria"
                    value={nomeNovaCategoria}
                    onChange={(e) => setNomeNovaCategoria(e.target.value)}
                    onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); criarCategoria() } }}
                    autoFocus
                  />
                  <Button
                    type="button"
                    size="sm"
                    disabled={loadingCategoria || !nomeNovaCategoria.trim()}
                    onClick={criarCategoria}
                  >
                    {loadingCategoria ? <Loader2 className="w-4 h-4 animate-spin" /> : "Criar"}
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    variant="ghost"
                    onClick={() => { setCriandoCategoria(false); setNomeNovaCategoria("") }}
                  >
                    Cancelar
                  </Button>
                </div>
              )}
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Preço de venda (R$) *</Label>
                <Input type="number" step="0.01" min="0" placeholder="0,00" {...register("preco")} />
                {errors.preco && <p className="text-destructive text-xs">{errors.preco.message}</p>}
              </div>
              <div className="space-y-2">
                <Label>Custo (R$)</Label>
                <Input type="number" step="0.01" min="0" placeholder="0,00" {...register("custo")} />
              </div>
            </div>
            {tipoModal === "produto" && (
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Estoque atual</Label>
                  <Input type="number" min="0" placeholder="0" {...register("estoque_atual")} />
                </div>
                <div className="space-y-2">
                  <Label>Estoque mínimo</Label>
                  <Input type="number" min="0" placeholder="0" {...register("estoque_minimo")} />
                </div>
              </div>
            )}
            {tipoModal === "servico" && (
              <div className="space-y-2">
                <Label>Duração (minutos)</Label>
                <Input type="number" min="0" placeholder="60" {...register("duracao_minutos")} />
              </div>
            )}
            <div className="space-y-2">
              <Label>Comissão (%)</Label>
              <Input type="number" step="0.01" min="0" max="100" placeholder="0" {...register("comissao_percentual")} />
            </div>
            <div className="space-y-2">
              <Label>Descrição</Label>
              <Textarea placeholder="Descrição opcional..." {...register("descricao")} />
            </div>
            <DialogFooter>
              <Button variant="outline" type="button" onClick={() => setModalAberto(false)}>Cancelar</Button>
              <Button type="submit" disabled={loading}>
                {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : editando ? "Salvar" : "Cadastrar"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}
