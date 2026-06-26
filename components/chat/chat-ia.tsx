"use client"

import { useState, useRef, useEffect } from "react"
import { motion, AnimatePresence } from "framer-motion"
import {
  MessageCircle, X, Send, Loader2, Bot, User,
  HeadphonesIcon, ChevronDown
} from "lucide-react"
import { toast } from "sonner"
import { createClient } from "@/lib/supabase/client"
import { cn } from "@/lib/utils"

interface Mensagem {
  role: "user" | "assistant"
  conteudo: string
  abrir_ticket?: boolean
}

const sugestoesIniciais = [
  "Como cadastrar um novo cliente?",
  "Como abrir o caixa?",
  "Como criar um agendamento?",
  "Como gerar um recibo em PDF?",
]

export function ChatIA() {
  const [aberto, setAberto] = useState(false)
  const [mensagens, setMensagens] = useState<Mensagem[]>([])
  const [input, setInput] = useState("")
  const [loading, setLoading] = useState(false)
  const [empresaId, setEmpresaId] = useState<string | null>(null)
  const bottomRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    const supabase = createClient()
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (user) {
        supabase.from("empresas").select("id").eq("user_id", user.id).single()
          .then(({ data }) => setEmpresaId(data?.id ?? null))
      }
    })
  }, [])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [mensagens])

  useEffect(() => {
    if (aberto && mensagens.length === 0) {
      setMensagens([{
        role: "assistant",
        conteudo: "Olá! 👋 Sou o assistente do **Bora Gerir**. Posso te ajudar com dúvidas sobre o sistema.\n\nO que você precisa hoje?",
      }])
    }
    if (aberto) setTimeout(() => inputRef.current?.focus(), 300)
  }, [aberto])

  async function enviar(texto?: string) {
    const msg = texto ?? input.trim()
    if (!msg || loading) return

    const novaMensagem: Mensagem = { role: "user", conteudo: msg }
    setMensagens((prev) => [...prev, novaMensagem])
    setInput("")
    setLoading(true)

    try {
      const historico = mensagens.map((m) => ({ role: m.role, content: m.conteudo }))
      const res = await fetch("/api/chat-ia", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mensagem: msg, historico }),
      })
      const data = await res.json()
      setMensagens((prev) => [...prev, {
        role: "assistant",
        conteudo: data.resposta,
        abrir_ticket: data.abrir_ticket,
      }])
    } catch {
      setMensagens((prev) => [...prev, {
        role: "assistant",
        conteudo: "Ocorreu um erro. Tente novamente.",
        abrir_ticket: true,
      }])
    }
    setLoading(false)
  }

  async function abrirTicket() {
    toast.info("Redirecionando para o suporte...")
    // Abrir modal de ticket ou redirecionar
    window.location.href = "/configuracoes?aba=suporte"
  }

  function renderMensagem(texto: string) {
    // Renderiza **negrito** e quebras de linha
    return texto.split("\n").map((linha, i) => (
      <span key={i}>
        {linha.split(/(\*\*[^*]+\*\*)/).map((parte, j) =>
          parte.startsWith("**") && parte.endsWith("**")
            ? <strong key={j}>{parte.slice(2, -2)}</strong>
            : parte
        )}
        {i < texto.split("\n").length - 1 && <br />}
      </span>
    ))
  }

  return (
    <>
      {/* Botão flutuante */}
      <div className="fixed bottom-20 md:bottom-6 right-4 z-40">
        <AnimatePresence>
          {!aberto && (
            <motion.button
              initial={{ scale: 0, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0, opacity: 0 }}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => setAberto(true)}
              className="w-14 h-14 rounded-full bg-[#F26E1D] text-white shadow-orange flex items-center justify-center relative"
            >
              <MessageCircle className="w-6 h-6" />
              {/* Badge de "novo" */}
              <span className="absolute -top-1 -right-1 w-4 h-4 bg-emerald-500 rounded-full border-2 border-background" />
            </motion.button>
          )}
        </AnimatePresence>

        {/* Janela do chat */}
        <AnimatePresence>
          {aberto && (
            <motion.div
              initial={{ opacity: 0, y: 20, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 20, scale: 0.95 }}
              transition={{ duration: 0.2 }}
              className={cn(
                "absolute bottom-0 right-0 w-[340px] sm:w-[380px] rounded-2xl shadow-2xl overflow-hidden",
                "border border-border bg-card"
              )}
            >
              {/* Header */}
              <div className="flex items-center justify-between px-4 py-3 bg-[#F26E1D]">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center">
                    <Bot className="w-4 h-4 text-white" />
                  </div>
                  <div>
                    <p className="text-sm font-bold text-white">Assistente Bora Gerir</p>
                    <div className="flex items-center gap-1">
                      <div className="w-1.5 h-1.5 rounded-full bg-emerald-300 animate-pulse" />
                      <p className="text-[10px] text-white/80">Online agora</p>
                    </div>
                  </div>
                </div>
                <button onClick={() => setAberto(false)}
                  className="text-white/70 hover:text-white transition-colors">
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Mensagens */}
              <div className="h-72 overflow-y-auto px-3 py-3 space-y-3">
                {mensagens.map((msg, i) => (
                  <div key={i} className={cn("flex gap-2", msg.role === "user" ? "flex-row-reverse" : "flex-row")}>
                    <div className={cn(
                      "w-7 h-7 rounded-full flex items-center justify-center shrink-0 mt-0.5",
                      msg.role === "user"
                        ? "bg-[#F26E1D]/10"
                        : "bg-[#F26E1D]"
                    )}>
                      {msg.role === "user"
                        ? <User className="w-3.5 h-3.5 text-[#F26E1D]" />
                        : <Bot className="w-3.5 h-3.5 text-white" />
                      }
                    </div>
                    <div className={cn(
                      "max-w-[80%] rounded-2xl px-3 py-2 text-sm",
                      msg.role === "user"
                        ? "bg-[#F26E1D] text-white rounded-tr-sm"
                        : "bg-muted text-foreground rounded-tl-sm"
                    )}>
                      {renderMensagem(msg.conteudo)}
                      {msg.abrir_ticket && msg.role === "assistant" && (
                        <button
                          onClick={abrirTicket}
                          className="mt-2 flex items-center gap-1.5 text-xs font-semibold text-[#F26E1D] bg-[#F26E1D]/10 px-2 py-1 rounded-lg hover:bg-[#F26E1D]/20 transition-colors"
                        >
                          <HeadphonesIcon className="w-3 h-3" />
                          Falar com suporte
                        </button>
                      )}
                    </div>
                  </div>
                ))}

                {loading && (
                  <div className="flex gap-2">
                    <div className="w-7 h-7 rounded-full bg-[#F26E1D] flex items-center justify-center shrink-0">
                      <Bot className="w-3.5 h-3.5 text-white" />
                    </div>
                    <div className="bg-muted rounded-2xl rounded-tl-sm px-3 py-2">
                      <div className="flex gap-1 items-center h-5">
                        {[0, 1, 2].map((i) => (
                          <motion.div key={i} className="w-1.5 h-1.5 rounded-full bg-muted-foreground"
                            animate={{ y: [0, -4, 0] }}
                            transition={{ delay: i * 0.15, repeat: Infinity, duration: 0.6 }} />
                        ))}
                      </div>
                    </div>
                  </div>
                )}

                {/* Sugestões iniciais */}
                {mensagens.length === 1 && !loading && (
                  <div className="flex flex-col gap-1.5 mt-1">
                    {sugestoesIniciais.map((s) => (
                      <button key={s} onClick={() => enviar(s)}
                        className="text-left text-xs px-3 py-2 rounded-xl border border-border hover:border-[#F26E1D]/40 hover:bg-[#F26E1D]/5 transition-colors text-muted-foreground">
                        {s}
                      </button>
                    ))}
                  </div>
                )}

                <div ref={bottomRef} />
              </div>

              {/* Input */}
              <div className="px-3 pb-3">
                <div className={cn(
                  "flex items-center gap-2 rounded-xl border px-3 py-2",
                  "bg-background border-border",
                  "focus-within:border-[#F26E1D]/60"
                )}>
                  <input
                    ref={inputRef}
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && enviar()}
                    placeholder="Digite sua dúvida..."
                    className="flex-1 bg-transparent text-sm text-foreground placeholder:text-muted-foreground focus:outline-none"
                    disabled={loading}
                  />
                  <button
                    onClick={() => enviar()}
                    disabled={!input.trim() || loading}
                    className="w-7 h-7 rounded-lg bg-[#F26E1D] flex items-center justify-center disabled:opacity-40 transition-opacity"
                  >
                    {loading
                      ? <Loader2 className="w-3.5 h-3.5 text-white animate-spin" />
                      : <Send className="w-3.5 h-3.5 text-white" />
                    }
                  </button>
                </div>
                <p className="text-[10px] text-muted-foreground text-center mt-1.5">
                  Powered by IA · Bora Gerir
                </p>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </>
  )
}
