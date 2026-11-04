"use client"

import { useState, useEffect } from "react"
import { Loader2, MessageCircle, Link2, Unlink, AlertTriangle, CheckCircle2 } from "lucide-react"
import { toast } from "sonner"
import { format } from "date-fns"
import { ptBR } from "date-fns/locale"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"

interface StatusChat {
  empresa_nome: string
  configurado: boolean
  conectado: boolean
  chave_final: string | null
  conectado_em: string | null
  ultimo_uso_em: string | null
  total_requisicoes: number
}

const formatarData = (iso: string) => format(new Date(iso), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })

export function IntegracaoChat() {
  const [status, setStatus] = useState<StatusChat | null>(null)
  const [chave, setChave] = useState("")
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    carregarStatus()
    // Volta do fluxo "Conectar com BoraGerir Chat": mostra o resultado e limpa a URL
    const params = new URLSearchParams(window.location.search)
    if (params.get("chat") === "conectado") toast.success("BoraGerir Chat conectado!")
    const erro = params.get("chat_erro")
    if (erro) toast.error(erro)
    if (params.has("chat") || erro) {
      params.delete("chat")
      params.delete("chat_erro")
      const query = params.toString()
      window.history.replaceState(null, "", window.location.pathname + (query ? `?${query}` : ""))
    }
  }, [])

  async function carregarStatus() {
    try {
      const res = await fetch("/api/integracoes/chat")
      if (res.ok) setStatus(await res.json())
    } catch { /* mantém carregando */ }
  }

  async function handleConectar() {
    setLoading(true)
    try {
      const res = await fetch("/api/integracoes/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ chat_api_key: chave }),
      })
      const body = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(body.erro || "Erro ao conectar")
      setChave("")
      toast.success("BoraGerir Chat conectado!")
      await carregarStatus()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erro ao conectar")
    } finally {
      setLoading(false)
    }
  }

  async function handleDesconectar() {
    if (!confirm("Desconectar o BoraGerir Chat? As automações do Chat deixam de acessar os dados desta empresa.")) return
    setLoading(true)
    try {
      const res = await fetch("/api/integracoes/chat", { method: "DELETE" })
      if (!res.ok) throw new Error("Erro ao desconectar")
      toast.success("BoraGerir Chat desconectado")
      await carregarStatus()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erro ao desconectar")
    } finally {
      setLoading(false)
    }
  }

  const cabecalho = (
    <CardHeader>
      <CardTitle className="flex items-center gap-2">
        <MessageCircle className="h-5 w-5 text-[#F26E1D]" />
        BoraGerir Chat
        {status?.conectado && <Badge className="bg-emerald-500 hover:bg-emerald-500">Conectado</Badge>}
      </CardTitle>
      <CardDescription>
        Conecte o seu WhatsApp do BoraGerir Chat para automações como felicitar aniversariantes
        e reativar clientes que não aparecem há algum tempo.
      </CardDescription>
    </CardHeader>
  )

  if (!status) {
    return (
      <Card>
        {cabecalho}
        <CardContent>
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-[#F26E1D]" />
            <span className="ml-2 text-sm text-muted-foreground">Verificando conexão...</span>
          </div>
        </CardContent>
      </Card>
    )
  }

  if (!status.configurado) {
    return (
      <Card>
        {cabecalho}
        <CardContent>
          <div className="flex items-center gap-2 rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800 dark:border-amber-900 dark:bg-amber-950/20 dark:text-amber-300">
            <AlertTriangle className="h-4 w-4 shrink-0" />
            Integração indisponível no momento. Fale com o suporte.
          </div>
        </CardContent>
      </Card>
    )
  }

  if (status.conectado) {
    return (
      <Card>
        {cabecalho}
        <CardContent className="space-y-4">
          <div className="flex items-start gap-3 rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-sm dark:border-emerald-900 dark:bg-emerald-950/20">
            <CheckCircle2 className="h-5 w-5 shrink-0 text-emerald-600" />
            <div className="space-y-0.5 text-emerald-900 dark:text-emerald-200">
              <p>API key terminada em <strong>…{status.chave_final}</strong></p>
              {status.conectado_em && <p className="text-xs">Conectado em {formatarData(status.conectado_em)}</p>}
              <p className="text-xs">
                {status.ultimo_uso_em
                  ? `Último acesso do Chat: ${formatarData(status.ultimo_uso_em)} (${status.total_requisicoes} consultas)`
                  : "O Chat ainda não consultou dados desta empresa."}
              </p>
            </div>
          </div>
          <Button variant="outline" onClick={handleDesconectar} disabled={loading} className="gap-2">
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Unlink className="h-4 w-4" />}
            Desconectar
          </Button>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      {cabecalho}
      <CardContent className="space-y-4">
        <p className="text-sm text-muted-foreground">
          Você vai para o BoraGerir Chat, entra (ou cria sua conta) e autoriza a conexão.
          Depois volta para cá já conectado{status.empresa_nome ? <> com <strong>{status.empresa_nome}</strong></> : null}.
        </p>
        <Button asChild className="gap-2">
          <a href="/api/integracoes/chat/conectar">
            <Link2 className="h-4 w-4" />
            Conectar com BoraGerir Chat
          </a>
        </Button>
        <p className="text-xs text-muted-foreground">
          O Chat passa a consultar nome, telefone, aniversário e histórico de visitas dos seus clientes
          para as automações. CPF, e-mail e dados financeiros da empresa não são compartilhados.
        </p>

        <details className="rounded-lg border p-3 text-sm">
          <summary className="cursor-pointer text-muted-foreground">Prefiro colar uma API key</summary>
          <div className="mt-3 space-y-3">
            <p className="text-xs text-muted-foreground">
              No BoraGerir Chat, abra <strong>Configurações → Integrações</strong> e copie uma API key (começa com <code>bgc_</code>).
            </p>
            <div className="space-y-2">
              <Label htmlFor="chat-api-key">API key do BoraGerir Chat</Label>
              <Input
                id="chat-api-key"
                type="password"
                autoComplete="off"
                placeholder="bgc_..."
                value={chave}
                onChange={(e) => setChave(e.target.value)}
              />
            </div>
            <Button variant="outline" onClick={handleConectar} disabled={loading || !chave.trim()} className="gap-2">
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Link2 className="h-4 w-4" />}
              Conectar com a API key
            </Button>
          </div>
        </details>
      </CardContent>
    </Card>
  )
}
