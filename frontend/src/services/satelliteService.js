/**
 * satelliteService — owns the satellite Web Worker. Returns a small object
 * exposing onPositions(cb) and stop().
 *
 * Used by the App to feed the SatellitesLayer when the backend `satellites`
 * channel is empty (CelesTrak direct-from-browser path).
 */

export function startSatelliteWorker({ groups } = {}) {
  let worker
  const callbacks = new Set()
  let lastCount = 0
  let ready = false

  try {
    worker = new Worker(new URL('../workers/satelliteWorker.js', import.meta.url), { type: 'module' })
  } catch (e) {
    console.warn('Satellite worker init failed:', e)
    return null
  }

  worker.onmessage = (ev) => {
    const m = ev.data || {}
    if (m.type === 'tle_ready') {
      lastCount = m.count
      ready = true
      callbacks.forEach(cb => { try { cb({ type: 'tle_ready', count: m.count }) } catch (e) {} })
    } else if (m.type === 'positions') {
      callbacks.forEach(cb => { try { cb({ type: 'positions', items: m.items }) } catch (e) {} })
    } else if (m.type === 'error') {
      console.warn('Satellite worker error:', m.message)
    }
  }

  worker.postMessage({ type: 'start', groups: groups || ['active', 'starlink', 'gps-ops', 'stations'] })

  return {
    onPositions(cb) { callbacks.add(cb); return () => callbacks.delete(cb) },
    isReady() { return ready },
    count() { return lastCount },
    stop() {
      try { worker.postMessage({ type: 'stop' }) } catch (e) {}
      try { worker.terminate() } catch (e) {}
      callbacks.clear()
    },
  }
}
