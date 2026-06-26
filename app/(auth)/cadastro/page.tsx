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

const schema = z.object({
  nome: z.string().min(2, "Nome obrigatório"),
  email: z.string().email("E-mail inválido"),
  senha: z.string().min(6, "Mínimo 6 caracteres"),
  confirmarSenha: z.string(),
}).refine((d) => d.senha === d.confirmarSenha, {
  message: "As senhas não conferem", path: ["confirmarSenha"],
})
type FormData = z.infer<typeof schema>

export default function CadastroPage() {
  const [mostrarSenha, setMostrarSenha] = useState(false)
  const [loading, setLoading] = useState(false)
  const router = useRouter()
  const supabase = createClient()

  const { register, handleSubmit, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(schema),
  })

  async function onSubmit(data: FormData) {
    setLoading(true)
    const { error } = await supabase.auth.signUp({
      email: data.email,
      password: data.senha,
      options: { data: { nome_completo: data.nome } },
    })
    if (error) {
      toast.error(error.message === "User already registered"
        ? "E-mail já cadastrado." : "Erro ao criar conta.")
      setLoading(false)
      return
    }
    toast.success("Conta criada! Vamos configurar seu negócio.")
    router.push("/onboarding")
    router.refresh()
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-black text-foreground">Criar conta grátis</h2>
        <p className="text-muted-foreground mt-1 text-sm">Sem cartão de crédito. Comece agora.</p>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <div className="space-y-1.5">
          <Label>Nome completo</Label>
          <Input placeholder="Seu nome" className={errors.nome ? "border-destructive" : ""}
            {...register("nome")} />
          {errors.nome && <p className="text-destructive text-xs">{errors.nome.message}</p>}
        </div>

        <div className="space-y-1.5">
          <Label>E-mail</Label>
          <Input type="email" placeholder="seu@email.com"
            className={errors.email ? "border-destructive" : ""}
            {...register("email")} />
          {errors.email && <p className="text-destructive text-xs">{errors.email.message}</p>}
        </div>

        <div className="space-y-1.5">
          <Label>Senha</Label>
          <div className="relative">
            <Input type={mostrarSenha ? "text" : "password"} placeholder="Mínimo 6 caracteres"
              className={errors.senha ? "border-destructive pr-10" : "pr-10"}
              {...register("senha")} />
            <button type="button" tabIndex={-1}
              onClick={() => setMostrarSenha(!mostrarSenha)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground">
              {mostrarSenha ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          </div>
          {errors.senha && <p className="text-destructive text-xs">{errors.senha.message}</p>}
        </div>

        <div className="space-y-1.5">
          <Label>Confirmar senha</Label>
          <Input type="password" placeholder="Repita a senha"
            className={errors.confirmarSenha ? "border-destructive" : ""}
            {...register("confirmarSenha")} />
          {errors.confirmarSenha && <p className="text-destructive text-xs">{errors.confirmarSenha.message}</p>}
        </div>

        <Button type="submit" className="w-full font-bold" disabled={loading}>
          {loading ? <><Loader2 className="w-4 h-4 animate-spin mr-2" />Criando conta...</> : "Criar conta grátis"}
        </Button>
      </form>

      <p className="text-center text-sm text-muted-foreground">
        Já tem conta?{" "}
        <Link href="/login" className="text-primary font-bold hover:underline">Entrar</Link>
      </p>
    </div>
  )
}
