"use client"

import { useEffect, useState } from "react"
import { toast } from "sonner"
import { BellRing, Crown, Loader2, Send, X } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"

interface Config {
  ativo: boolean
  telefone: string
  nome: string
  hora_resumo: string
  resumo: boolean
  vespera: boolean
  atraso: boolean
}
interface Envio { tipo: string; status: string; detalhe: string | null; created_at: string }

const ROTULO_TIPO: Record<string, string> = { resumo: "Resumo", vespera: "Véspera", atraso: "Cobrança", teste: "Teste" }

/** Janela "Lembretes no WhatsApp" da página de Tarefas (plano Profissional). */
export function LembretesWhatsApp({ onClose }: { onClose: () => void }) {
  const [carregando, setCarregando] = useState(true)
  const [disponivel, setDisponivel] = useState(false)
  const [config, setConfig] = useState<Config | null>(null)
  const [envios, setEnvios] = useState<Envio[]>([])
  const [aceite, setAceite] = useState(false)
  const [salvando, setSalvando] = useState(false)
  const [testando, setTestando] = useState(false)

  const buscar = () => fetch("/api/lembretes-tarefas").then((r) => (r.ok ? r.json() : null)).catch(() => null)
  const aplicar = (d: { disponivel: boolean; config: Config; envios: Envio[] } | null) => {
    if (d) {
      setDisponivel(d.disponivel)
      setConfig(d.config)
      setAceite(d.config.ativo)
      setEnvios(d.envios)
    }
    setCarregando(false)
  }
  const carregar = async () => aplicar(await buscar())

  useEffect(() => {
    let ativo = true
    buscar().then((d) => { if (ativo) aplicar(d) })
    return () => { ativo = false }
  }, [])

  const salvar = async (ativo: boolean) => {
    if (!config) return
    setSalvando(true)
    try {
      const res = await fetch("/api/lembretes-tarefas", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...config, ativo, aceite }),
      })
      const d = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(d.erro || "Erro ao salvar")
      toast.success(ativo ? "Lembretes ativados! 🔔" : "Configuração salva")
      carregar()
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Erro ao salvar")
    } finally {
      setSalvando(false)
    }
  }

  const testar = async () => {
    setTestando(true)
    try {
      const res = await fetch("/api/lembretes-tarefas", { method: "POST" })
      const d = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(d.erro || "Não foi possível enviar")
      toast.success("Resumo enviado para o seu WhatsApp!")
      carregar()
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Não foi possível enviar")
    } finally {
      setTestando(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="w-full max-w-lg rounded-2xl bg-card border shadow-xl p-5 space-y-4 max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-start gap-3">
          <div className="h-10 w-10 rounded-xl bg-orange-50 dark:bg-orange-950/30 flex items-center justify-center shrink-0">
            <BellRing className="h-5 w-5 text-[#F26E1D]" />
          </div>
          <div className="flex-1">
            <h2 className="text-base font-bold">Lembretes no WhatsApp</h2>
            <p className="text-xs text-muted-foreground">
              O WhatsApp do Bora Gerir te cobra os compromissos: resumo da manhã, aviso na véspera e cobrança do que atrasou,
              com mais insistência no que é urgente.
            </p>
          </div>
          <button onClick={onClose} aria-label="Fechar" className="text-muted-foreground hover:text-foreground"><X className="h-4 w-4" /></button>
        </div>

        {carregando || !config ? (
          <div className="flex justify-center py-6"><Loader2 className="h-5 w-5 animate-spin text-[#F26E1D]" /></div>
        ) : !disponivel ? (
          <div className="text-center space-y-3 py-4">
            <Crown className="h-8 w-8 text-[#F26E1D] mx-auto" />
            <p className="text-sm font-semibold">Exclusivo do plano Profissional</p>
            <Button asChild size="sm"><a href="/planos">Ver planos</a></Button>
          </div>
        ) : (
          <>
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-1">
                <Label className="text-xs">Seu WhatsApp</Label>
                <Input placeholder="(38) 99999-9999" value={config.telefone} onChange={(e) => setConfig({ ...config, telefone: e.target.value })} />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Como te chamamos</Label>
                <Input placeholder="Ex.: João" maxLength={60} value={config.nome} onChange={(e) => setConfig({ ...config, nome: e.target.value })} />
              </div>
            </div>

            <div className="space-y-2 rounded-lg border p-3 text-sm">
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" checked={config.resumo} onChange={(e) => setConfig({ ...config, resumo: e.target.checked })} />
                <span>Resumo da manhã às</span>
                <Input type="time" className="h-7 w-24" value={config.hora_resumo} onChange={(e) => setConfig({ ...config, hora_resumo: e.target.value })} />
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" checked={config.vespera} onChange={(e) => setConfig({ ...config, vespera: e.target.checked })} />
                <span>Aviso na véspera (18h) do que vence amanhã</span>
              </label>
              <label className="flex items-start gap-2 cursor-pointer">
                <input type="checkbox" className="mt-1" checked={config.atraso} onChange={(e) => setConfig({ ...config, atraso: e.target.checked })} />
                <span>
                  Cobrança das atrasadas (14h): urgentes todo dia, alta prioridade a cada 2 dias
                  <span className="block text-xs text-muted-foreground">Com botões “✅ Concluí” e “⏰ Adiar 1 dia” direto no WhatsApp.</span>
                </span>
              </label>
            </div>

            <label className="flex items-start gap-2 text-xs text-muted-foreground cursor-pointer">
              <input type="checkbox" className="mt-0.5" checked={aceite} onChange={(e) => setAceite(e.target.checked)} />
              Aceito receber lembretes das minhas tarefas pelo WhatsApp do Bora Gerir. Posso parar a qualquer momento respondendo SAIR.
            </label>

            <div className="flex flex-wrap gap-2">
              {config.ativo ? (
                <>
                  <Button size="sm" onClick={() => salvar(true)} disabled={salvando}>
                    {salvando && <Loader2 className="h-3.5 w-3.5 mr-1 animate-spin" />}Salvar
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => salvar(false)} disabled={salvando}>Desativar</Button>
                  <Button size="sm" variant="outline" onClick={testar} disabled={testando}>
                    {testando ? <Loader2 className="h-3.5 w-3.5 mr-1 animate-spin" /> : <Send className="h-3.5 w-3.5 mr-1" />}Enviar teste
                  </Button>
                </>
              ) : (
                <Button size="sm" onClick={() => salvar(true)} disabled={salvando || !aceite} className="bg-[#F26E1D] hover:bg-[#d95f15] text-white">
                  {salvando && <Loader2 className="h-3.5 w-3.5 mr-1 animate-spin" />}Ativar lembretes
                </Button>
              )}
            </div>

            <p className="text-[11px] text-muted-foreground">
              Os lembretes usam o prazo das tarefas (data). Tarefas sem prazo não geram aviso.
            </p>

            {envios.length > 0 && (
              <div className="text-xs space-y-0.5 border-t pt-3">
                <p className="font-medium">Últimos envios</p>
                {envios.slice(0, 6).map((e, i) => (
                  <p key={i} className="text-muted-foreground">
                    {new Date(e.created_at).toLocaleString("pt-BR", { timeZone: "America/Sao_Paulo", day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" })}
                    {" · "}{ROTULO_TIPO[e.tipo] || e.tipo}{" · "}
                    <span className={e.status === "enviado" ? "text-emerald-600" : e.status === "falhou" ? "text-red-500" : ""}>
                      {e.status === "enviado" ? "enviado" : e.status === "falhou" ? `falhou${e.detalhe ? ` (${e.detalhe})` : ""}` : "enviando"}
                    </span>
                  </p>
                ))}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}
