/**
 * useRealtime — subscribes to ODIN /ws/realtime channels.
 *
 * Returns the latest snapshot per channel plus connection status.
 * Auto-reconnects with exponential backoff.
 */
import { useEffect, useRef, useState, useCallback } from 'react'

const WS_URL = import.meta.env.VITE_WS_URL || `ws://${window.location.hostname}:4005`

export function useRealtime(channels = ['flights', 'satellites', 'earthquakes', 'ships', 'weather']) {
  const [connected, setConnected] = useState(false)
  const [streams, setStreams] = useState({}) // { flights: {ts, degraded, data}, ... }
  const wsRef = useRef(null)
  const backoffRef = useRef(1000)
  const channelsRef = useRef(channels)
  channelsRef.current = channels

  const connect = useCallback(() => {
    try {
      const ws = new WebSocket(`${WS_URL}/ws/realtime`)
      wsRef.current = ws

      ws.onopen = () => {
        setConnected(true)
        backoffRef.current = 1000
        ws.send(JSON.stringify({ action: 'subscribe', channels: channelsRef.current }))
      }

      ws.onmessage = (ev) => {
        let m
        try { m = JSON.parse(ev.data) } catch { return }
        if (!m.channel) return
        setStreams(prev => ({ ...prev, [m.channel]: m }))
      }

      ws.onclose = () => {
        setConnected(false)
        const wait = Math.min(backoffRef.current, 15000)
        backoffRef.current *= 2
        setTimeout(connect, wait)
      }
      ws.onerror = () => ws.close()
    } catch {
      setTimeout(connect, 3000)
    }
  }, [])

  useEffect(() => {
    connect()
    return () => wsRef.current?.close()
  }, [connect])

  return { connected, streams }
}
