"use client"

import { useState, useEffect } from "react"
import { usePathname } from "next/navigation"
import { motion, AnimatePresence } from "framer-motion"
import { Topbar } from "@/components/layout/topbar"
import { MobileNav } from "@/components/layout/mobile-nav"
import { ChatIA } from "@/components/chat/chat-ia"
import { PullToRefresh } from "@/components/layout/pull-to-refresh"
import { PinGuard } from "@/components/ui/pin-guard"
import { useEmpresa } from "@/hooks/use-empresa"
import { useRealtimeRefresh } from "@/hooks/use-realtime-refresh"
import { useKeyboardShortcuts } from "@/hooks/use-keyboard-shortcuts"
import { ColaboradorProvider, useColaborador } from "@/contexts/colaborador-context"
import { LoginColaborador } from "@/components/auth/login-colaborador"
import { createClient } from "@/lib/supabase/client"
import { Lock } from "lucide-react"

// Painel de atalhos
function ShortcutPanel({ onClose }: { onClose: () => void }) {
  const shortcuts = [
    { key: "N", label: "Nova Venda" },
    { key: "C", label: "Caixa" },
    { key: "A", label: "Agendamentos" },
    { key: "D", label: "Dashboard" },
    { key: "F", label: "Financeiro" },
    { key: "P", label: "Produtos/Serviços" },
    { key: "L", label: "Clientes" },
    { key: "?", label: "Mostrar atalhos" },
  ]
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm"
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.95, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.95, opacity: 0 }}
        transition={{ duration: 0.15 }}
        className="bg-card border border-border rounded-xl shadow-2xl p-6 w-full max-w-sm"
        onClick={(e) => e.stopPropagation()}
      >
        <h3 className="font-semibold text-sm mb-4 text-foreground">Atalhos de teclado</h3>
        <div className="space-y-2">
          {shortcuts.map((s) => (
            <div key={s.key} className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">{s.label}</span>
              <kbd className="kbd-tooltip">{s.key}</kbd>
            </div>
          ))}
        </div>
        <p className="text-xs text-muted-foreground mt-4 text-center">Pressione Esc para fechar</p>
      </motion.div>
    </motion.div>
  )
}

// Mapeamento de rotas para áreas protegidas
const ROTA_AREA_MAP: Record<string, { area: string; nome: string }> = {
  "/dashboard": { area: "dashboard", nome: "Dashboard" },
  "/caixa": { area: "caixa", nome: "Caixa" },
  "/venda": { area: "venda", nome: "Nova Venda" },
  "/agendamentos": { area: "agendamentos", nome: "Agendamentos" },
  "/clientes": { area: "clientes", nome: "Clientes" },
  "/financeiro": { area: "financeiro", nome: "Financeiro" },
  "/produtos-servicos": { area: "produtos_servicos", nome: "Produtos/Serviços" },
  "/orcamentos": { area: "orcamentos", nome: "Orçamentos" },
  "/contratos": { area: "contratos", nome: "Contratos" },
  "/tarefas": { area: "tarefas", nome: "Tarefas" },
  "/funcionarios": { area: "funcionarios", nome: "Colaboradores" },
  "/configuracoes": { area: "configuracoes", nome: "Configurações" },
}

function PinGuardWrapper({ empresa, pathname, children }: { empresa: any; pathname: string; children: React.ReactNode }) {
  const { colaborador, logado, temPermissao } = useColaborador()

  if (!empresa) return <>{children}</>

  // ─── Verificação de permissão do colaborador ───
  const rotaInfo = ROTA_AREA_MAP[pathname]
  if (logado && colaborador && colaborador.perfil !== "admin" && rotaInfo) {
    // Mapear area da rota para permissão do colaborador
    const permissaoRota = rotaInfo.area.replace("produtos_servicos", "produtos")
    if (!temPermissao(permissaoRota)) {
      return (
        <div className="flex flex-col items-center justify-center py-16 space-y-4">
          <div className="w-14 h-14 rounded-2xl bg-red-500/10 flex items-center justify-center">
            <Lock className="w-7 h-7 text-red-500" />
          </div>
          <div className="text-center space-y-1.5">
            <h3 className="text-lg font-bold">Acesso Restrito</h3>
            <p className="text-sm text-muted-foreground max-w-sm">
              Você não tem permissão para acessar <strong>{rotaInfo.nome}</strong>.
            </p>
            <p className="text-xs text-muted-foreground">
              Logado como <strong>{colaborador.nome}</strong> ({colaborador.perfil}).
            </p>
          </div>
        </div>
      )
    }
  }

  // ─── Verificação de PIN (fallback existente) ───
  // Se colaborador logado como admin ou gerente, NUNCA pede PIN
  if (logado && colaborador && (colaborador.perfil === "admin" || colaborador.perfil === "gerente")) {
    return <>{children}</>
  }

  const restricoes = empresa.restricoes_acesso as { areas_protegidas?: string[] } | null
  const areasProtegidas = restricoes?.areas_protegidas || []
  const pinConfigurado = !!empresa.pin_gerente

  // Verificar se a rota atual precisa de PIN
  if (!pinConfigurado || !rotaInfo) return <>{children}</>

  // Bloquear a página INTEIRA somente se o ID raiz da área estiver marcado
  // E NÃO tiver nenhum sub-item daquela área marcado (controle granular)
  // Se tem sub-itens marcados (ex: "caixa_sangria"), a página abre normal
  // e o PIN é pedido apenas na ação específica
  const areaRaizMarcada = areasProtegidas.includes(rotaInfo.area)
  const temSubItensMarcados = areasProtegidas.some(
    (a) => a.startsWith(rotaInfo.area + "_")
  )

  // Se marcou a área raiz MAS também marcou sub-itens, não bloqueia a página
  // (o bloqueio será feito nas ações individuais)
  const devBloquearPagina = areaRaizMarcada && !temSubItensMarcados

  if (!devBloquearPagina) return <>{children}</>

  return (
    <PinGuard
      empresaId={empresa.id}
      pinConfigurado={pinConfigurado}
      areaProtegida={true}
      nomeArea={rotaInfo.nome}
    >
      {children}
    </PinGuard>
  )
}

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <ColaboradorProvider>
      <AppLayoutInner>{children}</AppLayoutInner>
    </ColaboradorProvider>
  )
}

function AppLayoutInner({ children }: { children: React.ReactNode }) {
  const [showShortcuts, setShowShortcuts] = useState(false)
  const [funcionariosLogin, setFuncionariosLogin] = useState<{ id: string; nome: string; cargo: string; usuario: string | null; perfil: string }[]>([])
  const [adminTemSenha, setAdminTemSenha] = useState(false)
  const { empresa, empresas, selecionarEmpresa } = useEmpresa()
  const { colaborador, logado, login, loginComoAdmin, carregando: carregandoColab } = useColaborador()
  const pathname = usePathname()
  const plano = empresa?.plano ?? "gratuito"
  const isPlanoAgenda = plano === "agenda"
  const isPlanoGestao = plano === "gestao"

  useRealtimeRefresh(empresa?.id)
  useKeyboardShortcuts()

  // Carregar funcionários com login configurado + verificar senha admin
  useEffect(() => {
    if (!empresa?.id) return
    const supabase = createClient()
    supabase
      .from("funcionarios")
      .select("id, nome, cargo, usuario, perfil")
      .eq("empresa_id", empresa.id)
      .eq("ativo", true)
      .not("usuario", "is", null)
      .order("nome")
      .then(({ data }) => setFuncionariosLogin(data ?? []))

    // Verificar se admin tem senha configurada
    fetch(`/api/colaboradores/senha-admin?empresa_id=${empresa.id}`)
      .then((r) => r.json())
      .then((d) => setAdminTemSenha(d.temSenha ?? false))
      .catch(() => {})
  }, [empresa?.id])

  // Atalho ? para mostrar painel
  useEffect(() => {
    function handler(e: KeyboardEvent) {
      const tag = (e.target as HTMLElement).tagName
      if (["INPUT", "TEXTAREA", "SELECT"].includes(tag)) return
      if (e.key === "?" || e.key === "/") setShowShortcuts((v) => !v)
      if (e.key === "Escape") setShowShortcuts(false)
    }
    document.addEventListener("keydown", handler)
    return () => document.removeEventListener("keydown", handler)
  }, [])

  // Mostrar tela de login local se:
  // 1. Empresa carregada
  // 2. Existem colaboradores com login configurado
  // 3. Nenhum colaborador logado na sessão
  const precisaLoginLocal = empresa && !carregandoColab && !logado && funcionariosLogin.length > 0

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Overlay de login local */}
      {precisaLoginLocal && (
        <LoginColaborador
          empresaNome={empresa.nome}
          empresaLogoUrl={empresa.logo_url}
          funcionarios={funcionariosLogin}
          onLogin={async (usuario, senha) => login(empresa.id, usuario, senha)}
          adminTemSenha={adminTemSenha}
          onLoginAdmin={async (senha) => {
            if (!adminTemSenha || !senha) {
              // Sem senha configurada — entra direto
              loginComoAdmin(empresa.nome)
              return { sucesso: true }
            }
            // Verificar senha do admin
            try {
              const res = await fetch("/api/colaboradores/login-admin", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ empresa_id: empresa.id, senha }),
              })
              const data = await res.json()
              if (data.sucesso) {
                loginComoAdmin(empresa.nome)
                return { sucesso: true }
              }
              return { sucesso: false, erro: data.erro || "Senha incorreta" }
            } catch {
              return { sucesso: false, erro: "Erro de conexão" }
            }
          }}
        />
      )}

      {/* Topbar — só no desktop (md+). Mobile usa a barra inferior */}
      <div className="hidden md:block">
        <Topbar
          empresaNome={empresa?.nome}
          empresaLogoUrl={empresa?.logo_url}
          plano={plano}
          empresas={empresas}
          empresaAtualId={empresa?.id}
          onSelecionarEmpresa={selecionarEmpresa}
        />
      </div>

      {/* Conteúdo com animação de transição */}
      <AnimatePresence mode="wait">
        <motion.main
          key={pathname}
          initial={{ opacity: 0, y: 5 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -3 }}
          transition={{ duration: 0.18, ease: "easeOut" }}
          className="flex-1 p-4 lg:p-5 pb-20 md:pb-5 max-w-[1600px] w-full mx-auto"
        >
          <PullToRefresh>
            <PinGuardWrapper empresa={empresa} pathname={pathname}>
              {children}
            </PinGuardWrapper>
          </PullToRefresh>
        </motion.main>
      </AnimatePresence>

      <MobileNav plano={plano} empresas={empresas} empresaAtualId={empresa?.id} onSelecionarEmpresa={selecionarEmpresa} />
      {!isPlanoAgenda && <ChatIA />}

      {/* Painel de atalhos */}
      <AnimatePresence>
        {showShortcuts && <ShortcutPanel onClose={() => setShowShortcuts(false)} />}
      </AnimatePresence>
    </div>
  )
}
