import React, { useState, useCallback, useEffect } from 'react'
import { Toaster, toast } from 'react-hot-toast'
import MapView from './components/Map/MapView.jsx'
import NLQueryBar from './components/NLQuery/NLQueryBar.jsx'
import AgentReasoningPanel from './components/AgentPanel/AgentReasoningPanel.jsx'
import BeforeAfterPanel from './components/BeforeAfter/BeforeAfterPanel.jsx'
import IncidentFeed from './components/IncidentFeed/IncidentFeed.jsx'
import { useWebSocket } from './hooks/useWebSocket.js'
import { ingestText, getAgentTrace } from './api/odinApi.js'
import './index.css'

const DEMO_ALERTS = [
  `URGENT: Cat-4 hurricane making landfall Gulf Coast in 18 hrs. Sustained winds 220 km/h. Transmission corridors TX-44 and TX-12 in direct storm path. Datacenters serving financial institutions at risk of cascading failure.`,
  `SUPPLY DISRUPTION: DRC cobalt exports halted — government moratorium. Affects 65% global cobalt supply. EV manufacturers and datacenter battery backup suppliers face critical shortage.`,
  `SENSOR ALERT: Voltage fluctuation at Northeast Grid Hub Alpha ±15% beyond nominal. Three downstream hospitals and one major datacenter on same feeder circuit.`,
]

function Header({ wsConnected, agentCount }) {
  const [time, setTime] = useState(new Date())
  useEffect(() => { const t = setInterval(() => setTime(new Date()), 1000); return () => clearInterval(t) }, [])
  return (
    <header className="header">
      <div className="header-logo">
        <div className="header-logo-mark">⊕</div>
        <div>
          <div className="header-logo-text">ODIN</div>
          <div className="header-logo-sub">Planetary Infrastructure Intelligence</div>
        </div>
      </div>
      <div className="header-status-bar">
        <div className="status-badge"><div className="status-dot" /> OPERATIONAL</div>
        <div className="agent-badge">◈ {agentCount} AGENTS</div>
        <div className="ws-badge">
          <div className="ws-dot" style={{ background: wsConnected ? 'var(--green)' : 'var(--muted)' }} />
          {wsConnected ? 'STREAM LIVE' : 'RECONNECTING'}
        </div>
        <div className="header-time">{time.toISOString().replace('T',' ').slice(0,19)} UTC</div>
      </div>
    </header>
  )
}

function IngestPanel({ onResult }) {
  const [text, setText] = useState('')
  const [loading, setLoading] = useState(false)

  const handleIngest = async (e) => {
    e.preventDefault()
    if (!text.trim() || loading) return
    setLoading(true)
    const id = toast.loading('ODIN pipeline running…')
    try {
      const result = await ingestText(text)
      toast.success(`RUN/${result.run_id?.slice(0,8)} — COMPLETE`, { id, duration: 4000 })
      if (result.run_id) {
        setTimeout(async () => {
          try { onResult({ type: 'ingest', trace: await getAgentTrace(result.run_id), runId: result.run_id, incidentId: result.incident_id }) } catch {}
        }, 800)
      }
    } catch (err) {
      toast.error(`PIPELINE ERROR: ${err.message}`, { id })
    } finally { setLoading(false) }
  }

  return (
    <div className="widget">
      <div className="section-header"><span className="section-title">Alert Ingest</span></div>
      <form onSubmit={handleIngest}>
        <textarea
          id="odin-ingest-textarea"
          className="ingest-textarea"
          value={text}
          onChange={e => setText(e.target.value)}
          placeholder="Paste weather alert, news report, or supply disruption…"
          disabled={loading}
        />
        <div style={{ display:'flex', gap:6, marginTop:8 }}>
          <button className="btn btn-primary" type="submit" disabled={loading || !text.trim()}>
            {loading ? <><span className="spinner" />PROCESSING</> : '▶ RUN PIPELINE'}
          </button>
          {text && <button type="button" className="btn btn-ghost" onClick={() => setText('')}>CLR</button>}
        </div>
        <div style={{ marginTop:10 }}>
          <div className="section-title" style={{ marginBottom:6 }}>Demo Alerts</div>
          {DEMO_ALERTS.map((a, i) => (
            <button key={i} type="button" className="demo-alert-btn" onClick={() => setText(a)}>
              {a.slice(0, 68)}…
            </button>
          ))}
        </div>
      </form>
    </div>
  )
}

function LayerControls({ activeLayers, onToggle }) {
  return (
    <div className="map-layer-controls">
      {[['infrastructure','⚡','INFRA'],['wind','💨','WIND'],['minerals','⛏','MINERALS']].map(([key,icon,label]) => (
        <button key={key} id={`layer-${key}`} className={`layer-toggle ${activeLayers[key]?'active':''}`} onClick={() => onToggle(key)}>
          {icon} {label}
        </button>
      ))}
    </div>
  )
}

function MapLegend() {
  return (
    <div className="map-legend">
      <div className="legend-title">Asset Status</div>
      {[['OPERATIONAL','#00e676'],['VULNERABLE','#ff6d00'],['REROUTED','#00e5ff'],['DEGRADED','#ffd740'],['OFFLINE','#6b7280']].map(([s,c]) => (
        <div key={s} className="legend-item"><div className="legend-dot" style={{ background:c }} />{s}</div>
      ))}
    </div>
  )
}

function AssetDetail({ asset, onClose }) {
  if (!asset) return null
  const sc = {OPERATIONAL:'var(--green)',VULNERABLE:'var(--orange)',REROUTED:'var(--cyan)',OFFLINE:'#6b7280',DEGRADED:'var(--yellow)'}
  return (
    <div className="asset-detail">
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:8 }}>
        <div className="asset-detail__type">{asset.asset_type?.replace(/_/g,' ')}</div>
        <button onClick={onClose} style={{ background:'none',border:'none',color:'var(--muted)',cursor:'pointer' }}>✕</button>
      </div>
      <div className="asset-detail__name">{asset.name}</div>
      <div className="asset-detail__grid">
        {[['STATUS',asset.status,sc[asset.status]],['RISK',asset.risk_level||'NONE',null],['COUNTRY',asset.country,null],['CAPACITY',asset.capacity_mw?`${asset.capacity_mw} MW`:'—',null]].map(([l,v,c]) => (
          <div key={l} className="asset-detail__cell">
            <div className="asset-detail__cell-label">{l}</div>
            <div className="asset-detail__cell-val" style={c?{color:c}:{}}>{v}</div>
          </div>
        ))}
      </div>
    </div>
  )
}

function QueryResultBanner({ result, onClose }) {
  if (!result) return null
  return (
    <div className="query-banner">
      <div className="query-banner__header">
        <div className="query-banner__label">◈ ODIN Response</div>
        <button className="query-banner__close" onClick={onClose}>✕</button>
      </div>
      <div className="query-banner__answer">{result.answer}</div>
      <div className="query-banner__meta">
        <span className="query-banner__conf">Confidence: <span>{Math.round((result.confidence||0)*100)}%</span></span>
        {result.data_sources?.map(s => (
          <span key={s} style={{ fontSize:9, padding:'1px 6px', background:'rgba(255,179,0,.08)', color:'var(--amber)', border:'1px solid var(--amber-d)', letterSpacing:'.08em' }}>{s}</span>
        ))}
      </div>
    </div>
  )
}

export default function App() {
  const [activeLayers, setActiveLayers] = useState({ infrastructure:true, wind:false, minerals:false })
  const [selectedAsset, setSelectedAsset]   = useState(null)
  const [queryResult, setQueryResult]       = useState(null)
  const [currentTrace, setCurrentTrace]     = useState(null)
  const [beforeAfter, setBeforeAfter]       = useState([])
  const [tickets, setTickets]               = useState([])
  const [incidents, setIncidents]           = useState([])
  const [rightTab, setRightTab]             = useState('reasoning')
  const { isConnected, messages } = useWebSocket('/ws/incidents')

  useEffect(() => {
    if (!messages.length) return
    const latest = messages[0]
    if (latest?.type === 'INCIDENT_PROCESSED') {
      setIncidents(prev => [{ id:latest.run_id, title:`INC/${latest.incident_id}`, type:'PIPELINE_COMPLETE', severity:'HIGH', time:new Date(latest.timestamp), summary:latest.summary, confidence:latest.confidence }, ...prev].slice(0,50))
      if (latest.before_after?.length) { setBeforeAfter(prev => [...latest.before_after,...prev]); setRightTab('beforeafter') }
    }
  }, [messages])

  const handleLayerToggle = useCallback((key) => setActiveLayers(prev => ({ ...prev, [key]:!prev[key] })), [])

  const handleQueryResult = useCallback(async (result) => {
    if (result.type === 'nl_query') {
      setQueryResult(result)
    } else if (result.type === 'ingest' && result.trace) {
      setCurrentTrace(result.trace)
      const ba = result.trace.before_after || []
      if (ba.length) { setBeforeAfter(prev => [...ba,...prev]); setRightTab('beforeafter') }
      const disp = result.trace.dispatch_tickets || []
      if (disp.length) setTickets(prev => [...disp,...prev])
      setIncidents(prev => [{ id:result.runId, title:`INC/${result.incidentId}`, type:'PIPELINE_COMPLETE', severity:result.trace.overall_confidence>0.7?'HIGH':'CRITICAL', time:new Date(), confidence:result.trace.overall_confidence },...prev])
    }
  }, [])

  return (
    <>
      <Toaster position="top-right" toastOptions={{
        style:{ background:'#0d1117', color:'rgba(255,255,255,.88)', border:'1px solid rgba(255,179,0,.2)', fontFamily:"'IBM Plex Mono',monospace", fontSize:11, borderRadius:0, borderLeft:'2px solid #ffb300' }
      }} />
      <div className="app-layout">
        <Header wsConnected={isConnected} agentCount={7} />

        <aside className="panel-left">
          <IngestPanel onResult={handleQueryResult} />
          <div className="widget" style={{ flex:1, minHeight:0 }}>
            <div className="section-header"><span className="section-title">Incident Stream</span></div>
            <IncidentFeed incidents={incidents} wsConnected={isConnected} />
          </div>
        </aside>

        <main className="map-container">
          <NLQueryBar onResult={handleQueryResult} />
          <LayerControls activeLayers={activeLayers} onToggle={handleLayerToggle} />
          <MapView activeLayers={activeLayers} onAssetClick={setSelectedAsset} />
          <MapLegend />
          {queryResult && <QueryResultBanner result={queryResult} onClose={() => setQueryResult(null)} />}
        </main>

        <aside className="panel-right">
          <div className="tab-bar">
            {[['reasoning','◈ Reasoning'],['beforeafter','⚡ Before/After']].map(([tab,label]) => (
              <button key={tab} className={`tab-btn ${rightTab===tab?'active':''}`} onClick={() => setRightTab(tab)}>{label}</button>
            ))}
          </div>
          {rightTab==='reasoning' && <AgentReasoningPanel trace={currentTrace} />}
          {rightTab==='beforeafter' && <BeforeAfterPanel beforeAfter={beforeAfter} tickets={tickets} />}
        </aside>
      </div>
      {selectedAsset && <AssetDetail asset={selectedAsset} onClose={() => setSelectedAsset(null)} />}
    </>
  )
}
