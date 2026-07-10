"use client"

import { useState } from "react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { PinModal } from "@/components/ui/pin-modal"
import { Check, Eye, EyeOff, Loader2, Lock, ShieldCheck, TestTube } from "lucide-react"

interface RestricoesAcesso {
  areas_protegidas?: string[]
  limite_desconto_sem_pin?: number
}

interface ConfigAcessosProps {
  empresa: {
    id: string
    pin_gerente: string | null
    restricoes_acesso: RestricoesAcesso | null
  }
}

const AREAS_DISPONIVEIS = [
  { id: "financeiro", label: "Financeiro", descricao: "Acesso ao módulo financeiro e movimentações" },
  { id: "relatorios", label: "Relatórios", descricao: "Visualização de relatórios e métricas" },
  { id: "configuracoes", label: "Configurações", descricao: "Alterações nas configurações do sistema" },
  { id: "produtos_precos", label: "Preços de Produtos", descricao: "Alteração de preços de produtos e serviços" },
  { id: "comissoes", label: "Comissões", descricao: "Configuração e visualização de comissões" },
  { id: "excluir_vendas", label: "Excluir Vendas", descricao: "Permissão para excluir vendas registradas" },
] as const

export function ConfigAcessos({ empresa }: ConfigAcessosProps) {
  const restricoes: RestricoesAcesso = empresa.restricoes_acesso || {}

  // Estado do PIN
  const [pin, setPin] = useState("")
  const [confirmarPin, setConfirmarPin] = useState("")
  const [mostrarPin, setMostrarPin] = useState(false)
  const [pinSalvo, setPinSalvo] = useState(!!empresa.pin_gerente)
  const [alterandoPin, setAlterandoPin] = useState(false)

  // Estado das áreas protegidas
  const [areasProtegidas, setAreasProtegidas] = useState<string[]>(
    restricoes.areas_protegidas || []
  )

  // Estado do limite de desconto
  const [limiteDesconto, setLimiteDesconto] = useState<number>(
    restricoes.limite_desconto_sem_pin ?? 10
  )

  // Loading states
  const [salvandoPin, setSalvandoPin] = useState(false)
  const [salvandoRestricoes, setSalvandoRestricoes] = useState(false)

  // PIN modal para teste
  const [testarPinAberto, setTestarPinAberto] = useState(false)

  async function salvarPin() {
    if (!pin) {
      toast.error("Digite o PIN")
      return
    }

    if (pin.length < 4 || pin.length > 6) {
      toast.error("PIN deve ter entre 4 e 6 dígitos")
      return
    }

    if (!/^\d+$/.test(pin)) {
      toast.error("PIN deve conter apenas números")
      return
    }

    if (pin !== confirmarPin) {
      toast.error("Os PINs não conferem")
      return
    }

    setSalvandoPin(true)

    try {
      const res = await fetch("/api/configuracoes/acessos", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ empresa_id: empresa.id, pin }),
      })

      const data = await res.json()

      if (data.sucesso) {
        toast.success("PIN de gerente salvo com sucesso")
        setPinSalvo(true)
        setAlterandoPin(false)
        setPin("")
        setConfirmarPin("")
      } else {
        toast.error(data.erro || "Erro ao salvar PIN")
      }
    } catch {
      toast.error("Erro ao salvar PIN")
    } finally {
      setSalvandoPin(false)
    }
  }

  async function salvarRestricoes() {
    setSalvandoRestricoes(true)

    try {
      const res = await fetch("/api/configuracoes/acessos", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          empresa_id: empresa.id,
          restricoes_acesso: {
            areas_protegidas: areasProtegidas,
            limite_desconto_sem_pin: limiteDesconto,
          },
        }),
      })

      const data = await res.json()

      if (data.sucesso) {
        toast.success("Restrições de acesso salvas")
      } else {
        toast.error(data.erro || "Erro ao salvar restrições")
      }
    } catch {
      toast.error("Erro ao salvar restrições")
    } finally {
      setSalvandoRestricoes(false)
    }
  }

  function toggleArea(areaId: string) {
    setAreasProtegidas((prev) =>
      prev.includes(areaId)
        ? prev.filter((a) => a !== areaId)
        : [...prev, areaId]
    )
  }

  return (
    <div className="space-y-8">
      {/* Seção 1: Definir PIN */}
      <div className="space-y-4">
        <div className="flex items-center gap-2">
          <Lock className="w-5 h-5 text-primary" />
          <h3 className="text-lg font-semibold">PIN de Gerente</h3>
        </div>
        <p className="text-sm text-muted-foreground">
          Defina um PIN numérico de 4 a 6 dígitos para proteger áreas sensíveis do sistema.
        </p>

        {pinSalvo && !alterandoPin ? (
          <div className="flex items-center gap-3 p-4 rounded-lg bg-green-50 dark:bg-green-950/30 border border-green-200 dark:border-green-800">
            <ShieldCheck className="w-5 h-5 text-green-600" />
            <span className="text-sm font-medium text-green-700 dark:text-green-400">
              PIN configurado ✓
            </span>
            <div className="ml-auto flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setTestarPinAberto(true)}
              >
                <TestTube className="w-4 h-4 mr-1" />
                Testar
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setAlterandoPin(true)}
              >
                Alterar PIN
              </Button>
            </div>
          </div>
        ) : (
          <div className="space-y-3 p-4 rounded-lg border bg-card">
            <div className="space-y-2">
              <Label htmlFor="pin">Novo PIN (4-6 dígitos)</Label>
              <div className="relative">
                <Input
                  id="pin"
                  type={mostrarPin ? "text" : "password"}
                  inputMode="numeric"
                  maxLength={6}
                  placeholder="••••••"
                  value={pin}
                  onChange={(e) => {
                    const val = e.target.value.replace(/\D/g, "")
                    setPin(val)
                  }}
                  className="pr-10"
                />
                <button
                  type="button"
                  onClick={() => setMostrarPin(!mostrarPin)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  aria-label={mostrarPin ? "Ocultar PIN" : "Mostrar PIN"}
                >
                  {mostrarPin ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="confirmar-pin">Confirmar PIN</Label>
              <Input
                id="confirmar-pin"
                type={mostrarPin ? "text" : "password"}
                inputMode="numeric"
                maxLength={6}
                placeholder="••••••"
                value={confirmarPin}
                onChange={(e) => {
                  const val = e.target.value.replace(/\D/g, "")
                  setConfirmarPin(val)
                }}
              />
            </div>

            <div className="flex gap-2">
              <Button
                onClick={salvarPin}
                disabled={salvandoPin || !pin || !confirmarPin}
              >
                {salvandoPin ? (
                  <Loader2 className="w-4 h-4 animate-spin mr-1" />
                ) : (
                  <Check className="w-4 h-4 mr-1" />
                )}
                Salvar PIN
              </Button>
              {alterandoPin && (
                <Button
                  variant="ghost"
                  onClick={() => {
                    setAlterandoPin(false)
                    setPin("")
                    setConfirmarPin("")
                  }}
                >
                  Cancelar
                </Button>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Seção 2: Áreas Protegidas */}
      <div className="space-y-4">
        <div className="flex items-center gap-2">
          <ShieldCheck className="w-5 h-5 text-primary" />
          <h3 className="text-lg font-semibold">Áreas Protegidas</h3>
        </div>
        <p className="text-sm text-muted-foreground">
          Selecione quais áreas do sistema exigem o PIN de gerente para acesso.
        </p>

        <div className="space-y-2">
          {AREAS_DISPONIVEIS.map((area) => (
            <div
              key={area.id}
              className="flex items-center justify-between p-3 rounded-lg border bg-card hover:bg-accent/50 transition-colors"
            >
              <div className="space-y-0.5">
                <span className="text-sm font-medium">{area.label}</span>
                <p className="text-xs text-muted-foreground">{area.descricao}</p>
              </div>
              <Switch
                checked={areasProtegidas.includes(area.id)}
                onCheckedChange={() => toggleArea(area.id)}
                disabled={!pinSalvo}
                aria-label={`Proteger ${area.label}`}
              />
            </div>
          ))}
        </div>

        {!pinSalvo && (
          <p className="text-xs text-amber-600 dark:text-amber-400">
            Configure o PIN de gerente primeiro para ativar a proteção de áreas.
          </p>
        )}
      </div>

      {/* Seção 3: Limite de Desconto */}
      <div className="space-y-4">
        <div className="flex items-center gap-2">
          <Lock className="w-5 h-5 text-primary" />
          <h3 className="text-lg font-semibold">Limite de Desconto</h3>
        </div>
        <p className="text-sm text-muted-foreground">
          Percentual máximo de desconto permitido sem necessidade do PIN de gerente.
        </p>

        <div className="flex items-center gap-3 p-4 rounded-lg border bg-card">
          <Label htmlFor="limite-desconto" className="whitespace-nowrap">
            Máximo sem PIN:
          </Label>
          <Input
            id="limite-desconto"
            type="number"
            min={0}
            max={100}
            value={limiteDesconto}
            onChange={(e) => setLimiteDesconto(Number(e.target.value) || 0)}
            className="w-24"
            disabled={!pinSalvo}
          />
          <span className="text-sm text-muted-foreground">%</span>
        </div>

        {pinSalvo && (
          <p className="text-xs text-muted-foreground">
            Descontos acima de {limiteDesconto}% exigirão o PIN de gerente na tela de vendas.
          </p>
        )}
      </div>

      {/* Botão Salvar Restrições */}
      <div className="flex justify-end pt-4 border-t">
        <Button
          onClick={salvarRestricoes}
          disabled={salvandoRestricoes || !pinSalvo}
          size="lg"
        >
          {salvandoRestricoes ? (
            <Loader2 className="w-4 h-4 animate-spin mr-2" />
          ) : (
            <Check className="w-4 h-4 mr-2" />
          )}
          Salvar Restrições de Acesso
        </Button>
      </div>

      {/* Modal de teste do PIN */}
      <PinModal
        aberto={testarPinAberto}
        onClose={() => setTestarPinAberto(false)}
        onSuccess={() => {
          toast.success("PIN correto! Funcionando perfeitamente.")
        }}
        empresaId={empresa.id}
        titulo="Testar PIN"
        descricao="Digite seu PIN para verificar se está funcionando"
      />
    </div>
  )
}
