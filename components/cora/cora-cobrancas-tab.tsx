"use client"

import { useState, useEffect, useCallback } from "react"
import {
  FileText,
  QrCode,
  Layers,
  Ban,
  Eye,
  Plus,
  ChevronLeft,
  ChevronRight,
  Loader2,
  Filter,
  Send,
} from "lucide-react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Separator } from "@/components/ui/separator"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog"
import { formatarMoeda } from "@/lib/utils"
import { CoraStatusBadge } from "@/components/cora/cora-status-badge"
import { CoraEmitirBoleto } from "@/components/cora/cora-emitir-boleto"
import { CoraEmitirCarne } from "@/components/cora/cora-emitir-carne"
import { CoraTransferir } from "@/components/cora/cora-transferir"

// === Types ===

interface Boleto {
  id: string
  tipo: "boleto" | "pix" | "carne"
  clienteNome: string
  valor: number
  dataVencimento: string
  status: string
  codigoBarras?: string
  linhaDigitavel?: string
  qrCodePix?: string
  urlPdf?: string
  dataPagamento?: string
  dataCancelamento?: string
  descricaoServico?: string
  numeroParcela?: number
  carneId?: string
  createdAt: string
}

interface BoletoDetalhe extends Boleto {
  pagador?: {
    nome: string
    documento: string
    email?: string
  }
  coraInvoiceId?: string
}

interface CoraCobrancasTabProps {
  empresaId: string
}

// === Componente ===

export function CoraCobrancasTab({ empresaId }: CoraCobrancasTabProps) {
  // --- State ---
  const [boletos, setBoletos] = useState<Boleto[]>([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [limit] = useState(10)
  const [loading, setLoading] = useState(true)

  // Filtros
  const [filterStatus, setFilterStatus] = useState("todos")
  const [filterStartDate, setFilterStartDate] = useState("")
  const [filterEndDate, setFilterEndDate] = useState("")
  const [filterClienteNome, setFilterClienteNome] = useState("")

  // Modais
  const [modalBoleto, setModalBoleto] = useState(false)
  const [modalCarne, setModalCarne] = useState(false)
  const [modalTransferir, setModalTransferir] = useState(false)
  const [modalDetalhe, setModalDetalhe] = useState(false)

  // Detalhe
  const [selectedBoleto, setSelectedBoleto] = useState<BoletoDetalhe | null>(null)
  const [loadingDetalhe, setLoadingDetalhe] = useState(false)

  // Cancelamento
  const [cancelando, setCancelando] = useState<string | null>(null)

  // --- Fetch boletos ---

  const fetchBoletos = useCallback(async () => {
    setLoading(true)

    try {
      const params = new URLSearchParams()
      if (filterStatus !== "todos") params.set("status", filterStatus)
      if (filterStartDate) params.set("startDate", filterStartDate)
      if (filterEndDate) params.set("endDate", filterEndDate)
      if (filterClienteNome.trim()) params.set("clienteNome", filterClienteNome.trim())
      params.set("page", String(page))
      params.set("limit", String(limit))

      const res = await fetch(`/api/cora/boletos?${params}`)

      if (!res.ok) {
        const body = await res.json().catch(() => ({}))
        throw new Error(body.error || "Erro ao carregar cobranças")
      }

      const data = await res.json()
      setBoletos(data.boletos || [])
      setTotal(data.total || 0)
    } catch (err: any) {
      toast.error(err.message || "Erro ao carregar cobranças")
    } finally {
      setLoading(false)
    }
  }, [filterStatus, filterStartDate, filterEndDate, filterClienteNome, page, limit])

  useEffect(() => {
    fetchBoletos()
  }, [fetchBoletos])

  // --- Handlers ---

  function handleFiltrar() {
    setPage(1)
    fetchBoletos()
  }

  function handlePreviousPage() {
    if (page > 1) setPage(page - 1)
  }

  function handleNextPage() {
    const totalPages = Math.ceil(total / limit)
    if (page < totalPages) setPage(page + 1)
  }

  async function handleVerDetalhes(boleto: Boleto) {
    setLoadingDetalhe(true)
    setModalDetalhe(true)

    try {
      const res = await fetch(`/api/cora/boletos/${boleto.id}`)

      if (!res.ok) {
        const body = await res.json().catch(() => ({}))
        throw new Error(body.error || "Erro ao carregar detalhes")
      }

      const data: BoletoDetalhe = await res.json()
      setSelectedBoleto(data)
    } catch (err: any) {
      toast.error(err.message || "Erro ao carregar detalhes")
      setModalDetalhe(false)
    } finally {
      setLoadingDetalhe(false)
    }
  }

  async function handleCancelar(boleto: Boleto) {
    if (boleto.status === "pago") {
      toast.error("Boletos pagos não podem ser cancelados")
      return
    }

    const confirmar = window.confirm(
      `Deseja cancelar esta cobrança de ${formatarMoeda(boleto.valor)} para ${boleto.clienteNome}?`
    )
    if (!confirmar) return

    setCancelando(boleto.id)

    try {
      const res = await fetch(`/api/cora/boletos/${boleto.id}/cancelar`, {
        method: "POST",
      })

      if (!res.ok) {
        const body = await res.json().catch(() => ({}))
        throw new Error(body.error || "Erro ao cancelar cobrança")
      }

      toast.success("Cobrança cancelada com sucesso")
      fetchBoletos()
    } catch (err: any) {
      toast.error(err.message || "Erro ao cancelar cobrança")
    } finally {
      setCancelando(null)
    }
  }

  function handleModalSuccess() {
    fetchBoletos()
  }

  // --- Helpers ---

  function getTipoIcon(tipo: string) {
    switch (tipo) {
      case "pix":
        return <QrCode className="h-4 w-4 text-purple-600 dark:text-purple-400" />
      case "carne":
        return <Layers className="h-4 w-4 text-blue-600 dark:text-blue-400" />
      default:
        return <FileText className="h-4 w-4 text-[#F26E1D]" />
    }
  }

  function getTipoLabel(tipo: string) {
    switch (tipo) {
      case "pix":
        return "Pix"
      case "carne":
        return "Carnê"
      default:
        return "Boleto"
    }
  }

  const totalPages = Math.ceil(total / limit)

  // === Render ===

  return (
    <div className="space-y-4">
      {/* Header com ações */}
      <Card>
        <CardHeader>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <CardTitle className="flex items-center gap-2 text-lg">
              <FileText className="h-5 w-5 text-[#F26E1D]" />
              Cobranças
            </CardTitle>
            <div className="flex flex-wrap gap-2">
              <Button
                size="sm"
                onClick={() => setModalBoleto(true)}
                className="bg-[#F26E1D] hover:bg-[#d9611a] text-white font-bold rounded-xl"
              >
                <Plus className="h-4 w-4" />
                Emitir Boleto
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() => setModalCarne(true)}
              >
                <Layers className="h-4 w-4" />
                Emitir Carnê
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() => setModalTransferir(true)}
              >
                <Send className="h-4 w-4" />
                Transferir
              </Button>
            </div>
          </div>
        </CardHeader>
      </Card>

      {/* Filtros */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-wrap items-end gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="filter-status">Status</Label>
              <Select
                value={filterStatus}
                onValueChange={(val) => setFilterStatus(val)}
              >
                <SelectTrigger id="filter-status" className="w-[140px]">
                  <SelectValue placeholder="Todos" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="todos">Todos</SelectItem>
                  <SelectItem value="aberto">Aberto</SelectItem>
                  <SelectItem value="pago">Pago</SelectItem>
                  <SelectItem value="vencido">Vencido</SelectItem>
                  <SelectItem value="cancelado">Cancelado</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="filter-start">Início</Label>
              <Input
                id="filter-start"
                type="date"
                value={filterStartDate}
                onChange={(e) => setFilterStartDate(e.target.value)}
                className="w-[150px]"
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="filter-end">Fim</Label>
              <Input
                id="filter-end"
                type="date"
                value={filterEndDate}
                onChange={(e) => setFilterEndDate(e.target.value)}
                className="w-[150px]"
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="filter-cliente">Cliente</Label>
              <Input
                id="filter-cliente"
                placeholder="Nome do cliente"
                value={filterClienteNome}
                onChange={(e) => setFilterClienteNome(e.target.value)}
                className="w-[180px]"
              />
            </div>

            <Button onClick={handleFiltrar}>
              <Filter className="h-4 w-4" />
              Filtrar
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Tabela de boletos */}
      <Card>
        <CardContent className="pt-6">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-6 w-6 animate-spin text-[#F26E1D]" />
              <span className="ml-2 text-sm text-muted-foreground">
                Carregando cobranças...
              </span>
            </div>
          ) : boletos.length === 0 ? (
            <div className="flex flex-col items-center gap-2 py-12 text-center">
              <div className="rounded-full bg-gray-100 p-3 dark:bg-white/[0.06]">
                <FileText className="h-6 w-6 text-gray-400" />
              </div>
              <p className="text-sm font-medium text-gray-900 dark:text-gray-100">
                Nenhuma cobrança encontrada
              </p>
              <p className="text-xs text-muted-foreground">
                Emita um boleto, carnê ou gere uma cobrança Pix para começar.
              </p>
            </div>
          ) : (
            <>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-[60px]">Tipo</TableHead>
                      <TableHead>Cliente</TableHead>
                      <TableHead className="text-right">Valor</TableHead>
                      <TableHead>Vencimento</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-right">Ações</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {boletos.map((boleto) => (
                      <TableRow key={boleto.id}>
                        <TableCell>
                          <div className="flex items-center gap-1.5" title={getTipoLabel(boleto.tipo)}>
                            {getTipoIcon(boleto.tipo)}
                            <span className="text-xs text-muted-foreground hidden sm:inline">
                              {getTipoLabel(boleto.tipo)}
                            </span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="min-w-0">
                            <p className="truncate text-sm font-medium">
                              {boleto.clienteNome}
                            </p>
                            {boleto.numeroParcela && (
                              <p className="text-xs text-muted-foreground">
                                Parcela {boleto.numeroParcela}
                              </p>
                            )}
                          </div>
                        </TableCell>
                        <TableCell className="text-right font-medium">
                          {formatarMoeda(boleto.valor)}
                        </TableCell>
                        <TableCell>
                          {new Date(boleto.dataVencimento + "T00:00:00").toLocaleDateString("pt-BR")}
                        </TableCell>
                        <TableCell>
                          <CoraStatusBadge status={boleto.status} />
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-1">
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleVerDetalhes(boleto)}
                              title="Ver detalhes"
                            >
                              <Eye className="h-4 w-4" />
                            </Button>
                            {(boleto.status === "aberto" || boleto.status === "vencido") && (
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => handleCancelar(boleto)}
                                disabled={cancelando === boleto.id}
                                title="Cancelar cobrança"
                              >
                                {cancelando === boleto.id ? (
                                  <Loader2 className="h-4 w-4 animate-spin" />
                                ) : (
                                  <Ban className="h-4 w-4 text-red-500" />
                                )}
                              </Button>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>

              {/* Paginação */}
              {totalPages > 1 && (
                <>
                  <Separator className="my-4" />
                  <div className="flex items-center justify-between">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handlePreviousPage}
                      disabled={page <= 1}
                    >
                      <ChevronLeft className="h-4 w-4" />
                      Anterior
                    </Button>
                    <span className="text-sm text-muted-foreground">
                      Página {page} de {totalPages}
                    </span>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleNextPage}
                      disabled={page >= totalPages}
                    >
                      Próximo
                      <ChevronRight className="h-4 w-4" />
                    </Button>
                  </div>
                </>
              )}
            </>
          )}
        </CardContent>
      </Card>

      {/* Modal: Detalhes do boleto */}
      <Dialog open={modalDetalhe} onOpenChange={setModalDetalhe}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Eye className="h-5 w-5 text-[#F26E1D]" />
              Detalhes da Cobrança
            </DialogTitle>
            <DialogDescription>
              Informações completas da cobrança selecionada
            </DialogDescription>
          </DialogHeader>

          {loadingDetalhe ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-[#F26E1D]" />
              <span className="ml-2 text-sm text-muted-foreground">Carregando...</span>
            </div>
          ) : selectedBoleto ? (
            <div className="space-y-4">
              <div className="rounded-xl border p-4 bg-gray-50 dark:bg-[#1e2030] space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Tipo</span>
                  <div className="flex items-center gap-1.5">
                    {getTipoIcon(selectedBoleto.tipo)}
                    <span className="font-medium">{getTipoLabel(selectedBoleto.tipo)}</span>
                  </div>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Status</span>
                  <CoraStatusBadge status={selectedBoleto.status} />
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Valor</span>
                  <span className="font-bold text-[#F26E1D]">
                    {formatarMoeda(selectedBoleto.valor)}
                  </span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Vencimento</span>
                  <span className="font-medium">
                    {new Date(selectedBoleto.dataVencimento + "T00:00:00").toLocaleDateString("pt-BR")}
                  </span>
                </div>
                {selectedBoleto.clienteNome && (
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Cliente</span>
                    <span className="font-medium">{selectedBoleto.clienteNome}</span>
                  </div>
                )}
                {selectedBoleto.dataPagamento && (
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Pago em</span>
                    <span className="font-medium">
                      {new Date(selectedBoleto.dataPagamento).toLocaleDateString("pt-BR")}
                    </span>
                  </div>
                )}
                {selectedBoleto.dataCancelamento && (
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Cancelado em</span>
                    <span className="font-medium">
                      {new Date(selectedBoleto.dataCancelamento).toLocaleDateString("pt-BR")}
                    </span>
                  </div>
                )}
                {selectedBoleto.numeroParcela && (
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Parcela</span>
                    <span className="font-medium">{selectedBoleto.numeroParcela}</span>
                  </div>
                )}
              </div>

              {/* Pagador */}
              {selectedBoleto.pagador && (
                <>
                  <Separator />
                  <div className="space-y-2">
                    <p className="text-sm font-semibold text-gray-700 dark:text-gray-300">
                      Pagador
                    </p>
                    <div className="rounded-xl border p-3 space-y-1.5 text-sm">
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Nome</span>
                        <span className="font-medium">{selectedBoleto.pagador.nome}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Documento</span>
                        <span className="font-medium">{selectedBoleto.pagador.documento}</span>
                      </div>
                      {selectedBoleto.pagador.email && (
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Email</span>
                          <span className="font-medium">{selectedBoleto.pagador.email}</span>
                        </div>
                      )}
                    </div>
                  </div>
                </>
              )}

              {/* Linha digitável */}
              {selectedBoleto.linhaDigitavel && (
                <>
                  <Separator />
                  <div className="space-y-1.5">
                    <Label className="text-xs text-muted-foreground">Linha Digitável</Label>
                    <div className="rounded-xl border bg-gray-50 p-2.5 dark:bg-white/[0.03]">
                      <code className="break-all text-xs font-mono">
                        {selectedBoleto.linhaDigitavel}
                      </code>
                    </div>
                  </div>
                </>
              )}

              {/* QR Code Pix */}
              {selectedBoleto.qrCodePix && (
                <div className="flex flex-col items-center gap-2 pt-2">
                  <Label className="text-xs text-muted-foreground flex items-center gap-1">
                    <QrCode className="h-3 w-3" />
                    QR Code Pix
                  </Label>
                  <img
                    src={`data:image/png;base64,${selectedBoleto.qrCodePix}`}
                    alt="QR Code Pix"
                    className="h-28 w-28 rounded-lg border"
                  />
                </div>
              )}

              {/* Link PDF */}
              {selectedBoleto.urlPdf && (
                <Button
                  variant="outline"
                  className="w-full"
                  onClick={() => window.open(selectedBoleto!.urlPdf, "_blank")}
                >
                  <FileText className="h-4 w-4" />
                  Visualizar PDF
                </Button>
              )}
            </div>
          ) : null}

          <DialogFooter>
            <Button
              variant="ghost"
              onClick={() => setModalDetalhe(false)}
            >
              Fechar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Modais de emissão */}
      <CoraEmitirBoleto
        open={modalBoleto}
        onOpenChange={setModalBoleto}
        onSuccess={handleModalSuccess}
      />

      <CoraEmitirCarne
        open={modalCarne}
        onOpenChange={setModalCarne}
        onSuccess={handleModalSuccess}
      />

      <CoraTransferir
        open={modalTransferir}
        onOpenChange={setModalTransferir}
        onSuccess={handleModalSuccess}
      />
    </div>
  )
}
