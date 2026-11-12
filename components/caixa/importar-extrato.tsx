"use client"

import { useMemo, useRef, useState } from "react"
import { FileUp, Loader2, AlertTriangle, CheckCircle2 } from "lucide-react"
import { toast } from "sonner"
import { format, parseISO } from "date-fns"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { createClient } from "@/lib/supabase/client"
import { formatarMoeda } from "@/lib/utils"
import {
  lerExtrato, decodificarArquivo, ROTULO_FORMA,
  type LinhaExtrato, type FormaExtrato, type CategoriaImportacao,
} from "@/lib/extrato"
import type { TablesInsert } from "@/types/database"

type MovExistente = { tipo: string; valor: number; created_at: string; data_movimento?: string | null }

type LinhaRevisao = LinhaExtrato & {
  marcada: boolean
  situacao: "nova" | "importada" | "possivel_duplicado"
}

interface Props {
  empresaId: string
  caixas: { id: string; rotulo: string }[]
  caixaPadraoId: string
  colaboradorId: string | null
  movimentacoesExistentes: MovExistente[]
  /** Recebe as movimentações criadas, para atualizar a lista sem recarregar */
  onImportado: (movs: Record<string, unknown>[]) => void
  /** Envolve a abertura (ex.: PIN de gerente) */
  protegerAcao?: (acao: () => void) => void
}

const ROTULO_CATEGORIA: Record<CategoriaImportacao, string> = {
  suprimento: "Suprimento (entrada)",
  despesa: "Despesa",
  sangria: "Sangria",
}

function diaDe(m: MovExistente) {
  return m.data_movimento || format(new Date(m.created_at), "yyyy-MM-dd")
}

export function ImportarExtrato({ empresaId, caixas, caixaPadraoId, colaboradorId, movimentacoesExistentes, onImportado, protegerAcao }: Props) {
  const supabase = createClient()
  const inputRef = useRef<HTMLInputElement>(null)
  const [aberto, setAberto] = useState(false)
  const [lendo, setLendo] = useState(false)
  const [salvando, setSalvando] = useState(false)
  const [arquivo, setArquivo] = useState<string | null>(null)
  const [avisos, setAvisos] = useState<string[]>([])
  const [linhas, setLinhas] = useState<LinhaRevisao[]>([])
  const [caixaId, setCaixaId] = useState(caixaPadraoId)

  function abrir() {
    setLinhas([]); setAvisos([]); setArquivo(null); setCaixaId(caixaPadraoId)
    setAberto(true)
  }

  async function escolherArquivo(file: File | undefined) {
    if (!file) return
    if (file.size > 5 * 1024 * 1024) { toast.error("Arquivo muito grande (máximo 5 MB)."); return }
    setLendo(true)
    try {
      const texto = decodificarArquivo(await file.arrayBuffer())
      const r = lerExtrato(file.name, texto)
      if (!r.ok) { toast.error(r.erro); return }
      if (r.linhas.length === 0) { toast.error("Nenhuma movimentação encontrada no arquivo."); return }

      // Já importadas antes (mesmo identificador do banco)
      const ids = r.linhas.map((l) => l.id)
      const jaImportados = new Set<string>()
      for (let i = 0; i < ids.length; i += 100) {
        const { data, error } = await supabase
          .from("movimentacoes_caixa")
          .select("extrato_id")
          .eq("empresa_id", empresaId)
          .in("extrato_id", ids.slice(i, i + 100))
        if (error) {
          toast.error(/extrato_id/.test(error.message)
            ? "Importação ainda não ativada no banco (migration 20261114_extrato_importado.sql)."
            : "Não foi possível conferir lançamentos já importados.")
          return
        }
        for (const row of data ?? []) if (row.extrato_id) jaImportados.add(row.extrato_id)
      }

      // Possível duplicado de lançamento manual: mesmo dia, tipo e valor no caixa
      const manuais = new Map<string, number>()
      for (const m of movimentacoesExistentes) {
        const chave = `${diaDe(m)}|${m.tipo}|${Number(m.valor).toFixed(2)}`
        manuais.set(chave, (manuais.get(chave) ?? 0) + 1)
      }

      setLinhas(r.linhas.map((l) => {
        if (jaImportados.has(l.id)) return { ...l, marcada: false, situacao: "importada" as const }
        const chave = `${l.data}|${l.tipo}|${l.valor.toFixed(2)}`
        const n = manuais.get(chave) ?? 0
        if (n > 0) { manuais.set(chave, n - 1); return { ...l, marcada: false, situacao: "possivel_duplicado" as const } }
        return { ...l, marcada: true, situacao: "nova" as const }
      }))
      setAvisos(r.avisos)
      setArquivo(file.name)
    } catch {
      toast.error("Não foi possível ler o arquivo.")
    } finally {
      setLendo(false)
      if (inputRef.current) inputRef.current.value = ""
    }
  }

  function alterar(id: string, campos: Partial<LinhaRevisao>) {
    setLinhas((prev) => prev.map((l) => (l.id === id ? { ...l, ...campos } : l)))
  }

  const selecionadas = useMemo(() => linhas.filter((l) => l.marcada && l.situacao !== "importada"), [linhas])
  const totalEntradas = selecionadas.filter((l) => l.tipo === "entrada").reduce((s, l) => s + l.valor, 0)
  const totalSaidas = selecionadas.filter((l) => l.tipo === "saida").reduce((s, l) => s + l.valor, 0)

  async function importar() {
    if (!caixaId) { toast.error("Escolha o caixa."); return }
    if (selecionadas.length === 0) { toast.error("Nenhuma linha selecionada."); return }
    setSalvando(true)
    const registros: TablesInsert<"movimentacoes_caixa">[] = selecionadas.map((l) => ({
      empresa_id: empresaId,
      caixa_id: caixaId,
      tipo: l.categoria === "suprimento" ? "entrada" : "saida",
      categoria: l.categoria,
      descricao: `${l.descricao} [${l.forma}]`,
      valor: l.valor,
      created_at: new Date(`${l.data}T12:00:00`).toISOString(),
      data_movimento: l.data,
      colaborador_id: colaboradorId,
      extrato_id: l.id,
    }))
    const criadas: Record<string, unknown>[] = []
    for (let i = 0; i < registros.length; i += 200) {
      const { data, error } = await supabase
        .from("movimentacoes_caixa")
        .upsert(registros.slice(i, i + 200), { onConflict: "empresa_id,extrato_id", ignoreDuplicates: true })
        .select()
      if (error) {
        setSalvando(false)
        toast.error(criadas.length > 0
          ? `Importadas ${criadas.length}, mas houve erro no restante: ${error.message}`
          : `Erro ao importar: ${error.message}`)
        if (criadas.length > 0) onImportado(criadas)
        return
      }
      criadas.push(...(data ?? []))
    }
    setSalvando(false)
    onImportado(criadas)
    toast.success(`${criadas.length} lançamento${criadas.length === 1 ? "" : "s"} importado${criadas.length === 1 ? "" : "s"} do extrato.`)
    setAberto(false)
  }

  const formasSaida: FormaExtrato[] = ["pix", "cartao_debito", "transferencia", "boleto", "debito_conta", "dinheiro"]

  return (
    <>
      <Button variant="outline" className="gap-2" onClick={() => (protegerAcao ? protegerAcao(abrir) : abrir())}>
        <FileUp className="w-4 h-4 text-blue-500" />
        Importar extrato
      </Button>

      <Dialog open={aberto} onOpenChange={(o) => { if (!o && !salvando) setAberto(false) }}>
        <DialogContent className="max-w-3xl" onInteractOutside={(e) => e.preventDefault()}>
          <DialogHeader><DialogTitle>Importar extrato bancário</DialogTitle></DialogHeader>

          {!arquivo ? (
            <div className="space-y-4">
              <button
                type="button"
                onClick={() => inputRef.current?.click()}
                disabled={lendo}
                className="w-full rounded-xl border-2 border-dashed border-border p-8 text-center hover:border-primary/60 transition-colors"
              >
                {lendo ? <Loader2 className="w-8 h-8 mx-auto animate-spin text-muted-foreground" /> : <FileUp className="w-8 h-8 mx-auto text-muted-foreground" />}
                <p className="mt-2 text-sm font-semibold">Escolher arquivo OFX ou CSV</p>
                <p className="text-xs text-muted-foreground mt-1">Nubank: app → Conta → Extrato → Exportar extrato (OFX ou CSV)</p>
              </button>
              <input ref={inputRef} type="file" accept=".ofx,.csv,.txt" className="hidden" onChange={(e) => escolherArquivo(e.target.files?.[0])} />
              <p className="text-[11px] text-muted-foreground">
                O arquivo é lido aqui no seu navegador. Você revisa cada linha antes de lançar; nada entra no caixa sem sua confirmação.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              <div className="flex flex-wrap items-center gap-2 text-xs">
                <span className="font-semibold truncate max-w-[220px]">{arquivo}</span>
                <span className="text-muted-foreground">· {linhas.length} movimentações</span>
                <button type="button" className="text-primary hover:underline" onClick={() => setLinhas((p) => p.map((l) => (l.situacao === "importada" ? l : { ...l, marcada: true })))}>Marcar todas</button>
                <button type="button" className="text-primary hover:underline" onClick={() => setLinhas((p) => p.map((l) => ({ ...l, marcada: false })))}>Desmarcar todas</button>
                <button type="button" className="ml-auto text-muted-foreground hover:underline" onClick={() => { setArquivo(null); setLinhas([]) }}>Trocar arquivo</button>
              </div>

              {caixas.length > 1 && (
                <div className="flex items-center gap-2 text-xs">
                  <span className="text-muted-foreground">Lançar no caixa:</span>
                  <select value={caixaId} onChange={(e) => setCaixaId(e.target.value)} className="h-8 rounded-lg border border-input bg-background px-2 text-xs">
                    {caixas.map((c) => <option key={c.id} value={c.id}>{c.rotulo}</option>)}
                  </select>
                </div>
              )}

              {avisos.length > 0 && (
                <p className="text-[11px] text-amber-600">{avisos.length} linha(s) do arquivo não puderam ser lidas e foram ignoradas.</p>
              )}

              <div className="max-h-[50vh] overflow-y-auto rounded-xl border border-border divide-y divide-border">
                {linhas.map((l) => (
                  <div key={l.id} className={`flex flex-wrap items-center gap-x-3 gap-y-1.5 px-3 py-2 text-xs ${l.situacao === "importada" ? "opacity-50" : ""}`}>
                    <input
                      type="checkbox"
                      className="h-4 w-4 accent-[#F26E1D]"
                      checked={l.marcada}
                      disabled={l.situacao === "importada"}
                      onChange={(e) => alterar(l.id, { marcada: e.target.checked })}
                      aria-label="Importar esta linha"
                    />
                    <span className="w-11 shrink-0 text-muted-foreground">{format(parseISO(l.data), "dd/MM")}</span>
                    <span className="flex-1 min-w-[160px] truncate" title={l.descricao}>
                      {l.descricao}
                      {l.situacao === "importada" && <span className="ml-1 inline-flex items-center gap-0.5 text-emerald-600"><CheckCircle2 className="w-3 h-3" />já importada</span>}
                      {l.situacao === "possivel_duplicado" && <span className="ml-1 inline-flex items-center gap-0.5 text-amber-600"><AlertTriangle className="w-3 h-3" />já existe um lançamento igual nesse dia</span>}
                    </span>
                    <select
                      value={l.forma}
                      disabled={l.situacao === "importada"}
                      onChange={(e) => alterar(l.id, { forma: e.target.value as FormaExtrato })}
                      className="h-7 rounded-md border border-input bg-background px-1.5"
                      aria-label="Forma"
                    >
                      {formasSaida.map((f) => <option key={f} value={f}>{ROTULO_FORMA[f]}</option>)}
                    </select>
                    <select
                      value={l.categoria}
                      disabled={l.situacao === "importada" || l.tipo === "entrada"}
                      onChange={(e) => alterar(l.id, { categoria: e.target.value as CategoriaImportacao })}
                      className="h-7 rounded-md border border-input bg-background px-1.5"
                      aria-label="Categoria"
                    >
                      {(l.tipo === "entrada" ? ["suprimento"] : ["despesa", "sangria"]).map((c) => (
                        <option key={c} value={c}>{ROTULO_CATEGORIA[c as CategoriaImportacao]}</option>
                      ))}
                    </select>
                    <span className={`w-24 shrink-0 text-right font-semibold ${l.tipo === "entrada" ? "text-emerald-500" : "text-red-500"}`}>
                      {l.tipo === "entrada" ? "+" : "-"}{formatarMoeda(l.valor)}
                    </span>
                  </div>
                ))}
              </div>

              <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs">
                <span><strong>{selecionadas.length}</strong> selecionadas</span>
                <span className="text-emerald-600">Entradas {formatarMoeda(totalEntradas)}</span>
                <span className="text-red-500">Saídas {formatarMoeda(totalSaidas)}</span>
              </div>
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setAberto(false)} disabled={salvando}>Cancelar</Button>
            {arquivo && (
              <Button onClick={importar} disabled={salvando || selecionadas.length === 0} className="gap-2">
                {salvando ? <Loader2 className="w-4 h-4 animate-spin" /> : <FileUp className="w-4 h-4" />}
                Lançar {selecionadas.length} no caixa
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
