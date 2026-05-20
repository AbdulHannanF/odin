/**
 * satelliteWorker — fetches CelesTrak TLEs and propagates orbital
 * positions every 1 second. Posts arrays of {name, norad_id, lat, lon, alt_km}
 * back to the main thread.
 *
 * Cache: IndexedDB key 'odin:tle:active' with 24h TTL.
 *
 * Message protocol:
 *   in:  { type: 'start', groups: ['active','starlink','gps-ops','stations'] }
 *   in:  { type: 'stop' }
 *   out: { type: 'tle_ready', count }
 *   out: { type: 'positions', items: [{...}, ...], ts }
 *   out: { type: 'error', message }
 */
import * as satellite from 'satellite.js'

const CELESTRAK_BASE = 'https://celestrak.org/NORAD/elements/gp.php?FORMAT=tle&GROUP='
let satrecs = []        // [{ name, norad_id, satrec }]
let intervalId = null
let running = false

self.onmessage = async (e) => {
  const m = e.data || {}
  if (m.type === 'start') {
    if (running) return
    running = true
    try {
      const groups = m.groups || ['active', 'starlink', 'gps-ops', 'stations']
      satrecs = await loadTLEs(groups)
      self.postMessage({ type: 'tle_ready', count: satrecs.length })
      tick()
      intervalId = setInterval(tick, 1500)
    } catch (err) {
      self.postMessage({ type: 'error', message: String(err?.message || err) })
    }
  } else if (m.type === 'stop') {
    running = false
    if (intervalId) { clearInterval(intervalId); intervalId = null }
  }
}

function tick() {
  if (!satrecs.length) return
  const now = new Date()
  const gmst = satellite.gstime(now)
  const out = []
  for (let i = 0; i < satrecs.length; i++) {
    const r = satrecs[i]
    try {
      const pv = satellite.propagate(r.satrec, now)
      if (!pv || !pv.position) continue
      const geo = satellite.eciToGeodetic(pv.position, gmst)
      const lat = satellite.degreesLat(geo.latitude)
      const lon = satellite.degreesLong(geo.longitude)
      const altKm = geo.height
      if (!Number.isFinite(lat) || !Number.isFinite(lon) || !Number.isFinite(altKm)) continue
      out.push({
        name: r.name,
        norad_id: r.norad_id,
        lat, lon, alt_km: altKm,
      })
    } catch (e) {
      // skip bad TLE
    }
  }
  self.postMessage({ type: 'positions', items: out, ts: now.toISOString() })
}

async function loadTLEs(groups) {
  // Try cache first
  const cached = await idbGet('odin:tle:bundle')
  if (cached && Date.now() - cached.ts < 24 * 3600 * 1000) {
    return parseTLEBundle(cached.text)
  }
  const texts = []
  for (const g of groups) {
    try {
      const resp = await fetch(CELESTRAK_BASE + g)
      if (resp.ok) {
        const t = await resp.text()
        if (t && t.length > 100) texts.push(t)
      }
    } catch (e) {}
  }
  const joined = texts.join('\n')
  if (joined.length > 100) {
    await idbSet('odin:tle:bundle', { ts: Date.now(), text: joined })
  }
  return parseTLEBundle(joined)
}

function parseTLEBundle(txt) {
  if (!txt) return []
  const lines = txt.split(/\r?\n/).filter(Boolean)
  const out = []
  for (let i = 0; i + 2 < lines.length; i += 3) {
    const name = lines[i].trim()
    const l1 = lines[i + 1]
    const l2 = lines[i + 2]
    if (!l1 || !l2 || !l1.startsWith('1 ') || !l2.startsWith('2 ')) {
      // misaligned — try resync
      i -= 2
      continue
    }
    try {
      const satrec = satellite.twoline2satrec(l1, l2)
      if (satrec && !satrec.error) {
        out.push({
          name,
          norad_id: parseInt(l1.substring(2, 7), 10),
          satrec,
        })
      }
    } catch (e) {}
  }
  return out
}

// ── Minimal IndexedDB helpers ──────────────────────────────────────────────
function idbOpen() {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open('odin-cache', 1)
    req.onupgradeneeded = () => {
      const db = req.result
      if (!db.objectStoreNames.contains('kv')) db.createObjectStore('kv')
    }
    req.onsuccess = () => resolve(req.result)
    req.onerror = () => reject(req.error)
  })
}

async function idbGet(key) {
  try {
    const db = await idbOpen()
    return await new Promise((resolve) => {
      const tx = db.transaction('kv', 'readonly')
      const req = tx.objectStore('kv').get(key)
      req.onsuccess = () => resolve(req.result)
      req.onerror = () => resolve(null)
    })
  } catch (e) { return null }
}

async function idbSet(key, value) {
  try {
    const db = await idbOpen()
    return await new Promise((resolve) => {
      const tx = db.transaction('kv', 'readwrite')
      tx.objectStore('kv').put(value, key)
      tx.oncomplete = () => resolve(true)
      tx.onerror = () => resolve(false)
    })
  } catch (e) { return false }
}
