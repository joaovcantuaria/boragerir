"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { format, parseISO } from "date-fns"
import { Search, Building2, Eye, Shield, ShieldOff } from "lucide-react"
import { toast } from "sonner"
import { formatarCNPJ, formatarCPF, formatarTelefone } from "@/lib/utils"

interface Empresa {
  id: string; nome: string; email: string; telefone: string; area_atuacao: string
  plano: string; plano_ativo: boolean; tipo_documento: string; documento: string
  created_at: string; logo_url: string | null
  assinaturas?: { status: string; plano: string; valor_total: number }[]
}

const badgePlano: Record<string, string> = {
  gratuito: "bg-gray-500/10 text-gray-400 border-gray-500/20",
  basico: "bg-blue-500/10 text-blue-400 border-blue-500/20",
  profissional: "bg-orange-500/10 text-orange-400 border-orange-500/20",
}

export function AdminEmpresasClient({ empresas: init }: { empresas: Empresa[] }) {
  const [empresas, setEmpresas] = useState(init)
  const [busca, setBusca] = useState("")
  const [filtroPlano, setFiltroPlano] = useState("todos")
  const router = useRouter()

  const filtradas = empresas.filter((e) => {
    const bate = e.nome.toLowerCase().includes(busca.toLowerCase()) ||
      e.email.toLowerCase().includes(busca.toLowerCase()) ||
      (e.documento ?? "").includes(busca)
    const planoBate = filtroPlano === "todos" || e.plano === filtroPlano
    return bate && planoBate
  })

  async function alterarPlano(id: string, novoPlano: string) {
    const res = await fetch("/api/admin/empresas/alterar-plano", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ empresa_id: id, plano: novoPlano }),
    })
    if (res.ok) {
      setEmpresas((prev) => prev.map((e) => e.id === id ? { ...e, plano: novoPlano } : e))
      toast.success("Plano alterado!")
    } else {
      toast.error("Erro ao alterar plano.")
    }
  }

  async function toggleAtivo(empresa: Empresa) {
    const res = await fetch("/api/admin/empresas/toggle-ativo", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ empresa_id: empresa.id, ativo: !empresa.plano_ativo }),
    })
    if (res.ok) {
      setEmpresas((prev) => prev.map((e) => e.id === empresa.id ? { ...e, plano_ativo: !e.plano_ativo } : e))
      toast.success(empresa.plano_ativo ? "Empresa desativada." : "Empresa reativada.")
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-black text-white">Empresas</h1>
        <p className="text-white/40 text-sm">{empresas.length} empresas cadastradas</p>
      </div>

      {/* Filtros */}
      <div className="flex gap-3 flex-wrap">
        <div className="relative flex-1 min-w-60">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/30" />
          <input
            className="w-full bg-[#1a1a1a] border border-white/10 rounded-xl pl-9 pr-4 py-2.5 text-sm text-white placeholder:text-white/30 focus:outline-none focus:border-primary"
            placeholder="Buscar por nome, e-mail ou documento..."
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
          />
        </div>
        <div className="flex gap-2">
          {["todos", "gratuito", "basico", "profissional"].map((p) => (
            <button key={p} onClick={() => setFiltroPlano(p)}
              className={`px-3 py-2 rounded-xl text-xs font-bold transition-all capitalize ${
                filtroPlano === p ? "bg-primary text-white" : "bg-white/5 text-white/50 hover:bg-white/10"
              }`}>
              {p}
            </button>
          ))}
        </div>
      </div>

      {/* Tabela */}
      <div className="bg-[#1a1a1a] border border-white/10 rounded-2xl overflow-hidden">
        <div className="grid grid-cols-[1fr_1fr_1fr_auto_auto] gap-4 px-5 py-3 border-b border-white/10 text-xs font-bold text-white/30 uppercase tracking-wider">
          <span>Empresa</span><span>Contato</span><span>Área</span><span>Plano</span><span>Ações</span>
        </div>

        {filtradas.length > 0 ? filtradas.map((e) => {
          const docFormatado = e.tipo_documento === "cnpj"
            ? formatarCNPJ(e.documento ?? "")
            : formatarCPF(e.documento ?? "")
          const assinaturaAtiva = e.assinaturas?.find((a) => a.status === "ativa")

          return (
            <div key={e.id} className="grid grid-cols-[1fr_1fr_1fr_auto_auto] gap-4 px-5 py-4 border-b border-white/5 last:border-0 hover:bg-white/[0.02] transition-colors items-center">
              {/* Empresa */}
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-9 h-9 rounded-xl bg-primary/20 flex items-center justify-center shrink-0 overflow-hidden">
                  {e.logo_url
                    ? <img src={e.logo_url} alt="" className="w-full h-full object-cover" />
                    : <span className="text-xs font-black text-primary">{e.nome.charAt(0)}</span>
                  }
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-white truncate">{e.nome}</p>
                  <p className="text-xs text-white/30">{docFormatado}</p>
                  <p className="text-xs text-white/20">{format(parseISO(e.created_at), "dd/MM/yyyy")}</p>
                </div>
              </div>

              {/* Contato */}
              <div className="min-w-0">
                <p className="text-xs text-white/60 truncate">{e.email}</p>
                <p className="text-xs text-white/30">{formatarTelefone(e.telefone)}</p>
              </div>

              {/* Área */}
              <p className="text-xs text-white/50 truncate">{e.area_atuacao}</p>

              {/* Plano */}
              <div className="flex flex-col gap-1">
                <span className={`text-xs px-2 py-0.5 rounded-full border capitalize ${badgePlano[e.plano] ?? ""}`}>
                  {e.plano}
                </span>
                {assinaturaAtiva && (
                  <span className="text-xs text-emerald-400">✓ ativa</span>
                )}
                {!e.plano_ativo && (
                  <span className="text-xs text-red-400">⛔ inativa</span>
                )}
              </div>

              {/* Ações */}
              <div className="flex items-center gap-1">
                <button
                  onClick={() => router.push(`/admin/empresas/${e.id}`)}
                  className="p-1.5 rounded-lg hover:bg-white/10 text-white/40 hover:text-white transition-colors"
                  title="Ver detalhes"
                >
                  <Eye className="w-3.5 h-3.5" />
                </button>
                <button
                  onClick={() => toggleAtivo(e)}
                  className={`p-1.5 rounded-lg hover:bg-white/10 transition-colors ${e.plano_ativo ? "text-emerald-400 hover:text-red-400" : "text-red-400 hover:text-emerald-400"}`}
                  title={e.plano_ativo ? "Desativar" : "Reativar"}
                >
                  {e.plano_ativo ? <Shield className="w-3.5 h-3.5" /> : <ShieldOff className="w-3.5 h-3.5" />}
                </button>
              </div>
            </div>
          )
        }) : (
          <div className="py-12 text-center text-white/30">
            <Building2 className="w-8 h-8 mx-auto mb-2 opacity-40" />
            <p>Nenhuma empresa encontrada</p>
          </div>
        )}
      </div>
    </div>
  )
}
