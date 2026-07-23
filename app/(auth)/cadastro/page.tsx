"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { Eye, EyeOff, Loader2, X, CheckCircle, FileText, Shield } from "lucide-react"
import { toast } from "sonner"
import { useRegistrarVisita } from "@/hooks/use-registrar-visita"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { createClient } from "@/lib/supabase/client"
import { motion, AnimatePresence } from "framer-motion"
import { cn } from "@/lib/utils"

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
  useRegistrarVisita("cadastro")
  const [mostrarSenha, setMostrarSenha] = useState(false)
  const [loading, setLoading] = useState(false)
  const [contaCriada, setContaCriada] = useState(false)
  const [emailCadastrado, setEmailCadastrado] = useState("")
  const [emailJaExiste, setEmailJaExiste] = useState(false)
  const router = useRouter()
  const supabase = createClient()

  // Documentos legais
  const [termos, setTermos] = useState<string>("")
  const [politica, setPolitica] = useState<string>("")
  const [loadingDocs, setLoadingDocs] = useState(true)

  // Estado dos aceites
  const [modalAberto, setModalAberto] = useState<"termos" | "politica" | null>(null)
  const [termosLidos, setTermosLidos] = useState(false)
  const [politicaLida, setPoliticaLida] = useState(false)
  const [concordaTermos, setConcordaTermos] = useState(false)
  const [concordaPolitica, setConcordaPolitica] = useState(false)
  const concordaTudo = concordaTermos && concordaPolitica

  useEffect(() => {
    fetch("/api/documentos-legais")
      .then((r) => r.json())
      .then((d) => { setTermos(d.termos); setPolitica(d.politica) })
      .catch(() => {})
      .finally(() => setLoadingDocs(false))
  }, [])

  const { register, handleSubmit, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(schema),
  })

  async function onSubmit(data: FormData) {
    if (!concordaTudo) {
      toast.error("Você precisa aceitar os Termos de Uso e a Política de Privacidade.")
      return
    }
    setLoading(true)

    try {
      const res = await fetch("/api/auth/cadastro", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          nome: data.nome,
          email: data.email,
          senha: data.senha,
        }),
      })

      const result = await res.json()

      if (!res.ok) {
        if (result.error === "already_registered") {
          setEmailCadastrado(data.email)
          setEmailJaExiste(true)
        } else {
          console.error("[cadastro] Erro:", result.message)
          toast.error(`Erro ao criar conta: ${result.message || "Tente novamente."}`)
        }
        setLoading(false)
        return
      }

      // Conta criada com sucesso — sessão já estabelecida via cookies
      toast.success("Conta criada! Vamos configurar seu negócio.")
      router.push("/onboarding")
      router.refresh()
    } catch (err) {
      console.error("[cadastro] Erro de rede:", err)
      toast.error("Erro de conexão. Verifique sua internet e tente novamente.")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-6">
      {/* ── Email já cadastrado ── */}
      {emailJaExiste && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="space-y-6 text-center"
        >
          <div className="w-16 h-16 rounded-2xl bg-amber-100 dark:bg-amber-900/20 flex items-center justify-center mx-auto">
            <Shield className="w-8 h-8 text-amber-600 dark:text-amber-400" />
          </div>
          <div>
            <h2 className="text-2xl font-black text-foreground">E-mail já cadastrado</h2>
            <p className="text-muted-foreground mt-2 text-sm leading-relaxed">
              O e-mail <strong className="text-foreground">{emailCadastrado}</strong> já possui uma conta no Bora Gerir.
            </p>
          </div>

          <div className="space-y-3">
            <Link href="/login">
              <Button className="w-full font-bold">
                Fazer login →
              </Button>
            </Link>
            <button
              onClick={async () => {
                await supabase.auth.resetPasswordForEmail(emailCadastrado, {
                  redirectTo: `${window.location.origin}/login?reset=1`,
                })
                toast.success("E-mail de recuperação enviado! Verifique sua caixa de entrada.")
              }}
              className="w-full py-2.5 rounded-xl border border-gray-200 dark:border-white/10 text-sm font-medium text-muted-foreground hover:bg-muted transition-colors"
            >
              Esqueci minha senha
            </button>
          </div>

          <button
            onClick={() => { setEmailJaExiste(false); setEmailCadastrado("") }}
            className="text-xs text-primary hover:underline"
          >
            ← Tentar com outro e-mail
          </button>
        </motion.div>
      )}

      {/* ── Tela de confirmação de email ── */}
      {contaCriada && !emailJaExiste && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="space-y-6 text-center"
        >
          <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto">
            <CheckCircle className="w-8 h-8 text-primary" />
          </div>
          <div>
            <h2 className="text-2xl font-black text-foreground">Conta criada! 🎉</h2>
            <p className="text-muted-foreground mt-2 text-sm leading-relaxed">
              Enviamos um e-mail de confirmação para{" "}
              <strong className="text-foreground">{emailCadastrado}</strong>.
              <br />
              Confirme seu e-mail para garantir o acesso completo à sua conta.
            </p>
          </div>

          <div className="rounded-xl bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-700/40 p-4 text-left space-y-1">
            <p className="text-sm font-semibold text-amber-800 dark:text-amber-300">📧 Verifique sua caixa de entrada</p>
            <p className="text-xs text-amber-700 dark:text-amber-400">
              Procure por um e-mail do Bora Gerir. Se não encontrar, verifique a pasta de spam.
            </p>
          </div>

          <div className="space-y-2">
            <Button
              onClick={() => { router.push("/onboarding"); router.refresh() }}
              className="w-full font-bold"
            >
              Continuar sem confirmar agora →
            </Button>
            <p className="text-xs text-muted-foreground">
              Você pode confirmar depois. Algumas funcionalidades podem ser limitadas até a confirmação.
            </p>
          </div>

          <button
            onClick={async () => {
              await supabase.auth.resend({ type: "signup", email: emailCadastrado })
              toast.success("E-mail reenviado!")
            }}
            className="text-xs text-primary hover:underline"
          >
            Não recebeu? Reenviar e-mail
          </button>
        </motion.div>
      )}

      {/* ── Formulário de cadastro ── */}
      {!contaCriada && !emailJaExiste && (
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

        {/* Seção de aceite de termos */}
        <div className="rounded-xl border border-border bg-muted/30 p-4 space-y-3">
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Documentos obrigatórios</p>

          {/* Termos de Uso */}
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2.5 min-w-0">
              <FileText className={cn("w-4 h-4 shrink-0", concordaTermos ? "text-emerald-500" : "text-muted-foreground")} />
              <div className="min-w-0">
                <p className="text-sm font-medium">Termos de Uso</p>
                <p className="text-xs text-muted-foreground">{concordaTermos ? "✓ Aceito" : "Leitura obrigatória"}</p>
              </div>
            </div>
            <button type="button" onClick={() => setModalAberto("termos")}
              className={cn(
                "shrink-0 text-xs font-bold px-3 py-1.5 rounded-lg transition-all",
                concordaTermos
                  ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400"
                  : "bg-primary/10 text-primary hover:bg-primary/20"
              )}>
              {concordaTermos ? "Revisar" : "Ler e aceitar →"}
            </button>
          </div>

          {/* Política de Privacidade */}
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2.5 min-w-0">
              <Shield className={cn("w-4 h-4 shrink-0", concordaPolitica ? "text-emerald-500" : "text-muted-foreground")} />
              <div className="min-w-0">
                <p className="text-sm font-medium">Política de Privacidade</p>
                <p className="text-xs text-muted-foreground">{concordaPolitica ? "✓ Aceita" : "Leitura obrigatória"}</p>
              </div>
            </div>
            <button type="button" onClick={() => setModalAberto("politica")}
              className={cn(
                "shrink-0 text-xs font-bold px-3 py-1.5 rounded-lg transition-all",
                concordaPolitica
                  ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400"
                  : "bg-primary/10 text-primary hover:bg-primary/20"
              )}>
              {concordaPolitica ? "Revisar" : "Ler e aceitar →"}
            </button>
          </div>

          {/* Checkbox final */}
          <div className={cn(
            "flex items-start gap-2.5 pt-2 border-t border-border transition-opacity",
            !concordaTermos || !concordaPolitica ? "opacity-40 pointer-events-none" : ""
          )}>
            <input
              type="checkbox"
              id="concordaTudo"
              checked={concordaTudo}
              onChange={(e) => {
                if (concordaTermos && concordaPolitica) {
                  setConcordaTermos(e.target.checked)
                  setConcordaPolitica(e.target.checked)
                }
              }}
              className="mt-0.5 w-4 h-4 rounded accent-primary cursor-pointer"
            />
            <label htmlFor="concordaTudo" className="text-xs text-muted-foreground cursor-pointer leading-relaxed">
              Li e concordo com os <strong className="text-foreground">Termos de Uso</strong> e a <strong className="text-foreground">Política de Privacidade</strong> do Bora Gerir.
            </label>
          </div>
        </div>

        <Button type="submit" className="w-full font-bold" disabled={loading || !concordaTudo}>
          {loading ? <><Loader2 className="w-4 h-4 animate-spin mr-2" />Criando conta...</> : "Criar conta grátis"}
        </Button>
      </form>

      <p className="text-center text-sm text-muted-foreground">
        Já tem conta?{" "}
        <Link href="/login" className="text-primary font-bold hover:underline">Entrar</Link>
      </p>

      {/* Modal de documento */}
      <AnimatePresence>
        {modalAberto && (
          <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/50 backdrop-blur-sm p-0 sm:p-4">
            <motion.div
              initial={{ y: 40, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: 40, opacity: 0 }}
              className="bg-white dark:bg-[#1c1c1e] border border-border rounded-t-2xl sm:rounded-2xl w-full sm:max-w-lg shadow-2xl flex flex-col"
              style={{ maxHeight: "85vh" }}
            >
              {/* Header */}
              <div className="flex items-center justify-between px-5 py-4 border-b border-border shrink-0">
                <div className="flex items-center gap-2.5">
                  {modalAberto === "termos"
                    ? <FileText className="w-4 h-4 text-primary" />
                    : <Shield className="w-4 h-4 text-primary" />
                  }
                  <h3 className="font-black text-sm">
                    {modalAberto === "termos" ? "Termos de Uso — Bora Gerir" : "Política de Privacidade — Bora Gerir"}
                  </h3>
                </div>
                <button onClick={() => setModalAberto(null)} className="p-1 rounded-lg hover:bg-muted text-muted-foreground">
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Conteúdo */}
              <div className="flex-1 overflow-y-auto px-5 py-4">
                {loadingDocs ? (
                  <div className="flex items-center justify-center py-12">
                    <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
                  </div>
                ) : (
                  <div
                    className="prose prose-sm max-w-none text-foreground dark:prose-invert"
                    dangerouslySetInnerHTML={{
                      __html: modalAberto === "termos" ? termos : politica
                    }}
                  />
                )}
              </div>

              {/* Botão de aceite */}
              <div className="px-5 py-4 border-t border-border shrink-0 space-y-2">
                <button
                  onClick={() => {
                    if (modalAberto === "termos") {
                      setConcordaTermos(true)
                      setTermosLidos(true)
                    } else {
                      setConcordaPolitica(true)
                      setPoliticaLida(true)
                    }
                    setModalAberto(null)
                    toast.success(modalAberto === "termos" ? "Termos de Uso aceitos!" : "Política de Privacidade aceita!")
                  }}
                  style={{ backgroundColor: "#F26E1D" }}
                  className="w-full h-11 rounded-xl text-white font-bold text-sm hover:opacity-90 transition-opacity flex items-center justify-center gap-2"
                >
                  <CheckCircle className="w-4 h-4" />
                  {modalAberto === "termos"
                    ? "Concordo com os Termos de Uso"
                    : "Concordo com a Política de Privacidade"
                  }
                </button>
                <button onClick={() => setModalAberto(null)}
                  className="w-full h-9 rounded-xl border border-border text-sm text-muted-foreground hover:bg-muted transition-all">
                  Fechar sem aceitar
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
    )} {/* fim !contaCriada */}
    </div>
  )
}
