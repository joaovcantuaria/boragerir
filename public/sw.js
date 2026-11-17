// Service Worker antigo — DESATIVADO (17/11/2026)
// O sistema não registra mais service worker. Este arquivo existe só para
// desligar o que ficou instalado em navegadores antigos: ele guardava páginas
// e respostas da API em cache (telas desatualizadas depois de cada publicação
// e consultas como "o Pix já foi pago?" presas na primeira resposta).
// Ao atualizar, ele apaga todos os caches, se desregistra e recarrega a página.

self.addEventListener("install", () => {
  self.skipWaiting()
})

self.addEventListener("activate", (event) => {
  event.waitUntil(
    (async () => {
      const chaves = await caches.keys()
      await Promise.all(chaves.map((chave) => caches.delete(chave)))
      await self.registration.unregister()
      const janelas = await self.clients.matchAll({ type: "window" })
      janelas.forEach((janela) => janela.navigate(janela.url))
    })()
  )
})
