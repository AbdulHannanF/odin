import React, { useState, useCallback } from 'react'
import { ingestText, nlQuery } from '../../api/odinApi.js'

const EXAMPLE_QUERIES = [
  'Which regions are best suited for offshore wind expansion?',
  'What infrastructure is most vulnerable to monsoon flooding?',
  'Which countries control the majority of lithium supply?',
  'What is the economic impact if the Gulf transmission line fails?',
]

export default function NLQueryBar({ onResult }) {
  const [query, setQuery] = useState('')
  const [loading, setLoading] = useState(false)
  const [mode, setMode] = useState('query') // 'query' | 'ingest'

  const handleSubmit = useCallback(async (e) => {
    e.preventDefault()
    if (!query.trim() || loading) return
    setLoading(true)
    try {
      if (mode === 'query') {
        const result = await nlQuery(query)
        onResult?.({ type: 'nl_query', ...result })
      } else {
        const result = await ingestText(query)
        onResult?.({ type: 'ingest', ...result })
      }
    } catch (err) {
      onResult?.({ type: 'error', error: err.message })
    } finally {
      setLoading(false)
    }
  }, [query, loading, mode, onResult])

  return (
    <div className="nl-query-container">
      <div style={{ display: 'flex', gap: '6px', marginBottom: '8px', justifyContent: 'center' }}>
        {['query', 'ingest'].map(m => (
          <button
            key={m}
            onClick={() => setMode(m)}
            style={{
              padding: '3px 12px',
              borderRadius: '999px',
              border: `1px solid ${mode === m ? 'var(--color-primary)' : 'var(--glass-border)'}`,
              background: mode === m ? 'rgba(0,212,255,0.1)' : 'transparent',
              color: mode === m ? 'var(--color-primary)' : 'rgba(226,232,240,0.5)',
              fontSize: '0.68rem',
              fontWeight: 600,
              cursor: 'pointer',
              letterSpacing: '.06em',
              textTransform: 'uppercase',
            }}
          >
            {m === 'query' ? '⚡ NL Query' : '📡 Ingest Alert'}
          </button>
        ))}
      </div>

      <form className="nl-query-form" onSubmit={handleSubmit}>
        <span style={{ color: 'var(--color-primary)', fontSize: '1rem', flexShrink: 0 }}>
          {mode === 'query' ? '🔍' : '⚠️'}
        </span>
        <input
          id="odin-nl-query-input"
          className="nl-query-input"
          value={query}
          onChange={e => setQuery(e.target.value)}
          placeholder={
            mode === 'query'
              ? 'Ask ODIN anything about infrastructure, climate, or minerals…'
              : 'Paste a weather alert, news article, or supply disruption report…'
          }
          disabled={loading}
        />
        <button className="nl-query-btn" type="submit" disabled={loading || !query.trim()}>
          {loading ? <span className="spinner" style={{ width: 12, height: 12 }} /> : (mode === 'query' ? 'Analyze' : 'Ingest')}
        </button>
      </form>

      {/* Example queries */}
      <div style={{ display: 'flex', gap: '6px', marginTop: '6px', flexWrap: 'wrap', justifyContent: 'center' }}>
        {EXAMPLE_QUERIES.map((q, i) => (
          <button
            key={i}
            onClick={() => { setQuery(q); setMode('query') }}
            style={{
              padding: '2px 10px',
              borderRadius: '999px',
              border: '1px solid rgba(255,255,255,0.07)',
              background: 'rgba(6,11,24,0.8)',
              color: 'rgba(226,232,240,0.5)',
              fontSize: '0.65rem',
              cursor: 'pointer',
              transition: 'all .15s',
              backdropFilter: 'blur(8px)',
            }}
            onMouseEnter={e => e.target.style.color = 'var(--color-primary)'}
            onMouseLeave={e => e.target.style.color = 'rgba(226,232,240,0.5)'}
          >
            {q.length > 42 ? q.slice(0, 42) + '…' : q}
          </button>
        ))}
      </div>
    </div>
  )
}
