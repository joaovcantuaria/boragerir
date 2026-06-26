"use client"

import { useState } from "react"
import { useForm } from "react-hook-form"
import { z } from "zod"
import { zodResolver } from "@hookform/resolvers/zod"
import { Plus, FileText, Search, Loader2, Send, Edit, AlertCircle, CheckCircle, XCircle } from "lucide-react"
import { toast } from "sonner"
import { format, addDays, isPast, differenceInDays } from "date-fns"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { Separator } from "@/components/ui/separator"
import { createClient } from "@/lib/supabase/client"
import { formatarMoeda, gerarLinkWhatsApp, coresStatus, labelsStatus } from "@/lib/utils"
import { gerarOrcamentoPDF } from "@/lib/pdf/orcamento"
import type { Empresa } from "@/types"

const schemaOrcamento = z.object({
  titulo: z.string().min(1, "Título obrigatório"),
  cliente_id: z.string().optional(),
  validade_dias: z.string().default("30"),
  desconto: z.string().default("0"),
  observacoes: z.string().optional(),
})
type FormOrcamento = z.infer<typeof schemaOrcamento>

interface ItemOrc { produto_servico_id?: string; nome_item: string; quantidade: number; preco_unitario: number; subtotal: number }

export function OrcamentosClient({ empresa, orcamentos: orcInit, clientes, produtos }: {
  empresa: Empresa
  orcamentos: {
    id: string; titulo: string; numero_orcamento: number; status: string; total: number
    desconto: number; subtotal: number; validade_dias: number; created_at: string
    observacoes: string | null
    clientes?: { nome_completo: string; telefone: string } | null
    itens_orcamento?: ItemOrc[]
  }[]
  clientes: { id: string; nome_completo: string; telefone: string }[]
  produtos: { id: string; nome: string; preco: number }[]
}) {
  const [orcamentos, setOrcamentos] = useState(orcInit)
  const [busca, setBusca] = useState("")
  const [modalAberto, setModalAberto] = useState(false)
  const [itens, setItens] = useState<ItemOrc[]>([])
  const [buscaProduto, setBuscaProduto] = useState("")
  const [loading, setLoading] = useState(false)
  const supabase = createClient()

  const { register, handleSubmit, reset, setValue, watch } = useForm<FormOrcamento>({
    resolver: zodResolver(schemaOrcamento),
    defaultValues: { validade_dias: "30", desconto: "0" },
  })

  const desconto = parseFloat(watch("desconto") || "0") || 0
  const subtotal = itens.reduce((s, i) => s + i.subtotal, 0)
  const total = Math.max(0, subtotal - desconto)

  const orcFiltrados = orcamentos.filter((o) =>
    o.titulo.toLowerCase().includes(busca.toLowerCase()) ||
    (o.clientes?.nome_completo ?? "").toLowerCase().includes(busca.toLowerCase())
  )

  function adicionarItem(produto: { id: string; nome: string; preco: number }) {
    setItens((prev) => {
      const ex = prev.find((i) => i.produto_servico_id === produto.id)
      if (ex) return prev.map((i) => i.produto_servico_id === produto.id ? { ...i, quantidade: i.quantidade + 1, subtotal: (i.quantidade + 1) * i.preco_unitario } : i)
      return [...prev, { produto_servico_id: produto.id, nome_item: produto.nome, quantidade: 1, preco_unitario: produto.preco, subtotal: produto.preco }]
    })
    setBuscaProduto("")
  }

  function removerItem(idx: number) {
    setItens((prev) => prev.filter((_, i) => i !== idx))
  }

  async function onSubmit(data: FormOrcamento) {
    if (itens.length === 0) { toast.error("Adicione ao menos um item."); return }
    setLoading(true)
    const { data: orc, error } = await supabase.from("orcamentos").insert({
      empresa_id: empresa.id,
      titulo: data.titulo,
      cliente_id: data.cliente_id || null,
      validade_dias: parseInt(data.validade_dias) || 30,
      subtotal,
      desconto: parseFloat(data.desconto) || 0,
      total,
      status: "pendente",
      observacoes: data.observacoes || null,
    }).select("*, clientes(nome_completo, telefone)").single()

    if (error) { toast.error("Erro ao criar orçamento."); setLoading(false); return }

    await supabase.from("itens_orcamento").insert(itens.map((i) => ({
      orcamento_id: orc.id, empresa_id: empresa.id,
      produto_servico_id: i.produto_servico_id || null,
      nome_item: i.nome_item, quantidade: i.quantidade, preco_unitario: i.preco_unitario, subtotal: i.subtotal,
    })))

    setOrcamentos((prev) => [{ ...orc, itens_orcamento: itens }, ...prev])
    toast.success("Orçamento criado!")
    setModalAberto(false)
    setItens([])
    reset()
    setLoading(false)
  }

  async function alterarStatus(id: string, status: string) {
    const { error } = await supabase.from("orcamentos").update({ status }).eq("id", id)
    if (error) { toast.error("Erro ao atualizar."); return }
    setOrcamentos((prev) => prev.map((o) => o.id === id ? { ...o, status } : o))
    toast.success("Status atualizado!")
  }

  function badgeStatus(orc: typeof orcamentos[0]) {
    const validade = addDays(new Date(orc.created_at), orc.validade_dias)
    const diasRestantes = differenceInDays(validade, new Date())
    if (orc.status === "pendente" && isPast(validade)) return <Badge className="text-xs bg-gray-500/10 text-gray-500">Expirado</Badge>
    if (orc.status === "pendente" && diasRestantes <= 3) return <Badge className="text-xs bg-orange-500/10 text-orange-500">Expira em {diasRestantes}d</Badge>
    return <Badge className={`text-xs ${coresStatus[orc.status as keyof typeof coresStatus] ?? ""}`}>{labelsStatus[orc.status] ?? orc.status}</Badge>
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Orçamentos</h1>
          <p className="text-muted-foreground">{orcamentos.length} orçamento(s)</p>
        </div>
        <Button onClick={() => { setItens([]); reset(); setModalAberto(true) }} className="gap-2">
          <Plus className="w-4 h-4" /><span className="hidden sm:inline">Novo Orçamento</span>
        </Button>
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input placeholder="Buscar orçamentos..." className="pl-9" value={busca} onChange={(e) => setBusca(e.target.value)} />
      </div>

      {orcFiltrados.length > 0 ? (
        <div className="space-y-3">
          {orcFiltrados.map((orc) => (
            <Card key={orc.id} className="hover:border-primary/40 transition-colors">
              <CardContent className="p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-medium">{orc.titulo}</span>
                      <span className="text-xs text-muted-foreground">#{String(orc.numero_orcamento).padStart(3, "0")}</span>
                      {badgeStatus(orc)}
                    </div>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {orc.clientes?.nome_completo ?? "Sem cliente"} •
                      {format(new Date(orc.created_at), " dd/MM/yyyy")} •
                      Validade: {orc.validade_dias} dias
                    </p>
                    <p className="text-sm font-bold text-primary mt-1">{formatarMoeda(orc.total)}</p>
                  </div>
                  <div className="flex flex-col gap-1">
                    <Button variant="ghost" size="xs" onClick={() => gerarOrcamentoPDF({ empresa, orcamento: orc, cliente: orc.clientes ?? null, itens: orc.itens_orcamento ?? [] })}>
                      🖨️ PDF
                    </Button>
                    {orc.clientes?.telefone && (
                      <Button variant="ghost" size="xs" onClick={() => {
                        const msg = `Olá ${orc.clientes?.nome_completo}! Segue o orçamento "${orc.titulo}" no valor de ${formatarMoeda(orc.total)}. Válido por ${orc.validade_dias} dias. — ${empresa.nome}`
                        window.open(gerarLinkWhatsApp(orc.clientes!.telefone, msg), "_blank")
                      }}>
                        <Send className="w-3 h-3 mr-1" />WhatsApp
                      </Button>
                    )}
                    {orc.status === "pendente" && (
                      <Button variant="ghost" size="xs" className="text-emerald-500" onClick={() => alterarStatus(orc.id, "aprovado")}>
                        <CheckCircle className="w-3 h-3 mr-1" />Aprovar
                      </Button>
                    )}
                    {orc.status === "pendente" && (
                      <Button variant="ghost" size="xs" className="text-red-500" onClick={() => alterarStatus(orc.id, "recusado")}>
                        <XCircle className="w-3 h-3 mr-1" />Recusar
                      </Button>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <div className="py-16 text-center text-muted-foreground">
          <FileText className="w-12 h-12 mx-auto mb-3 opacity-40" />
          <p>{busca ? "Nenhum orçamento encontrado" : "Nenhum orçamento criado"}</p>
        </div>
      )}

      {/* Modal */}
      <Dialog open={modalAberto} onOpenChange={setModalAberto}>
        <DialogContent className="max-w-2xl">
          <DialogHeader><DialogTitle>Novo Orçamento</DialogTitle></DialogHeader>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="col-span-2 space-y-2">
                <Label>Título *</Label>
                <Input placeholder="Ex: Pacote de tratamento" {...register("titulo")} />
              </div>
              <div className="space-y-2">
                <Label>Cliente</Label>
                <Select onValueChange={(v) => setValue("cliente_id", v)}>
                  <SelectTrigger><SelectValue placeholder="Selecionar" /></SelectTrigger>
                  <SelectContent>
                    {clientes.map((c) => <SelectItem key={c.id} value={c.id}>{c.nome_completo}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Validade (dias)</Label>
                <Input type="number" min="1" defaultValue="30" {...register("validade_dias")} />
              </div>
            </div>

            {/* Itens */}
            <div className="space-y-2">
              <Label>Itens</Label>
              <div className="relative">
                <Input placeholder="Buscar produto/serviço..." value={buscaProduto} onChange={(e) => setBuscaProduto(e.target.value)} />
                {buscaProduto && (
                  <div className="absolute top-full left-0 right-0 z-10 bg-popover border border-border rounded-md mt-1 max-h-40 overflow-y-auto shadow-lg">
                    {produtos.filter((p) => p.nome.toLowerCase().includes(buscaProduto.toLowerCase())).slice(0, 8).map((p) => (
                      <button key={p.id} className="w-full text-left px-3 py-2 hover:bg-muted flex justify-between text-sm"
                        onClick={() => adicionarItem(p)}>
                        <span>{p.nome}</span><span className="text-primary">{formatarMoeda(p.preco)}</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
              {itens.length > 0 && (
                <div className="border border-border rounded-lg overflow-hidden">
                  {itens.map((item, idx) => (
                    <div key={idx} className="flex items-center justify-between px-3 py-2 border-b border-border last:border-0 text-sm">
                      <span className="flex-1">{item.nome_item}</span>
                      <span className="text-muted-foreground mx-2">{item.quantidade}x {formatarMoeda(item.preco_unitario)}</span>
                      <span className="font-medium w-20 text-right">{formatarMoeda(item.subtotal)}</span>
                      <Button variant="ghost" size="xs" className="ml-2 text-destructive" onClick={() => removerItem(idx)}>✕</Button>
                    </div>
                  ))}
                  <div className="flex justify-between px-3 py-2 text-sm font-bold bg-muted/40">
                    <span>Total</span><span className="text-primary">{formatarMoeda(total)}</span>
                  </div>
                </div>
              )}
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Desconto (R$)</Label>
                <Input type="number" step="0.01" min="0" defaultValue="0" {...register("desconto")} />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Observações</Label>
              <Textarea placeholder="..." {...register("observacoes")} />
            </div>
            <DialogFooter>
              <Button variant="outline" type="button" onClick={() => setModalAberto(false)}>Cancelar</Button>
              <Button type="submit" disabled={loading}>
                {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : "Criar Orçamento"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}
