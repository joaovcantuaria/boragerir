"use client"

import { useState, useRef, useEffect } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { MessageCircle, X, Send, Loader2, Bot, User, HeadphonesIcon } from "lucide-react"
import { toast } from "sonner"
import { createClient } from "@/lib/supabase/client"

interface Mensagem {
  role: "user" | "assistant"
  conteudo: string
  abrir_ticket?: boolean
}

const sugestoes = [
  "Como abrir o caixa?",
  "Como cadastrar um cliente?",
  "Como criar um agendamento?",
  "Como gerar um recibo PDF?",
]

export function ChatIA() {
  const [aberto, setAberto] = useState(false)
  const [msgs, setMsgs] = useState<Mensagem[]>([])
  const [input, setInput] = useState("")
  const [loading, setLoading] = useState(false)
  const bottomRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [msgs])

  useEffect(() => {
    if (aberto && msgs.length === 0) {
      setMsgs([{
        role: "assistant",
        conteudo: "Olá! 👋 Sou o assistente do **Bora Gerir**.\n\nComo posso te ajudar hoje?",
      }])
    }
    if (aberto) setTimeout(() => inputRef.current?.focus(), 200)
  }, [aberto])

  async function enviar(texto?: string) {
    const msg = (texto ?? input).trim()
    if (!msg || loading) return
    setMsgs((p) => [...p, { role: "user", conteudo: msg }])
    setInput("")
    setLoading(true)
    try {
      const historico = msgs.map((m) => ({ role: m.role, content: m.conteudo }))
      const res = await fetch("/api/chat-ia", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mensagem: msg, historico }),
      })
      const data = await res.json()
      setMsgs((p) => [...p, { role: "assistant", conteudo: data.resposta, abrir_ticket: data.abrir_ticket }])
    } catch {
      setMsgs((p) => [...p, { role: "assistant", conteudo: "Erro de conexão. Tente novamente.", abrir_ticket: true }])
    }
    setLoading(false)
  }

  function renderTexto(texto: string) {
    return texto.split("\n").map((linha, i, arr) => (
      <span key={i}>
        {linha.split(/(\*\*[^*]+\*\*)/).map((p, j) =>
          p.startsWith("**") && p.endsWith("**")
            ? <strong key={j}>{p.slice(2, -2)}</strong>
            : p
        )}
        {i < arr.length - 1 && <br />}
      </span>
    ))
  }

  return (
    <div className="fixed bottom-20 md:bottom-6 right-4 z-[100]">
      {/* Janela do chat */}
      <AnimatePresence>
        {aberto && (
          <motion.div
            initial={{ opacity: 0, y: 16, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 16, scale: 0.95 }}
            transition={{ duration: 0.18 }}
            style={{
              position: "absolute",
              bottom: "64px",
              right: 0,
              width: "340px",
              borderRadius: "20px",
              overflow: "hidden",
              boxShadow: "0 20px 60px rgba(0,0,0,0.25)",
              border: "1px solid rgba(0,0,0,0.08)",
            }}
          >
            {/* Header */}
            <div style={{ background: "#F26E1D", padding: "12px 16px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                <div style={{ width: 32, height: 32, borderRadius: "50%", background: "rgba(255,255,255,0.2)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                  <Bot size={16} color="white" />
                </div>
                <div>
                  <p style={{ margin: 0, fontSize: 13, fontWeight: 700, color: "white" }}>Assistente Bora Gerir</p>
                  <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
                    <div style={{ width: 6, height: 6, borderRadius: "50%", background: "#4ade80" }} />
                    <p style={{ margin: 0, fontSize: 10, color: "rgba(255,255,255,0.8)" }}>Online</p>
                  </div>
                </div>
              </div>
              <button onClick={() => setAberto(false)} style={{ background: "none", border: "none", cursor: "pointer", color: "rgba(255,255,255,0.8)", padding: 4 }}>
                <X size={18} />
              </button>
            </div>

            {/* Mensagens */}
            <div style={{
              background: "#f9f9f9",
              height: 280,
              overflowY: "auto",
              padding: "12px",
              display: "flex",
              flexDirection: "column",
              gap: 8,
            }}>
              {msgs.map((msg, i) => (
                <div key={i} style={{ display: "flex", gap: 8, flexDirection: msg.role === "user" ? "row-reverse" : "row" }}>
                  <div style={{
                    width: 28, height: 28, borderRadius: "50%", flexShrink: 0, marginTop: 2,
                    background: msg.role === "user" ? "#F26E1D" : "#1a1a1a",
                    display: "flex", alignItems: "center", justifyContent: "center",
                  }}>
                    {msg.role === "user"
                      ? <User size={13} color="white" />
                      : <Bot size={13} color="white" />
                    }
                  </div>
                  <div style={{
                    maxWidth: "78%",
                    background: msg.role === "user" ? "#F26E1D" : "white",
                    color: msg.role === "user" ? "white" : "#1a1a1a",
                    borderRadius: msg.role === "user" ? "16px 4px 16px 16px" : "4px 16px 16px 16px",
                    padding: "8px 12px",
                    fontSize: 13,
                    lineHeight: 1.5,
                    boxShadow: "0 1px 3px rgba(0,0,0,0.08)",
                  }}>
                    {renderTexto(msg.conteudo)}
                    {msg.abrir_ticket && msg.role === "assistant" && (
                      <button
                        onClick={() => { toast.info("Abrindo suporte..."); window.location.href = "/configuracoes" }}
                        style={{
                          marginTop: 8, display: "flex", alignItems: "center", gap: 6,
                          background: "rgba(242,110,29,0.1)", border: "none", borderRadius: 8,
                          color: "#F26E1D", fontSize: 11, fontWeight: 700, padding: "5px 8px",
                          cursor: "pointer", width: "100%",
                        }}>
                        <HeadphonesIcon size={12} />
                        Falar com suporte
                      </button>
                    )}
                  </div>
                </div>
              ))}

              {loading && (
                <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                  <div style={{ width: 28, height: 28, borderRadius: "50%", background: "#1a1a1a", display: "flex", alignItems: "center", justifyContent: "center" }}>
                    <Bot size={13} color="white" />
                  </div>
                  <div style={{ background: "white", borderRadius: "4px 16px 16px 16px", padding: "10px 14px", boxShadow: "0 1px 3px rgba(0,0,0,0.08)" }}>
                    <div style={{ display: "flex", gap: 4, alignItems: "center" }}>
                      {[0, 1, 2].map((i) => (
                        <motion.div key={i} style={{ width: 6, height: 6, borderRadius: "50%", background: "#ccc" }}
                          animate={{ y: [0, -4, 0] }}
                          transition={{ delay: i * 0.15, repeat: Infinity, duration: 0.6 }} />
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {/* Sugestões */}
              {msgs.length === 1 && !loading && (
                <div style={{ display: "flex", flexDirection: "column", gap: 4, marginTop: 4 }}>
                  {sugestoes.map((s) => (
                    <button key={s} onClick={() => enviar(s)} style={{
                      textAlign: "left", background: "white", border: "1px solid #e5e7eb",
                      borderRadius: 10, padding: "7px 12px", fontSize: 12, color: "#555",
                      cursor: "pointer", transition: "border-color 0.15s",
                    }}>
                      {s}
                    </button>
                  ))}
                </div>
              )}

              <div ref={bottomRef} />
            </div>

            {/* Input */}
            <div style={{ background: "white", padding: "10px 12px", borderTop: "1px solid #f0f0f0" }}>
              <div style={{
                display: "flex", alignItems: "center", gap: 8,
                background: "#f5f5f5", borderRadius: 12, padding: "6px 10px",
              }}>
                <input
                  ref={inputRef}
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && enviar()}
                  placeholder="Digite sua dúvida..."
                  disabled={loading}
                  style={{
                    flex: 1, background: "none", border: "none", outline: "none",
                    fontSize: 13, color: "#1a1a1a",
                  }}
                />
                <button onClick={() => enviar()} disabled={!input.trim() || loading}
                  style={{
                    width: 28, height: 28, borderRadius: 8, background: input.trim() ? "#F26E1D" : "#e5e7eb",
                    border: "none", cursor: input.trim() ? "pointer" : "default",
                    display: "flex", alignItems: "center", justifyContent: "center", transition: "background 0.15s",
                  }}>
                  {loading ? <Loader2 size={13} color="white" /> : <Send size={13} color="white" />}
                </button>
              </div>
              <p style={{ margin: "6px 0 0", textAlign: "center", fontSize: 10, color: "#bbb" }}>
                Powered by IA · Bora Gerir
              </p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Botão flutuante */}
      <AnimatePresence>
        {!aberto && (
          <motion.button
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            exit={{ scale: 0 }}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.92 }}
            onClick={() => setAberto(true)}
            style={{
              width: 52, height: 52, borderRadius: "50%",
              background: "#F26E1D", border: "none", cursor: "pointer",
              display: "flex", alignItems: "center", justifyContent: "center",
              boxShadow: "0 4px 20px rgba(242,110,29,0.4)",
              position: "relative",
            }}
          >
            <MessageCircle size={22} color="white" />
            <div style={{
              position: "absolute", top: -2, right: -2,
              width: 14, height: 14, borderRadius: "50%",
              background: "#22c55e", border: "2px solid white",
            }} />
          </motion.button>
        )}
      </AnimatePresence>
    </div>
  )
}
