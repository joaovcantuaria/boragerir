"use client"

import { useState } from "react"
import Link from "next/link"
import { Fingerprint, Loader2, Search } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { formatarMoeda, formatarDataHora } from "@/lib/utils"

interface Resultado {
  codigo: string
  tipo: string
  link: string
  valor: number
  data: string
  status: string | null
  descricao: string | null
  detalhe: string | null
}

/** Botão + janela para achar qualquer operação financeira pelo código de rastreio. */
export function RastrearCodigo() {
  const [aberto, setAberto] = useState(false)
  const [codigo, setCodigo] = useState("")
  const [buscando, setBuscando] = useState(false)
  const [resultado, setResultado] = useState<Resultado | null>(null)
  const [erro, setErro] = useState<string | null>(null)

  async function buscar(e?: React.FormEvent) {
    e?.preventDefault()
    if (!codigo.trim()) return
    setBuscando(true); setErro(null); setResultado(null)
    const res = await fetch(`/api/rastreio?codigo=${encodeURIComponent(codigo.trim())}`)
    const data = await res.json().catch(() => ({}))
    setBuscando(false)
    if (!res.ok) { setErro(data.erro ?? "Não foi possível rastrear"); return }
    setResultado(data)
  }

  return (
    <>
      <Button variant="outline" size="sm" className="gap-2" onClick={() => setAberto(true)}>
        <Fingerprint className="w-4 h-4" />Rastrear código
      </Button>
      <Dialog open={aberto} onOpenChange={(o) => { setAberto(o); if (!o) { setResultado(null); setErro(null) } }}>
        <DialogContent>
          <DialogHeader><DialogTitle>Rastrear operação</DialogTitle></DialogHeader>
          <form onSubmit={buscar} className="flex gap-2">
            <Input
              autoFocus
              value={codigo}
              onChange={(e) => setCodigo(e.target.value)}
              placeholder="Ex: VD-261109-00001-4"
              className="font-mono"
            />
            <Button type="submit" disabled={buscando || !codigo.trim()}>
              {buscando ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
            </Button>
          </form>
          <p className="text-[11px] text-muted-foreground">
            VD venda · EN entrada · SA saída · CX caixa · CP conta a pagar · CR a receber · DB débito · PC parcela de contrato
          </p>

          {erro && <p className="text-sm text-red-500">{erro}</p>}

          {resultado && (
            <div className="rounded-xl border border-border p-4 space-y-2">
              <div className="flex items-center justify-between gap-2">
                <span className="text-xs font-semibold text-primary">{resultado.tipo}</span>
                <span className="font-mono text-xs text-muted-foreground">{resultado.codigo}</span>
              </div>
              <p className="text-sm font-semibold">{resultado.descricao ?? "—"}</p>
              <p className="text-2xl font-black">{formatarMoeda(Number(resultado.valor) || 0)}</p>
              <div className="text-xs text-muted-foreground space-y-0.5">
                <p>Registrado em {formatarDataHora(resultado.data)}</p>
                {resultado.status && <p>Situação: <span className="capitalize">{resultado.status}</span></p>}
                {resultado.detalhe && <p>{resultado.detalhe}</p>}
              </div>
              <Link href={resultado.link} onClick={() => setAberto(false)} className="inline-block text-xs font-semibold text-primary hover:underline">
                Abrir tela →
              </Link>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  )
}
