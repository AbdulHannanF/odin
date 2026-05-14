import React, { useState, useCallback, useEffect } from 'react'
import { Toaster, toast } from 'react-hot-toast'

import MapView from './components/Map/MapView.jsx'
import NLQueryBar from './components/NLQuery/NLQueryBar.jsx'
import AgentReasoningPanel from './components/AgentPanel/AgentReasoningPanel.jsx'
import BeforeAfterPanel from './components/BeforeAfter/BeforeAfterPanel.jsx'
import IncidentFeed from './components/IncidentFeed/IncidentFeed.jsx'
import { useWebSocket } from './hooks/useWebSocket.js'
import { useAgentTrace } from './hooks/useAgentTrace.js'
import { ingestText, getAgentTrace } from './api/odinApi.js'

// ── Ingest Panel (left column section) ─────────────────────────────
function IngestPanel({ onResult }) {
  const [text, setText] = useState('')
  const [loading, setLoading] = useState(false)

  const DEMO_ALERTS = [
    `URGENT WEATHER ALERT: Category 4 hurricane is making landfall at the Gulf Coast within 18 hours. Sustained winds at 220 km/h. Major transmission corridors TX-44 and TX-12 are directly in the projected storm path. Datacenters serving financial institutions in the region are at risk of cascading power failure.`,
    `SUPPLY DISRUPTION: DRC cobalt exports halted due to government moratorium. Affects 65% of global cobalt supply. EV manufacturers and datacenter battery backup suppliers face severe shortage. Geopolitical risk CRITICAL.`,
    `SENSOR ALERT: Unusual voltage fluctuation detected at Northeast Grid Hub Alpha. Values oscillating ±15% beyond nominal. Three downstream hospitals and one major datacenter on same feeder circuit.`,
  ]

  const handleIngest = async (e) => {
    e.preventDefault()
    if (!text.trim() || loading) return
    setLoading(true)
    const toastId = toast.loading('ODIN processing alert…')
    try {
      const result = await ingestText(text)
      toast.success(`Pipeline complete. Run ID: ${result.run_id?.slice(0, 8)}`, { id: toastId, duration: 4000 })
      // Fetch full trace
      if (result.run_id) {
        setTimeout(async () => {
          try {
            const trace = await getAgentTrace(result.run_id)
            onResult({ type: 'ingest', trace, runId: result.run_id, incidentId: result.incident_id })
          } catch {}
        }, 800)
      }
    } catch (err) {
      toast.error(`Error: ${err.message}`, { id: toastId })
    } finally {
      setLoading(false)
    }
  }

  return (
    <div>
      <div className="section-header">
        <span className="section-title">⚠️ Ingest Unstructured Alert</span>
      </div>
      <form onSubmit={handleIngest}>
        <textarea
          id="odin-ingest-textarea"
          className="ingest-textarea"
          value={text}
          onChange={e => setText(e.target.value)}
          placeholder="Paste a weather alert, news article, or supply disruption report…"
          disabled={loading}
        />
        <div style={{ display: 'flex', gap: 6, marginTop: 8, flexWrap: 'wrap' }}>
          <button className="btn btn-primary" type="submit" disabled={loading || !text.trim()}>
            {loading ? <><span className="spinner" />Processing…</> : '⚡ Run ODIN Pipeline'}
          </button>
        </div>
        <div style={{ marginTop: 8 }}>
          <div style={{ fontSize: '0.65rem', color: 'rgba(226,232,240,.35)', marginBottom: 4, textTransform: 'uppercase', letterSpacing: '.08em' }}>Demo Alerts</div>
          {DEMO_ALERTS.map((a, i) => (
            <button
              key={i}
              type="button"
              onClick={() => setText(a)}
              style={{
                display: 'block', width: '100%', textAlign: 'left',
                padding: '6px 8px', marginBottom: 4, borderRadius: 6,
                border: '1px solid rgba(255,255,255,.05)',
                background: 'rgba(13,21,38,.6)',
                color: 'rgba(226,232,240,.5)', fontSize: '0.68rem', cursor: 'pointer',
                transition: 'all .15s',
              }}
              onMouseEnter={e => e.currentTarget.style.borderColor = 'rgba(0,212,255,.25)'}
              onMouseLeave={e => e.currentTarget.style.borderColor = 'rgba(255,255,255,.05)'}
            >
              {a.slice(0, 72)}…
            </button>
          ))}
        </div>
      </form>
    </div>
  )
}

// ── Asset Detail ────────────────────────────────────────────────────
function AssetDetail({ asset, onClose }) {
  if (!asset) return null
  const statusColors = {
    OPERATIONAL: '#10b981', VULNERABLE: '#f97316',
    REROUTED: '#00d4ff', OFFLINE: '#6b7280', DEGRADED: '#fbbf24',
  }
  return (
    <div style={{
      position: 'fixed', right: 16, bottom: 16, width: 280, zIndex: 30,
      background: 'rgba(13,21,38,.97)', border: '1px solid rgba(0,212,255,.25)',
      borderRadius: 12, padding: 16, backdropFilter: 'blur(16px)',
      boxShadow: '0 8px 40px rgba(0,0,0,.5)',
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 10 }}>
        <div style={{ fontSize: '0.65rem', color: 'var(--color-primary)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.1em' }}>
          {asset.asset_type}
        </div>
        <button onClick={onClose} style={{ background: 'none', border: 'none', color: 'rgba(226,232,240,.5)', cursor: 'pointer', fontSize: '1rem' }}>✕</button>
      </div>
      <div style={{ fontSize: '0.9rem', fontWeight: 600, color: '#e2e8f0', marginBottom: 8 }}>{asset.name}</div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6 }}>
        {[
          ['Status', asset.status, statusColors[asset.status]],
          ['Risk', asset.risk_level || 'NONE'],
          ['Country', asset.country],
          ['Capacity', asset.capacity_mw ? `${asset.capacity_mw} MW` : '—'],
        ].map(([label, value, color]) => (
          <div key={label} style={{ padding: '6px 8px', borderRadius: 6, background: 'rgba(255,255,255,.03)', border: '1px solid rgba(255,255,255,.05)' }}>
            <div style={{ fontSize: '0.6rem', color: 'rgba(226,232,240,.4)', marginBottom: 2 }}>{label}</div>
            <div style={{ fontSize: '0.78rem', fontWeight: 600, color: color || '#e2e8f0' }}>{value}</div>
          </div>
        ))}
      </div>
    </div>
  )
}

// ── NL Query Result Display ─────────────────────────────────────────
function QueryResultBanner({ result, onClose }) {
  if (!result) return null
  return (
    <div style={{
      position: 'absolute', bottom: 20, left: '50%', transform: 'translateX(-50%)',
      maxWidth: 600, width: 'calc(100% - 32px)', zIndex: 20,
      background: 'rgba(13,21,38,.97)', border: '1px solid rgba(0,212,255,.25)',
      borderRadius: 12, padding: '14px 16px',
      backdropFilter: 'blur(16px)', boxShadow: '0 8px 40px rgba(0,0,0,.5)',
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div style={{ fontSize: '0.65rem', color: 'var(--color-primary)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.1em', marginBottom: 6 }}>
          🤖 ODIN Response
        </div>
        <button onClick={onClose} style={{ background: 'none', border: 'none', color: 'rgba(226,232,240,.5)', cursor: 'pointer' }}>✕</button>
      </div>
      <div style={{ fontSize: '0.83rem', color: '#e2e8f0', lineHeight: 1.6, marginBottom: 8 }}>{result.answer}</div>
      <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
        <span style={{ fontSize: '0.65rem', color: 'rgba(226,232,240,.4)' }}>
          Confidence: <span style={{ color: 'var(--color-primary)', fontWeight: 700 }}>{Math.round((result.confidence || 0) * 100)}%</span>
        </span>
        {result.data_sources?.map(s => (
          <span key={s} style={{ fontSize: '0.6rem', padding: '1px 7px', borderRadius: 999, background: 'rgba(124,58,237,.15)', color: '#a78bfa' }}>{s}</span>
        ))}
      </div>
    </div>
  )
}

// ── Header ──────────────────────────────────────────────────────────
function Header({ wsConnected, agentCount }) {
  const [time, setTime] = React.useState(new Date())
  React.useEffect(() => {
    const t = setInterval(() => setTime(new Date()), 1000)
    return () => clearInterval(t)
  }, [])

  return (
    <header className="header">
      <div className="header-logo">
        <div style={{
          width: 32, height: 32, borderRadius: 8,
          background: 'linear-gradient(135deg, #00d4ff, #7c3aed)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: '1rem', fontWeight: 800,
        }}>⊕</div>
        <div>
          <div className="header-logo-text">ODIN</div>
          <div className="header-logo-sub">Planetary Infrastructure Intelligence</div>
        </div>
      </div>

      <div className="header-status-bar">
        <div className="status-badge">
          <div className="status-dot" />
          OPERATIONAL
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '4px 10px', borderRadius: 999, background: 'rgba(124,58,237,.1)', border: '1px solid rgba(124,58,237,.25)', fontSize: '0.72rem', color: '#a78bfa' }}>
          🤖 {agentCount} Agents Active
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: '0.72rem', color: 'rgba(226,232,240,.4)' }}>
          <div style={{ width: 6, height: 6, borderRadius: '50%', background: wsConnected ? '#10b981' : '#6b7280' }} />
          WS {wsConnected ? 'Connected' : 'Reconnecting…'}
        </div>
        <div className="header-time">
          {time.toUTCString().slice(0, 25)} UTC
        </div>
      </div>
    </header>
  )
}

// ── Layer Controls ───────────────────────────────────────────────────
function LayerControls({ activeLayers, onToggle }) {
  const layers = [
    { key: 'infrastructure', icon: '⚡', label: 'Infrastructure' },
    { key: 'wind', icon: '💨', label: 'Wind' },
    { key: 'minerals', icon: '⛏️', label: 'Minerals' },
  ]
  return (
    <div className="map-layer-controls">
      {layers.map(({ key, icon, label }) => (
        <button
          key={key}
          id={`layer-toggle-${key}`}
          className={`layer-toggle ${activeLayers[key] ? 'active' : ''}`}
          onClick={() => onToggle(key)}
        >
          {icon} {label}
        </button>
      ))}
    </div>
  )
}

// ── App Root ─────────────────────────────────────────────────────────
export default function App() {
  const [activeLayers, setActiveLayers] = useState({ infrastructure: true, wind: true, minerals: false })
  const [selectedAsset, setSelectedAsset] = useState(null)
  const [queryResult, setQueryResult] = useState(null)
  const [currentTrace, setCurrentTrace] = useState(null)
  const [beforeAfter, setBeforeAfter] = useState([])
  const [tickets, setTickets] = useState([])
  const [incidents, setIncidents] = useState([])
  const [rightTab, setRightTab] = useState('reasoning') // 'reasoning' | 'beforeafter'

  const { isConnected, messages } = useWebSocket('/ws/incidents')

  // Process incoming WS messages
  useEffect(() => {
    if (!messages.length) return
    const latest = messages[0]
    if (latest?.type === 'INCIDENT_PROCESSED') {
      setIncidents(prev => [{
        id: latest.run_id,
        title: `Incident ${latest.incident_id}`,
        type: 'PIPELINE_COMPLETE',
        severity: 'HIGH',
        time: new Date(latest.timestamp),
        summary: latest.summary,
        confidence: latest.confidence,
      }, ...prev].slice(0, 50))
      if (latest.before_after?.length) {
        setBeforeAfter(prev => [...latest.before_after, ...prev])
        setRightTab('beforeafter')
      }
    }
  }, [messages])

  const handleLayerToggle = useCallback((key) => {
    setActiveLayers(prev => ({ ...prev, [key]: !prev[key] }))
  }, [])

  const handleQueryResult = useCallback(async (result) => {
    if (result.type === 'nl_query') {
      setQueryResult(result)
    } else if (result.type === 'ingest' && result.trace) {
      setCurrentTrace(result.trace)
      const ba = result.trace.before_after || []
      if (ba.length) {
        setBeforeAfter(prev => [...ba, ...prev])
        setRightTab('beforeafter')
      }
      const disp = result.trace.dispatch_tickets || []
      if (disp.length) setTickets(prev => [...disp, ...prev])
      setIncidents(prev => [{
        id: result.runId,
        title: `Alert Processed — ${result.incidentId}`,
        type: 'PIPELINE_COMPLETE',
        severity: result.trace.overall_confidence > 0.7 ? 'HIGH' : 'CRITICAL',
        time: new Date(),
        confidence: result.trace.overall_confidence,
      }, ...prev])
    }
  }, [])

  return (
    <>
      <Toaster position="top-right" toastOptions={{
        style: { background: '#0d1526', color: '#e2e8f0', border: '1px solid rgba(0,212,255,.2)', fontSize: '0.82rem' }
      }} />

      <div className="app-layout">
        <Header wsConnected={isConnected} agentCount={7} />

        {/* Left Panel */}
        <aside className="panel-left">
          <IngestPanel onResult={handleQueryResult} />
          <div style={{ borderTop: '1px solid var(--glass-border)', paddingTop: 12 }}>
            <IncidentFeed incidents={incidents} wsConnected={isConnected} />
          </div>
        </aside>

        {/* Map */}
        <main className="map-container">
          <NLQueryBar onResult={handleQueryResult} />
          <LayerControls activeLayers={activeLayers} onToggle={handleLayerToggle} />
          <MapView activeLayers={activeLayers} onAssetClick={setSelectedAsset} />
          {/* Map Legend */}
          <div className="map-legend">
            <div className="legend-title">Infrastructure Status</div>
            {[['OPERATIONAL','#10b981'],['VULNERABLE','#f97316'],['REROUTED','#00d4ff'],['OFFLINE','#6b7280'],['DEGRADED','#fbbf24']].map(([s,c]) => (
              <div key={s} className="legend-item">
                <div className="legend-dot" style={{ background: c }} />
                {s}
              </div>
            ))}
          </div>
          {queryResult && <QueryResultBanner result={queryResult} onClose={() => setQueryResult(null)} />}
        </main>

        {/* Right Panel */}
        <aside className="panel-right">
          {/* Tab bar */}
          <div style={{ display: 'flex', gap: 4, marginBottom: 12 }}>
            {[['reasoning', '🤖 Reasoning'], ['beforeafter', '⚡ Before/After']].map(([tab, label]) => (
              <button
                key={tab}
                onClick={() => setRightTab(tab)}
                style={{
                  flex: 1, padding: '6px', borderRadius: 8, border: 'none', cursor: 'pointer',
                  background: rightTab === tab ? 'rgba(0,212,255,.12)' : 'transparent',
                  color: rightTab === tab ? 'var(--color-primary)' : 'rgba(226,232,240,.45)',
                  fontSize: '0.72rem', fontWeight: 600, borderBottom: rightTab === tab ? '2px solid var(--color-primary)' : '2px solid transparent',
                }}
              >
                {label}
              </button>
            ))}
          </div>

          {rightTab === 'reasoning' && <AgentReasoningPanel trace={currentTrace} />}
          {rightTab === 'beforeafter' && <BeforeAfterPanel beforeAfter={beforeAfter} tickets={tickets} />}
        </aside>
      </div>

      {/* Asset detail popup */}
      {selectedAsset && <AssetDetail asset={selectedAsset} onClose={() => setSelectedAsset(null)} />}

      {/* Ambient glows */}
      <div className="glow-top-right" />
      <div className="glow-bottom-left" />
    </>
  )
}
