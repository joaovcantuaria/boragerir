"use client"

import { useState } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { Send, Loader2, Check, AlertCircle, Building2 } from "lucide-react"
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Separator } from "@/components/ui/separator"
import { CoraStatusBadge } from "./cora-status-badge"

// === Schema de validação ===

const transferenciaSchema = z.object({
  banco: z
    .string()
    .min(1, "Código do banco é obrigatório")
    .regex(/^\d{3}$/, "Código do banco deve ter 3 dígitos"),
  agencia: z
    .string()
    .min(1, "Agência é obrigatória")
    .regex(/^\d{4,5}$/, "Agência deve ter 4 ou 5 dígitos"),
  conta: z
    .string()
    .min(1, "Conta é obrigatória")
    .regex(/^\d+[-]?\d$/, "Conta deve ser numérica com dígito verificador"),
  tipoConta: z.enum(["corrente", "poupanca"], {
    required_error: "Selecione o tipo de conta",
  }),
  documento: z
    .string()
    .min(1, "CPF/CNPJ é obrigatório")
    .refine(
      (val) => {
        const digits = val.replace(/\D/g, "")
        return digits.length === 11 || digits.length === 14
      },
      { message: "CPF deve ter 11 dígitos ou CNPJ deve ter 14 dígitos" }
    ),
  nomeTitular: z.string().min(1, "Nome do titular é obrigatório"),
  valor: z
    .string()
    .min(1, "Valor é obrigatório")
    .refine(
      (val) => {
        const num = parseFloat(val.replace(/\./g, "").replace(",", "."))
        return !isNaN(num) && num > 0
      },
      { message: "Valor deve ser maior que zero" }
    ),
  descricao: z.string().min(1, "Descrição é obrigatória"),
})

type TransferenciaForm = z.infer<typeof transferenciaSchema>

// === Tipos de resposta ===

interface TransferenciaResponse {
  id: string
  coraTransferId: string
  valor: number
  descricao: string
  contaDestino: {
    banco: string
    agencia: string
    conta: string
    tipoConta: string
    documento: string
    nomeTitular: string
  }
  status: string
  createdAt: string
}

// === Props do componente ===

interface CoraTransferirProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSuccess?: () => void
}

type Step = "form" | "confirmacao" | "sucesso"

export function CoraTransferir({ open, onOpenChange, onSuccess }: CoraTransferirProps) {
  const [step, setStep] = useState<Step>("form")
  const [loading, setLoading] = useState(false)
  const [resultado, setResultado] = useState<TransferenciaResponse | null>(null)

  const form = useForm<TransferenciaForm>({
    resolver: zodResolver(transferenciaSchema),
    defaultValues: {
      banco: "",
      agencia: "",
      conta: "",
      tipoConta: undefined,
      documento: "",
      nomeTitular: "",
      valor: "",
      descricao: "",
    },
  })

  function resetModal() {
    form.reset()
    setStep("form")
    setResultado(null)
    setLoading(false)
  }

  function handleOpenChange(value: boolean) {
    if (!value) {
      resetModal()
    }
    onOpenChange(value)
  }

  function parseValor(valorStr: string): number {
    return parseFloat(valorStr.replace(/\./g, "").replace(",", "."))
  }

  function formatarValor(valor: number): string {
    return valor.toLocaleString("pt-BR", {
      style: "currency",
      currency: "BRL",
    })
  }

  function formatarDocumento(doc: string): string {
    const digits = doc.replace(/\D/g, "")
    if (digits.length === 11) {
      return digits.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, "$1.$2.$3-$4")
    }
    if (digits.length === 14) {
      return digits.replace(/(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})/, "$1.$2.$3/$4-$5")
    }
    return doc
  }

  function onFormSubmit(data: TransferenciaForm) {
    // Avança para step de confirmação
    setStep("confirmacao")
  }

  async function confirmarTransferencia() {
    setLoading(true)

    const values = form.getValues()
    const valorNumerico = parseValor(values.valor)

    try {
      const res = await fetch("/api/cora/transferencias", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          banco: values.banco,
          agencia: values.agencia,
          conta: values.conta,
          tipoConta: values.tipoConta,
          documento: values.documento.replace(/\D/g, ""),
          nomeTitular: values.nomeTitular,
          valor: valorNumerico,
          descricao: values.descricao,
        }),
      })

      if (!res.ok) {
        const body = await res.json().catch(() => ({}))
        throw new Error(body.error || "Erro ao solicitar transferência")
      }

      const data: TransferenciaResponse = await res.json()
      setResultado(data)
      setStep("sucesso")
      toast.success("Transferência solicitada com sucesso")
      onSuccess?.()
    } catch (err: any) {
      toast.error(err.message || "Erro ao solicitar transferência")
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        {step === "form" && (
          <>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Building2 className="h-5 w-5 text-[#F26E1D]" />
                Nova Transferência
              </DialogTitle>
              <DialogDescription>
                Preencha os dados da conta destino para solicitar a transferência
              </DialogDescription>
            </DialogHeader>

            <form onSubmit={form.handleSubmit(onFormSubmit)} className="space-y-4">
              {/* Banco e Agência */}
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label htmlFor="banco">Banco (código)</Label>
                  <Input
                    id="banco"
                    placeholder="001"
                    maxLength={3}
                    {...form.register("banco")}
                  />
                  {form.formState.errors.banco && (
                    <p className="text-xs text-red-500">
                      {form.formState.errors.banco.message}
                    </p>
                  )}
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="agencia">Agência</Label>
                  <Input
                    id="agencia"
                    placeholder="0001"
                    maxLength={5}
                    {...form.register("agencia")}
                  />
                  {form.formState.errors.agencia && (
                    <p className="text-xs text-red-500">
                      {form.formState.errors.agencia.message}
                    </p>
                  )}
                </div>
              </div>

              {/* Conta e Tipo */}
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label htmlFor="conta">Conta</Label>
                  <Input
                    id="conta"
                    placeholder="12345-6"
                    {...form.register("conta")}
                  />
                  {form.formState.errors.conta && (
                    <p className="text-xs text-red-500">
                      {form.formState.errors.conta.message}
                    </p>
                  )}
                </div>
                <div className="space-y-1.5">
                  <Label>Tipo de conta</Label>
                  <Select
                    value={form.watch("tipoConta")}
                    onValueChange={(val) =>
                      form.setValue("tipoConta", val as "corrente" | "poupanca", {
                        shouldValidate: true,
                      })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="corrente">Corrente</SelectItem>
                      <SelectItem value="poupanca">Poupança</SelectItem>
                    </SelectContent>
                  </Select>
                  {form.formState.errors.tipoConta && (
                    <p className="text-xs text-red-500">
                      {form.formState.errors.tipoConta.message}
                    </p>
                  )}
                </div>
              </div>

              <Separator />

              {/* Documento e Nome Titular */}
              <div className="space-y-1.5">
                <Label htmlFor="documento">CPF/CNPJ do titular</Label>
                <Input
                  id="documento"
                  placeholder="000.000.000-00 ou 00.000.000/0000-00"
                  {...form.register("documento")}
                />
                {form.formState.errors.documento && (
                  <p className="text-xs text-red-500">
                    {form.formState.errors.documento.message}
                  </p>
                )}
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="nomeTitular">Nome do titular</Label>
                <Input
                  id="nomeTitular"
                  placeholder="Nome completo do titular da conta"
                  {...form.register("nomeTitular")}
                />
                {form.formState.errors.nomeTitular && (
                  <p className="text-xs text-red-500">
                    {form.formState.errors.nomeTitular.message}
                  </p>
                )}
              </div>

              <Separator />

              {/* Valor e Descrição */}
              <div className="space-y-1.5">
                <Label htmlFor="valor">Valor (R$)</Label>
                <Input
                  id="valor"
                  placeholder="0,00"
                  {...form.register("valor")}
                />
                {form.formState.errors.valor && (
                  <p className="text-xs text-red-500">
                    {form.formState.errors.valor.message}
                  </p>
                )}
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="descricao">Descrição</Label>
                <Input
                  id="descricao"
                  placeholder="Motivo da transferência"
                  {...form.register("descricao")}
                />
                {form.formState.errors.descricao && (
                  <p className="text-xs text-red-500">
                    {form.formState.errors.descricao.message}
                  </p>
                )}
              </div>

              <DialogFooter>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => handleOpenChange(false)}
                >
                  Cancelar
                </Button>
                <Button
                  type="submit"
                  className="bg-[#F26E1D] hover:bg-[#d9611a] text-white font-bold rounded-xl"
                >
                  <Send className="h-4 w-4" />
                  Continuar
                </Button>
              </DialogFooter>
            </form>
          </>
        )}

        {step === "confirmacao" && (
          <>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <AlertCircle className="h-5 w-5 text-[#F26E1D]" />
                Confirmar Transferência
              </DialogTitle>
              <DialogDescription>
                Revise os dados antes de confirmar a transferência
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-3 rounded-xl border p-4 bg-gray-50 dark:bg-[#1e2030]">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Banco</span>
                <span className="font-medium">{form.getValues("banco")}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Agência</span>
                <span className="font-medium">{form.getValues("agencia")}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Conta</span>
                <span className="font-medium">{form.getValues("conta")}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Tipo</span>
                <span className="font-medium">
                  {form.getValues("tipoConta") === "corrente"
                    ? "Conta Corrente"
                    : "Poupança"}
                </span>
              </div>

              <Separator />

              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Titular</span>
                <span className="font-medium">{form.getValues("nomeTitular")}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">CPF/CNPJ</span>
                <span className="font-medium">
                  {formatarDocumento(form.getValues("documento"))}
                </span>
              </div>

              <Separator />

              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Valor</span>
                <span className="font-bold text-base text-[#F26E1D]">
                  {formatarValor(parseValor(form.getValues("valor")))}
                </span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Descrição</span>
                <span className="font-medium text-right max-w-[200px] truncate">
                  {form.getValues("descricao")}
                </span>
              </div>
            </div>

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setStep("form")}
                disabled={loading}
              >
                Voltar
              </Button>
              <Button
                type="button"
                onClick={confirmarTransferencia}
                disabled={loading}
                className="bg-[#F26E1D] hover:bg-[#d9611a] text-white font-bold rounded-xl"
              >
                {loading ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Enviando...
                  </>
                ) : (
                  <>
                    <Send className="h-4 w-4" />
                    Confirmar Transferência
                  </>
                )}
              </Button>
            </DialogFooter>
          </>
        )}

        {step === "sucesso" && resultado && (
          <>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Check className="h-5 w-5 text-emerald-600" />
                Transferência Solicitada
              </DialogTitle>
              <DialogDescription>
                A transferência foi enviada para processamento
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-3 rounded-xl border p-4 bg-emerald-50 dark:bg-emerald-950/20">
              <div className="flex justify-between items-center text-sm">
                <span className="text-muted-foreground">Status</span>
                <CoraStatusBadge status={resultado.status} />
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Valor</span>
                <span className="font-bold text-base">
                  {formatarValor(resultado.valor)}
                </span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Destinatário</span>
                <span className="font-medium">
                  {resultado.contaDestino.nomeTitular}
                </span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Descrição</span>
                <span className="font-medium text-right max-w-[200px] truncate">
                  {resultado.descricao}
                </span>
              </div>

              <Separator />

              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Banco</span>
                <span>{resultado.contaDestino.banco}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Ag/Conta</span>
                <span>
                  {resultado.contaDestino.agencia} / {resultado.contaDestino.conta}
                </span>
              </div>
            </div>

            <DialogFooter>
              <Button
                type="button"
                onClick={() => handleOpenChange(false)}
                className="bg-[#F26E1D] hover:bg-[#d9611a] text-white font-bold rounded-xl w-full"
              >
                Fechar
              </Button>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  )
}
