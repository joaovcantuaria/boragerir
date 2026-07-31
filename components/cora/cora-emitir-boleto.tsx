"use client"

import { useState, useEffect } from "react"
import { useForm } from "react-hook-form"
import { z } from "zod"
import { zodResolver } from "@hookform/resolvers/zod"
import { FileText, Copy, QrCode, Download, Loader2 } from "lucide-react"
import { toast } from "sonner"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Separator } from "@/components/ui/separator"
import { formatarMoeda } from "@/lib/utils"

// === Schema de validação ===

const boletoSchema = z.object({
  nome: z.string().min(1, "Nome do pagador é obrigatório").max(60, "Nome deve ter no máximo 60 caracteres"),
  documento: z
    .string()
    .min(1, "CPF/CNPJ é obrigatório")
    .refine((val) => {
      const digits = val.replace(/\D/g, "")
      return digits.length === 11 || digits.length === 14
    }, "CPF deve ter 11 dígitos ou CNPJ deve ter 14 dígitos"),
  email: z.string().email("Email inválido").optional().or(z.literal("")),
  rua: z.string().min(1, "Rua é obrigatória"),
  numero: z.string().min(1, "Número é obrigatório"),
  complemento: z.string().optional(),
  bairro: z.string().min(1, "Bairro é obrigatório"),
  cidade: z.string().min(1, "Cidade é obrigatória"),
  estado: z
    .string()
    .min(2, "Estado é obrigatório")
    .max(2, "Use a sigla do estado (ex: SP)"),
  cep: z
    .string()
    .min(1, "CEP é obrigatório")
    .refine((val) => val.replace(/\D/g, "").length === 8, "CEP deve ter 8 dígitos"),
  valor: z.string().min(1, "Valor é obrigatório"),
  dataVencimento: z.string().min(1, "Data de vencimento é obrigatória"),
  descricaoServico: z.string().min(1, "Descrição do serviço é obrigatória"),
})

type BoletoFormData = z.infer<typeof boletoSchema>

// === Interface do resultado do boleto ===

interface BoletoResult {
  id: string
  coraInvoiceId: string
  valor: number
  dataVencimento: string
  status: string
  codigoBarras: string
  linhaDigitavel: string
  qrCodePix: string
  urlPdf: string
  pagador: {
    nome: string
    documento: string
  }
}

// === Props do componente ===

interface CoraEmitirBoletoProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSuccess?: () => void
  clienteId?: string
  clienteNome?: string
  clienteDocumento?: string
  clienteEmail?: string
}

// === Helpers ===

function parseBRLToFloat(value: string): number {
  // Remove pontos de milhar e troca vírgula por ponto
  const cleaned = value.replace(/\./g, "").replace(",", ".")
  const num = parseFloat(cleaned)
  return isNaN(num) ? 0 : num
}

function detectTipoPagador(documento: string): "PERSON" | "BUSINESS" {
  const digits = documento.replace(/\D/g, "")
  return digits.length === 14 ? "BUSINESS" : "PERSON"
}

// === Componente ===

export function CoraEmitirBoleto({
  open,
  onOpenChange,
  onSuccess,
  clienteId,
  clienteNome,
  clienteDocumento,
  clienteEmail,
}: CoraEmitirBoletoProps) {
  const [loading, setLoading] = useState(false)
  const [resultado, setResultado] = useState<BoletoResult | null>(null)
  const [apiError, setApiError] = useState<string | null>(null)

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<BoletoFormData>({
    resolver: zodResolver(boletoSchema),
    defaultValues: {
      nome: clienteNome || "",
      documento: clienteDocumento || "",
      email: clienteEmail || "",
      rua: "",
      numero: "",
      complemento: "",
      bairro: "",
      cidade: "",
      estado: "",
      cep: "",
      valor: "",
      dataVencimento: "",
      descricaoServico: "",
    },
  })

  // Reset do form quando o modal abre/fecha
  useEffect(() => {
    if (open) {
      setResultado(null)
      setApiError(null)
      reset({
        nome: clienteNome || "",
        documento: clienteDocumento || "",
        email: clienteEmail || "",
        rua: "",
        numero: "",
        complemento: "",
        bairro: "",
        cidade: "",
        estado: "",
        cep: "",
        valor: "",
        dataVencimento: "",
        descricaoServico: "",
      })
    }
  }, [open, clienteNome, clienteDocumento, clienteEmail, reset])

  async function onSubmit(data: BoletoFormData) {
    setLoading(true)
    setApiError(null)

    const valorFloat = parseBRLToFloat(data.valor)

    if (valorFloat <= 0) {
      setApiError("O valor deve ser maior que zero")
      setLoading(false)
      return
    }

    // Validar data de vencimento não é no passado
    const hoje = new Date()
    hoje.setHours(0, 0, 0, 0)
    const dataVenc = new Date(data.dataVencimento + "T00:00:00")
    if (dataVenc < hoje) {
      setApiError("A data de vencimento não pode ser anterior a hoje")
      setLoading(false)
      return
    }

    const documento = data.documento.replace(/\D/g, "")
    const tipo = detectTipoPagador(documento)

    const body = {
      pagador: {
        nome: data.nome.trim(),
        documento,
        email: data.email?.trim() || undefined,
        tipo,
        endereco: {
          rua: data.rua.trim(),
          numero: data.numero.trim(),
          complemento: data.complemento?.trim() || undefined,
          bairro: data.bairro.trim(),
          cidade: data.cidade.trim(),
          estado: data.estado.trim().toUpperCase(),
          cep: data.cep.replace(/\D/g, ""),
        },
      },
      valor: valorFloat,
      dataVencimento: data.dataVencimento,
      descricaoServico: data.descricaoServico.trim(),
      clienteId: clienteId || undefined,
    }

    try {
      const res = await fetch("/api/cora/boletos", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      })

      const json = await res.json()

      if (!res.ok) {
        setApiError(json.error || "Erro ao emitir boleto. Tente novamente.")
        setLoading(false)
        return
      }

      setResultado(json)
      toast.success("Boleto emitido com sucesso!")
      onSuccess?.()
    } catch {
      setApiError("Erro de conexão. Verifique sua internet e tente novamente.")
    } finally {
      setLoading(false)
    }
  }

  function handleCopiarLinhaDigitavel() {
    if (!resultado?.linhaDigitavel) return
    navigator.clipboard.writeText(resultado.linhaDigitavel)
    toast.success("Linha digitável copiada!")
  }

  function handleBaixarPdf() {
    if (!resultado?.urlPdf) return
    window.open(resultado.urlPdf, "_blank")
  }

  function handleFechar() {
    onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg sm:max-w-xl">
        {resultado ? (
          // === Visualização de Sucesso ===
          <>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5 text-emerald-600" />
                Boleto Emitido
              </DialogTitle>
              <DialogDescription>
                O boleto foi emitido com sucesso. Confira os dados abaixo.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4">
              {/* Dados do boleto */}
              <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4 dark:border-emerald-900/50 dark:bg-emerald-950/20">
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Pagador</span>
                    <span className="font-medium">{resultado.pagador.nome}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Documento</span>
                    <span className="font-medium">{resultado.pagador.documento}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Valor</span>
                    <span className="font-bold text-emerald-700 dark:text-emerald-400">
                      {formatarMoeda(resultado.valor)}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Vencimento</span>
                    <span className="font-medium">
                      {new Date(resultado.dataVencimento + "T00:00:00").toLocaleDateString("pt-BR")}
                    </span>
                  </div>
                </div>
              </div>

              <Separator />

              {/* Linha digitável */}
              {resultado.linhaDigitavel && (
                <div className="space-y-2">
                  <Label className="text-xs text-muted-foreground">Linha Digitável</Label>
                  <div className="flex items-center gap-2 rounded-xl border bg-gray-50 p-3 dark:bg-white/[0.03]">
                    <code className="flex-1 break-all text-xs font-mono">
                      {resultado.linhaDigitavel}
                    </code>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      onClick={handleCopiarLinhaDigitavel}
                      title="Copiar linha digitável"
                    >
                      <Copy className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              )}

              {/* Código de barras */}
              {resultado.codigoBarras && (
                <div className="space-y-1">
                  <Label className="text-xs text-muted-foreground">Código de Barras</Label>
                  <p className="break-all text-xs font-mono text-muted-foreground">
                    {resultado.codigoBarras}
                  </p>
                </div>
              )}

              {/* QR Code Pix */}
              {resultado.qrCodePix && (
                <div className="flex flex-col items-center gap-2 py-2">
                  <Label className="text-xs text-muted-foreground flex items-center gap-1">
                    <QrCode className="h-3 w-3" />
                    QR Code Pix
                  </Label>
                  <img
                    src={`data:image/png;base64,${resultado.qrCodePix}`}
                    alt="QR Code Pix"
                    className="h-32 w-32 rounded-lg border"
                  />
                </div>
              )}
            </div>

            <DialogFooter className="flex-col gap-2 sm:flex-row">
              <Button
                type="button"
                onClick={handleCopiarLinhaDigitavel}
                className="w-full sm:w-auto"
              >
                <Copy className="h-4 w-4" />
                Copiar Linha Digitável
              </Button>
              {resultado.urlPdf && (
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleBaixarPdf}
                  className="w-full sm:w-auto"
                >
                  <Download className="h-4 w-4" />
                  Baixar PDF
                </Button>
              )}
              <Button
                type="button"
                variant="ghost"
                onClick={handleFechar}
                className="w-full sm:w-auto"
              >
                Fechar
              </Button>
            </DialogFooter>
          </>
        ) : (
          // === Formulário de Emissão ===
          <>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5 text-[#F26E1D]" />
                Emitir Boleto
              </DialogTitle>
              <DialogDescription>
                Preencha os dados do pagador e do boleto para gerar a cobrança.
              </DialogDescription>
            </DialogHeader>

            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
              {/* Erro da API */}
              {apiError && (
                <div className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700 dark:border-red-900/50 dark:bg-red-950/20 dark:text-red-300">
                  {apiError}
                </div>
              )}

              {/* Dados do Pagador */}
              <div className="space-y-3">
                <p className="text-sm font-semibold text-gray-700 dark:text-gray-300">
                  Dados do Pagador
                </p>

                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <div className="sm:col-span-2">
                    <Label htmlFor="nome">Nome *</Label>
                    <Input
                      id="nome"
                      placeholder="Nome completo do pagador"
                      {...register("nome")}
                    />
                    {errors.nome && (
                      <p className="mt-1 text-xs text-red-500">{errors.nome.message}</p>
                    )}
                  </div>

                  <div>
                    <Label htmlFor="documento">CPF/CNPJ *</Label>
                    <Input
                      id="documento"
                      placeholder="000.000.000-00"
                      {...register("documento")}
                    />
                    {errors.documento && (
                      <p className="mt-1 text-xs text-red-500">{errors.documento.message}</p>
                    )}
                  </div>

                  <div>
                    <Label htmlFor="email">Email</Label>
                    <Input
                      id="email"
                      type="email"
                      placeholder="email@exemplo.com"
                      {...register("email")}
                    />
                    {errors.email && (
                      <p className="mt-1 text-xs text-red-500">{errors.email.message}</p>
                    )}
                  </div>
                </div>
              </div>

              <Separator />

              {/* Endereço */}
              <div className="space-y-3">
                <p className="text-sm font-semibold text-gray-700 dark:text-gray-300">
                  Endereço
                </p>

                <div className="grid grid-cols-1 gap-3 sm:grid-cols-4">
                  <div className="sm:col-span-3">
                    <Label htmlFor="rua">Rua *</Label>
                    <Input
                      id="rua"
                      placeholder="Nome da rua"
                      {...register("rua")}
                    />
                    {errors.rua && (
                      <p className="mt-1 text-xs text-red-500">{errors.rua.message}</p>
                    )}
                  </div>

                  <div>
                    <Label htmlFor="numero">Nº *</Label>
                    <Input
                      id="numero"
                      placeholder="123"
                      {...register("numero")}
                    />
                    {errors.numero && (
                      <p className="mt-1 text-xs text-red-500">{errors.numero.message}</p>
                    )}
                  </div>

                  <div className="sm:col-span-2">
                    <Label htmlFor="complemento">Complemento</Label>
                    <Input
                      id="complemento"
                      placeholder="Apto, bloco, etc."
                      {...register("complemento")}
                    />
                  </div>

                  <div className="sm:col-span-2">
                    <Label htmlFor="bairro">Bairro *</Label>
                    <Input
                      id="bairro"
                      placeholder="Bairro"
                      {...register("bairro")}
                    />
                    {errors.bairro && (
                      <p className="mt-1 text-xs text-red-500">{errors.bairro.message}</p>
                    )}
                  </div>

                  <div className="sm:col-span-2">
                    <Label htmlFor="cidade">Cidade *</Label>
                    <Input
                      id="cidade"
                      placeholder="Cidade"
                      {...register("cidade")}
                    />
                    {errors.cidade && (
                      <p className="mt-1 text-xs text-red-500">{errors.cidade.message}</p>
                    )}
                  </div>

                  <div>
                    <Label htmlFor="estado">UF *</Label>
                    <Input
                      id="estado"
                      placeholder="SP"
                      maxLength={2}
                      {...register("estado")}
                    />
                    {errors.estado && (
                      <p className="mt-1 text-xs text-red-500">{errors.estado.message}</p>
                    )}
                  </div>

                  <div>
                    <Label htmlFor="cep">CEP *</Label>
                    <Input
                      id="cep"
                      placeholder="00000-000"
                      {...register("cep")}
                    />
                    {errors.cep && (
                      <p className="mt-1 text-xs text-red-500">{errors.cep.message}</p>
                    )}
                  </div>
                </div>
              </div>

              <Separator />

              {/* Dados do Boleto */}
              <div className="space-y-3">
                <p className="text-sm font-semibold text-gray-700 dark:text-gray-300">
                  Dados do Boleto
                </p>

                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <div>
                    <Label htmlFor="valor">Valor (R$) *</Label>
                    <Input
                      id="valor"
                      placeholder="100,00"
                      inputMode="decimal"
                      {...register("valor")}
                    />
                    {errors.valor && (
                      <p className="mt-1 text-xs text-red-500">{errors.valor.message}</p>
                    )}
                  </div>

                  <div>
                    <Label htmlFor="dataVencimento">Vencimento *</Label>
                    <Input
                      id="dataVencimento"
                      type="date"
                      {...register("dataVencimento")}
                    />
                    {errors.dataVencimento && (
                      <p className="mt-1 text-xs text-red-500">{errors.dataVencimento.message}</p>
                    )}
                  </div>

                  <div className="sm:col-span-2">
                    <Label htmlFor="descricaoServico">Descrição do Serviço *</Label>
                    <Input
                      id="descricaoServico"
                      placeholder="Ex: Corte de cabelo, Tratamento capilar..."
                      {...register("descricaoServico")}
                    />
                    {errors.descricaoServico && (
                      <p className="mt-1 text-xs text-red-500">{errors.descricaoServico.message}</p>
                    )}
                  </div>
                </div>
              </div>

              <DialogFooter>
                <Button
                  type="button"
                  variant="ghost"
                  onClick={handleFechar}
                  disabled={loading}
                >
                  Cancelar
                </Button>
                <Button type="submit" disabled={loading}>
                  {loading ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Emitindo...
                    </>
                  ) : (
                    <>
                      <FileText className="h-4 w-4" />
                      Emitir Boleto
                    </>
                  )}
                </Button>
              </DialogFooter>
            </form>
          </>
        )}
      </DialogContent>
    </Dialog>
  )
}
