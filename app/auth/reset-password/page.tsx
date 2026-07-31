"use client"

import { Suspense, useState } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { Eye, EyeOff, Loader2, CheckCircle } from "lucide-react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"

const schema = z.object({
  senha: z.string().min(6, "Mínimo 6 caracteres"),
  confirmarSenha: z.string(),
}).refine((d) => d.senha === d.confirmarSenha, {
  message: "As senhas não conferem", path: ["confirmarSenha"],
})
type FormData = z.infer<typeof schema>

export default function ResetPasswordPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
      </div>
    }>
      <ResetPasswordContent />
    </Suspense>
  )
}

function ResetPasswordContent() {
  const [mostrarSenha, setMostrarSenha] = useState(false)
  const [loading, setLoading] = useState(false)
  const [sucesso, setSucesso] = useState(false)
  const [erro, setErro] = useState("")
  const router = useRouter()
  const searchParams = useSearchParams()

  const token = searchParams.get("token")
  const email = searchParams.get("email")

  const { register, handleSubmit, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(schema),
  })

  // Se não tem token ou email na URL, link inválido
  if (!token || !email) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4 bg-background">
        <div className="w-full max-w-md space-y-6 text-center">
          <div className="w-16 h-16 rounded-2xl bg-red-100 dark:bg-red-900/20 flex items-center justify-center mx-auto">
            <span className="text-2xl">⚠️</span>
          </div>
          <h2 className="text-xl font-bold">Link inválido</h2>
          <p className="text-sm text-muted-foreground">
            O link de redefinição de senha é inválido. Solicite um novo pela tela de login.
          </p>
          <Button onClick={() => router.push("/login")} className="w-full">
            Voltar ao login
          </Button>
        </div>
      </div>
    )
  }

  async function onSubmit(data: FormData) {
    setLoading(true)
    setErro("")

    try {
      const res = await fetch("/api/auth/redefinir-senha", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email,
          token,
          novaSenha: data.senha,
        }),
      })

      const result = await res.json()

      if (!res.ok) {
        setErro(result.error || "Erro ao redefinir senha")
        setLoading(false)
        return
      }

      setSucesso(true)
      toast.success("Senha redefinida com sucesso!")
      setTimeout(() => {
        router.push("/login")
      }, 2000)
    } catch {
      setErro("Erro de conexão. Tente novamente.")
    } finally {
      setLoading(false)
    }
  }

  if (sucesso) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4 bg-background">
        <div className="w-full max-w-md space-y-6 text-center">
          <div className="w-16 h-16 rounded-2xl bg-green-100 dark:bg-green-900/20 flex items-center justify-center mx-auto">
            <CheckCircle className="w-8 h-8 text-green-600" />
          </div>
          <h2 className="text-xl font-bold">Senha redefinida!</h2>
          <p className="text-sm text-muted-foreground">
            Redirecionando para o login...
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-background">
      <div className="w-full max-w-md space-y-6">
        <div className="text-center">
          <h2 className="text-2xl font-black text-foreground">Redefinir senha</h2>
          <p className="text-muted-foreground mt-1 text-sm">Digite sua nova senha abaixo.</p>
        </div>

        {erro && (
          <div className="p-3 rounded-xl bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-sm text-red-600 dark:text-red-400 text-center">
            {erro}
          </div>
        )}

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-1.5">
            <Label>Nova senha</Label>
            <div className="relative">
              <Input
                type={mostrarSenha ? "text" : "password"}
                placeholder="Mínimo 6 caracteres"
                className={errors.senha ? "border-destructive pr-10" : "pr-10"}
                {...register("senha")}
              />
              <button type="button" tabIndex={-1}
                onClick={() => setMostrarSenha(!mostrarSenha)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                {mostrarSenha ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
            {errors.senha && <p className="text-destructive text-xs">{errors.senha.message}</p>}
          </div>

          <div className="space-y-1.5">
            <Label>Confirmar nova senha</Label>
            <Input
              type="password"
              placeholder="Repita a senha"
              className={errors.confirmarSenha ? "border-destructive" : ""}
              {...register("confirmarSenha")}
            />
            {errors.confirmarSenha && <p className="text-destructive text-xs">{errors.confirmarSenha.message}</p>}
          </div>

          <Button type="submit" className="w-full font-bold" disabled={loading}>
            {loading ? <><Loader2 className="w-4 h-4 animate-spin mr-2" />Salvando...</> : "Redefinir senha"}
          </Button>
        </form>

        <p className="text-center">
          <button onClick={() => router.push("/login")} className="text-xs text-primary hover:underline">
            ← Voltar ao login
          </button>
        </p>
      </div>
    </div>
  )
}
