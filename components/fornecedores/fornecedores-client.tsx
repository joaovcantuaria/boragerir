"use client"

import { useMemo, useState } from "react"
import Link from "next/link"
import { format, parseISO } from "date-fns"
import { toast } from "sonner"
import {
  Plus, Search, Truck, Pencil, Ban, RotateCcw, Phone, Mail, Receipt, Loader2, KeyRound, User,
} from "lucide-react"
import { PageHeader } from "@/components/ui/page-header"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { formatarMoeda } from "@/lib/utils"
import { formatarDocumento, formatarTelefone, type TotaisFornecedor } from "@/lib/fornecedores"

export interface FornecedorLista extends TotaisFornecedor {
  id: string
  nome: string
  documento: string | null
  contato: string | null
  telefone: string | null
  email: string | null
  categoria: string
  chave_pix: string | null
  endereco: string | null
  observacoes: string | null
  ativo: boolean
  created_at: string
}

const CATEGORIAS = [
  { value: "fornecedor", label: "📦 Fornecedor" },
  { value: "aluguel", label: "🏠 Aluguel" },
  { value: "energia", label: "⚡ Energia" },
  { value: "agua", label: "💧 Água" },
  { value: "salario", label: "👤 Salário" },
  { value: "marketing", label: "📣 Marketing" },
  { value: "manutencao", label: "🔧 Manutenção" },
  { value: "outros", label: "📋 Outros" },
]

const FORM_VAZIO = {
  nome: "", documento: "", contato: "", telefone: "", email: "",
  categoria: "fornecedor", chave_pix: "", endereco: "", observacoes: "",
}

export function FornecedoresClient({ fornecedoresIniciais, tabelaPronta }: {
  fornecedoresIniciais: FornecedorLista[]
  tabelaPronta: boolean
}) {
  const [fornecedores, setFornecedores] = useState(fornecedoresIniciais)
  const [busca, setBusca] = useState("")
  const [mostrarInativos, setMostrarInativos] = useState(false)
  const [modal, setModal] = useState<{ id: string | null } | null>(null)
  const [form, setForm] = useState(FORM_VAZIO)
  const [salvando, setSalvando] = useState(false)

  const ativos = fornecedores.filter((f) => f.ativo)
  const lista = useMemo(() => {
    const termo = busca.trim().toLowerCase()
    const digitos = termo.replace(/\D/g, "")
    return fornecedores
      .filter((f) => (mostrarInativos ? !f.ativo : f.ativo))
      .filter((f) => !termo
        || f.nome.toLowerCase().includes(termo)
        || (f.contato ?? "").toLowerCase().includes(termo)
        || (f.email ?? "").toLowerCase().includes(termo)
        || (!!digitos && ((f.documento ?? "").includes(digitos) || (f.telefone ?? "").includes(digitos))))
  }, [fornecedores, busca, mostrarInativos])

  const totalAberto = ativos.reduce((s, f) => s + f.em_aberto, 0)
  const totalPago = ativos.reduce((s, f) => s + f.pago, 0)

  function abrirNovo() {
    setForm(FORM_VAZIO)
    setModal({ id: null })
  }

  function abrirEdicao(f: FornecedorLista) {
    setForm({
      nome: f.nome, documento: formatarDocumento(f.documento), contato: f.contato ?? "",
      telefone: formatarTelefone(f.telefone), email: f.email ?? "", categoria: f.categoria,
      chave_pix: f.chave_pix ?? "", endereco: f.endereco ?? "", observacoes: f.observacoes ?? "",
    })
    setModal({ id: f.id })
  }

  async function salvar() {
    if (!form.nome.trim()) { toast.error("Informe o nome do fornecedor"); return }
    setSalvando(true)
    const editando = modal?.id
    const res = await fetch("/api/fornecedores", {
      method: editando ? "PUT" : "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(editando ? { ...form, id: editando } : form),
    })
    const data = await res.json().catch(() => ({}))
    setSalvando(false)
    if (!res.ok) { toast.error(data.erro ?? "Erro ao salvar fornecedor"); return }

    setFornecedores((prev) => {
      const atual = prev.find((f) => f.id === data.id)
      const item: FornecedorLista = { ...(atual ?? { em_aberto: 0, pago: 0, contas: 0, proximo_vencimento: null }), ...data }
      const resto = prev.filter((f) => f.id !== data.id)
      return [...resto, item].sort((a, b) => a.nome.localeCompare(b.nome))
    })
    toast.success(editando ? "Fornecedor atualizado!" : "Fornecedor cadastrado!")
    setModal(null)
  }

  async function alternarAtivo(f: FornecedorLista) {
    if (f.ativo && !confirm(`Desativar ${f.nome}? As contas já lançadas continuam no Financeiro.`)) return
    const res = f.ativo
      ? await fetch(`/api/fornecedores?id=${encodeURIComponent(f.id)}`, { method: "DELETE" })
      : await fetch("/api/fornecedores", {
          method: "PUT", headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ id: f.id, _acao: "reativar" }),
        })
    if (!res.ok) { toast.error("Não foi possível atualizar o fornecedor"); return }
    setFornecedores((prev) => prev.map((x) => (x.id === f.id ? { ...x, ativo: !f.ativo } : x)))
    toast.success(f.ativo ? "Fornecedor desativado" : "Fornecedor reativado")
  }

  const campo = (k: keyof typeof FORM_VAZIO) => ({
    value: form[k],
    onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => setForm((p) => ({ ...p, [k]: e.target.value })),
  })

  return (
    <div className="space-y-6">
      <PageHeader
        titulo="Fornecedores"
        subtitulo="Cadastre quem você paga e lance as contas a pagar direto para cada um"
        metricas={[
          { label: "Fornecedores ativos", valor: ativos.length },
          { label: "Em aberto", valor: formatarMoeda(totalAberto) },
          { label: "Já pago", valor: formatarMoeda(totalPago) },
        ]}
      >
        <Button onClick={abrirNovo} disabled={!tabelaPronta} className="bg-white text-[#F26E1D] hover:bg-white/90 font-bold gap-2">
          <Plus className="w-4 h-4" />Novo fornecedor
        </Button>
      </PageHeader>

      {!tabelaPronta && (
        <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-sm text-amber-700 dark:text-amber-300">
          O cadastro de fornecedores ainda não foi ativado no banco de dados. Aplique a migration <code>20261110_fornecedores.sql</code> no Supabase.
        </div>
      )}

      <div className="flex flex-wrap gap-2 items-center">
        <div className="relative flex-1 min-w-[200px] max-w-sm">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input placeholder="Buscar por nome, CNPJ, contato..." value={busca} onChange={(e) => setBusca(e.target.value)} className="pl-9 h-9" />
        </div>
        <button
          onClick={() => setMostrarInativos((v) => !v)}
          className={`px-3 py-2 rounded-lg text-xs font-semibold transition-all ${mostrarInativos ? "bg-primary text-white" : "bg-muted text-muted-foreground hover:text-foreground"}`}
        >
          {mostrarInativos ? "Mostrando desativados" : "Ver desativados"}
        </button>
      </div>

      {lista.length === 0 ? (
        <div className="py-16 text-center text-muted-foreground">
          <Truck className="w-10 h-10 mx-auto mb-3 opacity-30" />
          <p className="text-sm font-medium">
            {busca ? "Nenhum fornecedor encontrado" : mostrarInativos ? "Nenhum fornecedor desativado" : "Nenhum fornecedor cadastrado"}
          </p>
          {!busca && !mostrarInativos && tabelaPronta && (
            <Button onClick={abrirNovo} size="sm" variant="outline" className="mt-4 gap-2"><Plus className="w-4 h-4" />Cadastrar o primeiro</Button>
          )}
        </div>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {lista.map((f) => (
            <div key={f.id} className={`rounded-xl border border-border bg-card p-4 space-y-3 ${f.ativo ? "" : "opacity-70"}`}>
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="font-bold truncate">{f.nome}</p>
                  <p className="text-xs text-muted-foreground">
                    {CATEGORIAS.find((c) => c.value === f.categoria)?.label ?? f.categoria}
                    {f.documento && <> · {formatarDocumento(f.documento)}</>}
                  </p>
                </div>
                <div className="flex gap-1 shrink-0">
                  {f.ativo && (
                    <button onClick={() => abrirEdicao(f)} title="Editar" className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted">
                      <Pencil className="w-3.5 h-3.5" />
                    </button>
                  )}
                  <button onClick={() => alternarAtivo(f)} title={f.ativo ? "Desativar" : "Reativar"}
                    className={`p-1.5 rounded-lg hover:bg-muted ${f.ativo ? "text-muted-foreground hover:text-red-500" : "text-emerald-500"}`}>
                    {f.ativo ? <Ban className="w-3.5 h-3.5" /> : <RotateCcw className="w-3.5 h-3.5" />}
                  </button>
                </div>
              </div>

              <div className="space-y-1 text-xs text-muted-foreground">
                {f.contato && <p className="flex items-center gap-1.5"><User className="w-3 h-3" />{f.contato}</p>}
                {f.telefone && <p className="flex items-center gap-1.5"><Phone className="w-3 h-3" />{formatarTelefone(f.telefone)}</p>}
                {f.email && <p className="flex items-center gap-1.5 truncate"><Mail className="w-3 h-3 shrink-0" />{f.email}</p>}
                {f.chave_pix && <p className="flex items-center gap-1.5 truncate"><KeyRound className="w-3 h-3 shrink-0" />Pix: {f.chave_pix}</p>}
              </div>

              <div className="grid grid-cols-2 gap-2 rounded-lg bg-muted/50 p-2.5">
                <div>
                  <p className="text-[10px] uppercase font-semibold text-muted-foreground">Em aberto</p>
                  <p className={`text-sm font-black ${f.em_aberto > 0 ? "text-amber-600" : ""}`}>{formatarMoeda(f.em_aberto)}</p>
                  {f.proximo_vencimento && (
                    <p className="text-[10px] text-muted-foreground">próx. {format(parseISO(f.proximo_vencimento), "dd/MM/yyyy")}</p>
                  )}
                </div>
                <div>
                  <p className="text-[10px] uppercase font-semibold text-muted-foreground">Pago</p>
                  <p className="text-sm font-black text-emerald-600">{formatarMoeda(f.pago)}</p>
                  <p className="text-[10px] text-muted-foreground">{f.contas} {f.contas === 1 ? "conta" : "contas"}</p>
                </div>
              </div>

              {f.ativo && (
                <Link href={`/financeiro?tab=contaspagar&fornecedor=${f.id}`}
                  className="flex items-center justify-center gap-2 w-full rounded-lg border border-primary/30 text-primary text-xs font-semibold py-2 hover:bg-primary/5 transition-colors">
                  <Receipt className="w-3.5 h-3.5" />Lançar conta a pagar
                </Link>
              )}
            </div>
          ))}
        </div>
      )}

      <Dialog open={!!modal} onOpenChange={(o) => { if (!o) setModal(null) }}>
        <DialogContent className="max-h-[90vh] overflow-y-auto" onInteractOutside={(e) => e.preventDefault()}>
          <DialogHeader><DialogTitle>{modal?.id ? "Editar fornecedor" : "Novo fornecedor"}</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1.5">
              <Label>Nome *</Label>
              <Input placeholder="Ex: Distribuidora Silva" maxLength={120} {...campo("nome")} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>CPF / CNPJ</Label>
                <Input placeholder="Opcional" inputMode="numeric" maxLength={18} {...campo("documento")} />
              </div>
              <div className="space-y-1.5">
                <Label>Categoria padrão</Label>
                <Select value={form.categoria} onValueChange={(v) => setForm((p) => ({ ...p, categoria: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {CATEGORIAS.map((c) => <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Pessoa de contato</Label>
                <Input placeholder="Opcional" maxLength={120} {...campo("contato")} />
              </div>
              <div className="space-y-1.5">
                <Label>Telefone / WhatsApp</Label>
                <Input placeholder="(00) 00000-0000" inputMode="tel" maxLength={20} {...campo("telefone")} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>E-mail</Label>
                <Input type="email" placeholder="Opcional" maxLength={160} {...campo("email")} />
              </div>
              <div className="space-y-1.5">
                <Label>Chave Pix</Label>
                <Input placeholder="Opcional" maxLength={140} {...campo("chave_pix")} />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>Endereço</Label>
              <Input placeholder="Opcional" maxLength={300} {...campo("endereco")} />
            </div>
            <div className="space-y-1.5">
              <Label>Observações</Label>
              <Textarea rows={2} placeholder="Ex: prazo de entrega, condições de pagamento..." maxLength={1000} {...campo("observacoes")} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setModal(null)}>Cancelar</Button>
            <Button onClick={salvar} disabled={salvando}>
              {salvando && <Loader2 className="w-4 h-4 animate-spin mr-2" />}
              {modal?.id ? "Salvar" : "Cadastrar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
