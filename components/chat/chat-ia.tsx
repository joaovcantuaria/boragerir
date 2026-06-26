"use client"

import { useState, useRef, useEffect } from "react"
import { motion, AnimatePresence } from "framer-motion"
import {
  MessageCircle, X, Send, Loader2, Bot, User,
  HeadphonesIcon, ChevronLeft, Clock, CheckCircle,
  AlertCircle, Plus, Hash
} from "lucide-react"
import { toast } from "sonner"
import { format, parseISO } from "date-fns"
import { ptBR } from "date-fns/locale"

interface Mensagem {
  role: "user" | "assistant"
  conteudo: string
  abrir_ticket?: boolean
  created_at?: string
}

interface Conversa {
  id: string
  protocolo: string
  titulo: string
  status: "aberto" | "resolvido" | "encaminhado"
  created_at: string
  updated_at: string
}

const sugestoes = [
  "Como abrir o caixa?",
  "Como cadastrar um cliente?",
  "Como criar um agendamento?",
  "Como gerar um recibo em PDF?",
]

const corStatus: Record<string, string> = {
  aberto: "#f59e0b",
  resolvido: "#22c55e",
  encaminhado: "#3b82f6",
}

const labelStatus: Record<string, string> = {
  aberto: "Em aberto",
  resolvido: "Resolvido",
  encaminhado: "Encaminhado",
}

export function ChatIA() {
  const [aberto, setAberto] = useState(false)
  const [aba, setAba] = useState<"chat" | "historico">("chat")
  const [msgs, setMsgs] = useState<Mensagem[]>([])
  const [input, setInput] = useState("")
  const [loading, setLoading] = useState(false)
  const [conversaId, setConversaId] = useState<string | null>(null)
  const [protocolo, setProtocolo] = useState<string>("")
  const [nomeUsuario, setNomeUsuario] = useState("você")
  const [conversas, setConversas] = useState<Conversa[]>([])
  const [carregandoHistorico, setCarregandoHistorico] = useState(false)
  const bottomRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [msgs])

  useEffect(() => {
    if (aberto && msgs.length === 0 && !conversaId) {
      setMsgs([{
        role: "assistant",
        conteudo: "Oi! Eu sou a **Mel** 🌟, sua assistente do Bora Gerir!\n\nAdoro resolver problemas e estou aqui para te ajudar com qualquer dúvida sobre o sistema. Como posso te ajudar hoje?",
      }])
    }
    if (aberto) setTimeout(() => inputRef.current?.focus(), 200)
  }, [aberto])

  async function carregarHistorico() {
    setCarregandoHistorico(true)
    try {
      const res = await fetch("/api/chat-ia", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ acao: "listar_conversas" }),
      })
      const data = await res.json()
      if (Array.isArray(data)) setConversas(data)
    } catch {}
    setCarregandoHistorico(false)
  }

  async function abrirConversa(conversa: Conversa) {
    setCarregandoHistorico(true)
    try {
      const res = await fetch("/api/chat-ia", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ acao: "carregar_conversa", conversa_id: conversa.id }),
      })
      const data = await res.json()
      if (Array.isArray(data)) {
        setMsgs(data.map((m: { role: "user" | "assistant"; conteudo: string; created_at: string }) => ({
          role: m.role,
          conteudo: m.conteudo,
          created_at: m.created_at,
        })))
        setConversaId(conversa.id)
        setProtocolo(conversa.protocolo)
        setAba("chat")
      }
    } catch {}
    setCarregandoHistorico(false)
  }

  function novaConversa() {
    setMsgs([{
      role: "assistant",
      conteudo: "Nova conversa iniciada! 😊 Como posso te ajudar?",
    }])
    setConversaId(null)
    setProtocolo("")
    setAba("chat")
  }

  async function fecharConversa() {
    if (!conversaId) return
    await fetch("/api/chat-ia", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ acao: "fechar_conversa", conversa_id: conversaId }),
    })
    toast.success(`Atendimento ${protocolo} encerrado!`)
    novaConversa()
  }

  async function enviar(texto?: string) {
    const msg = (texto ?? input).trim()
    if (!msg || loading) return

    setMsgs((p) => [...p, { role: "user", conteudo: msg }])
    setInput("")
    setLoading(true)

    try {
      const res = await fetch("/api/chat-ia", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mensagem: msg, conversa_id: conversaId }),
      })
      const data = await res.json()

      if (data.conversa_id && !conversaId) {
        setConversaId(data.conversa_id)
        setProtocolo(data.protocolo ?? "")
      }
      if (data.nome_usuario) setNomeUsuario(data.nome_usuario)

      setMsgs((p) => [...p, {
        role: "assistant",
        conteudo: data.resposta,
        abrir_ticket: data.abrir_ticket,
      }])
    } catch {
      setMsgs((p) => [...p, {
        role: "assistant",
        conteudo: "Ops! Tive um probleminha. Tenta de novo? 😅",
        abrir_ticket: true,
      }])
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

  // Estilos base do container flutuante
  const containerStyle: React.CSSProperties = {
    position: "absolute",
    bottom: "64px",
    right: 0,
    width: "360px",
    maxHeight: "580px",
    borderRadius: "20px",
    overflow: "hidden",
    boxShadow: "0 20px 60px rgba(0,0,0,0.2), 0 0 0 1px rgba(0,0,0,0.06)",
    display: "flex",
    flexDirection: "column",
    backgroundColor: "#ffffff",
  }

  return (
    <div style={{ position: "fixed", bottom: "80px", right: "16px", zIndex: 9999 }}
      className="md:bottom-6">
      {/* Janela da Mel */}
      <AnimatePresence>
        {aberto && (
          <motion.div
            initial={{ opacity: 0, y: 16, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 16, scale: 0.95 }}
            transition={{ duration: 0.18 }}
            style={containerStyle}
          >
            {/* ── HEADER ── */}
            <div style={{ background: "linear-gradient(135deg, #F26E1D, #e05e10)", padding: "14px 16px", flexShrink: 0 }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  {/* Avatar da Mel */}
                  <div style={{
                    width: 38, height: 38, borderRadius: "50%",
                    background: "rgba(255,255,255,0.25)",
                    display: "flex", alignItems: "center", justifyContent: "center",
                    fontSize: 20,
                  }}>
                    🌟
                  </div>
                  <div>
                    <p style={{ margin: 0, fontSize: 14, fontWeight: 800, color: "white" }}>Mel — Assistente IA</p>
                    <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
                      <div style={{ width: 6, height: 6, borderRadius: "50%", background: "#4ade80", animation: "pulse 2s infinite" }} />
                      <p style={{ margin: 0, fontSize: 10, color: "rgba(255,255,255,0.85)" }}>
                        Online · Bora Gerir
                      </p>
                    </div>
                  </div>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                  {/* Botão histórico */}
                  <button
                    onClick={() => { setAba(aba === "historico" ? "chat" : "historico"); if (aba === "chat") carregarHistorico() }}
                    title="Conversas anteriores"
                    style={{ background: "rgba(255,255,255,0.2)", border: "none", borderRadius: 8, width: 28, height: 28, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>
                    <Clock size={14} color="white" />
                  </button>
                  {/* Nova conversa */}
                  <button
                    onClick={novaConversa}
                    title="Nova conversa"
                    style={{ background: "rgba(255,255,255,0.2)", border: "none", borderRadius: 8, width: 28, height: 28, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>
                    <Plus size={14} color="white" />
                  </button>
                  <button onClick={() => setAberto(false)}
                    style={{ background: "none", border: "none", cursor: "pointer", color: "rgba(255,255,255,0.8)", padding: 2 }}>
                    <X size={18} />
                  </button>
                </div>
              </div>

              {/* Protocolo */}
              {protocolo && (
                <div style={{ marginTop: 8, display: "flex", alignItems: "center", gap: 6, background: "rgba(255,255,255,0.15)", borderRadius: 8, padding: "4px 8px" }}>
                  <Hash size={11} color="rgba(255,255,255,0.8)" />
                  <span style={{ fontSize: 11, color: "rgba(255,255,255,0.9)", fontWeight: 600 }}>
                    Protocolo: {protocolo}
                  </span>
                  {conversaId && (
                    <button onClick={fecharConversa}
                      style={{ marginLeft: "auto", background: "rgba(255,255,255,0.2)", border: "none", borderRadius: 6, padding: "2px 6px", fontSize: 10, color: "white", cursor: "pointer", fontWeight: 600 }}>
                      Encerrar
                    </button>
                  )}
                </div>
              )}
            </div>

            {/* ── ABAS ── */}
            <div style={{ display: "flex", borderBottom: "1px solid #f0f0f0", background: "white", flexShrink: 0 }}>
              {[
                { id: "chat", label: "💬 Chat" },
                { id: "historico", label: "📋 Conversas anteriores" },
              ].map((tab) => (
                <button key={tab.id}
                  onClick={() => { setAba(tab.id as "chat" | "historico"); if (tab.id === "historico") carregarHistorico() }}
                  style={{
                    flex: 1, padding: "9px 4px", border: "none", cursor: "pointer",
                    fontSize: 11, fontWeight: 600, background: "white",
                    borderBottom: aba === tab.id ? "2px solid #F26E1D" : "2px solid transparent",
                    color: aba === tab.id ? "#F26E1D" : "#999",
                    transition: "all 0.15s",
                  }}>
                  {tab.label}
                </button>
              ))}
            </div>

            {/* ── ABA: HISTÓRICO ── */}
            {aba === "historico" && (
              <div style={{ flex: 1, overflowY: "auto", background: "#fafafa", padding: 12 }}>
                {carregandoHistorico ? (
                  <div style={{ display: "flex", justifyContent: "center", padding: 24 }}>
                    <Loader2 size={20} color="#F26E1D" style={{ animation: "spin 1s linear infinite" }} />
                  </div>
                ) : conversas.length === 0 ? (
                  <div style={{ textAlign: "center", padding: "24px 12px", color: "#999" }}>
                    <MessageCircle size={32} style={{ margin: "0 auto 8px", opacity: 0.3 }} />
                    <p style={{ margin: 0, fontSize: 13 }}>Nenhuma conversa ainda</p>
                    <p style={{ margin: "4px 0 0", fontSize: 11 }}>Inicie uma conversa com a Mel!</p>
                  </div>
                ) : (
                  <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                    {conversas.map((c) => (
                      <button key={c.id} onClick={() => abrirConversa(c)}
                        style={{
                          textAlign: "left", background: "white", border: "1px solid #e5e7eb",
                          borderRadius: 12, padding: "10px 12px", cursor: "pointer",
                          transition: "border-color 0.15s", width: "100%",
                        }}>
                        <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 8 }}>
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <p style={{ margin: 0, fontSize: 12, fontWeight: 700, color: "#1a1a1a", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                              {c.titulo || "Conversa"}
                            </p>
                            <div style={{ display: "flex", alignItems: "center", gap: 6, marginTop: 4 }}>
                              <span style={{ fontSize: 10, color: "#999" }}>#{c.protocolo}</span>
                              <span style={{ fontSize: 10, color: "#bbb" }}>·</span>
                              <span style={{ fontSize: 10, color: "#999" }}>
                                {format(parseISO(c.updated_at), "dd/MM HH:mm", { locale: ptBR })}
                              </span>
                            </div>
                          </div>
                          <span style={{
                            fontSize: 10, fontWeight: 700, padding: "2px 7px", borderRadius: 20,
                            background: `${corStatus[c.status]}20`,
                            color: corStatus[c.status],
                            flexShrink: 0,
                          }}>
                            {labelStatus[c.status]}
                          </span>
                        </div>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* ── ABA: CHAT ── */}
            {aba === "chat" && (
              <>
                {/* Mensagens */}
                <div style={{
                  flex: 1, overflowY: "auto", background: "#f9f9f9",
                  padding: "12px", display: "flex", flexDirection: "column", gap: 8,
                  minHeight: 220,
                }}>
                  {msgs.map((msg, i) => (
                    <div key={i} style={{ display: "flex", gap: 8, flexDirection: msg.role === "user" ? "row-reverse" : "row", alignItems: "flex-end" }}>
                      {/* Avatar */}
                      <div style={{
                        width: 26, height: 26, borderRadius: "50%", flexShrink: 0,
                        background: msg.role === "user" ? "#F26E1D" : "#1a1a1a",
                        display: "flex", alignItems: "center", justifyContent: "center",
                        fontSize: msg.role === "assistant" ? 13 : 10,
                      }}>
                        {msg.role === "assistant" ? "🌟" : <User size={12} color="white" />}
                      </div>

                      {/* Balão */}
                      <div style={{
                        maxWidth: "76%",
                        background: msg.role === "user" ? "#F26E1D" : "white",
                        color: msg.role === "user" ? "white" : "#1a1a1a",
                        borderRadius: msg.role === "user" ? "16px 4px 16px 16px" : "4px 16px 16px 16px",
                        padding: "9px 12px",
                        fontSize: 13,
                        lineHeight: 1.55,
                        boxShadow: "0 1px 4px rgba(0,0,0,0.08)",
                      }}>
                        {renderTexto(msg.conteudo)}

                        {msg.abrir_ticket && msg.role === "assistant" && (
                          <button
                            onClick={() => { toast.info("Redirecionando para suporte..."); setAberto(false); window.location.href = "/configuracoes" }}
                            style={{
                              marginTop: 9, display: "flex", alignItems: "center", gap: 6,
                              background: "rgba(242,110,29,0.12)", border: "none",
                              borderRadius: 8, color: "#F26E1D", fontSize: 11.5,
                              fontWeight: 700, padding: "6px 10px", cursor: "pointer", width: "100%",
                            }}>
                            <HeadphonesIcon size={13} />
                            Falar com um atendente
                          </button>
                        )}
                      </div>
                    </div>
                  ))}

                  {loading && (
                    <div style={{ display: "flex", gap: 8, alignItems: "flex-end" }}>
                      <div style={{ width: 26, height: 26, borderRadius: "50%", background: "#1a1a1a", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 13 }}>🌟</div>
                      <div style={{ background: "white", borderRadius: "4px 16px 16px 16px", padding: "10px 14px", boxShadow: "0 1px 4px rgba(0,0,0,0.08)" }}>
                        <div style={{ display: "flex", gap: 4, alignItems: "center" }}>
                          {[0, 1, 2].map((idx) => (
                            <motion.div key={idx}
                              style={{ width: 6, height: 6, borderRadius: "50%", background: "#F26E1D" }}
                              animate={{ y: [0, -5, 0] }}
                              transition={{ delay: idx * 0.18, repeat: Infinity, duration: 0.7 }} />
                          ))}
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Sugestões iniciais */}
                  {msgs.length === 1 && !loading && (
                    <div style={{ display: "flex", flexDirection: "column", gap: 5, marginTop: 4 }}>
                      {sugestoes.map((s) => (
                        <button key={s} onClick={() => enviar(s)} style={{
                          textAlign: "left", background: "white",
                          border: "1px solid #e5e7eb", borderRadius: 10,
                          padding: "7px 12px", fontSize: 12, color: "#555",
                          cursor: "pointer",
                        }}>
                          {s}
                        </button>
                      ))}
                    </div>
                  )}

                  <div ref={bottomRef} />
                </div>

                {/* Input */}
                <div style={{ background: "white", padding: "10px 12px", borderTop: "1px solid #f0f0f0", flexShrink: 0 }}>
                  <div style={{
                    display: "flex", alignItems: "center", gap: 8,
                    background: "#f5f5f5", borderRadius: 12, padding: "7px 10px",
                  }}>
                    <input
                      ref={inputRef}
                      value={input}
                      onChange={(e) => setInput(e.target.value)}
                      onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && enviar()}
                      placeholder="Pergunte para a Mel..."
                      disabled={loading}
                      style={{ flex: 1, background: "none", border: "none", outline: "none", fontSize: 13, color: "#1a1a1a" }}
                    />
                    <button onClick={() => enviar()} disabled={!input.trim() || loading}
                      style={{
                        width: 30, height: 30, borderRadius: 9, border: "none",
                        background: input.trim() ? "#F26E1D" : "#e5e7eb",
                        cursor: input.trim() ? "pointer" : "default",
                        display: "flex", alignItems: "center", justifyContent: "center",
                        transition: "background 0.15s",
                      }}>
                      {loading ? <Loader2 size={13} color="white" /> : <Send size={13} color="white" />}
                    </button>
                  </div>
                  <p style={{ margin: "5px 0 0", textAlign: "center", fontSize: 10, color: "#ccc" }}>
                    Mel IA · Bora Gerir
                  </p>
                </div>
              </>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Botão flutuante */}
      <AnimatePresence>
        {!aberto && (
          <motion.button
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0, opacity: 0 }}
            whileHover={{ scale: 1.06 }}
            whileTap={{ scale: 0.92 }}
            onClick={() => setAberto(true)}
            style={{
              width: 52, height: 52, borderRadius: "50%",
              background: "linear-gradient(135deg, #F26E1D, #e05e10)",
              border: "none", cursor: "pointer",
              display: "flex", alignItems: "center", justifyContent: "center",
              boxShadow: "0 4px 20px rgba(242,110,29,0.45)",
              fontSize: 22, position: "relative",
            }}
            title="Falar com a Mel"
          >
            🌟
            <div style={{
              position: "absolute", top: -1, right: -1,
              width: 14, height: 14, borderRadius: "50%",
              background: "#22c55e", border: "2.5px solid white",
            }} />
          </motion.button>
        )}
      </AnimatePresence>
    </div>
  )
}
