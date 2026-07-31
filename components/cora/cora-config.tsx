"use client"

import { useState, useEffect } from "react"
import { Loader2, Link2, Unlink, AlertTriangle, Crown } from "lucide-react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { createClient } from "@/lib/supabase/client"
import type { Empresa } from "@/types"

type CoraStatus = "carregando" | "desconectado" | "ativo" | "erro"

interface CoraContaRow {
  id: string
  empresa_id: string
  cora_account_id: string
  status: string
  created_at: string
}

export function CoraConfig({ empresa }: { empresa: Empresa }) {
  const [status, setStatus] = useState<CoraStatus>("carregando")
  const [coraAccountId, setCoraAccountId] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const supabase = createClient()

  const planoProfissional = empresa.plano === "profissional"

  useEffect(() => {
    if (!planoProfissional) {
      setStatus("desconectado")
      return
    }
    fetchCoraStatus()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [empresa.id])

  async function fetchCoraStatus() {
    try {
      const { data, error } = await supabase
        .from("cora_contas")
        .select("id, empresa_id, cora_account_id, status, created_at")
        .eq("empresa_id", empresa.id)
        .single()

      if (error || !data) {
        setStatus("desconectado")
        return
      }

      const conta = data as CoraContaRow

      if (conta.status === "ativo") {
        setStatus("ativo")
        setCoraAccountId(conta.cora_account_id)
      } else if (conta.status === "erro") {
        setStatus("erro")
        setCoraAccountId(conta.cora_account_id)
      } else {
        setStatus("desconectado")
      }
    } catch {
      setStatus("desconectado")
    }
  }

  async function handleConectar() {
    setLoading(true)
    // Redireciona para o endpoint de OAuth que inicia o fluxo com a Cora
    window.location.href = "/api/cora/auth"
  }

  async function handleDesconectar() {
    setLoading(true)
    try {
      const res = await fetch("/api/cora/disconnect", { method: "POST" })
      if (!res.ok) {
        const body = await res.json().catch(() => ({}))
        throw new Error(body.error || "Erro ao desconectar")
      }
      setStatus("desconectado")
      setCoraAccountId(null)
      toast.success("Conta Cora desconectada com sucesso")
    } catch (err: any) {
      toast.error(err.message || "Erro ao desconectar da Cora")
    } finally {
      setLoading(false)
    }
  }

  async function handleReconectar() {
    setLoading(true)
    window.location.href = "/api/cora/auth"
  }

  // Se empresa não tem plano profissional, exibe CTA de upgrade
  if (!planoProfissional) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Crown className="h-5 w-5 text-[#F26E1D]" />
            Cora Pagamentos
          </CardTitle>
          <CardDescription>
            Emita boletos, carnês e cobranças Pix diretamente pelo sistema
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-center gap-4 py-6 text-center">
            <div className="rounded-full bg-orange-50 p-4 dark:bg-orange-950/20">
              <Crown className="h-8 w-8 text-[#F26E1D]" />
            </div>
            <div className="space-y-1">
              <p className="font-semibold text-gray-900 dark:text-gray-100">
                Funcionalidade exclusiva do plano Profissional
              </p>
              <p className="text-sm text-muted-foreground">
                Faça upgrade para o plano Profissional e conecte sua conta Cora para emitir boletos, carnês e cobranças Pix.
              </p>
            </div>
            <Button asChild>
              <a href="/planos">Ver planos e fazer upgrade</a>
            </Button>
          </div>
        </CardContent>
      </Card>
    )
  }

  // Estado carregando
  if (status === "carregando") {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Link2 className="h-5 w-5 text-[#F26E1D]" />
            Cora Pagamentos
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-[#F26E1D]" />
            <span className="ml-2 text-sm text-muted-foreground">Verificando conexão...</span>
          </div>
        </CardContent>
      </Card>
    )
  }

  // Estado desconectado
  if (status === "desconectado") {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Link2 className="h-5 w-5 text-[#F26E1D]" />
            Cora Pagamentos
          </CardTitle>
          <CardDescription>
            Conecte sua conta Cora para emitir boletos, carnês e cobranças Pix
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-center gap-4 py-6 text-center">
            <div className="rounded-full bg-gray-100 p-4 dark:bg-white/[0.06]">
              <Link2 className="h-8 w-8 text-gray-400" />
            </div>
            <div className="space-y-1">
              <p className="font-semibold text-gray-900 dark:text-gray-100">
                Nenhuma conta Cora conectada
              </p>
              <p className="text-sm text-muted-foreground">
                Vincule sua conta Cora para começar a emitir boletos registrados, carnês e cobranças Pix diretamente pelo sistema.
              </p>
            </div>
            <Button onClick={handleConectar} disabled={loading}>
              {loading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Conectando...
                </>
              ) : (
                <>
                  <Link2 className="h-4 w-4" />
                  Conectar Cora
                </>
              )}
            </Button>
          </div>
        </CardContent>
      </Card>
    )
  }

  // Estado erro
  if (status === "erro") {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Link2 className="h-5 w-5 text-[#F26E1D]" />
            Cora Pagamentos
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex items-start gap-3 rounded-xl border border-red-200 bg-red-50 p-4 dark:border-red-900/50 dark:bg-red-950/20">
              <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-red-600 dark:text-red-400" />
              <div className="space-y-1">
                <p className="font-semibold text-red-800 dark:text-red-200">
                  Reconexão necessária
                </p>
                <p className="text-sm text-red-700 dark:text-red-300">
                  A sessão com a Cora expirou ou foi revogada. Reconecte sua conta para continuar utilizando boletos e cobranças.
                </p>
              </div>
            </div>
            {coraAccountId && (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <span>Conta:</span>
                <Badge variant="outline">{coraAccountId}</Badge>
              </div>
            )}
            <Button onClick={handleReconectar} disabled={loading}>
              {loading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Reconectando...
                </>
              ) : (
                <>
                  <Link2 className="h-4 w-4" />
                  Reconectar Cora
                </>
              )}
            </Button>
          </div>
        </CardContent>
      </Card>
    )
  }

  // Estado ativo
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Link2 className="h-5 w-5 text-[#F26E1D]" />
          Cora Pagamentos
        </CardTitle>
        <CardDescription>
          Sua conta Cora está conectada e pronta para uso
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <div className="flex items-start gap-3 rounded-xl border border-emerald-200 bg-emerald-50 p-4 dark:border-emerald-900/50 dark:bg-emerald-950/20">
            <Link2 className="mt-0.5 h-5 w-5 shrink-0 text-emerald-600 dark:text-emerald-400" />
            <div className="space-y-1">
              <p className="font-semibold text-emerald-800 dark:text-emerald-200">
                Conta conectada
              </p>
              <p className="text-sm text-emerald-700 dark:text-emerald-300">
                Você pode emitir boletos, carnês e cobranças Pix diretamente pelo sistema.
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <span>Conta Cora:</span>
            <Badge variant="secondary">{coraAccountId}</Badge>
            <Badge className="bg-emerald-100 text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-400">
              Ativa
            </Badge>
          </div>
          <Button
            variant="destructive"
            onClick={handleDesconectar}
            disabled={loading}
          >
            {loading ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Desconectando...
              </>
            ) : (
              <>
                <Unlink className="h-4 w-4" />
                Desconectar Cora
              </>
            )}
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}
