import React from 'react'
import { formatDistanceToNow } from 'date-fns'

const SEVERITY_META = {
  CRITICAL: { color: '#ef4444', bg: 'rgba(239,68,68,.08)', icon: '🔴' },
  HIGH:     { color: '#f97316', bg: 'rgba(249,115,22,.08)', icon: '🟠' },
  MEDIUM:   { color: '#f59e0b', bg: 'rgba(245,158,11,.08)', icon: '🟡' },
  LOW:      { color: '#84cc16', bg: 'rgba(132,204,22,.08)', icon: '🟢' },
}

export default function IncidentFeed({ incidents = [], wsConnected = false }) {
  const allIncidents = [
    ...incidents,
    // Demo incidents if empty
    ...(incidents.length === 0 ? [
      { id: 'DEMO-1', title: 'ODIN Initialized', type: 'SYSTEM', severity: 'LOW', time: new Date() },
      { id: 'DEMO-2', title: 'Waiting for real-time alerts…', type: 'SYSTEM', severity: 'NONE', time: new Date() },
    ] : []),
  ]

  return (
    <div>
      <div className="section-header">
        <span className="section-title">📡 Live Incident Feed</span>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <div style={{
            width: 7, height: 7, borderRadius: '50%',
            background: wsConnected ? '#10b981' : '#6b7280',
            animation: wsConnected ? 'pulse-dot 2s infinite' : 'none',
          }} />
          <span style={{ fontSize: '0.62rem', color: 'rgba(226,232,240,.4)' }}>
            {wsConnected ? 'LIVE' : 'OFFLINE'}
          </span>
        </div>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
        {allIncidents.map((inc, i) => {
          const meta = SEVERITY_META[inc.severity] || SEVERITY_META.LOW
          const ts = inc.time || inc.created_at ? new Date(inc.time || inc.created_at) : null
          return (
            <div key={inc.id || i} className="incident-item">
              <div className={`incident-severity-dot ${inc.severity || 'LOW'}`} />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div className="incident-title" style={{ color: meta.color }}>{inc.title}</div>
                <div className="incident-meta">
                  {inc.type && <span>{inc.type}</span>}
                  {ts && <span> · {formatDistanceToNow(ts, { addSuffix: true })}</span>}
                  {inc.summary && <div style={{ marginTop: 2, fontSize: '0.68rem', color: 'rgba(226,232,240,.5)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{inc.summary}</div>}
                  {inc.confidence && (
                    <div style={{ marginTop: 2, fontSize: '0.65rem', color: 'var(--color-primary)' }}>
                      Confidence: {Math.round(inc.confidence * 100)}%
                    </div>
                  )}
                </div>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
