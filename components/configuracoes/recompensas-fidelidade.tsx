"use client"

import { useState, useEffect } from "react"
import { Gift, Plus, Trash2, Loader2, Edit2, Check, X, Package } from "lucide-react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { createClient } from "@/lib/supabase/client"
import type { Empresa } from "@/types"

interface Recompensa {
  id: string
  nome: string
  descricao: string | null
  pontos_necessarios: number
  estoque: number | null
  ativo: boolean
  created_at: string
}

export function RecompensasFidelidade({ empresa }: { empresa: Empresa }) {
  const [recompensas, setRecompensas] = useState<Recompensa[]>([])
  const [loading, setLoading] = useState(true)
  const [salvando, setSalvando] = useState(false)
  const [editandoId, setEditandoId] = useState<string | null>(null)

  // Form nova recompensa
  const [nome, setNome] = useState("")
  const [descricao, setDescricao] = useState("")
  const [pontos, setPontos] = useState("")
  const [estoque, setEstoque] = useState("")
  const [mostrarForm, setMostrarForm] = useState(false)

  // Form edição
  const [editNome, setEditNome] = useState("")
  const [editDescricao, setEditDescricao] = useState("")
  const [editPontos, setEditPontos] = useState("")
  const [editEstoque, setEditEstoque] = useState("")

  const supabase = createClient()

  useEffect(() => {
    carregarRecompensas()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  async function carregarRecompensas() {
    setLoading(true)
    const { data } = await supabase
      .from("recompensas_fidelidade")
      .select("*")
      .eq("empresa_id", empresa.id)
      .order("pontos_necessarios", { ascending: true })
    setRecompensas(data ?? [])
    setLoading(false)
  }

  async function criarRecompensa() {
    if (!nome.trim()) { toast.error("Informe o nome do brinde"); return }
    const pontosNum = parseInt(pontos)
    if (!pontosNum || pontosNum <= 0) { toast.error("Informe a quantidade de pontos necessários"); return }

    setSalvando(true)
    const { error } = await supabase.from("recompensas_fidelidade").insert({
      empresa_id: empresa.id,
      nome: nome.trim(),
      descricao: descricao.trim() || null,
      pontos_necessarios: pontosNum,
      estoque: estoque ? parseInt(estoque) : null,
      ativo: true,
    })

    if (error) {
      toast.error("Erro ao cadastrar brinde")
      setSalvando(false)
      return
    }

    toast.success("Brinde cadastrado!")
    setNome("")
    setDescricao("")
    setPontos("")
    setEstoque("")
    setMostrarForm(false)
    setSalvando(false)
    carregarRecompensas()
  }

  async function atualizarRecompensa(id: string) {
    if (!editNome.trim()) { toast.error("Informe o nome"); return }
    const pontosNum = parseInt(editPontos)
    if (!pontosNum || pontosNum <= 0) { toast.error("Informe os pontos"); return }

    setSalvando(true)
    const { error } = await supabase
      .from("recompensas_fidelidade")
      .update({
        nome: editNome.trim(),
        descricao: editDescricao.trim() || null,
        pontos_necessarios: pontosNum,
        estoque: editEstoque ? parseInt(editEstoque) : null,
      })
      .eq("id", id)

    if (error) {
      toast.error("Erro ao atualizar")
      setSalvando(false)
      return
    }

    toast.success("Brinde atualizado!")
    setEditandoId(null)
    setSalvando(false)
    carregarRecompensas()
  }

  async function toggleAtivo(rec: Recompensa) {
    await supabase
      .from("recompensas_fidelidade")
      .update({ ativo: !rec.ativo })
      .eq("id", rec.id)
    carregarRecompensas()
    toast.success(rec.ativo ? "Brinde desativado" : "Brinde reativado")
  }

  async function excluirRecompensa(id: string) {
    if (!confirm("Excluir este brinde? Resgates já realizados não serão afetados.")) return
    await supabase.from("recompensas_fidelidade").delete().eq("id", id)
    carregarRecompensas()
    toast.success("Brinde excluído")
  }

  function iniciarEdicao(rec: Recompensa) {
    setEditandoId(rec.id)
    setEditNome(rec.nome)
    setEditDescricao(rec.descricao ?? "")
    setEditPontos(rec.pontos_necessarios.toString())
    setEditEstoque(rec.estoque?.toString() ?? "")
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Gift className="w-5 h-5 text-primary" />
            <CardTitle className="text-base">Brindes / Recompensas</CardTitle>
          </div>
          <Button
            size="sm"
            variant={mostrarForm ? "ghost" : "default"}
            onClick={() => setMostrarForm(!mostrarForm)}
            className="gap-1.5"
          >
            {mostrarForm ? <X className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
            {mostrarForm ? "Cancelar" : "Novo brinde"}
          </Button>
        </div>
        <p className="text-xs text-muted-foreground">
          Cadastre brindes que seus clientes podem resgatar usando pontos de fidelidade.
        </p>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Form novo brinde */}
        {mostrarForm && (
          <div className="rounded-lg border border-primary/20 bg-primary/5 p-4 space-y-3">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs">Nome do brinde *</Label>
                <Input
                  value={nome}
                  onChange={(e) => setNome(e.target.value)}
                  placeholder="Ex: Hidratação grátis"
                  className="h-9"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Pontos necessários *</Label>
                <Input
                  type="number"
                  min="1"
                  value={pontos}
                  onChange={(e) => setPontos(e.target.value)}
                  placeholder="Ex: 500"
                  className="h-9"
                />
              </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs">Descrição (opcional)</Label>
                <Input
                  value={descricao}
                  onChange={(e) => setDescricao(e.target.value)}
                  placeholder="Detalhes do brinde..."
                  className="h-9"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Estoque (vazio = ilimitado)</Label>
                <Input
                  type="number"
                  min="0"
                  value={estoque}
                  onChange={(e) => setEstoque(e.target.value)}
                  placeholder="Ilimitado"
                  className="h-9"
                />
              </div>
            </div>
            <Button
              onClick={criarRecompensa}
              disabled={salvando}
              size="sm"
              className="gap-1.5"
            >
              {salvando ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
              Cadastrar brinde
            </Button>
          </div>
        )}

        {/* Lista de brindes */}
        {loading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
          </div>
        ) : recompensas.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <Package className="w-10 h-10 mx-auto mb-2 opacity-40" />
            <p className="text-sm">Nenhum brinde cadastrado ainda.</p>
            <p className="text-xs mt-1">Cadastre brindes para que seus clientes possam trocar pontos.</p>
          </div>
        ) : (
          <div className="space-y-2">
            {recompensas.map((rec) => (
              <div
                key={rec.id}
                className={`rounded-lg border p-3 transition-colors ${
                  rec.ativo ? "bg-background" : "bg-muted/50 opacity-60"
                }`}
              >
                {editandoId === rec.id ? (
                  <div className="space-y-3">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <Input
                        value={editNome}
                        onChange={(e) => setEditNome(e.target.value)}
                        placeholder="Nome"
                        className="h-8 text-sm"
                      />
                      <Input
                        type="number"
                        min="1"
                        value={editPontos}
                        onChange={(e) => setEditPontos(e.target.value)}
                        placeholder="Pontos"
                        className="h-8 text-sm"
                      />
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <Input
                        value={editDescricao}
                        onChange={(e) => setEditDescricao(e.target.value)}
                        placeholder="Descrição"
                        className="h-8 text-sm"
                      />
                      <Input
                        type="number"
                        min="0"
                        value={editEstoque}
                        onChange={(e) => setEditEstoque(e.target.value)}
                        placeholder="Estoque (vazio = ilimitado)"
                        className="h-8 text-sm"
                      />
                    </div>
                    <div className="flex gap-2">
                      <Button size="sm" onClick={() => atualizarRecompensa(rec.id)} disabled={salvando} className="gap-1 h-7 text-xs">
                        <Check className="w-3 h-3" /> Salvar
                      </Button>
                      <Button size="sm" variant="ghost" onClick={() => setEditandoId(null)} className="h-7 text-xs">
                        Cancelar
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-sm truncate">{rec.nome}</span>
                        {!rec.ativo && <Badge variant="secondary" className="text-[10px]">Inativo</Badge>}
                      </div>
                      {rec.descricao && (
                        <p className="text-xs text-muted-foreground truncate mt-0.5">{rec.descricao}</p>
                      )}
                    </div>
                    <div className="flex items-center gap-3 shrink-0">
                      <div className="text-right">
                        <p className="text-sm font-bold text-primary">{rec.pontos_necessarios} pts</p>
                        {rec.estoque !== null && (
                          <p className="text-[10px] text-muted-foreground">Estoque: {rec.estoque}</p>
                        )}
                      </div>
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => iniciarEdicao(rec)}
                          className="p-1.5 rounded-md hover:bg-muted transition-colors"
                          title="Editar"
                        >
                          <Edit2 className="w-3.5 h-3.5 text-muted-foreground" />
                        </button>
                        <button
                          onClick={() => toggleAtivo(rec)}
                          className="p-1.5 rounded-md hover:bg-muted transition-colors"
                          title={rec.ativo ? "Desativar" : "Reativar"}
                        >
                          {rec.ativo ? (
                            <X className="w-3.5 h-3.5 text-muted-foreground" />
                          ) : (
                            <Check className="w-3.5 h-3.5 text-green-600" />
                          )}
                        </button>
                        <button
                          onClick={() => excluirRecompensa(rec.id)}
                          className="p-1.5 rounded-md hover:bg-destructive/10 transition-colors"
                          title="Excluir"
                        >
                          <Trash2 className="w-3.5 h-3.5 text-destructive" />
                        </button>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
