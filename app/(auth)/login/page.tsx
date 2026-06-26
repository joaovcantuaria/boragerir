"use client"

import { useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { Eye, EyeOff, Loader2 } from "lucide-react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { createClient } from "@/lib/supabase/client"

export const dynamic = "force-dynamic"

const schemaLogin = z.object({
  email: z.string().email("E-mail inválido"),
  senha: z.string().min(6, "Mínimo 6 caracteres"),
})

const schemaRecuperar = z.object({
  email: z.string().email("E-mail inválido"),
})

type FormLogin = z.infer<typeof schemaLogin>
type FormRecuperar = z.infer<typeof schemaRecuperar>

export default function LoginPage() {
  const [mostrarSenha, setMostrarSenha] = useState(false)
  const [loading, setLoading] = useState(false)
  const [modoRecuperar, setModoRecuperar] = useState(false)
  const [emailEnviado, setEmailEnviado] = useState(false)
  const router = useRouter()
  const supabase = createClient()

  const formLogin = useForm<FormLogin>({ resolver: zodResolver(schemaLogin) })
  const formRecuperar = useForm<FormRecuperar>({ resolver: zodResolver(schemaRecuperar) })

  async function onLogin(data: FormLogin) {
    setLoading(true)
    const { error } = await supabase.auth.signInWithPassword({
      email: data.email,
      password: data.senha,
    })
    if (error) {
      toast.error("E-mail ou senha incorretos.")
      setLoading(false)
      return
    }
    toast.success("Bem-vindo de volta!")
    router.push("/dashboard")
    router.refresh()
  }

  async function onRecuperar(data: FormRecuperar) {
    setLoading(true)
    const { error } = await supabase.auth.resetPasswordForEmail(data.email, {
      redirectTo: `${window.location.origin}/auth/reset-password`,
    })
    if (error) {
      toast.error("Erro ao enviar e-mail. Verifique o endereço.")
      setLoading(false)
      return
    }
    setEmailEnviado(true)
    setLoading(false)
  }

  // ── Tela de recuperação de senha ──────────────────────────
  if (modoRecuperar) {
    return (
      <div className="space-y-6">
        <div>
          <button
            onClick={() => { setModoRecuperar(false); setEmailEnviado(false) }}
            className="text-sm text-muted-foreground hover:text-foreground mb-4 flex items-center gap-1"
          >
            ← Voltar ao login
          </button>
          <h2 className="text-2xl font-black text-foreground">Esqueci minha senha</h2>
          <p className="text-muted-foreground mt-1 text-sm">
            Digite seu e-mail e enviaremos um link para redefinir sua senha.
          </p>
        </div>

        {emailEnviado ? (
          <div className="p-4 bg-primary/5 border border-primary/20 rounded-xl text-center space-y-2">
            <p className="text-2xl">📧</p>
            <p className="font-bold text-foreground">E-mail enviado!</p>
            <p className="text-sm text-muted-foreground">
              Verifique sua caixa de entrada e clique no link para redefinir sua senha.
            </p>
            <button
              onClick={() => { setModoRecuperar(false); setEmailEnviado(false) }}
              className="text-sm text-primary font-bold hover:underline mt-2 block"
            >
              Voltar ao login
            </button>
          </div>
        ) : (
          <form onSubmit={formRecuperar.handleSubmit(onRecuperar)} className="space-y-4">
            <div className="space-y-1.5">
              <Label>E-mail cadastrado</Label>
              <Input
                type="email"
                placeholder="seu@email.com"
                className={formRecuperar.formState.errors.email ? "border-destructive" : ""}
                {...formRecuperar.register("email")}
              />
              {formRecuperar.formState.errors.email && (
                <p className="text-destructive text-xs">{formRecuperar.formState.errors.email.message}</p>
              )}
            </div>
            <Button type="submit" className="w-full font-bold" disabled={loading}>
              {loading
                ? <><Loader2 className="w-4 h-4 animate-spin mr-2" />Enviando...</>
                : "Enviar link de recuperação"
              }
            </Button>
          </form>
        )}
      </div>
    )
  }

  // ── Tela de login ────────────────────────────────────────
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-black text-foreground">Entrar na sua conta</h2>
        <p className="text-muted-foreground mt-1 text-sm">Digite seus dados para continuar</p>
      </div>

      <form onSubmit={formLogin.handleSubmit(onLogin)} className="space-y-4">
        <div className="space-y-1.5">
          <Label htmlFor="email">E-mail</Label>
          <Input
            id="email"
            type="email"
            placeholder="seu@email.com"
            className={formLogin.formState.errors.email ? "border-destructive" : ""}
            {...formLogin.register("email")}
          />
          {formLogin.formState.errors.email && (
            <p className="text-destructive text-xs">{formLogin.formState.errors.email.message}</p>
          )}
        </div>

        <div className="space-y-1.5">
          <div className="flex items-center justify-between">
            <Label htmlFor="senha">Senha</Label>
            <button
              type="button"
              onClick={() => setModoRecuperar(true)}
              className="text-xs text-primary hover:underline font-medium"
            >
              Esqueci minha senha
            </button>
          </div>
          <div className="relative">
            <Input
              id="senha"
              type={mostrarSenha ? "text" : "password"}
              placeholder="••••••••"
              className={formLogin.formState.errors.senha ? "border-destructive pr-10" : "pr-10"}
              {...formLogin.register("senha")}
            />
            <button
              type="button"
              tabIndex={-1}
              onClick={() => setMostrarSenha(!mostrarSenha)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
            >
              {mostrarSenha ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          </div>
          {formLogin.formState.errors.senha && (
            <p className="text-destructive text-xs">{formLogin.formState.errors.senha.message}</p>
          )}
        </div>

        <Button type="submit" className="w-full font-bold" disabled={loading}>
          {loading
            ? <><Loader2 className="w-4 h-4 animate-spin mr-2" />Entrando...</>
            : "Entrar"
          }
        </Button>
      </form>

      <p className="text-center text-sm text-muted-foreground">
        Não tem conta?{" "}
        <Link href="/cadastro" className="text-primary font-bold hover:underline">
          Criar conta grátis
        </Link>
      </p>

      <div className="relative text-center">
        <div className="border-t border-border" />
        <span className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-background px-3 text-xs text-muted-foreground">
          ou
        </span>
      </div>

      <p className="text-center text-sm text-muted-foreground">
        Quer experimentar antes?{" "}
        <Link href="/demo" className="text-primary font-bold hover:underline">
          Ver demo →
        </Link>
      </p>
    </div>
  )
}
