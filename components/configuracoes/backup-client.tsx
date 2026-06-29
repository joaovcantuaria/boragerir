"use client"

import { useState, useRef } from "react"
import { Download, Upload, FileJson, FileSpreadsheet, AlertTriangle, CheckCircle, Loader2, Shield } from "lucide-react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"

interface Props {
  empresaNome: string
}

export function BackupClient({ empresaNome }: Props) {
  const [exportando, setExportando] = useState(false)
  const [importando, setImportando] = useState(false)
  const [resultadoImport, setResultadoImport] = useState<any>(null)
  const [confirmando, setConfirmando] = useState(false)
  const [arquivoSelecionado, setArquivoSelecionado] = useState<File | null>(null)
  const fileRef = useRef<HTMLInputElement>(null)

  // ── Exportar backup JSON ──────────────────────────────────
  async function exportarJSON() {
    setExportando(true)
    try {
      const res = await fetch("/api/empresa/backup")
      if (!res.ok) throw new Error("Erro ao gerar backup")
      const data = await res.json()

      const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" })
      const url = URL.createObjectURL(blob)
      const a = document.createElement("a")
      const data_hoje = new Date().toISOString().slice(0, 10)
      a.href = url
      a.download = `backup-boragerir-${empresaNome.replace(/\s+/g, "-").toLowerCase()}-${data_hoje}.json`
      a.click()
      URL.revokeObjectURL(url)
      toast.success("Backup exportado com sucesso!")
    } catch {
      toast.error("Erro ao exportar backup.")
    }
    setExportando(false)
  }

  // ── Exportar CSV de clientes ──────────────────────────────
  async function exportarCSV() {
    setExportando(true)
    try {
      const res = await fetch("/api/empresa/backup")
      if (!res.ok) throw new Error("Erro ao gerar backup")
      const data = await res.json()

      const clientes = data.dados.clientes ?? []
      const cabecalho = ["Nome", "CPF", "Email", "Telefone", "Data Nascimento", "Pontos Fidelidade", "Observações"]
      const linhas = clientes.map((c: any) => [
        c.nome_completo ?? "",
        c.cpf ?? "",
        c.email ?? "",
        c.telefone ?? "",
        c.data_nascimento ?? "",
        c.pontos_fidelidade ?? 0,
        c.observacoes ?? "",
      ])

      const csv = [cabecalho, ...linhas]
        .map(l => l.map((v: any) => `"${String(v).replace(/"/g, '""')}"`).join(","))
        .join("\n")

      const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" })
      const url = URL.createObjectURL(blob)
      const a = document.createElement("a")
      a.href = url
      a.download = `clientes-${empresaNome.replace(/\s+/g, "-").toLowerCase()}.csv`
      a.click()
      URL.revokeObjectURL(url)
      toast.success(`${clientes.length} clientes exportados em CSV!`)
    } catch {
      toast.error("Erro ao exportar CSV.")
    }
    setExportando(false)
  }

  // ── Exportar Excel (XLSX via CSV com BOM para Excel) ─────
  async function exportarExcel() {
    setExportando(true)
    try {
      const res = await fetch("/api/empresa/backup")
      if (!res.ok) throw new Error("Erro ao gerar backup")
      const data = await res.json()

      // Múltiplas abas simuladas como CSV separado por tab (abre em Excel)
      const clientes = data.dados.clientes ?? []
      const produtos = data.dados.produtos_servicos ?? []
      const agendamentos = data.dados.agendamentos ?? []
      const vendas = data.dados.vendas ?? []

      const gerarSheet = (cabecalho: string[], linhas: any[][]) =>
        [cabecalho, ...linhas].map(l => l.join("\t")).join("\n")

      const clientesSheet = gerarSheet(
        ["Nome", "CPF", "Email", "Telefone", "Pontos"],
        clientes.map((c: any) => [c.nome_completo, c.cpf, c.email ?? "", c.telefone, c.pontos_fidelidade])
      )

      const produtosSheet = gerarSheet(
        ["Nome", "Tipo", "Preço", "Estoque", "Ativo"],
        produtos.map((p: any) => [p.nome, p.tipo, p.preco, p.estoque_atual ?? "", p.ativo ? "Sim" : "Não"])
      )

      const agendamentosSheet = gerarSheet(
        ["Cliente", "Data/Hora", "Status", "Serviço", "Duração (min)"],
        agendamentos.map((a: any) => [
          a.nome_cliente_avulso ?? "",
          a.data_hora,
          a.status,
          a.servico_id ?? "",
          a.duracao_minutos,
        ])
      )

      const vendasSheet = gerarSheet(
        ["Número", "Total", "Forma Pagamento", "Status", "Data"],
        vendas.map((v: any) => [v.numero_venda, v.total, v.forma_pagamento, v.status, v.created_at?.slice(0, 10)])
      )

      const conteudo = [
        "=== CLIENTES ===", clientesSheet,
        "\n=== PRODUTOS / SERVIÇOS ===", produtosSheet,
        "\n=== AGENDAMENTOS ===", agendamentosSheet,
        "\n=== VENDAS ===", vendasSheet,
      ].join("\n")

      const blob = new Blob(["\uFEFF" + conteudo], { type: "text/tab-separated-values;charset=utf-8;" })
      const url = URL.createObjectURL(blob)
      const a = document.createElement("a")
      const data_hoje = new Date().toISOString().slice(0, 10)
      a.href = url
      a.download = `backup-${empresaNome.replace(/\s+/g, "-").toLowerCase()}-${data_hoje}.xls`
      a.click()
      URL.revokeObjectURL(url)
      toast.success("Arquivo Excel exportado!")
    } catch {
      toast.error("Erro ao exportar Excel.")
    }
    setExportando(false)
  }

  // ── Selecionar arquivo de import ─────────────────────────
  function handleArquivoSelecionado(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    if (!file.name.endsWith(".json")) {
      toast.error("Apenas arquivos .json são aceitos para importação.")
      return
    }
    setArquivoSelecionado(file)
    setConfirmando(true)
    setResultadoImport(null)
  }

  // ── Importar backup ───────────────────────────────────────
  async function importarBackup() {
    if (!arquivoSelecionado) return
    setImportando(true)
    setConfirmando(false)

    try {
      const texto = await arquivoSelecionado.text()
      let backup: any
      try { backup = JSON.parse(texto) } catch {
        toast.error("Arquivo JSON inválido ou corrompido.")
        setImportando(false)
        return
      }

      const res = await fetch("/api/empresa/importar", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(backup),
      })

      const data = await res.json()

      if (!res.ok) {
        toast.error(data.erro ?? "Erro ao importar backup.")
        setImportando(false)
        return
      }

      setResultadoImport(data)
      toast.success(`Backup importado! ${data.resumo.total_importados} registros restaurados.`)
    } catch {
      toast.error("Erro inesperado ao importar.")
    }

    setArquivoSelecionado(null)
    if (fileRef.current) fileRef.current.value = ""
    setImportando(false)
  }

  return (
    <div className="space-y-5">

      {/* Exportar */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center">
              <Download className="w-4.5 h-4.5 text-emerald-600 dark:text-emerald-400" />
            </div>
            <div>
              <CardTitle className="text-base">Exportar Backup</CardTitle>
              <CardDescription>Baixe todos os dados da sua empresa</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="rounded-xl bg-muted/60 p-4 text-sm text-muted-foreground space-y-1">
            <p>O backup inclui: <strong className="text-foreground">clientes, agendamentos, vendas, produtos, serviços, funcionários, orçamentos, caixas e configurações.</strong></p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {/* JSON */}
            <button
              onClick={exportarJSON}
              disabled={exportando}
              className="flex flex-col items-center gap-3 p-5 rounded-2xl border-2 border-border hover:border-emerald-500/50 hover:bg-emerald-50/50 dark:hover:bg-emerald-950/20 transition-all group"
            >
              <div className="w-12 h-12 rounded-xl bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center group-hover:scale-105 transition-transform">
                <FileJson className="w-6 h-6 text-emerald-600" />
              </div>
              <div className="text-center">
                <p className="font-bold text-sm">JSON</p>
                <p className="text-xs text-muted-foreground">Backup completo<br />reimportável</p>
              </div>
            </button>

            {/* CSV */}
            <button
              onClick={exportarCSV}
              disabled={exportando}
              className="flex flex-col items-center gap-3 p-5 rounded-2xl border-2 border-border hover:border-blue-500/50 hover:bg-blue-50/50 dark:hover:bg-blue-950/20 transition-all group"
            >
              <div className="w-12 h-12 rounded-xl bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center group-hover:scale-105 transition-transform">
                <FileSpreadsheet className="w-6 h-6 text-blue-600" />
              </div>
              <div className="text-center">
                <p className="font-bold text-sm">CSV</p>
                <p className="text-xs text-muted-foreground">Clientes<br />para outros sistemas</p>
              </div>
            </button>

            {/* Excel */}
            <button
              onClick={exportarExcel}
              disabled={exportando}
              className="flex flex-col items-center gap-3 p-5 rounded-2xl border-2 border-border hover:border-violet-500/50 hover:bg-violet-50/50 dark:hover:bg-violet-950/20 transition-all group"
            >
              <div className="w-12 h-12 rounded-xl bg-violet-100 dark:bg-violet-900/30 flex items-center justify-center group-hover:scale-105 transition-transform">
                <FileSpreadsheet className="w-6 h-6 text-violet-600" />
              </div>
              <div className="text-center">
                <p className="font-bold text-sm">Excel</p>
                <p className="text-xs text-muted-foreground">Planilha completa<br />abre no Excel</p>
              </div>
            </button>
          </div>

          {exportando && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="w-4 h-4 animate-spin" />
              Gerando backup, aguarde...
            </div>
          )}
        </CardContent>
      </Card>

      {/* Importar */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center">
              <Upload className="w-4.5 h-4.5 text-amber-600 dark:text-amber-400" />
            </div>
            <div>
              <CardTitle className="text-base">Importar Backup</CardTitle>
              <CardDescription>Restaure dados de um backup anterior do Bora Gerir</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">

          {/* Aviso */}
          <div className="flex items-start gap-3 rounded-xl border border-amber-200 bg-amber-50 dark:bg-amber-950/20 dark:border-amber-800 p-4">
            <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
            <div className="text-sm">
              <p className="font-semibold text-amber-700 dark:text-amber-400">Atenção antes de importar</p>
              <p className="text-amber-600 dark:text-amber-500 mt-0.5">
                A importação <strong>adiciona ou atualiza</strong> registros existentes. Dados atuais não são apagados. Aceita apenas backups <strong>.json gerados pelo Bora Gerir</strong>.
              </p>
            </div>
          </div>

          {/* Confirmação */}
          {confirmando && arquivoSelecionado && (
            <div className="rounded-xl border-2 border-[#F26E1D]/40 bg-[#F26E1D]/5 p-4 space-y-3">
              <p className="text-sm font-semibold">Confirmar importação?</p>
              <p className="text-xs text-muted-foreground">
                Arquivo: <strong>{arquivoSelecionado.name}</strong> ({(arquivoSelecionado.size / 1024).toFixed(1)} KB)
              </p>
              <div className="flex gap-2">
                <Button onClick={importarBackup} className="font-bold" size="sm">
                  Sim, importar agora
                </Button>
                <Button variant="outline" size="sm" onClick={() => {
                  setConfirmando(false)
                  setArquivoSelecionado(null)
                  if (fileRef.current) fileRef.current.value = ""
                }}>
                  Cancelar
                </Button>
              </div>
            </div>
          )}

          {/* Resultado */}
          {resultadoImport && (
            <div className="rounded-xl border border-emerald-200 bg-emerald-50 dark:bg-emerald-950/20 dark:border-emerald-800 p-4 space-y-3">
              <div className="flex items-center gap-2">
                <CheckCircle className="w-5 h-5 text-emerald-600" />
                <p className="font-semibold text-emerald-700 dark:text-emerald-400 text-sm">
                  Importação concluída — {resultadoImport.resumo.total_importados} registros restaurados
                  {resultadoImport.resumo.total_erros > 0 && `, ${resultadoImport.resumo.total_erros} com erro`}
                </p>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {Object.entries(resultadoImport.detalhes).map(([tabela, r]: any) => (
                  r.importados > 0 && (
                    <div key={tabela} className="text-xs bg-white dark:bg-white/5 rounded-lg px-3 py-2 border border-emerald-200/50">
                      <p className="font-semibold capitalize">{tabela.replace(/_/g, " ")}</p>
                      <p className="text-emerald-600">{r.importados} importados</p>
                    </div>
                  )
                ))}
              </div>
              <Button variant="outline" size="sm" onClick={() => window.location.reload()}>
                Recarregar página para ver os dados
              </Button>
            </div>
          )}

          {importando && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="w-4 h-4 animate-spin" />
              Importando dados, aguarde...
            </div>
          )}

          <input
            ref={fileRef}
            type="file"
            accept=".json"
            className="hidden"
            onChange={handleArquivoSelecionado}
          />

          {!confirmando && !importando && (
            <button
              onClick={() => fileRef.current?.click()}
              className="w-full flex flex-col items-center gap-3 py-8 rounded-2xl border-2 border-dashed border-border hover:border-[#F26E1D]/50 hover:bg-[#F26E1D]/5 transition-all group"
            >
              <div className="w-12 h-12 rounded-xl bg-muted flex items-center justify-center group-hover:bg-[#F26E1D]/10 transition-colors">
                <Upload className="w-6 h-6 text-muted-foreground group-hover:text-[#F26E1D] transition-colors" />
              </div>
              <div className="text-center">
                <p className="font-semibold text-sm">Clique para selecionar o arquivo</p>
                <p className="text-xs text-muted-foreground mt-0.5">Apenas arquivos .json gerados pelo Bora Gerir</p>
              </div>
            </button>
          )}

          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <Shield className="w-3.5 h-3.5 shrink-0" />
            Seus dados são processados com segurança e nunca compartilhados.
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
