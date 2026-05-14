import { useState, useCallback } from 'react'
import { getAgentTrace, listAgentTraces } from '../api/odinApi.js'

export function useAgentTrace() {
  const [trace, setTrace] = useState(null)
  const [traces, setTraces] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  const fetchTrace = useCallback(async (runId) => {
    setLoading(true)
    setError(null)
    try {
      const data = await getAgentTrace(runId)
      setTrace(data)
    } catch (e) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }, [])

  const fetchTraces = useCallback(async () => {
    try {
      const data = await listAgentTraces()
      setTraces(data.traces || [])
    } catch {}
  }, [])

  const clearTrace = useCallback(() => setTrace(null), [])

  return { trace, traces, loading, error, fetchTrace, fetchTraces, clearTrace }
}
