// Service Worker — BeautyFlow PWA
const CACHE_NAME = "beautyflow-v1"
const OFFLINE_URL = "/offline"

const STATIC_ASSETS = [
  "/",
  "/dashboard",
  "/manifest.json",
]

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(STATIC_ASSETS)
    })
  )
  self.skipWaiting()
})

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key))
      )
    )
  )
  self.clients.claim()
})

self.addEventListener("fetch", (event) => {
  // Apenas GET
  if (event.request.method !== "GET") return

  // Não cachear requisições para o Supabase
  if (event.request.url.includes("supabase.co")) return

  event.respondWith(
    caches.match(event.request).then((cached) => {
      if (cached) return cached

      return fetch(event.request)
        .then((response) => {
          if (response && response.status === 200 && response.type === "basic") {
            const clone = response.clone()
            caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone))
          }
          return response
        })
        .catch(() => {
          // Fallback para páginas HTML quando offline
          if (event.request.mode === "navigate") {
            return caches.match("/dashboard") || new Response("Você está offline.", {
              headers: { "Content-Type": "text/html" },
            })
          }
        })
    })
  )
})
