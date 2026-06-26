"use client"

import { Store, CreditCard, Star, Tag, Check } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Separator } from "@/components/ui/separator"
import { toast } from "sonner"
import { formatarTelefone } from "@/lib/utils"
import { empresaDemo, categoriasDemo } from "@/lib/demo/dados-demo"
import { planosInfo } from "@/types"

export default function DemoConfiguracoes() {
  const planoAtual = planosInfo[empresaDemo.plano]

  return (
    <div className="space-y-6 max-w-3xl">
      <div>
        <h1 className="text-2xl font-bold">Configurações</h1>
        <p className="text-muted-foreground">Dados do estabelecimento</p>
      </div>

      <Tabs defaultValue="negocio">
        <TabsList className="grid grid-cols-3 w-full">
          <TabsTrigger value="negocio" className="gap-1 text-xs"><Store className="w-3.5 h-3.5" /><span className="hidden sm:inline">Negócio</span></TabsTrigger>
          <TabsTrigger value="plano" className="gap-1 text-xs"><CreditCard className="w-3.5 h-3.5" /><span className="hidden sm:inline">Plano</span></TabsTrigger>
          <TabsTrigger value="categorias" className="gap-1 text-xs"><Tag className="w-3.5 h-3.5" /><span className="hidden sm:inline">Categorias</span></TabsTrigger>
        </TabsList>

        <TabsContent value="negocio" className="mt-4">
          <Card>
            <CardHeader><CardTitle>Dados do estabelecimento</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              {[
                { label: "Nome", value: empresaDemo.nome },
                { label: "Área de atuação", value: empresaDemo.area_atuacao },
                { label: "Telefone", value: formatarTelefone(empresaDemo.telefone) },
                { label: "E-mail", value: empresaDemo.email },
                { label: "Endereço", value: `${empresaDemo.endereco_rua}, ${empresaDemo.endereco_numero} — ${empresaDemo.endereco_bairro}, ${empresaDemo.endereco_cidade}/${empresaDemo.endereco_estado}` },
                { label: "CEP", value: empresaDemo.endereco_cep },
              ].map((f) => (
                <div key={f.label} className="space-y-1">
                  <Label className="text-xs text-muted-foreground">{f.label}</Label>
                  <Input value={f.value} readOnly className="opacity-80" />
                </div>
              ))}
              <Separator />
              <div className="flex items-center gap-2">
                <Star className="w-4 h-4 text-yellow-500" />
                <span className="font-medium text-sm">Programa de Fidelidade</span>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <Label className="text-xs text-muted-foreground">Pontos por real gasto</Label>
                  <Input value={empresaDemo.pontos_por_real} readOnly className="opacity-80" />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs text-muted-foreground">Pontos para R$ 1 de desconto</Label>
                  <Input value={empresaDemo.pontos_para_desconto} readOnly className="opacity-80" />
                </div>
              </div>
              <Button className="w-full sm:w-auto" onClick={() => toast.info("Modo demo — crie uma conta para editar!")}>
                Salvar alterações
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="plano" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle>Meu Plano</CardTitle>
              <CardDescription>Atualmente no plano <strong>{planoAtual.nome}</strong></CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="p-4 border border-primary/30 bg-primary/5 rounded-lg">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="font-bold text-lg">{planoAtual.nome}</h3>
                    <p className="text-muted-foreground text-sm">R$ {planoAtual.preco}/mês</p>
                  </div>
                  <Badge variant="default" className="gap-1"><Check className="w-3 h-3" />Ativo</Badge>
                </div>
                <ul className="mt-3 space-y-1.5 text-sm text-muted-foreground">
                  <li>✓ Clientes ilimitados</li>
                  <li>✓ Produtos e serviços ilimitados</li>
                  <li>✓ Funcionários ilimitados</li>
                  <li>✓ Agendamento online</li>
                  <li>✓ Programa de fidelidade</li>
                  <li>✓ Lembretes automáticos</li>
                  <li>✓ PDFs sem marca d&apos;água</li>
                  <li>✓ Relatórios avançados</li>
                </ul>
              </div>
              <p className="text-xs text-muted-foreground">
                💳 No modo demo você vê o plano Profissional completo. Ao criar uma conta real, comece grátis e faça upgrade quando quiser.
              </p>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="categorias" className="mt-4">
          <Card>
            <CardHeader><CardTitle>Categorias</CardTitle></CardHeader>
            <CardContent>
              <div className="space-y-2">
                {categoriasDemo.map((cat) => (
                  <div key={cat.id} className="flex items-center justify-between py-2 border-b border-border last:border-0">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium">{cat.nome}</span>
                      <Badge variant="secondary" className="text-xs">{cat.tipo}</Badge>
                    </div>
                  </div>
                ))}
              </div>
              <Button variant="outline" className="mt-4 w-full" onClick={() => toast.info("Modo demo — crie uma conta para gerenciar categorias!")}>
                + Nova categoria
              </Button>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
