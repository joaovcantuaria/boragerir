"use client"

import { useState } from "react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
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
  {
    id: "financeiro",
    label: "Financeiro",
    descricao: "Acesso ao módulo financeiro e caixa",
    subitens: [
      { id: "financeiro_ver_movimentacoes", label: "Ver movimentações" },
      { id: "financeiro_fechar_caixa", label: "Fechar caixa" },
      { id: "financeiro_sangria", label: "Realizar sangria/suprimento" },
      { id: "financeiro_relatorio_caixa", label: "Relatório do caixa" },
    ],
  },
  {
    id: "relatorios",
    label: "Relatórios",
    descricao: "Visualização de relatórios e métricas",
    subitens: [
      { id: "relatorios_dashboard", label: "Ver dashboard" },
      { id: "relatorios_exportar", label: "Exportar dados" },
    ],
  },
  {
    id: "configuracoes",
    label: "Configurações",
    descricao: "Alterações nas configurações do sistema",
    subitens: [
      { id: "configuracoes_dados", label: "Dados do negócio" },
      { id: "configuracoes_plano", label: "Plano e assinatura" },
      { id: "configuracoes_categorias", label: "Categorias" },
    ],
  },
  {
    id: "produtos_precos",
    label: "Preços de Produtos",
    descricao: "Alteração de preços de produtos e serviços",
    subitens: [
      { id: "produtos_editar_preco", label: "Editar preços" },
      { id: "produtos_cadastrar", label: "Cadastrar produto/serviço" },
      { id: "produtos_excluir", label: "Excluir produto/serviço" },
    ],
  },
  {
    id: "comissoes",
    label: "Comissões",
    descricao: "Configuração e visualização de comissões",
    subitens: [
      { id: "comissoes_ver", label: "Ver comissões" },
      { id: "comissoes_alterar", label: "Alterar percentuais" },
    ],
  },
  {
    id: "excluir_vendas",
    label: "Excluir Vendas",
    descricao: "Permissão para excluir vendas registradas",
    subitens: [],
  },
] as const

export function ConfigAcessos({ empresa }: ConfigAcessosProps) {
  const restricoes: RestricoesAcesso = empresa.restricoes_acesso || {}
  const pinJaConfigurado = !!empresa.pin_gerente

  // Controle de acesso ao painel — se PIN já existe, precisa desbloquear primeiro
  const [painelDesbloqueado, setPainelDesbloqueado] = useState(!pinJaConfigurado)
  const [pedindoPin, setPedindoPin] = useState(pinJaConfigurado)

  // Estado do PIN
  const [pin, setPin] = useState("")
  const [confirmarPin, setConfirmarPin] = useState("")
  const [mostrarPin, setMostrarPin] = useState(false)
  const [pinSalvo, setPinSalvo] = useState(pinJaConfigurado)
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

  // PIN modal para teste e para alterar
  const [testarPinAberto, setTestarPinAberto] = useState(false)
  const [alterarPinModal, setAlterarPinModal] = useState(false)

  async function salvarPin() {
    if (!pin) { toast.error("Digite o PIN"); return }
    if (pin.length < 4 || pin.length > 6) { toast.error("PIN deve ter entre 4 e 6 dígitos"); return }
    if (!/^\d+$/.test(pin)) { toast.error("PIN deve conter apenas números"); return }
    if (pin !== confirmarPin) { toast.error("Os PINs não conferem"); return }

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
      prev.includes(areaId) ? prev.filter((a) => a !== areaId) : [...prev, areaId]
    )
  }

  // Se PIN já configurado e painel não desbloqueado — mostra tela de bloqueio
  if (pinJaConfigurado && !painelDesbloqueado) {
    return (
      <div className="flex flex-col items-center justify-center py-16 space-y-6">
        <div className="w-16 h-16 rounded-2xl bg-orange-500/10 flex items-center justify-center">
          <Lock className="w-8 h-8 text-orange-500" />
        </div>
        <div className="text-center space-y-2">
          <h3 className="text-xl font-bold">Painel Protegido</h3>
          <p className="text-sm text-muted-foreground max-w-sm">
            As configurações de acessos estão protegidas pelo PIN de gerente.
            Digite o PIN para acessar este painel.
          </p>
        </div>
        <Button
          onClick={() => setPedindoPin(true)}
          className="gap-2 bg-orange-500 hover:bg-orange-600 text-white"
          size="lg"
        >
          <Lock className="w-4 h-4" />
          Desbloquear com PIN
        </Button>

        <PinModal
          aberto={pedindoPin}
          onClose={() => setPedindoPin(false)}
          onSuccess={() => {
            setPainelDesbloqueado(true)
            setPedindoPin(false)
          }}
          empresaId={empresa.id}
          titulo="Desbloquear Acessos"
          descricao="Digite o PIN de gerente para acessar as configurações"
          onPinResetado={() => {
            // PIN foi resetado via email — recarregar a página para refletir
            window.location.reload()
          }}
        />
      </div>
    )
  }

  return (
    <div className="space-y-8">
      {/* Seção 1: Definir PIN */}
      <div className="space-y-4">
        <div className="flex items-center gap-2">
          <Lock className="w-5 h-5 text-orange-500" />
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
              <Button variant="outline" size="sm" onClick={() => setTestarPinAberto(true)}>
                <TestTube className="w-4 h-4 mr-1" /> Testar
              </Button>
              <Button variant="outline" size="sm" onClick={() => setAlterarPinModal(true)}>
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
                  onChange={(e) => setPin(e.target.value.replace(/\D/g, ""))}
                  className="pr-10"
                />
                <button type="button" onClick={() => setMostrarPin(!mostrarPin)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
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
                onChange={(e) => setConfirmarPin(e.target.value.replace(/\D/g, ""))}
              />
            </div>
            <div className="flex gap-2">
              <Button onClick={salvarPin} disabled={salvandoPin || !pin || !confirmarPin}>
                {salvandoPin ? <Loader2 className="w-4 h-4 animate-spin mr-1" /> : <Check className="w-4 h-4 mr-1" />}
                Salvar PIN
              </Button>
              {alterandoPin && (
                <Button variant="ghost" onClick={() => { setAlterandoPin(false); setPin(""); setConfirmarPin("") }}>
                  Cancelar
                </Button>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Seção 2: Áreas Protegidas — com toggle laranja visível */}
      <div className="space-y-4">
        <div className="flex items-center gap-2">
          <ShieldCheck className="w-5 h-5 text-orange-500" />
          <h3 className="text-lg font-semibold">Áreas Protegidas</h3>
        </div>
        <p className="text-sm text-muted-foreground">
          Selecione quais áreas do sistema exigem o PIN de gerente para acesso.
        </p>

        <div className="space-y-2">
          {AREAS_DISPONIVEIS.map((area) => {
            const ativo = areasProtegidas.includes(area.id)
            return (
              <div key={area.id} className="space-y-0">
                <button
                  type="button"
                  onClick={() => pinSalvo && toggleArea(area.id)}
                  disabled={!pinSalvo}
                  className={`w-full flex items-center justify-between p-3.5 rounded-xl border-2 transition-all text-left ${
                    ativo
                      ? "border-orange-500 bg-orange-50 dark:bg-orange-500/10 rounded-b-none"
                      : "border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 hover:border-orange-300 dark:hover:border-orange-700"
                  } ${!pinSalvo ? "opacity-50 cursor-not-allowed" : "cursor-pointer"}`}
                >
                  <div className="space-y-0.5">
                    <span className={`text-sm font-semibold ${ativo ? "text-orange-700 dark:text-orange-300" : "text-foreground"}`}>
                      {area.label}
                    </span>
                    <p className={`text-xs ${ativo ? "text-orange-600/70 dark:text-orange-400/70" : "text-muted-foreground"}`}>
                      {area.descricao}
                    </p>
                  </div>
                  <div className={`w-12 h-7 rounded-full flex items-center transition-all px-1 ${
                    ativo
                      ? "bg-orange-500 justify-end"
                      : "bg-zinc-300 dark:bg-zinc-600 justify-start"
                  }`}>
                    <div className={`w-5 h-5 rounded-full shadow-sm transition-all ${
                      ativo ? "bg-white" : "bg-white dark:bg-zinc-300"
                    }`} />
                  </div>
                </button>

                {/* Subitens — expandem ao ativar a área */}
                {ativo && area.subitens.length > 0 && (
                  <div className="border-2 border-t-0 border-orange-500 rounded-b-xl bg-orange-50/50 dark:bg-orange-500/5 p-3 space-y-1.5">
                    <p className="text-[10px] font-semibold text-orange-600 dark:text-orange-400 uppercase tracking-wider mb-2">
                      Funções protegidas dentro de {area.label}:
                    </p>
                    {area.subitens.map((sub) => {
                      const subAtivo = areasProtegidas.includes(sub.id)
                      return (
                        <button
                          key={sub.id}
                          type="button"
                          onClick={() => toggleArea(sub.id)}
                          className={`w-full flex items-center justify-between px-3 py-2 rounded-lg transition-all text-left ${
                            subAtivo
                              ? "bg-orange-100 dark:bg-orange-500/20 border border-orange-300 dark:border-orange-600"
                              : "bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 hover:border-orange-200"
                          }`}
                        >
                          <span className={`text-xs font-medium ${subAtivo ? "text-orange-700 dark:text-orange-300" : "text-foreground"}`}>
                            {sub.label}
                          </span>
                          <div className={`w-9 h-5 rounded-full flex items-center transition-all px-0.5 ${
                            subAtivo
                              ? "bg-orange-500 justify-end"
                              : "bg-zinc-300 dark:bg-zinc-600 justify-start"
                          }`}>
                            <div className="w-4 h-4 rounded-full bg-white shadow-sm" />
                          </div>
                        </button>
                      )
                    })}
                  </div>
                )}
              </div>
            )
          })}
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
          <Lock className="w-5 h-5 text-orange-500" />
          <h3 className="text-lg font-semibold">Limite de Desconto</h3>
        </div>
        <p className="text-sm text-muted-foreground">
          Percentual máximo de desconto permitido sem necessidade do PIN de gerente.
        </p>

        <div className="flex items-center gap-3 p-4 rounded-xl border-2 border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900">
          <Label htmlFor="limite-desconto" className="whitespace-nowrap font-medium">
            Máximo sem PIN:
          </Label>
          <Input
            id="limite-desconto"
            type="number"
            min={0}
            max={100}
            value={limiteDesconto}
            onChange={(e) => setLimiteDesconto(Number(e.target.value) || 0)}
            className="w-24 text-center font-bold"
            disabled={!pinSalvo}
          />
          <span className="text-sm font-semibold text-muted-foreground">%</span>
        </div>

        {pinSalvo && (
          <p className="text-xs text-muted-foreground">
            Descontos acima de <strong className="text-orange-600">{limiteDesconto}%</strong> exigirão o PIN de gerente na tela de vendas.
          </p>
        )}
      </div>

      {/* Botão Salvar Restrições */}
      <div className="flex justify-end pt-4 border-t">
        <Button
          onClick={salvarRestricoes}
          disabled={salvandoRestricoes || !pinSalvo}
          size="lg"
          className="bg-orange-500 hover:bg-orange-600 text-white"
        >
          {salvandoRestricoes ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Check className="w-4 h-4 mr-2" />}
          Salvar Restrições de Acesso
        </Button>
      </div>

      {/* Modal de teste do PIN */}
      <PinModal
        aberto={testarPinAberto}
        onClose={() => setTestarPinAberto(false)}
        onSuccess={() => toast.success("PIN correto! Funcionando perfeitamente.")}
        empresaId={empresa.id}
        titulo="Testar PIN"
        descricao="Digite seu PIN para verificar se está funcionando"
      />

      {/* Modal para alterar PIN — exige PIN atual primeiro */}
      <PinModal
        aberto={alterarPinModal}
        onClose={() => setAlterarPinModal(false)}
        onSuccess={() => {
          setAlterarPinModal(false)
          setAlterandoPin(true)
        }}
        empresaId={empresa.id}
        titulo="Confirmar Identidade"
        descricao="Digite o PIN atual para autorizar a alteração"
      />
    </div>
  )
}
