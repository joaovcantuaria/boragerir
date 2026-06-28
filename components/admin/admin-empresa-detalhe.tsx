"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { format, parseISO } from "date-fns"
import { ArrowLeft, Building2, Mail, Phone, MapPin, CreditCard, MessageSquare, Plus, Send, Loader2 } from "lucide-react"
import { toast } from "sonner"
import { formatarCNPJ, formatarCPF, formatarTelefone, formatarMoeda } from "@/lib/utils"

interface Empresa {
  id: string; nome: string; email: string; telefone: string; area_atuacao: string
  plano: string; plano_ativo: boolean; tipo_documento: string; documento: string
  endereco_rua: string; endereco_numero: string; endereco_bairro: string
  endereco_cidade: string; endereco_estado: string; endereco_cep: string
  created_at: string; logo_url: string | null
}

export function AdminEmpresaDetalhe({ empresa, assinaturas, notas: notasInit, tickets }: {
  empresa: Empresa
  assinaturas: { id: string; plano: string; periodicidade: string; status: string; valor_total: number; forma_pagamento: string | null; created_at: string }[]
  notas: { id: string; nota: string; created_at: string }[]
  tickets: { id: string; assunto: string; status: string; mensagem: string; resposta_admin: string | null; created_at: string }[]
}) {
  const [notas, setNotas] = useState(notasInit)
  const [novaNota, setNovaNota] = useState("")
  const [planoSelecionado, setPlanoSelecionado] = useState(empresa.plano)
  const [loading, setLoading] = useState(false)
  const [emailAssunto, setEmailAssunto] = useState("")
  const [emailMensagem, setEmailMensagem] = useState("")
  const router = useRouter()

  const docFormatado = empresa.tipo_documento === "cnpj"
    ? formatarCNPJ(empresa.documento ?? "")
    : formatarCPF(empresa.documento ?? "")

  const badgeStatus: Record<string, string> = {
    ativa: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
    pendente: "bg-yellow-500/10 text-yellow-400 border-yellow-500/20",
    cancelada: "bg-red-500/10 text-red-400 border-red-500/20",
    pausada: "bg-gray-500/10 text-gray-400 border-gray-500/20",
  }

  async function salvarNota() {
    if (!novaNota.trim()) return
    const res = await fetch("/api/admin/notas", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ empresa_id: empresa.id, nota: novaNota }),
    })
    if (res.ok) {
      const data = await res.json()
      setNotas((prev) => [data, ...prev])
      setNovaNota("")
      toast.success("Nota salva!")
    }
  }

  async function salvarPlano() {
    setLoading(true)
    const res = await fetch("/api/admin/empresas/alterar-plano", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ empresa_id: empresa.id, plano: planoSelecionado }),
    })
    if (res.ok) toast.success("Plano alterado!")
    else toast.error("Erro ao alterar plano.")
    setLoading(false)
  }

  async function enviarEmail() {
    if (!emailAssunto || !emailMensagem) { toast.error("Preencha assunto e mensagem."); return }
    setLoading(true)
    const res = await fetch("/api/admin/suporte/enviar-email", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ empresa_id: empresa.id, email: empresa.email, assunto: emailAssunto, mensagem: emailMensagem }),
    })
    if (res.ok) {
      toast.success("E-mail enviado!")
      setEmailAssunto(""); setEmailMensagem("")
    } else toast.error("Erro ao enviar e-mail.")
    setLoading(false)
  }

  return (
    <div className="space-y-6 max-w-5xl">
      {/* Header */}
      <div className="flex items-center gap-3">
        <button onClick={() => router.back()} className="p-2 hover:bg-gray-50 dark:hover:bg-white/5 rounded-xl transition-colors text-gray-400 dark:text-white/40 hover:text-gray-900 dark:hover:text-white">
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-primary/20 flex items-center justify-center overflow-hidden shrink-0">
            {empresa.logo_url
              ? <img src={empresa.logo_url} alt="" className="w-full h-full object-cover" />
              : <span className="text-lg font-black text-primary">{empresa.nome.charAt(0)}</span>}
          </div>
          <div>
            <h1 className="text-xl font-black text-gray-900 dark:text-white">{empresa.nome}</h1>
            <p className="text-gray-400 dark:text-white/40 text-sm">{empresa.area_atuacao} · cadastro em {format(parseISO(empresa.created_at), "dd/MM/yyyy")}</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Dados da empresa */}
        <div className="lg:col-span-2 space-y-4">
          <div className="bg-white dark:bg-[#1a1a1a] border border-gray-100 dark:border-white/10 rounded-2xl p-5">
            <h3 className="text-sm font-bold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
              <Building2 className="w-4 h-4 text-primary" />Dados da empresa
            </h3>
            <div className="grid grid-cols-2 gap-3 text-sm">
              {[
                { label: "Documento", valor: docFormatado },
                { label: "E-mail", valor: empresa.email },
                { label: "Telefone", valor: formatarTelefone(empresa.telefone) },
                { label: "Endereço", valor: `${empresa.endereco_rua}, ${empresa.endereco_numero} — ${empresa.endereco_bairro}` },
                { label: "Cidade/Estado", valor: `${empresa.endereco_cidade}/${empresa.endereco_estado}` },
                { label: "CEP", valor: empresa.endereco_cep },
              ].map((f) => (
                <div key={f.label}>
                  <p className="text-gray-300 dark:text-white/30 text-xs">{f.label}</p>
                  <p className="text-gray-900 dark:text-white font-medium">{f.valor}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Assinaturas */}
          <div className="bg-white dark:bg-[#1a1a1a] border border-gray-100 dark:border-white/10 rounded-2xl p-5">
            <h3 className="text-sm font-bold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
              <CreditCard className="w-4 h-4 text-primary" />Assinaturas
            </h3>
            {assinaturas.length > 0 ? (
              <div className="space-y-2">
                {assinaturas.map((a) => (
                  <div key={a.id} className="flex items-center justify-between py-2 border-b border-gray-50 dark:border-white/5 last:border-0">
                    <div>
                      <p className="text-sm font-semibold text-gray-900 dark:text-white capitalize">{a.plano} — {a.periodicidade}</p>
                      <p className="text-xs text-gray-400 dark:text-white/40">{a.forma_pagamento ?? "—"} · {format(parseISO(a.created_at), "dd/MM/yyyy")}</p>
                    </div>
                    <div className="text-right">
                      <span className={`text-xs px-2 py-0.5 rounded-full border ${badgeStatus[a.status] ?? ""}`}>{a.status}</span>
                      <p className="text-sm font-bold text-emerald-400 mt-1">{formatarMoeda(a.valor_total)}</p>
                    </div>
                  </div>
                ))}
              </div>
            ) : <p className="text-gray-300 dark:text-white/30 text-sm">Nenhuma assinatura.</p>}
          </div>

          {/* Enviar e-mail */}
          <div className="bg-white dark:bg-[#1a1a1a] border border-gray-100 dark:border-white/10 rounded-2xl p-5">
            <h3 className="text-sm font-bold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
              <Mail className="w-4 h-4 text-primary" />Enviar e-mail para {empresa.email}
            </h3>
            <div className="space-y-3">
              <input value={emailAssunto} onChange={(e) => setEmailAssunto(e.target.value)}
                placeholder="Assunto"
                className="w-full bg-gray-50 dark:bg-[#1a1a1a] border border-gray-200 dark:border-white/10 rounded-xl px-3 py-2.5 text-sm text-gray-900 dark:text-white placeholder:text-gray-400 dark:placeholder:text-white/30 focus:outline-none focus:border-[#F26E1D]" />
              <textarea value={emailMensagem} onChange={(e) => setEmailMensagem(e.target.value)}
                placeholder="Mensagem..."
                rows={4}
                className="w-full bg-gray-50 dark:bg-[#1a1a1a] border border-gray-200 dark:border-white/10 rounded-xl px-3 py-2.5 text-sm text-gray-900 dark:text-white placeholder:text-gray-400 dark:placeholder:text-white/30 focus:outline-none focus:border-[#F26E1D] resize-none" />
              <button onClick={enviarEmail} disabled={loading}
                className="flex items-center gap-2 bg-primary text-white px-4 py-2.5 rounded-xl font-bold text-sm hover:bg-primary/90 transition-colors disabled:opacity-50">
                {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                Enviar e-mail
              </button>
            </div>
          </div>
        </div>

        {/* Coluna direita */}
        <div className="space-y-4">
          {/* Alterar plano */}
          <div className="bg-white dark:bg-[#1a1a1a] border border-gray-100 dark:border-white/10 rounded-2xl p-5">
            <h3 className="text-sm font-bold text-gray-900 dark:text-white mb-3">Gerenciar plano</h3>
            <p className="text-xs text-gray-400 dark:text-white/40 mb-2">Plano atual: <strong className="text-gray-900 dark:text-white">{empresa.plano}</strong></p>
            <select value={planoSelecionado} onChange={(e) => setPlanoSelecionado(e.target.value)}
              className="w-full bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-xl px-3 py-2.5 text-sm text-gray-900 dark:text-white focus:outline-none focus:border-primary mb-3">
              <option value="gratuito">Gratuito</option>
              <option value="basico">Básico</option>
              <option value="profissional">Profissional</option>
            </select>
            <button onClick={salvarPlano} disabled={loading || planoSelecionado === empresa.plano}
              className="w-full bg-primary text-white py-2.5 rounded-xl font-bold text-sm hover:bg-primary/90 transition-colors disabled:opacity-40">
              Salvar plano
            </button>
          </div>

          {/* Notas internas */}
          <div className="bg-white dark:bg-[#1a1a1a] border border-gray-100 dark:border-white/10 rounded-2xl p-5">
            <h3 className="text-sm font-bold text-gray-900 dark:text-white mb-3 flex items-center gap-2">
              <MessageSquare className="w-4 h-4 text-primary" />Notas internas
            </h3>
            <div className="flex gap-2 mb-3">
              <input value={novaNota} onChange={(e) => setNovaNota(e.target.value)}
                placeholder="Adicionar nota..."
                onKeyDown={(e) => e.key === "Enter" && salvarNota()}
                className="flex-1 bg-gray-50 dark:bg-[#1a1a1a] border border-gray-200 dark:border-white/10 rounded-xl px-3 py-2 text-sm text-gray-900 dark:text-white placeholder:text-gray-400 dark:placeholder:text-white/30 focus:outline-none focus:border-[#F26E1D]" />
              <button onClick={salvarNota}
                className="p-2 bg-primary rounded-xl hover:bg-primary/90 transition-colors">
                <Plus className="w-4 h-4 text-white" />
              </button>
            </div>
            <div className="space-y-2 max-h-60 overflow-y-auto">
              {notas.map((n) => (
                <div key={n.id} className="bg-gray-50 dark:bg-white/5 rounded-xl p-3">
                  <p className="text-sm text-gray-700 dark:text-white/80">{n.nota}</p>
                  <p className="text-xs text-gray-300 dark:text-white/30 mt-1">{format(parseISO(n.created_at), "dd/MM/yyyy HH:mm")}</p>
                </div>
              ))}
              {notas.length === 0 && <p className="text-gray-300 dark:text-white/30 text-xs text-center py-2">Sem notas</p>}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
