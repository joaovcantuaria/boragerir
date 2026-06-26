// Força todas as rotas do grupo (app) a serem dinâmicas (não pré-renderizadas)
// pois dependem de autenticação e dados do banco
export const dynamic = "force-dynamic"
export const revalidate = 0
