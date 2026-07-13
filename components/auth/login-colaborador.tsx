"use client"

import { useState, useEffect, useRef } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { User, Lock, Loader2, Eye, EyeOff, ArrowLeft, Shield } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { LogoIcon } from "@/components/ui/logo"

interface Funcionario {
  id: string
  nome: string
  cargo: string
  usuario: string | null
  perfil: string
}

interface LoginColaboradorProps {
  empresaNome: string
  empresaLogoUrl?: string | null
  funcionarios: Funcionario[]
  onLogin: (usuario: string, senha: string) => Promise<{ sucesso: boolean; erro?: string }>
  onLoginAdmin: () => void
}

export function LoginColaborador({
  empresaNome,
  empresaLogoUrl,
  funcionarios,
  onLogin,
  onLoginAdmin,
}: LoginColaboradorProps) {
  const [etapa, setEtapa] = useState<"selecao" | "senha">("selecao")
  const [selecionado, setSelecionado] = useState<Funcionario | null>(null)
  const [senha, setSenha] = useState("")
  const [mostrarSenha, setMostrarSenha] = useState(false)
  const [loading, setLoading] = useState(false)
  const [erro, setErro] = useState("")
  const inputRef = useRef<HTMLInputElement>(null)

  // Filtrar apenas funcionários com login configurado
  const comLogin = funcionarios.filter((f) => f.usuario)

  useEffect(() => {
    if (etapa === "senha") {
      setTimeout(() => inputRef.current?.focus(), 300)
    }
  }, [etapa])

  async function handleLogin() {
    if (!selecionado?.usuario || !senha) return
    setLoading(true)
    setErro("")

    const result = await onLogin(selecionado.usuario, senha)

    if (!result.sucesso) {
      setErro(result.erro || "Senha incorreta")
      setSenha("")
      setTimeout(() => inputRef.current?.focus(), 100)
    }
    setLoading(false)
  }

  function selecionarColaborador(func: Funcionario) {
    setSelecionado(func)
    setSenha("")
    setErro("")
    setEtapa("senha")
  }

  function voltar() {
    setEtapa("selecao")
    setSelecionado(null)
    setSenha("")
    setErro("")
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-gradient-to-br from-zinc-900 via-zinc-900 to-zinc-950">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="w-full max-w-md mx-4"
      >
        {/* Logo e empresa */}
        <div className="text-center mb-8">
          <div className="flex justify-center mb-3">
            {empresaLogoUrl ? (
              <img src={empresaLogoUrl} alt={empresaNome} className="w-14 h-14 rounded-2xl object-cover" />
            ) : (
              <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-orange-500 to-orange-600 flex items-center justify-center">
                <LogoIcon size={28} />
              </div>
            )}
          </div>
          <h1 className="text-xl font-bold text-white">{empresaNome}</h1>
          <p className="text-sm text-zinc-400 mt-1">Quem está usando?</p>
        </div>

        <AnimatePresence mode="wait">
          {/* ─── ETAPA: Seleção de colaborador ─── */}
          {etapa === "selecao" && (
            <motion.div
              key="selecao"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="space-y-2"
            >
              {/* Botão Admin/Dono */}
              <button
                onClick={onLoginAdmin}
                className="w-full flex items-center gap-3 p-4 rounded-xl bg-orange-500/10 border border-orange-500/30 hover:bg-orange-500/20 transition-all group"
              >
                <div className="w-11 h-11 rounded-full bg-orange-500/20 flex items-center justify-center shrink-0">
                  <Shield className="w-5 h-5 text-orange-400" />
                </div>
                <div className="text-left flex-1">
                  <p className="text-sm font-semibold text-orange-300">Administrador</p>
                  <p className="text-xs text-orange-400/70">Acesso total ao sistema</p>
                </div>
              </button>

              {/* Separador */}
              {comLogin.length > 0 && (
                <div className="flex items-center gap-3 py-2">
                  <div className="flex-1 h-px bg-zinc-700" />
                  <span className="text-[10px] text-zinc-500 uppercase tracking-wider">Colaboradores</span>
                  <div className="flex-1 h-px bg-zinc-700" />
                </div>
              )}

              {/* Lista de colaboradores */}
              <div className="space-y-1.5 max-h-[50vh] overflow-y-auto">
                {comLogin.map((func) => (
                  <button
                    key={func.id}
                    onClick={() => selecionarColaborador(func)}
                    className="w-full flex items-center gap-3 p-3.5 rounded-xl bg-zinc-800/50 border border-zinc-700/50 hover:bg-zinc-800 hover:border-zinc-600 transition-all"
                  >
                    <div className="w-10 h-10 rounded-full bg-zinc-700 flex items-center justify-center shrink-0">
                      <User className="w-4.5 h-4.5 text-zinc-300" />
                    </div>
                    <div className="text-left flex-1 min-w-0">
                      <p className="text-sm font-medium text-white truncate">{func.nome}</p>
                      <p className="text-xs text-zinc-400">{func.cargo}</p>
                    </div>
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-zinc-700 text-zinc-400 shrink-0">
                      {func.perfil === "gerente" ? "Gerente" : "Colaborador"}
                    </span>
                  </button>
                ))}
              </div>

              {comLogin.length === 0 && (
                <div className="text-center py-8">
                  <p className="text-sm text-zinc-400">Nenhum colaborador com login configurado</p>
                  <p className="text-xs text-zinc-500 mt-1">Configure logins em Configurações → Colaboradores</p>
                </div>
              )}
            </motion.div>
          )}

          {/* ─── ETAPA: Digitar senha ─── */}
          {etapa === "senha" && selecionado && (
            <motion.div
              key="senha"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
              className="space-y-4"
            >
              <button
                onClick={voltar}
                className="flex items-center gap-1.5 text-xs text-zinc-400 hover:text-white transition-colors"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                Voltar
              </button>

              {/* Avatar e nome */}
              <div className="text-center py-2">
                <div className="w-16 h-16 rounded-full bg-zinc-700 flex items-center justify-center mx-auto mb-3">
                  <User className="w-7 h-7 text-zinc-300" />
                </div>
                <p className="text-lg font-semibold text-white">{selecionado.nome}</p>
                <p className="text-xs text-zinc-400">{selecionado.cargo}</p>
              </div>

              {/* Campo de senha */}
              <div className="space-y-2">
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
                  <Input
                    ref={inputRef}
                    type={mostrarSenha ? "text" : "password"}
                    placeholder="Digite sua senha"
                    value={senha}
                    onChange={(e) => { setSenha(e.target.value); setErro("") }}
                    onKeyDown={(e) => { if (e.key === "Enter") handleLogin() }}
                    disabled={loading}
                    className="pl-10 pr-10 h-12 bg-zinc-800 border-zinc-700 text-white placeholder:text-zinc-500 focus:border-orange-500 focus:ring-orange-500/20"
                  />
                  <button
                    type="button"
                    onClick={() => setMostrarSenha(!mostrarSenha)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-zinc-300"
                  >
                    {mostrarSenha ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>

                {erro && (
                  <motion.p
                    initial={{ opacity: 0, y: -5 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="text-sm text-red-400 text-center"
                  >
                    {erro}
                  </motion.p>
                )}
              </div>

              <Button
                onClick={handleLogin}
                disabled={loading || !senha}
                className="w-full h-12 bg-orange-500 hover:bg-orange-600 text-white font-semibold text-sm"
              >
                {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : "Entrar"}
              </Button>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </div>
  )
}
