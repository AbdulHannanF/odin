import React from 'react'

const STATUS_COLORS = {
  OPERATIONAL:'#00e676', VULNERABLE:'#ff6d00', REROUTED:'#00e5ff',
  OFFLINE:'#6b7280', DEGRADED:'#ffd740',
}

function StateBlock({ label, state, accent }) {
  const bg     = accent === 'before' ? 'rgba(255,109,0,.06)'  : 'rgba(0,229,255,.06)'
  const border = accent === 'before' ? 'rgba(255,109,0,.18)'  : 'rgba(0,229,255,.18)'
  const color  = accent === 'before' ? '#ff6d00'              : '#00e5ff'
  return (
    <div style={{ flex:1, padding:'9px 10px', background:bg, border:`1px solid ${border}` }}>
      <div style={{ fontSize:'0.6rem', fontWeight:700, color, textTransform:'uppercase', letterSpacing:'.12em', marginBottom:5 }}>
        {label}
      </div>
      <div style={{ fontWeight:700, fontSize:'0.85rem', color:STATUS_COLORS[state?.status] || '#e2e8f0', marginBottom:4 }}>
        {state?.status}
      </div>
      <div style={{ fontSize:'0.65rem', color:'rgba(255,255,255,.4)' }}>
        Risk: <span style={{ color:'rgba(255,255,255,.75)', fontWeight:600 }}>{state?.risk_level}</span>
      </div>
      {state?.risk_score != null && (
        <div style={{ fontSize:'0.62rem', color:'rgba(255,255,255,.4)', marginTop:2 }}>
          Score: <span style={{ fontFamily:'var(--mono)', color:'rgba(255,255,255,.7)' }}>
            {(state.risk_score * 100).toFixed(1)}%
          </span>
        </div>
      )}
    </div>
  )
}

function BeforeAfterCard({ item }) {
  return (
    <div className="card" style={{ marginBottom:8 }}>
      <div style={{ marginBottom:7 }}>
        <div style={{ fontSize:'0.75rem', fontWeight:600, color:'var(--text)' }}>
          {item.asset_name || item.asset_id}
        </div>
        <div style={{ fontSize:'0.62rem', color:'rgba(255,255,255,.35)', marginTop:2 }}>
          Triggered by:{' '}
          <span style={{ color:'var(--cyan)' }}>{item.triggered_by}</span>
          {item.ticket_id && (
            <span> · Ticket: <span style={{ color:'rgba(0,229,255,.6)' }}>{item.ticket_id}</span></span>
          )}
        </div>
      </div>

      <div style={{ display:'flex', gap:7, alignItems:'stretch' }}>
        <StateBlock label="Before" state={item.before} accent="before" />
        <div style={{ display:'flex', alignItems:'center', color:'var(--amber)', fontSize:'1.1rem', flexShrink:0 }}>→</div>
        <StateBlock label="After" state={item.after} accent="after" />
      </div>

      {item.change_reason && (
        <div style={{ marginTop:7, fontSize:'0.65rem', color:'rgba(255,255,255,.35)', fontStyle:'italic' }}>
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
        <span className="section-title">Before / After State</span>
        {beforeAfter.length > 0 && (
          <span style={{
            fontSize:'0.6rem', padding:'1px 8px',
            background:'rgba(0,229,255,.08)', color:'var(--cyan)', fontWeight:700,
            border:'1px solid rgba(0,229,255,.15)',
          }}>
            {beforeAfter.length}
          </span>
        )}
      </div>

      {beforeAfter.length === 0 ? (
        <div style={{ textAlign:'center', padding:'24px 0', color:'rgba(255,255,255,.2)', fontSize:'0.72rem' }}>
          No state changes yet — ingest an alert to trigger actions
        </div>
      ) : (
        <div style={{ maxHeight:340, overflowY:'auto' }}>
          {beforeAfter.map((item, i) => <BeforeAfterCard key={i} item={item} />)}
        </div>
      )}

      {tickets.length > 0 && (
        <div style={{ marginTop:10 }}>
          <div style={{ fontSize:'0.65rem', color:'var(--amber)', fontWeight:700, marginBottom:6, textTransform:'uppercase', letterSpacing:'.1em' }}>
            Dispatch Tickets ({tickets.length})
          </div>
          {tickets.map((t, i) => (
            <div key={i} style={{
              padding:'8px 10px', marginBottom:5,
              background:'var(--bg0)', border:'1px solid var(--border)',
            }}>
              <div style={{ display:'flex', justifyContent:'space-between', marginBottom:3 }}>
                <span style={{ fontFamily:'var(--mono)', fontSize:'0.65rem', color:'var(--cyan)', fontWeight:700 }}>
                  {t.ticket_id}
                </span>
                <span style={{
                  fontSize:'0.6rem', padding:'1px 7px',
                  background: t.status === 'DISPATCHED' ? 'rgba(0,229,255,.08)' : 'rgba(255,109,0,.08)',
                  color: t.status === 'DISPATCHED' ? '#00e5ff' : '#ff6d00',
                  border: `1px solid ${t.status === 'DISPATCHED' ? 'rgba(0,229,255,.18)' : 'rgba(255,109,0,.18)'}`,
                }}>
                  {t.status}
                </span>
              </div>
              <div style={{ fontSize:'0.68rem', color:'rgba(255,255,255,.6)' }}>{t.action_type} · {t.asset_id}</div>
              <div style={{ fontSize:'0.62rem', color:'rgba(255,255,255,.35)', marginTop:2 }}>
                Team: {t.assigned_team} · Priority: {t.priority}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
