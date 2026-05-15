import React, { useState, useCallback } from 'react'
import { nlQuery } from '../../api/odinApi.js'

const EXAMPLES = [
  'Best regions for offshore wind expansion?',
  'Most vulnerable assets to monsoon flooding?',
  'Who controls lithium supply chains?',
]

export default function NLQueryBar({ onResult }) {
  const [query, setQuery] = useState('')
  const [loading, setLoading] = useState(false)

  const handleSubmit = useCallback(async (e) => {
    e.preventDefault()
    if (!query.trim() || loading) return
    setLoading(true)
    try {
      const result = await nlQuery(query)
      onResult?.({ type: 'nl_query', ...result })
    } catch (err) {
      onResult?.({ type: 'error', error: err.message })
    } finally { setLoading(false) }
  }, [query, loading, onResult])

  return (
    <div className="nl-query-container">
      <form className="nl-query-form" onSubmit={handleSubmit}>
        <span style={{ color:'var(--amber)', fontSize:12, flexShrink:0, letterSpacing:'.1em' }}>◈</span>
        <input
          id="odin-nl-query-input"
          className="nl-query-input"
          value={query}
          onChange={e => setQuery(e.target.value)}
          placeholder="Query ODIN — infrastructure, climate, minerals…"
          disabled={loading}
        />
        <button className="nl-query-btn" type="submit" disabled={loading || !query.trim()}>
          {loading ? <span className="spinner" style={{ width:12,height:12,borderWidth:1.5 }} /> : 'ANALYZE'}
        </button>
      </form>
      <div style={{ display:'flex', gap:4, marginTop:5, justifyContent:'center', flexWrap:'wrap' }}>
        {EXAMPLES.map((q, i) => (
          <button
            key={i}
            onClick={() => setQuery(q)}
            style={{
              padding:'2px 10px', background:'rgba(8,10,14,.85)',
              border:'1px solid rgba(255,255,255,.07)', color:'rgba(255,255,255,.35)',
              fontSize:10, cursor:'pointer', fontFamily:"'IBM Plex Mono',monospace",
              transition:'all .15s', backdropFilter:'blur(8px)',
            }}
            onMouseEnter={e => { e.target.style.color='var(--amber)'; e.target.style.borderColor='var(--amber-d)' }}
            onMouseLeave={e => { e.target.style.color='rgba(255,255,255,.35)'; e.target.style.borderColor='rgba(255,255,255,.07)' }}
          >{q}</button>
        ))}
      </div>
    </div>
  )
}
