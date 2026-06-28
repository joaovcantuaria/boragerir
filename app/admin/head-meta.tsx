// Server component — injeta theme-color escuro para o painel admin
// Isso é renderizado no servidor antes do JS, garantindo que o browser
// mobile já receba a cor certa desde o primeiro byte do HTML
export default function AdminHeadMeta() {
  return (
    <>
      {/* Força a barra de status do mobile para escuro no admin */}
      <meta name="theme-color" content="#111113" />
      <meta name="theme-color" content="#111113" media="(prefers-color-scheme: light)" />
      <meta name="theme-color" content="#111113" media="(prefers-color-scheme: dark)" />
    </>
  )
}
