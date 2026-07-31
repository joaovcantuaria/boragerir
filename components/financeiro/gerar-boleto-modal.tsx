"use client"

import { useState, useEffect } from "react"
import { useForm } from "react-hook-form"
import { z } from "zod"
import { zodResolver } from "@hookform/resolvers/zod"
import { FileText, Loader2 } from "lucide-react"
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

const gerarBoletoSchema = z.object({
  valor: z.string().min(1, "Valor é obrigatório"),
  descricaoServico: z.string().min(1, "Descrição do serviço é obrigatória"),
  dataVencimento: z.string().min(1, "Data de vencimento é obrigatória"),
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
})

type GerarBoletoFormData = z.infer<typeof gerarBoletoSchema>

// === Props do componente ===

interface GerarBoletoModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSuccess?: () => void
  // Pre-filled from the valor_receber record:
  valorReceberId: string
  valor: number
  descricao: string
  dataVencimento: string
  // Optional pre-filled client data:
  clienteNome?: string
  clienteDocumento?: string
}

// === Helpers ===

function parseBRLToFloat(value: string): number {
  const cleaned = value.replace(/\./g, "").replace(",", ".")
  const num = parseFloat(cleaned)
  return isNaN(num) ? 0 : num
}

function formatValorParaInput(valor: number): string {
  return valor.toFixed(2).replace(".", ",")
}

function detectTipoPagador(documento: string): "PERSON" | "BUSINESS" {
  const digits = documento.replace(/\D/g, "")
  return digits.length === 14 ? "BUSINESS" : "PERSON"
}

// === Componente ===

export function GerarBoletoModal({
  open,
  onOpenChange,
  onSuccess,
  valorReceberId,
  valor,
  descricao,
  dataVencimento,
  clienteNome,
  clienteDocumento,
}: GerarBoletoModalProps) {
  const [loading, setLoading] = useState(false)
  const [apiError, setApiError] = useState<string | null>(null)

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<GerarBoletoFormData>({
    resolver: zodResolver(gerarBoletoSchema),
    defaultValues: {
      valor: formatValorParaInput(valor),
      descricaoServico: descricao || "",
      dataVencimento: dataVencimento || "",
      nome: clienteNome || "",
      documento: clienteDocumento || "",
      email: "",
      rua: "",
      numero: "",
      complemento: "",
      bairro: "",
      cidade: "",
      estado: "",
      cep: "",
    },
  })

  // Reset do form quando o modal abre/fecha
  useEffect(() => {
    if (open) {
      setApiError(null)
      reset({
        valor: formatValorParaInput(valor),
        descricaoServico: descricao || "",
        dataVencimento: dataVencimento || "",
        nome: clienteNome || "",
        documento: clienteDocumento || "",
        email: "",
        rua: "",
        numero: "",
        complemento: "",
        bairro: "",
        cidade: "",
        estado: "",
        cep: "",
      })
    }
  }, [open, valor, descricao, dataVencimento, clienteNome, clienteDocumento, reset])

  async function onSubmit(data: GerarBoletoFormData) {
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
      valorReceberId,
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
    }

    try {
      const res = await fetch("/api/cora/boletos", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      })

      const json = await res.json()

      if (!res.ok) {
        setApiError(json.error || "Erro ao gerar boleto. Tente novamente.")
        setLoading(false)
        return
      }

      toast.success("Boleto gerado com sucesso!")
      onSuccess?.()
      onOpenChange(false)
    } catch {
      setApiError("Erro de conexão. Verifique sua internet e tente novamente.")
    } finally {
      setLoading(false)
    }
  }

  function handleFechar() {
    if (!loading) {
      onOpenChange(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={loading ? undefined : onOpenChange}>
      <DialogContent className="max-w-lg sm:max-w-xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5 text-[#F26E1D]" />
            Gerar Boleto
          </DialogTitle>
          <DialogDescription>
            Gere um boleto registrado para este valor a receber. Preencha os dados do pagador para emissão.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          {/* Erro da API */}
          {apiError && (
            <div className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700 dark:border-red-900/50 dark:bg-red-950/20 dark:text-red-300">
              {apiError}
            </div>
          )}

          {/* Dados do Boleto */}
          <div className="space-y-3">
            <p className="text-sm font-semibold text-gray-700 dark:text-gray-300">
              Dados do Boleto
            </p>

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div>
                <Label htmlFor="gerar-valor">Valor (R$) *</Label>
                <Input
                  id="gerar-valor"
                  placeholder="100,00"
                  inputMode="decimal"
                  {...register("valor")}
                />
                {errors.valor && (
                  <p className="mt-1 text-xs text-red-500">{errors.valor.message}</p>
                )}
              </div>

              <div>
                <Label htmlFor="gerar-dataVencimento">Vencimento *</Label>
                <Input
                  id="gerar-dataVencimento"
                  type="date"
                  {...register("dataVencimento")}
                />
                {errors.dataVencimento && (
                  <p className="mt-1 text-xs text-red-500">{errors.dataVencimento.message}</p>
                )}
              </div>

              <div className="sm:col-span-2">
                <Label htmlFor="gerar-descricaoServico">Descrição do Serviço *</Label>
                <Input
                  id="gerar-descricaoServico"
                  placeholder="Ex: Mensalidade, Serviço prestado..."
                  {...register("descricaoServico")}
                />
                {errors.descricaoServico && (
                  <p className="mt-1 text-xs text-red-500">{errors.descricaoServico.message}</p>
                )}
              </div>
            </div>
          </div>

          <Separator />

          {/* Dados do Pagador */}
          <div className="space-y-3">
            <p className="text-sm font-semibold text-gray-700 dark:text-gray-300">
              Dados do Pagador
            </p>

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div className="sm:col-span-2">
                <Label htmlFor="gerar-nome">Nome *</Label>
                <Input
                  id="gerar-nome"
                  placeholder="Nome completo do pagador"
                  {...register("nome")}
                />
                {errors.nome && (
                  <p className="mt-1 text-xs text-red-500">{errors.nome.message}</p>
                )}
              </div>

              <div>
                <Label htmlFor="gerar-documento">CPF/CNPJ *</Label>
                <Input
                  id="gerar-documento"
                  placeholder="000.000.000-00"
                  {...register("documento")}
                />
                {errors.documento && (
                  <p className="mt-1 text-xs text-red-500">{errors.documento.message}</p>
                )}
              </div>

              <div>
                <Label htmlFor="gerar-email">Email</Label>
                <Input
                  id="gerar-email"
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
                <Label htmlFor="gerar-rua">Rua *</Label>
                <Input
                  id="gerar-rua"
                  placeholder="Nome da rua"
                  {...register("rua")}
                />
                {errors.rua && (
                  <p className="mt-1 text-xs text-red-500">{errors.rua.message}</p>
                )}
              </div>

              <div>
                <Label htmlFor="gerar-numero">Nº *</Label>
                <Input
                  id="gerar-numero"
                  placeholder="123"
                  {...register("numero")}
                />
                {errors.numero && (
                  <p className="mt-1 text-xs text-red-500">{errors.numero.message}</p>
                )}
              </div>

              <div className="sm:col-span-2">
                <Label htmlFor="gerar-complemento">Complemento</Label>
                <Input
                  id="gerar-complemento"
                  placeholder="Apto, bloco, etc."
                  {...register("complemento")}
                />
              </div>

              <div className="sm:col-span-2">
                <Label htmlFor="gerar-bairro">Bairro *</Label>
                <Input
                  id="gerar-bairro"
                  placeholder="Bairro"
                  {...register("bairro")}
                />
                {errors.bairro && (
                  <p className="mt-1 text-xs text-red-500">{errors.bairro.message}</p>
                )}
              </div>

              <div className="sm:col-span-2">
                <Label htmlFor="gerar-cidade">Cidade *</Label>
                <Input
                  id="gerar-cidade"
                  placeholder="Cidade"
                  {...register("cidade")}
                />
                {errors.cidade && (
                  <p className="mt-1 text-xs text-red-500">{errors.cidade.message}</p>
                )}
              </div>

              <div>
                <Label htmlFor="gerar-estado">UF *</Label>
                <Input
                  id="gerar-estado"
                  placeholder="SP"
                  maxLength={2}
                  {...register("estado")}
                />
                {errors.estado && (
                  <p className="mt-1 text-xs text-red-500">{errors.estado.message}</p>
                )}
              </div>

              <div>
                <Label htmlFor="gerar-cep">CEP *</Label>
                <Input
                  id="gerar-cep"
                  placeholder="00000-000"
                  {...register("cep")}
                />
                {errors.cep && (
                  <p className="mt-1 text-xs text-red-500">{errors.cep.message}</p>
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
            <Button
              type="submit"
              disabled={loading}
              className="bg-[#F26E1D] hover:bg-[#d95e15]"
            >
              {loading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Gerando...
                </>
              ) : (
                <>
                  <FileText className="h-4 w-4" />
                  Gerar Boleto
                </>
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
