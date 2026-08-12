"use client"

import { useState } from "react"
import { FileText, Copy, Download, MessageCircle, QrCode, Check, ShoppingCart } from "lucide-react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog"
import { formatarMoeda, gerarLinkWhatsApp } from "@/lib/utils"

interface BoletoResultModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  boleto: {
    codigoBarras?: string
    linhaDigitavel?: string
    qrCodePix?: string
    urlPdf?: string
    valor: number
    dataVencimento: string
    clienteNome?: string
    clienteTelefone?: string
  } | null
  onNovaVenda?: () => void
}

function formatarData(dataISO: string): string {
  try {
    // Add T12:00:00 to avoid timezone issues (UTC midnight becomes previous day in Brazil)
    const date = new Date(dataISO + "T12:00:00")
    return date.toLocaleDateString("pt-BR")
  } catch {
    return dataISO
  }
}

export function BoletoResultModal({
  open,
  onOpenChange,
  boleto,
  onNovaVenda,
}: BoletoResultModalProps) {
  const [copiado, setCopiado] = useState(false)

  if (!boleto) return null

  const valorFormatado = formatarMoeda(boleto.valor)
  const vencimentoFormatado = formatarData(boleto.dataVencimento)

  async function copiarLinhaDigitavel() {
    if (!boleto?.linhaDigitavel) return
    try {
      await navigator.clipboard.writeText(boleto.linhaDigitavel)
      setCopiado(true)
      toast.success("Copiado!")
      setTimeout(() => setCopiado(false), 2000)
    } catch {
      toast.error("Não foi possível copiar")
    }
  }

  function abrirPdf() {
    if (boleto?.urlPdf) {
      window.open(boleto.urlPdf, "_blank")
    }
  }

  function enviarWhatsApp() {
    if (!boleto) return

    const mensagem = `Olá! Segue o boleto no valor de ${valorFormatado} com vencimento em ${vencimentoFormatado}.${boleto.urlPdf ? ` Link: ${boleto.urlPdf}` : ""}`

    if (boleto.clienteTelefone) {
      const link = gerarLinkWhatsApp(boleto.clienteTelefone, mensagem)
      window.open(link, "_blank")
    } else {
      // Sem telefone, abre WhatsApp genérico com a mensagem
      const encoded = encodeURIComponent(mensagem)
      window.open(`https://wa.me/?text=${encoded}`, "_blank")
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-100 dark:bg-emerald-900/30">
              <Check className="h-5 w-5 text-emerald-600" />
            </div>
            Boleto Gerado com Sucesso
          </DialogTitle>
          <DialogDescription>
            Confira os dados do boleto abaixo
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Valor e Vencimento */}
          <div className="flex items-center justify-between rounded-xl bg-gray-50 dark:bg-white/5 p-4">
            <div>
              <p className="text-xs text-gray-500 dark:text-gray-400">Valor</p>
              <p className="text-lg font-bold text-gray-900 dark:text-white">
                {valorFormatado}
              </p>
            </div>
            <div className="text-right">
              <p className="text-xs text-gray-500 dark:text-gray-400">Vencimento</p>
              <p className="text-sm font-semibold text-gray-700 dark:text-gray-200">
                {vencimentoFormatado}
              </p>
            </div>
          </div>

          {/* Linha Digitável */}
          {boleto.linhaDigitavel && (
            <div className="space-y-2">
              <p className="text-xs font-medium text-gray-500 dark:text-gray-400">
                Linha Digitável
              </p>
              <div className="flex items-center gap-2">
                <code className="flex-1 rounded-lg bg-gray-100 dark:bg-white/5 px-3 py-2 text-xs font-mono text-gray-700 dark:text-gray-300 break-all border border-gray-200 dark:border-white/10">
                  {boleto.linhaDigitavel}
                </code>
                <Button
                  variant="outline"
                  size="icon"
                  onClick={copiarLinhaDigitavel}
                  className="shrink-0"
                  title="Copiar linha digitável"
                >
                  {copiado ? (
                    <Check className="h-4 w-4 text-emerald-500" />
                  ) : (
                    <Copy className="h-4 w-4" />
                  )}
                </Button>
              </div>
            </div>
          )}

          {/* Código de Barras */}
          {boleto.codigoBarras && (
            <div className="space-y-2">
              <p className="text-xs font-medium text-gray-500 dark:text-gray-400">
                Código de Barras
              </p>
              <div className="flex items-center gap-2 rounded-lg bg-gray-100 dark:bg-white/5 px-3 py-2 border border-gray-200 dark:border-white/10">
                <FileText className="h-4 w-4 text-gray-400 shrink-0" />
                <span className="text-xs font-mono text-gray-600 dark:text-gray-300 break-all">
                  {boleto.codigoBarras}
                </span>
              </div>
            </div>
          )}

          {/* QR Code Pix */}
          {boleto.qrCodePix && (
            <div className="space-y-2">
              <p className="flex items-center gap-1 text-xs font-medium text-gray-500 dark:text-gray-400">
                <QrCode className="h-3.5 w-3.5" />
                QR Code Pix
              </p>
              <div className="flex justify-center rounded-xl bg-white dark:bg-white p-4 border border-gray-200 dark:border-white/10">
                <img
                  src={boleto.qrCodePix}
                  alt="QR Code Pix para pagamento"
                  className="h-40 w-40 object-contain"
                />
              </div>
            </div>
          )}

          {/* Ações */}
          <div className="flex flex-col gap-2 pt-2">
            {boleto.urlPdf ? (
              <Button
                variant="outline"
                className="w-full justify-center gap-2"
                onClick={abrirPdf}
              >
                <Download className="h-4 w-4" />
                Baixar PDF do Boleto
              </Button>
            ) : boleto.linhaDigitavel ? (
              <Button
                variant="outline"
                className="w-full justify-center gap-2"
                onClick={copiarLinhaDigitavel}
              >
                <Copy className="h-4 w-4" />
                {copiado ? "Copiado!" : "Copiar Linha Digitável"}
              </Button>
            ) : null}

            <Button
              variant="default"
              className="w-full justify-center gap-2 bg-green-600 hover:bg-green-700"
              onClick={enviarWhatsApp}
            >
              <MessageCircle className="h-4 w-4" />
              Enviar via WhatsApp
            </Button>
          </div>
        </div>

        <DialogFooter className="pt-2">
          {onNovaVenda && (
            <Button
              variant="secondary"
              className="w-full justify-center gap-2"
              onClick={onNovaVenda}
            >
              <ShoppingCart className="h-4 w-4" />
              Nova Venda
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
