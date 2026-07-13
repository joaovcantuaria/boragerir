"use client"

import { useState, useEffect, useCallback, createContext, useContext } from "react"

export interface ColaboradorAtivo {
  id: string
  nome: string
  cargo: string
  perfil: "admin" | "gerente" | "colaborador"
  permissoes: Permissoes
}

export interface Permissoes {
  caixa?: boolean
  caixa_abrir?: boolean
  caixa_fechar?: boolean
  caixa_sangria?: boolean
  caixa_suprimento?: boolean
  caixa_despesa?: boolean
  venda?: boolean
  venda_desconto?: boolean
  venda_limite_desconto?: number
  clientes?: boolean
  clientes_editar?: boolean
  clientes_excluir?: boolean
  produtos?: boolean
  produtos_editar?: boolean
  produtos_excluir?: boolean
  agendamentos?: boolean
  financeiro?: boolean
  configuracoes?: boolean
  funcionarios?: boolean
  [key: string]: boolean | number | undefined
}

const STORAGE_KEY = "boragerir_colaborador_ativo"

// ─── Permissões padrão por perfil ───
const PERMISSOES_ADMIN: Permissoes = {
  caixa: true, caixa_abrir: true, caixa_fechar: true, caixa_sangria: true, caixa_suprimento: true, caixa_despesa: true,
  venda: true, venda_desconto: true, venda_limite_desconto: 100,
  clientes: true, clientes_editar: true, clientes_excluir: true,
  produtos: true, produtos_editar: true, produtos_excluir: true,
  agendamentos: true, financeiro: true, configuracoes: true, funcionarios: true,
}

const PERMISSOES_GERENTE: Permissoes = {
  caixa: true, caixa_abrir: true, caixa_fechar: true, caixa_sangria: true, caixa_suprimento: true, caixa_despesa: true,
  venda: true, venda_desconto: true, venda_limite_desconto: 50,
  clientes: true, clientes_editar: true, clientes_excluir: false,
  produtos: true, produtos_editar: true, produtos_excluir: false,
  agendamentos: true, financeiro: true, configuracoes: false, funcionarios: true,
}

const PERMISSOES_COLABORADOR: Permissoes = {
  caixa: true, caixa_abrir: true, caixa_fechar: true, caixa_sangria: false, caixa_suprimento: false, caixa_despesa: false,
  venda: true, venda_desconto: false, venda_limite_desconto: 0,
  clientes: true, clientes_editar: false, clientes_excluir: false,
  produtos: true, produtos_editar: false, produtos_excluir: false,
  agendamentos: true, financeiro: false, configuracoes: false, funcionarios: false,
}

export function getPermissoesPadrao(perfil: string): Permissoes {
  switch (perfil) {
    case "admin": return PERMISSOES_ADMIN
    case "gerente": return PERMISSOES_GERENTE
    default: return PERMISSOES_COLABORADOR
  }
}

export function useColaboradorAtivo() {
  const [colaborador, setColaborador] = useState<ColaboradorAtivo | null>(null)
  const [carregando, setCarregando] = useState(true)

  // Carregar do sessionStorage ao montar
  useEffect(() => {
    try {
      const salvo = sessionStorage.getItem(STORAGE_KEY)
      if (salvo) {
        const parsed = JSON.parse(salvo)
        setColaborador(parsed)
      }
    } catch {}
    setCarregando(false)
  }, [])

  // Fazer login local
  const login = useCallback(async (empresaId: string, usuario: string, senha: string): Promise<{ sucesso: boolean; erro?: string }> => {
    try {
      const res = await fetch("/api/colaboradores/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ empresa_id: empresaId, usuario, senha }),
      })
      const data = await res.json()

      if (!res.ok || !data.sucesso) {
        return { sucesso: false, erro: data.erro || "Erro ao fazer login" }
      }

      const colab: ColaboradorAtivo = {
        id: data.colaborador.id,
        nome: data.colaborador.nome,
        cargo: data.colaborador.cargo,
        perfil: data.colaborador.perfil,
        permissoes: {
          ...getPermissoesPadrao(data.colaborador.perfil),
          ...(data.colaborador.permissoes || {}),
        },
      }

      setColaborador(colab)
      sessionStorage.setItem(STORAGE_KEY, JSON.stringify(colab))
      return { sucesso: true }
    } catch {
      return { sucesso: false, erro: "Erro de conexão" }
    }
  }, [])

  // Fazer logout local
  const logout = useCallback(async (empresaId: string) => {
    if (colaborador) {
      try {
        await fetch("/api/colaboradores/logout", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ empresa_id: empresaId, funcionario_id: colaborador.id }),
        })
      } catch {}
    }
    setColaborador(null)
    sessionStorage.removeItem(STORAGE_KEY)
  }, [colaborador])

  // Login como admin (dono da empresa — sem credenciais de colaborador)
  const loginComoAdmin = useCallback((empresaNome: string) => {
    const colab: ColaboradorAtivo = {
      id: "owner",
      nome: empresaNome,
      cargo: "Proprietário",
      perfil: "admin",
      permissoes: PERMISSOES_ADMIN,
    }
    setColaborador(colab)
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(colab))
  }, [])

  // Verificar se tem permissão para uma ação
  const temPermissao = useCallback((permissao: string): boolean => {
    if (!colaborador) return false
    if (colaborador.perfil === "admin") return true
    return colaborador.permissoes[permissao] === true
  }, [colaborador])

  // Obter limite de desconto
  const limiteDesconto = colaborador?.permissoes.venda_limite_desconto ?? 0

  return {
    colaborador,
    carregando,
    login,
    logout,
    loginComoAdmin,
    temPermissao,
    limiteDesconto,
    isAdmin: colaborador?.perfil === "admin",
    isGerente: colaborador?.perfil === "gerente",
    logado: !!colaborador,
  }
}
