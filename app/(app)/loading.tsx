// Loading skeleton global para todas as páginas do app
// Aparece instantaneamente enquanto o servidor busca os dados
export default function Loading() {
  return (
    <div className="space-y-6 animate-pulse">
      {/* Header da página */}
      <div className="space-y-2">
        <div className="h-8 w-48 bg-muted rounded-lg" />
        <div className="h-4 w-64 bg-muted rounded-md" />
      </div>

      {/* Linha de cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="h-28 bg-muted rounded-2xl" />
        ))}
      </div>

      {/* Bloco de conteúdo principal */}
      <div className="space-y-3">
        <div className="h-10 w-full bg-muted rounded-xl" />
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="h-16 w-full bg-muted rounded-xl" />
        ))}
      </div>
    </div>
  )
}
