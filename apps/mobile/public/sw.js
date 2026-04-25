// Minimal service worker with stale-while-revalidate caching for heavy,
// immutable assets: the kuromoji dict files (~12 MB) and the vocab database
// (~2 MB). First load pays the network cost; subsequent loads hit the cache
// and refresh in the background.
const CACHE_NAME = 'japanese-learning-assets-v1'

const SWR_PREFIXES = ['/dict/', '/vocab.db']

self.addEventListener('install', () => self.skipWaiting())

self.addEventListener('activate', (e) => {
  e.waitUntil(
    (async () => {
      const keys = await caches.keys()
      await Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)))
      await self.clients.claim()
    })()
  )
})

self.addEventListener('fetch', (event) => {
  const { request } = event
  if (request.method !== 'GET') return

  const url = new URL(request.url)
  if (url.origin !== self.location.origin) return

  const match = SWR_PREFIXES.some((p) => url.pathname.startsWith(p))
  if (!match) return

  event.respondWith(
    (async () => {
      const cache = await caches.open(CACHE_NAME)
      const cached = await cache.match(request)
      const networkPromise = fetch(request)
        .then((res) => {
          if (res && res.ok) cache.put(request, res.clone())
          return res
        })
        .catch(() => null)
      return cached ?? (await networkPromise) ?? Response.error()
    })()
  )
})
