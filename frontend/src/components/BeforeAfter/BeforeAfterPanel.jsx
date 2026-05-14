import React from 'react'

function StateBlock({ label, state, accent }) {
  if (!state) return null
  const bg = accent === 'before' ? 'rgba(249,115,22,.08)' : 'rgba(0,212,255,.08)'
  const border = accent === 'before' ? 'rgba(249,115,22,.25)' : 'rgba(0,212,255,.25)'
  const labelColor = accent === 'before' ? '#f97316' : '#00d4ff'
  const statusColors = {
    OPERATIONAL: '#10b981', VULNERABLE: '#f97316', REROUTED: '#00d4ff',
    OFFLINE: '#6b7280', DEGRADED: '#fbbf24',
  }
  return (
    <div style={{ flex: 1, padding: '10px 12px', borderRadius: 8, background: bg, border: `1px solid ${border}` }}>
      <div style={{ fontSize: '0.6rem', fontWeight: 700, color: labelColor, textTransform: 'uppercase', letterSpacing: '.12em', marginBottom: 6 }}>
        {label}
      </div>
      <div style={{ fontWeight: 700, fontSize: '0.9rem', color: statusColors[state.status] || '#e2e8f0', marginBottom: 4 }}>
        {state.status}
      </div>
      <div style={{ fontSize: '0.68rem', color: 'rgba(226,232,240,.5)' }}>
        Risk: <span style={{ color: 'rgba(226,232,240,.85)', fontWeight: 600 }}>{state.risk_level}</span>
      </div>
      <div style={{ fontSize: '0.68rem', color: 'rgba(226,232,240,.5)', marginTop: 2 }}>
        Score: <span style={{ fontFamily: 'var(--font-mono)', color: 'rgba(226,232,240,.85)' }}>{(state.risk_score * 100).toFixed(1)}%</span>
      </div>
    </div>
  )
}

function BeforeAfterCard({ item }) {
  return (
    <div className="card" style={{ marginBottom: 10 }}>
      <div style={{ marginBottom: 8 }}>
        <div style={{ fontSize: '0.78rem', fontWeight: 600, color: '#e2e8f0' }}>{item.asset_name || item.asset_id}</div>
        <div style={{ fontSize: '0.65rem', color: 'rgba(226,232,240,.4)', marginTop: 2 }}>
          Triggered by: <span style={{ color: 'var(--color-primary)' }}>{item.triggered_by}</span>
          {item.ticket_id && <span> · Ticket: <span style={{ color: 'rgba(0,212,255,.7)' }}>{item.ticket_id}</span></span>}
        </div>
      </div>

      <div style={{ display: 'flex', gap: 8, alignItems: 'stretch' }}>
        <StateBlock label="Before" state={item.before} accent="before" />
        <div style={{ display: 'flex', alignItems: 'center', color: 'var(--color-primary)', fontSize: '1.1rem', flexShrink: 0 }}>→</div>
        <StateBlock label="After" state={item.after} accent="after" />
      </div>

      {item.change_reason && (
        <div style={{ marginTop: 8, fontSize: '0.68rem', color: 'rgba(226,232,240,.45)', fontStyle: 'italic' }}>
          "{item.change_reason}"
        </div>
      )}
    </div>
  )
}

export default function BeforeAfterPanel({ beforeAfter = [], tickets = [] }) {
  return (
    <div>
      <div className="section-header">
        <span className="section-title">⚡ Before → After State</span>
        {beforeAfter.length > 0 && (
          <span style={{
            fontSize: '0.65rem', padding: '2px 8px', borderRadius: 999,
            background: 'rgba(0,212,255,.1)', color: 'var(--color-primary)', fontWeight: 700,
          }}>
            {beforeAfter.length}
          </span>
        )}
      </div>

      {beforeAfter.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '20px 0', color: 'rgba(226,232,240,.3)', fontSize: '0.78rem' }}>
          No state changes yet — ingest an alert to trigger actions
        </div>
      ) : (
        <div style={{ maxHeight: 320, overflowY: 'auto' }}>
          {beforeAfter.map((item, i) => <BeforeAfterCard key={i} item={item} />)}
        </div>
      )}

      {/* Dispatch Tickets */}
      {tickets.length > 0 && (
        <div style={{ marginTop: 12 }}>
          <div style={{ fontSize: '0.68rem', color: 'var(--color-primary)', fontWeight: 700, marginBottom: 8, textTransform: 'uppercase', letterSpacing: '.1em' }}>
            🎫 Dispatch Tickets ({tickets.length})
          </div>
          {tickets.map((t, i) => (
            <div key={i} style={{
              padding: '8px 10px', borderRadius: 8, marginBottom: 6,
              background: 'rgba(13,21,38,.6)', border: '1px solid rgba(0,212,255,.12)',
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 3 }}>
                <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.68rem', color: 'var(--color-primary)', fontWeight: 700 }}>
                  {t.ticket_id}
                </span>
                <span style={{
                  fontSize: '0.62rem', padding: '1px 7px', borderRadius: 999,
                  background: t.status === 'DISPATCHED' ? 'rgba(0,212,255,.12)' : 'rgba(249,115,22,.12)',
                  color: t.status === 'DISPATCHED' ? '#00d4ff' : '#f97316',
                }}>
                  {t.status}
                </span>
              </div>
              <div style={{ fontSize: '0.72rem', color: 'rgba(226,232,240,.65)' }}>{t.action_type} · {t.asset_id}</div>
              <div style={{ fontSize: '0.65rem', color: 'rgba(226,232,240,.4)', marginTop: 2 }}>
                Team: {t.assigned_team} · Priority: {t.priority}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
