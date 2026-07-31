"use client"

import { useState } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { FileText, Loader2, Calendar, DollarSign, Layers, ArrowLeft } from "lucide-react"
import { toast } from "sonner"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Separator } from "@/components/ui/separator"
import { formatarMoeda } from "@/lib/utils"

// --- Types ---

interface CoraEmitirCarneProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSuccess?: () => void
  clienteId?: string
  clienteNome?: string
  clienteDocumento?: string
  clienteEmail?: string
  contratoId?: string
}

interface ParcelaPreview {
  numero: number
  valor: number
  vencimento: string
}

interface CarneResult {
  carneId: string
  parcelas: any[]
}

// --- Schema ---

const schema = z.object({
  nome: z.string().min(3, "Nome é obrigatório (mín. 3 caracteres)"),
  documento: z.string().min(11, "CPF ou CNPJ inválido").max(14, "CPF ou CNPJ inválido"),
  email: z.string().email("E-mail inválido"),
  cep: z.string().min(8, "CEP inválido").max(9, "CEP inválido"),
  logradouro: z.string().min(1, "Logradouro é obrigatório"),
  numero: z.string().min(1, "Número é obrigatório"),
  bairro: z.string().min(1, "Bairro é obrigatório"),
  cidade: z.string().min(1, "Cidade é obrigatória"),
  uf: z.string().length(2, "UF inválido"),
  valorTotal: z.string().min(1, "Valor total é obrigatório"),
  numeroParcelas: z.string().min(1, "Número de parcelas é obrigatório"),
  dataVencimentoPrimeira: z.string().min(1, "Data do primeiro vencimento é obrigatória"),
  descricaoServico: z.string().min(1, "Descrição do serviço é obrigatória"),
})

type FormData = z.infer<typeof schema>

// --- Helpers ---

function detectarTipoPessoa(documento: string): "PERSON" | "BUSINESS" {
  const limpo = documento.replace(/\D/g, "")
  return limpo.length === 14 ? "BUSINESS" : "PERSON"
}

function calcularParcelas(valorTotal: number, numeroParcelas: number, dataInicial: string): ParcelaPreview[] {
  const valorBase = Math.floor((valorTotal * 100) / numeroParcelas) / 100
  const soma = valorBase * (numeroParcelas - 1)
  const valorPrimeira = Math.round((valorTotal - soma) * 100) / 100

  const parcelas: ParcelaPreview[] = []
  const baseDate = new Date(dataInicial + "T12:00:00")

  for (let i = 0; i < numeroParcelas; i++) {
    const dataVenc = new Date(baseDate)
    dataVenc.setMonth(dataVenc.getMonth() + i)

    parcelas.push({
      numero: i + 1,
      valor: i === 0 ? valorPrimeira : valorBase,
      vencimento: dataVenc.toISOString().split("T")[0],
    })
  }

  return parcelas
}

function formatarData(dateStr: string): string {
  const [ano, mes, dia] = dateStr.split("-")
  return `${dia}/${mes}/${ano}`
}

// --- Component ---

export function CoraEmitirCarne({
  open,
  onOpenChange,
  onSuccess,
  clienteId,
  clienteNome,
  clienteDocumento,
  clienteEmail,
  contratoId,
}: CoraEmitirCarneProps) {
  const [step, setStep] = useState<"form" | "preview" | "sucesso">("form")
  const [loading, setLoading] = useState(false)
  const [parcelas, setParcelas] = useState<ParcelaPreview[]>([])
  const [resultado, setResultado] = useState<CarneResult | null>(null)

  const { register, handleSubmit, watch, reset, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: {
      nome: clienteNome || "",
      documento: clienteDocumento || "",
      email: clienteEmail || "",
      cep: "",
      logradouro: "",
      numero: "",
      bairro: "",
      cidade: "",
      uf: "",
      valorTotal: "",
      numeroParcelas: "12",
      dataVencimentoPrimeira: "",
      descricaoServico: "",
    },
  })

  function handleClose() {
    if (!loading) {
      setStep("form")
      setParcelas([])
      setResultado(null)
      reset()
      onOpenChange(false)
    }
  }

  function onPreview(data: FormData) {
    const valor = parseFloat(data.valorTotal.replace(",", "."))
    const numParcelas = parseInt(data.numeroParcelas)

    if (isNaN(valor) || valor <= 0) {
      toast.error("Valor total deve ser maior que zero")
      return
    }
    if (isNaN(numParcelas) || numParcelas < 2 || numParcelas > 48) {
      toast.error("Número de parcelas deve ser entre 2 e 48")
      return
    }

    const preview = calcularParcelas(valor, numParcelas, data.dataVencimentoPrimeira)
    setParcelas(preview)
    setStep("preview")
  }

  async function onConfirmar() {
    setLoading(true)
    try {
      const data = watch()
      const documento = data.documento.replace(/\D/g, "")
      const tipo = detectarTipoPessoa(documento)

      const body = {
        pagador: {
          nome: data.nome,
          documento,
          email: data.email,
          tipo,
          endereco: {
            cep: data.cep.replace(/\D/g, ""),
            logradouro: data.logradouro,
            numero: data.numero,
            bairro: data.bairro,
            cidade: data.cidade,
            uf: data.uf.toUpperCase(),
          },
        },
        valorTotal: parseFloat(data.valorTotal.replace(",", ".")),
        numeroParcelas: parseInt(data.numeroParcelas),
        dataVencimentoPrimeira: data.dataVencimentoPrimeira,
        descricaoServico: data.descricaoServico,
        ...(clienteId && { clienteId }),
        ...(contratoId && { contratoId }),
      }

      const res = await fetch("/api/cora/boletos/carne", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      })

      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        throw new Error(err.error || "Erro ao emitir carnê")
      }

      const result = await res.json()
      setResultado(result)
      setStep("sucesso")
      toast.success("Carnê emitido com sucesso!")
      onSuccess?.()
    } catch (err: any) {
      toast.error(err.message || "Erro ao emitir carnê")
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Layers className="h-5 w-5 text-[#F26E1D]" />
            {step === "form" && "Emitir Carnê"}
            {step === "preview" && "Confirmar Parcelas"}
            {step === "sucesso" && "Carnê Emitido"}
          </DialogTitle>
          <DialogDescription>
            {step === "form" && "Preencha os dados do pagador e condições do carnê"}
            {step === "preview" && "Confira as parcelas antes de confirmar a emissão"}
            {step === "sucesso" && "O carnê foi emitido com sucesso"}
          </DialogDescription>
        </DialogHeader>

        {/* Step 1: Formulário */}
        {step === "form" && (
          <form onSubmit={handleSubmit(onPreview)} className="space-y-4">
            {/* Dados do pagador */}
            <div className="space-y-3">
              <p className="text-sm font-semibold text-gray-700 dark:text-gray-300 flex items-center gap-1.5">
                <FileText className="h-4 w-4 text-[#F26E1D]" />
                Dados do pagador
              </p>

              <div className="grid grid-cols-2 gap-3">
                <div className="col-span-2">
                  <Label htmlFor="nome">Nome completo</Label>
                  <Input id="nome" {...register("nome")} placeholder="Nome do pagador" />
                  {errors.nome && <span className="text-xs text-red-500">{errors.nome.message}</span>}
                </div>

                <div>
                  <Label htmlFor="documento">CPF/CNPJ</Label>
                  <Input id="documento" {...register("documento")} placeholder="Somente números" />
                  {errors.documento && <span className="text-xs text-red-500">{errors.documento.message}</span>}
                </div>

                <div>
                  <Label htmlFor="email">E-mail</Label>
                  <Input id="email" type="email" {...register("email")} placeholder="email@exemplo.com" />
                  {errors.email && <span className="text-xs text-red-500">{errors.email.message}</span>}
                </div>
              </div>

              {/* Endereço */}
              <div className="grid grid-cols-4 gap-3">
                <div>
                  <Label htmlFor="cep">CEP</Label>
                  <Input id="cep" {...register("cep")} placeholder="00000000" />
                  {errors.cep && <span className="text-xs text-red-500">{errors.cep.message}</span>}
                </div>

                <div className="col-span-2">
                  <Label htmlFor="logradouro">Logradouro</Label>
                  <Input id="logradouro" {...register("logradouro")} placeholder="Rua, Av..." />
                  {errors.logradouro && <span className="text-xs text-red-500">{errors.logradouro.message}</span>}
                </div>

                <div>
                  <Label htmlFor="numero-end">Nº</Label>
                  <Input id="numero-end" {...register("numero")} placeholder="123" />
                  {errors.numero && <span className="text-xs text-red-500">{errors.numero.message}</span>}
                </div>

                <div className="col-span-2">
                  <Label htmlFor="bairro">Bairro</Label>
                  <Input id="bairro" {...register("bairro")} placeholder="Bairro" />
                  {errors.bairro && <span className="text-xs text-red-500">{errors.bairro.message}</span>}
                </div>

                <div>
                  <Label htmlFor="cidade">Cidade</Label>
                  <Input id="cidade" {...register("cidade")} placeholder="Cidade" />
                  {errors.cidade && <span className="text-xs text-red-500">{errors.cidade.message}</span>}
                </div>

                <div>
                  <Label htmlFor="uf">UF</Label>
                  <Input id="uf" {...register("uf")} placeholder="SP" maxLength={2} />
                  {errors.uf && <span className="text-xs text-red-500">{errors.uf.message}</span>}
                </div>
              </div>
            </div>

            <Separator />

            {/* Condições do carnê */}
            <div className="space-y-3">
              <p className="text-sm font-semibold text-gray-700 dark:text-gray-300 flex items-center gap-1.5">
                <DollarSign className="h-4 w-4 text-[#F26E1D]" />
                Condições do carnê
              </p>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label htmlFor="valorTotal">Valor total (R$)</Label>
                  <Input id="valorTotal" {...register("valorTotal")} placeholder="1000,00" />
                  {errors.valorTotal && <span className="text-xs text-red-500">{errors.valorTotal.message}</span>}
                </div>

                <div>
                  <Label htmlFor="numeroParcelas">Nº de parcelas</Label>
                  <Input id="numeroParcelas" type="number" min={2} max={48} {...register("numeroParcelas")} placeholder="12" />
                  {errors.numeroParcelas && <span className="text-xs text-red-500">{errors.numeroParcelas.message}</span>}
                </div>

                <div>
                  <Label htmlFor="dataVencimentoPrimeira">1º vencimento</Label>
                  <Input id="dataVencimentoPrimeira" type="date" {...register("dataVencimentoPrimeira")} />
                  {errors.dataVencimentoPrimeira && <span className="text-xs text-red-500">{errors.dataVencimentoPrimeira.message}</span>}
                </div>

                <div>
                  <Label htmlFor="descricaoServico">Descrição</Label>
                  <Input id="descricaoServico" {...register("descricaoServico")} placeholder="Serviço prestado" />
                  {errors.descricaoServico && <span className="text-xs text-red-500">{errors.descricaoServico.message}</span>}
                </div>
              </div>
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={handleClose}>
                Cancelar
              </Button>
              <Button
                type="submit"
                className="bg-[#F26E1D] hover:bg-[#d45e17] text-white font-bold rounded-xl"
              >
                <Calendar className="h-4 w-4" />
                Visualizar Parcelas
              </Button>
            </DialogFooter>
          </form>
        )}

        {/* Step 2: Preview de parcelas */}
        {step === "preview" && (
          <div className="space-y-4">
            <div className="rounded-xl border border-orange-200 bg-orange-50/50 p-3 dark:border-orange-900/40 dark:bg-orange-950/10">
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-600 dark:text-gray-400">Valor total:</span>
                <span className="font-bold text-gray-900 dark:text-gray-100">
                  {formatarMoeda(parcelas.reduce((acc, p) => acc + p.valor, 0))}
                </span>
              </div>
              <div className="flex items-center justify-between text-sm mt-1">
                <span className="text-gray-600 dark:text-gray-400">Parcelas:</span>
                <span className="font-bold text-gray-900 dark:text-gray-100">{parcelas.length}x</span>
              </div>
            </div>

            <div className="max-h-60 overflow-y-auto rounded-xl border border-gray-200 dark:border-gray-700">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 dark:bg-white/[0.04] sticky top-0">
                  <tr>
                    <th className="text-left px-3 py-2 font-semibold text-gray-600 dark:text-gray-400">Parcela</th>
                    <th className="text-left px-3 py-2 font-semibold text-gray-600 dark:text-gray-400">Vencimento</th>
                    <th className="text-right px-3 py-2 font-semibold text-gray-600 dark:text-gray-400">Valor</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                  {parcelas.map((p) => (
                    <tr key={p.numero} className="hover:bg-gray-50 dark:hover:bg-white/[0.02]">
                      <td className="px-3 py-2 text-gray-900 dark:text-gray-100">{p.numero}/{parcelas.length}</td>
                      <td className="px-3 py-2 text-gray-600 dark:text-gray-400">{formatarData(p.vencimento)}</td>
                      <td className="px-3 py-2 text-right font-medium text-gray-900 dark:text-gray-100">
                        {formatarMoeda(p.valor)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setStep("form")} disabled={loading}>
                <ArrowLeft className="h-4 w-4" />
                Voltar
              </Button>
              <Button
                type="button"
                onClick={onConfirmar}
                disabled={loading}
                className="bg-[#F26E1D] hover:bg-[#d45e17] text-white font-bold rounded-xl"
              >
                {loading ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Emitindo...
                  </>
                ) : (
                  <>
                    <Layers className="h-4 w-4" />
                    Confirmar Emissão
                  </>
                )}
              </Button>
            </DialogFooter>
          </div>
        )}

        {/* Step 3: Sucesso */}
        {step === "sucesso" && resultado && (
          <div className="space-y-4">
            <div className="flex flex-col items-center gap-3 py-4 text-center">
              <div className="rounded-full bg-emerald-50 p-4 dark:bg-emerald-950/20">
                <Layers className="h-8 w-8 text-emerald-600 dark:text-emerald-400" />
              </div>
              <div className="space-y-1">
                <p className="font-bold text-gray-900 dark:text-gray-100">
                  Carnê emitido com sucesso!
                </p>
                <p className="text-sm text-muted-foreground">
                  {resultado.parcelas.length} parcela{resultado.parcelas.length > 1 ? "s" : ""} emitida{resultado.parcelas.length > 1 ? "s" : ""}
                </p>
              </div>
            </div>

            <div className="rounded-xl border border-emerald-200 bg-emerald-50/50 p-3 dark:border-emerald-900/40 dark:bg-emerald-950/10">
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-600 dark:text-gray-400">ID do carnê:</span>
                <span className="font-mono text-xs text-gray-900 dark:text-gray-100">{resultado.carneId}</span>
              </div>
              <div className="flex items-center justify-between text-sm mt-1">
                <span className="text-gray-600 dark:text-gray-400">Total de parcelas:</span>
                <span className="font-bold text-gray-900 dark:text-gray-100">{resultado.parcelas.length}</span>
              </div>
            </div>

            <DialogFooter>
              <Button
                type="button"
                onClick={handleClose}
                className="bg-[#F26E1D] hover:bg-[#d45e17] text-white font-bold rounded-xl"
              >
                Fechar
              </Button>
            </DialogFooter>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}
