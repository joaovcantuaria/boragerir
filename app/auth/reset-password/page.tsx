"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { Eye, EyeOff, Loader2, CheckCircle } from "lucide-react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { createClient } from "@/lib/supabase/client"
import { LogoFull } from "@/components/ui/logo"

export const dynamic = "force-dynamic"

const schema = z.object({
  senha: z.string().min(6, "Mínimo 6 caracteres"),
  confirmar: z.string(),
}).refine((d) => d.senha === d.confirmar, {
  message: "As senhas não conferem",
  path: ["confirmar"],
})

type FormData = z.infer<typeof schema>

export default function ResetPasswordPage() {
  const [mostrarSenha, setMostrarSenha] = useState(false)
  const [loading, setLoading] = useState(false)
  const [concluido, setConcluido] = useState(false)
  const router = useRouter()
  const supabase = createClient()

  const { register, handleSubmit, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(schema),
  })

  async function onSubmit(data: FormData) {
    setLoading(true)
    const { error } = await supabase.auth.updateUser({ password: data.senha })
    if (error) {
      toast.error("Erro ao redefinir senha. O link pode ter expirado.")
      setLoading(false)
      return
    }
    setConcluido(true)
    setLoading(false)
    setTimeout(() => router.push("/dashboard"), 3000)
  }

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-6">
      <div className="w-full max-w-md space-y-6">
        <div className="flex justify-center mb-8">
          <LogoFull height={48} />
        </div>

        {concluido ? (
          <div className="text-center space-y-4">
            <CheckCircle className="w-16 h-16 text-primary mx-auto" />
            <h2 className="text-2xl font-black">Senha redefinida!</h2>
            <p className="text-muted-foreground">
              Sua senha foi alterada com sucesso. Redirecionando para o sistema...
            </p>
          </div>
        ) : (
          <>
            <div>
              <h2 className="text-2xl font-black text-foreground">Redefinir senha</h2>
              <p className="text-muted-foreground mt-1 text-sm">Digite sua nova senha abaixo</p>
            </div>

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
                  <button
                    type="button"
                    tabIndex={-1}
                    onClick={() => setMostrarSenha(!mostrarSenha)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground"
                  >
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
                  className={errors.confirmar ? "border-destructive" : ""}
                  {...register("confirmar")}
                />
                {errors.confirmar && <p className="text-destructive text-xs">{errors.confirmar.message}</p>}
              </div>

              <Button type="submit" className="w-full font-bold" disabled={loading}>
                {loading
                  ? <><Loader2 className="w-4 h-4 animate-spin mr-2" />Salvando...</>
                  : "Salvar nova senha"
                }
              </Button>
            </form>
          </>
        )}
      </div>
    </div>
  )
}
