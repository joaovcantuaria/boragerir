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
  MessageCircle,
  AlertCircle,
  CheckCircle2,
  Calendar,
} from "lucide-react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
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
  numeroParcela?: number
  carneId?: string
  createdAt: string
}

interface BoletosPageProps {
  empresaId: string
}

export function BoletosPage({ empresaId }: BoletosPageProps) {
  const [boletos, setBoletos] = useState<Boleto[]>([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const limit = 15
  const [loading, setLoading] = useState(true)

  // Summary data
  const [resumo, setResumo] = useState({
    aberto: 0,
    vencido: 0,
    pagoMes: 0,
    emitidosMes: 0,
  })

  // Filters
  const [filterStatus, setFilterStatus] = useState("todos")
  const [filterStartDate, setFilterStartDate] = useState("")
  const [filterEndDate, setFilterEndDate] = useState("")
  const [filterClienteNome, setFilterClienteNome] = useState("")

  // Modals
  const [modalBoleto, setModalBoleto] = useState(false)
  const [modalCarne, setModalCarne] = useState(false)
  const [modalDetalhe, setModalDetalhe] = useState(false)
  const [selectedBoleto, setSelectedBoleto] = useState<Boleto | null>(null)
  const [cancelando, setCancelando] = useState<string | null>(null)

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
      if (!res.ok) throw new Error("Erro ao carregar boletos")
      const data = await res.json()
      setBoletos(data.boletos || [])
      setTotal(data.total || 0)
    } catch (err: any) {
      toast.error(err.message || "Erro ao carregar boletos")
    } finally {
      setLoading(false)
    }
  }, [filterStatus, filterStartDate, filterEndDate, filterClienteNome, page, limit])

  const fetchResumo = useCallback(async () => {
    try {
      const now = new Date()
      const startOfMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-01`

      const [abertoRes, vencidoRes, pagoMesRes, emitidosMesRes] = await Promise.all([
        fetch(`/api/cora/boletos?status=aberto&limit=1`),
        fetch(`/api/cora/boletos?status=vencido&limit=1`),
        fetch(`/api/cora/boletos?status=pago&startDate=${startOfMonth}&limit=100`),
        fetch(`/api/cora/boletos?startDate=${startOfMonth}&limit=1`),
      ])

      const [abertoData, vencidoData, pagoMesData, emitidosMesData] = await Promise.all([
        abertoRes.json(),
        vencidoRes.json(),
        pagoMesRes.json(),
        emitidosMesRes.json(),
      ])

      const totalPagoMes = (pagoMesData.boletos || []).reduce(
        (s: number, b: any) => s + (b.valor || 0),
        0
      )

      setResumo({
        aberto: abertoData.total || 0,
        vencido: vencidoData.total || 0,
        pagoMes: totalPagoMes,
        emitidosMes: emitidosMesData.total || 0,
      })
    } catch {
      // resumo é não-crítico
    }
  }, [])

  useEffect(() => {
    fetchBoletos()
  }, [fetchBoletos])

  useEffect(() => {
    fetchResumo()
  }, [fetchResumo])

  async function handleCancelar(boleto: Boleto) {
    if (boleto.status === "pago") {
      toast.error("Boletos pagos não podem ser cancelados")
      return
    }

    if (
      !confirm(
        `Cancelar boleto de ${formatarMoeda(boleto.valor)} para ${boleto.clienteNome || "cliente"}?`
      )
    ) {
      return
    }

    setCancelando(boleto.id)
    try {
      const res = await fetch("/api/cora/boletos/cancelar", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ boletoId: boleto.id }),
      })
      if (!res.ok) {
        const body = await res.json().catch(() => ({}))
        throw new Error(body.error || "Erro ao cancelar")
      }
      toast.success("Boleto cancelado")
      fetchBoletos()
      fetchResumo()
    } catch (err: any) {
      toast.error(err.message || "Erro ao cancelar boleto")
    } finally {
      setCancelando(null)
    }
  }

  function handleWhatsApp(boleto: Boleto) {
    const vencimento = new Date(boleto.dataVencimento + "T00:00:00").toLocaleDateString("pt-BR")
    let msg = `Boleto de ${formatarMoeda(boleto.valor)} com vencimento em ${vencimento}.`
    if (boleto.linhaDigitavel) msg += `\nLinha digitável: ${boleto.linhaDigitavel}`
    if (boleto.urlPdf) msg += `\nBaixar: ${boleto.urlPdf}`
    window.open(`https://wa.me/?text=${encodeURIComponent(msg)}`, "_blank")
  }

  function getTipoIcon(tipo: string) {
    if (tipo === "pix") return <QrCode className="h-4 w-4 text-purple-500" />
    if (tipo === "carne") return <Layers className="h-4 w-4 text-blue-500" />
    return <FileText className="h-4 w-4 text-[#F26E1D]" />
  }

  const totalPages = Math.ceil(total / limit)

  const summaryCards = [
    {
      label: "Em Aberto",
      valor: resumo.aberto,
      suffix: "boletos",
      color: "#f59e0b",
      icon: <AlertCircle className="h-5 w-5" />,
    },
    {
      label: "Vencidos",
      valor: resumo.vencido,
      suffix: "boletos",
      color: "#ef4444",
      icon: <AlertCircle className="h-5 w-5" />,
    },
    {
      label: "Pago no Mês",
      valor: formatarMoeda(resumo.pagoMes),
      suffix: "",
      color: "#10b981",
      icon: <CheckCircle2 className="h-5 w-5" />,
    },
    {
      label: "Emitidos no Mês",
      valor: resumo.emitidosMes,
      suffix: "boletos",
      color: "#6366f1",
      icon: <Calendar className="h-5 w-5" />,
    },
  ]

  return (
    <div className="space-y-6 max-w-6xl">
      {/* Header */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-lg font-semibold text-foreground">Boletos</h1>
          <p className="text-xs text-muted-foreground mt-0.5">
            Gerencie todas as cobranças via Cora Pagamentos
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            size="sm"
            onClick={() => setModalBoleto(true)}
            className="bg-[#F26E1D] hover:bg-[#d9611a] text-white font-bold rounded-xl"
          >
            <Plus className="h-4 w-4" />
            Emitir Boleto
          </Button>
          <Button size="sm" variant="outline" onClick={() => setModalCarne(true)}>
            <Layers className="h-4 w-4" />
            Emitir Carnê
          </Button>
        </div>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {summaryCards.map((card) => (
          <Card key={card.label}>
            <CardContent className="p-4 flex items-center gap-3">
              <div
                className="rounded-lg p-2"
                style={{ backgroundColor: card.color + "20", color: card.color }}
              >
                {card.icon}
              </div>
              <div>
                <p className="text-xs text-muted-foreground">{card.label}</p>
                <p className="font-bold text-base" style={{ color: card.color }}>
                  {card.valor}
                  {card.suffix ? ` ${card.suffix}` : ""}
                </p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="pt-4">
          <div className="flex flex-wrap gap-3 items-end">
            <div className="space-y-1.5">
              <Label htmlFor="filter-status">Status</Label>
              <Select value={filterStatus} onValueChange={setFilterStatus}>
                <SelectTrigger id="filter-status" className="w-[140px]">
                  <SelectValue />
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
              <Label>Início</Label>
              <Input
                type="date"
                value={filterStartDate}
                onChange={(e) => setFilterStartDate(e.target.value)}
                className="w-[150px]"
              />
            </div>
            <div className="space-y-1.5">
              <Label>Fim</Label>
              <Input
                type="date"
                value={filterEndDate}
                onChange={(e) => setFilterEndDate(e.target.value)}
                className="w-[150px]"
              />
            </div>
            <div className="space-y-1.5">
              <Label>Cliente</Label>
              <Input
                placeholder="Nome do cliente"
                value={filterClienteNome}
                onChange={(e) => setFilterClienteNome(e.target.value)}
                className="w-[180px]"
              />
            </div>
            <Button
              onClick={() => {
                setPage(1)
                fetchBoletos()
              }}
            >
              <Filter className="h-4 w-4" />
              Filtrar
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Table */}
      <Card>
        <CardContent className="pt-4">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-6 w-6 animate-spin text-[#F26E1D]" />
              <span className="ml-2 text-sm text-muted-foreground">Carregando...</span>
            </div>
          ) : boletos.length === 0 ? (
            <div className="flex flex-col items-center gap-2 py-12 text-center">
              <FileText className="h-10 w-10 text-muted-foreground/30" />
              <p className="text-sm font-medium">Nenhum boleto encontrado</p>
              <p className="text-xs text-muted-foreground">Emita um boleto para começar.</p>
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
                          <div className="flex items-center gap-1.5" title={boleto.tipo}>
                            {getTipoIcon(boleto.tipo)}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div>
                            <p className="truncate text-sm font-medium max-w-[160px]">
                              {boleto.clienteNome || "—"}
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
                              onClick={() => {
                                setSelectedBoleto(boleto)
                                setModalDetalhe(true)
                              }}
                              title="Ver detalhes"
                            >
                              <Eye className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleWhatsApp(boleto)}
                              title="Enviar WhatsApp"
                            >
                              <MessageCircle className="h-4 w-4 text-green-600" />
                            </Button>
                            {(boleto.status === "aberto" || boleto.status === "vencido") && (
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => handleCancelar(boleto)}
                                disabled={cancelando === boleto.id}
                                title="Cancelar"
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

              {totalPages > 1 && (
                <>
                  <Separator className="my-4" />
                  <div className="flex items-center justify-between">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setPage((p) => Math.max(1, p - 1))}
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
                      onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
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

      {/* Detail Modal */}
      {selectedBoleto && (
        <Dialog open={modalDetalhe} onOpenChange={setModalDetalhe}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>Detalhes do Boleto</DialogTitle>
              <DialogDescription>Informações completas da cobrança</DialogDescription>
            </DialogHeader>
            <div className="space-y-3 text-sm">
              <div className="rounded-xl border p-4 bg-muted/30 space-y-2">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Valor</span>
                  <span className="font-bold text-[#F26E1D]">
                    {formatarMoeda(selectedBoleto.valor)}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Status</span>
                  <CoraStatusBadge status={selectedBoleto.status} />
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Vencimento</span>
                  <span>
                    {new Date(selectedBoleto.dataVencimento + "T00:00:00").toLocaleDateString(
                      "pt-BR"
                    )}
                  </span>
                </div>
                {selectedBoleto.clienteNome && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Cliente</span>
                    <span>{selectedBoleto.clienteNome}</span>
                  </div>
                )}
                {selectedBoleto.dataPagamento && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Pago em</span>
                    <span>
                      {new Date(selectedBoleto.dataPagamento).toLocaleDateString("pt-BR")}
                    </span>
                  </div>
                )}
              </div>
              {selectedBoleto.linhaDigitavel && (
                <div>
                  <p className="text-xs text-muted-foreground mb-1">Linha Digitável</p>
                  <code className="text-xs block bg-muted p-2 rounded break-all">
                    {selectedBoleto.linhaDigitavel}
                  </code>
                </div>
              )}
              {selectedBoleto.qrCodePix && (
                <div className="flex justify-center">
                  <img
                    src={`data:image/png;base64,${selectedBoleto.qrCodePix}`}
                    alt="QR Code Pix"
                    className="h-32 w-32"
                  />
                </div>
              )}
              {selectedBoleto.urlPdf && (
                <Button
                  variant="outline"
                  className="w-full"
                  onClick={() => window.open(selectedBoleto.urlPdf, "_blank")}
                >
                  <FileText className="h-4 w-4" />
                  Abrir PDF
                </Button>
              )}
            </div>
            <DialogFooter>
              <Button variant="ghost" onClick={() => setModalDetalhe(false)}>
                Fechar
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}

      {/* Emission modals */}
      <CoraEmitirBoleto
        open={modalBoleto}
        onOpenChange={setModalBoleto}
        onSuccess={() => {
          fetchBoletos()
          fetchResumo()
        }}
      />
      <CoraEmitirCarne
        open={modalCarne}
        onOpenChange={setModalCarne}
        onSuccess={() => {
          fetchBoletos()
          fetchResumo()
        }}
      />
    </div>
  )
}
