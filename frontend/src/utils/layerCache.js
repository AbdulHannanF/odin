const CACHE_NAME = 'odin-layers-v1'
const mem = new Map()

async function openCache() {
  try { return await caches.open(CACHE_NAME) } catch { return null }
}

export async function fetchLayerCached(url) {
  if (mem.has(url)) return mem.get(url)

  const cache = await openCache()
  if (cache) {
    const hit = await cache.match(url)
    if (hit) {
      const data = await hit.json()
      mem.set(url, data)
      return data
    }
  }

  const res = await fetch(url)
  if (!res.ok) throw new Error(`layer fetch ${res.status}: ${url}`)
  const data = await res.clone().json()
  mem.set(url, data)
  if (cache) cache.put(url, res).catch(() => {})
  return data
}

export function clearLayerCache() {
  mem.clear()
  caches.delete(CACHE_NAME).catch(() => {})
}
