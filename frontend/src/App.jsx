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

// ── Static technology legend data ──────────────────────────────────────────
const TECH_LEGEND = [
  { key:'SOLAR',         label:'Solar',          color:'#f59e0b', count:50,  mw:21480 },
  { key:'WIND',          label:'Wind',            color:'#84cc16', count:62,  mw:31840 },
  { key:'OFFSHORE_WIND', label:'Offshore Wind',   color:'#06b6d4', count:5,   mw:3830  },
  { key:'STORAGE',       label:'Storage',         color:'#ec4899', count:8,   mw:2450  },
  { key:'HYDRO',         label:'Hydro',           color:'#38bdf8', count:42,  mw:48200 },
  { key:'NUCLEAR',       label:'Nuclear',         color:'#22d3ee', count:28,  mw:77480 },
  { key:'GAS',           label:'Gas',             color:'#c084fc', count:64,  mw:75600 },
  { key:'COAL',          label:'Coal',            color:'#78716c', count:23,  mw:53900 },
  { key:'GEOTHERMAL',    label:'Geothermal',      color:'#fb923c', count:7,   mw:1957  },
]

const TRANSMISSION_LEGEND = [
  { label:'735kV+',    color:'#00e5ff', width:3 },
  { label:'500–734kV', color:'#22d3ee', width:2.5 },
  { label:'345–499kV', color:'#38bdf8', width:2 },
  { label:'230–344kV', color:'#818cf8', width:1.5 },
  { label:'138–229kV', color:'#a78bfa', width:1 },
]

const SUBSTATION_LEGEND = [
  { label:'500+ kV', size:9, color:'#22d3ee' },
  { label:'345–499 kV', size:7, color:'#38bdf8' },
  { label:'230–344 kV', size:5.5, color:'#818cf8' },
  { label:'<230 kV', size:4, color:'#a78bfa' },
]

const DEMO_ALERTS = [
  'URGENT: Cat-4 hurricane making landfall Gulf Coast in 18 hrs. Sustained winds 220 km/h. Transmission corridors TX-44 and TX-12 in direct storm path. Datacenters serving financial institutions at risk of cascading failure.',
  'SUPPLY DISRUPTION: DRC cobalt exports halted — government moratorium. Affects 65% global cobalt supply. EV manufacturers and datacenter battery backup suppliers face critical shortage.',
  'SENSOR ALERT: Voltage fluctuation at Northeast Grid Hub Alpha ±15% beyond nominal. Three downstream hospitals and one major datacenter on same feeder circuit.',
]

function fmtMW(mw) {
  if (!mw) return '0 MW'
  return mw >= 1000 ? `${(mw/1000).toFixed(1)}GW` : `${mw}MW`
}

// ── HEADER ────────────────────────────────────────────────────────────────
function Header({ wsConnected, agentCount }) {
  const [time, setTime] = useState(new Date())
  useEffect(() => {
    const t = setInterval(() => setTime(new Date()), 1000)
    return () => clearInterval(t)
  }, [])
  return (
    <header className="header">
      <div className="header-logo">
        <div className="header-logo-mark">
          <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
            <circle cx="9" cy="9" r="7.5" stroke="#ffb300" strokeWidth="1"/>
            <circle cx="9" cy="9" r="3" fill="#ffb300"/>
            <line x1="9" y1="0" x2="9" y2="4" stroke="#ffb300" strokeWidth="1"/>
            <line x1="9" y1="14" x2="9" y2="18" stroke="#ffb300" strokeWidth="1"/>
            <line x1="0" y1="9" x2="4" y2="9" stroke="#ffb300" strokeWidth="1"/>
            <line x1="14" y1="9" x2="18" y2="9" stroke="#ffb300" strokeWidth="1"/>
          </svg>
        </div>
        <div>
          <div className="header-logo-text">ODIN</div>
          <div className="header-logo-sub">Planetary Infrastructure Intelligence</div>
        </div>
      </div>
      <div className="header-status-bar">
        <div className="status-badge"><div className="status-dot" />OPERATIONAL</div>
        <div className="agent-badge">◈ {agentCount} AGENTS ACTIVE</div>
        <div className="header-divider" />
        <div className="ws-badge">
          <div className="ws-dot" style={{ background: wsConnected ? 'var(--green)' : 'var(--muted)' }} />
          {wsConnected ? 'STREAM LIVE' : 'STREAM OFFLINE'}
        </div>
        <div className="header-time">{time.toISOString().replace('T',' ').slice(0,19)} UTC</div>
      </div>
    </header>
  )
}

// ── LEFT PANEL (OGW-style) ─────────────────────────────────────────────────
function TechRow({ item, filtered, onToggle }) {
  const dimmed = filtered && !filtered.has(item.key)
  return (
    <div
      className={`ogw-tech-row ${dimmed ? 'dimmed' : ''}`}
      onClick={() => onToggle(item.key)}
    >
      <div className="ogw-tech-dot" style={{ background: item.color }} />
      <span className="ogw-tech-label">{item.label}</span>
      <span className="ogw-tech-count">{item.count.toLocaleString()}</span>
      <span className="ogw-tech-mw">{fmtMW(item.mw)}</span>
    </div>
  )
}

function SizeLegend() {
  const sizes = [{ r:3, label:'50MW' },{ r:5, label:'500MW' },{ r:8, label:'2GW' },{ r:11, label:'5GW' },{ r:15, label:'10GW' }]
  return (
    <div className="ogw-section">
      <div className="ogw-section-header">
        <span>Size (MW)</span>
        <span className="ogw-info-icon">ⓘ</span>
      </div>
      <div className="ogw-size-row">
        {sizes.map(({ r, label }) => (
          <div key={label} className="ogw-size-item">
            <div className="ogw-size-circle-wrap" style={{ height: r*2+2 }}>
              <div style={{ width:r*2, height:r*2, borderRadius:'50%', border:'1.5px solid rgba(255,255,255,0.35)', background:'rgba(255,255,255,0.06)' }} />
            </div>
            <div className="ogw-size-label">{label}</div>
          </div>
        ))}
      </div>
    </div>
  )
}

function TxLegend({ active, onToggle }) {
  return (
    <div className="ogw-section">
      <div className="ogw-section-header" style={{ cursor:'pointer' }} onClick={onToggle}>
        <span>Transmission</span>
        <span className="ogw-toggle-icon">{active ? '◉' : '○'}</span>
      </div>
      {TRANSMISSION_LEGEND.map(({ label, color, width }) => (
        <div key={label} className="ogw-tx-row">
          <div className="ogw-tx-line" style={{ background: color, height: Math.max(1, width*0.8) }} />
          <span className="ogw-tx-label">{label}</span>
        </div>
      ))}
    </div>
  )
}

function SubstationLegend() {
  return (
    <div className="ogw-section">
      <div className="ogw-section-header">
        <span>Substations</span>
        <span className="ogw-info-icon">ⓘ</span>
      </div>
      {SUBSTATION_LEGEND.map(({ label, size, color }) => (
        <div key={label} className="ogw-sub-row">
          <div style={{ width:size, height:size, borderRadius:'50%', background:color, flexShrink:0 }} />
          <span className="ogw-sub-label">{label}</span>
        </div>
      ))}
    </div>
  )
}

function FiberLegend({ active, onToggle }) {
  return (
    <div className="ogw-section">
      <div className="ogw-section-header" style={{ cursor:'pointer' }} onClick={onToggle}>
        <span>Submarine Cables</span>
        <span className="ogw-toggle-icon">{active ? '◉' : '○'}</span>
      </div>
      <div className="ogw-tx-row">
        <div style={{ width:28, height:0, borderTop:'1.5px dashed #e879f9', flexShrink:0 }} />
        <span className="ogw-tx-label">Fiber optic cable</span>
      </div>
      <div className="ogw-sub-row" style={{ marginTop:3 }}>
        <div style={{ width:6, height:6, borderRadius:'50%', background:'#e879f9', flexShrink:0 }} />
        <span className="ogw-sub-label">Cable landing point</span>
      </div>
    </div>
  )
}

function PipelineLegend({ gasActive, oilActive, onGasToggle, onOilToggle }) {
  return (
    <div className="ogw-section">
      <div className="ogw-section-header">
        <span>Pipelines</span>
        <span className="ogw-info-icon">ⓘ</span>
      </div>
      <div className="ogw-tx-row" style={{ cursor:'pointer' }} onClick={onGasToggle}>
        <div style={{ width:28, height:0, borderTop:'1.5px dashed #f97316', flexShrink:0 }} />
        <span className="ogw-tx-label" style={{ color: gasActive ? undefined : 'rgba(255,255,255,.3)' }}>Natural Gas {gasActive ? '◉' : '○'}</span>
      </div>
      <div className="ogw-tx-row" style={{ cursor:'pointer', marginTop:3 }} onClick={onOilToggle}>
        <div style={{ width:28, height:2, background:'#ef4444', flexShrink:0, borderRadius:1 }} />
        <span className="ogw-tx-label" style={{ color: oilActive ? undefined : 'rgba(255,255,255,.3)' }}>Crude Oil {oilActive ? '◉' : '○'}</span>
      </div>
    </div>
  )
}

function OffshoreLegend({ active, onToggle }) {
  return (
    <div className="ogw-section">
      <div className="ogw-section-header" style={{ cursor:'pointer' }} onClick={onToggle}>
        <span>Offshore</span>
        <span className="ogw-toggle-icon">{active ? '◉' : '○'}</span>
      </div>
      <div className="ogw-sub-row">
        <div style={{ width:7, height:7, borderRadius:'50%', background:'#f59e0b', flexShrink:0 }} />
        <span className="ogw-sub-label">Oil/Gas Platform</span>
      </div>
      <div className="ogw-sub-row" style={{ marginTop:3 }}>
        <div style={{ width:7, height:7, borderRadius:'50%', background:'#fb923c', flexShrink:0 }} />
        <span className="ogw-sub-label">LNG Facility</span>
      </div>
      <div className="ogw-sub-row" style={{ marginTop:3 }}>
        <div style={{ width:7, height:7, borderRadius:'50%', background:'#06b6d4', flexShrink:0 }} />
        <span className="ogw-sub-label">Offshore Wind</span>
      </div>
    </div>
  )
}

function AlertIngest({ onResult }) {
  const [text, setText] = useState('')
  const [loading, setLoading] = useState(false)
  const [expanded, setExpanded] = useState(false)

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
          try {
            const trace = await getAgentTrace(result.run_id)
            onResult({ type:'ingest', trace, runId:result.run_id, incidentId:result.incident_id })
          } catch {}
        }, 800)
      }
    } catch (err) {
      toast.error(`PIPELINE ERROR: ${err.message}`, { id })
    } finally { setLoading(false) }
  }

  return (
    <div className="ogw-section ogw-section-ingest">
      <div className="ogw-section-header" style={{ cursor:'pointer' }} onClick={() => setExpanded(v => !v)}>
        <span>Alert Ingest</span>
        <span className="ogw-toggle-icon">{expanded ? '▼' : '▶'}</span>
      </div>
      {expanded && (
        <form onSubmit={handleIngest}>
          <textarea
            className="ingest-textarea"
            value={text}
            onChange={e => setText(e.target.value)}
            placeholder="Paste weather alert, news report, or supply disruption…"
            disabled={loading}
          />
          <div style={{ display:'flex', gap:5, marginTop:6 }}>
            <button className="btn btn-primary" type="submit" disabled={loading || !text.trim()} style={{ flex:1, fontSize:10 }}>
              {loading ? <><span className="spinner" /> PROCESSING</> : '▶ RUN PIPELINE'}
            </button>
            {text && <button type="button" className="btn btn-ghost" onClick={() => setText('')} style={{ fontSize:10 }}>CLR</button>}
          </div>
          <div style={{ marginTop:8 }}>
            {DEMO_ALERTS.map((a, i) => (
              <button key={i} type="button" className="demo-alert-btn" onClick={() => setText(a)}>
                {a.slice(0, 60)}…
              </button>
            ))}
          </div>
        </form>
      )}
    </div>
  )
}

function LeftPanel({ activeLayers, onLayerToggle, onResult }) {
  const [filtered, setFiltered] = useState(null)
  const totalCount = TECH_LEGEND.reduce((s,t) => s+t.count, 0) + 75 + 10 + 3  // + substations + DCs + hospitals
  const totalGW = TECH_LEGEND.reduce((s,t) => s+t.mw, 0) / 1000

  const handleTechToggle = (key) => {
    setFiltered(prev => {
      if (!prev) {
        const s = new Set([key])
        return s
      }
      const s = new Set(prev)
      if (s.has(key)) s.delete(key)
      else s.add(key)
      return s.size === 0 ? null : s
    })
  }

  return (
    <aside className="panel-left">
      {/* Title block */}
      <div className="ogw-title-block">
        <div className="ogw-title">North American Grid</div>
        <div className="ogw-subtitle">
          <span className="ogw-count">{totalCount.toLocaleString()} assets</span>
          <span className="ogw-sep">|</span>
          <span className="ogw-cap">{totalGW.toFixed(1)}GW</span>
        </div>
        <div className="ogw-status-row">
          <div className="ogw-status-dot OPERATIONAL" />
          <span>USA · Canada · Mexico · 9 technologies</span>
        </div>
      </div>

      {/* Technology breakdown */}
      <div className="ogw-section">
        <div className="ogw-section-header">
          <span>Technology</span>
          {filtered && (
            <button className="ogw-clear-btn" onClick={() => setFiltered(null)}>Clear</button>
          )}
        </div>
        {TECH_LEGEND.map(item => (
          <TechRow key={item.key} item={item} filtered={filtered} onToggle={handleTechToggle} />
        ))}
      </div>

      <SizeLegend />

      {/* Data Centers section */}
      <div className="ogw-section">
        <div className="ogw-section-header">
          <span>Data Centers</span>
          <span className="ogw-info-icon">ⓘ</span>
        </div>
        <div className="ogw-dc-row">
          <div style={{ width:8, height:8, borderRadius:1, background:'#818cf8', flexShrink:0 }} />
          <span className="ogw-sub-label">Data Centers (10)</span>
        </div>
        <div className="ogw-dc-row">
          <div style={{ width:7, height:7, borderRadius:'50%', background:'#34d399', flexShrink:0 }} />
          <span className="ogw-sub-label">Hospitals (3)</span>
        </div>
      </div>

      <TxLegend
        active={activeLayers.transmission !== false}
        onToggle={() => onLayerToggle('transmission')}
      />
      <SubstationLegend />

      <FiberLegend
        active={activeLayers.cables !== false}
        onToggle={() => onLayerToggle('cables')}
      />
      <PipelineLegend
        gasActive={activeLayers.gas !== false}
        oilActive={activeLayers.oil !== false}
        onGasToggle={() => onLayerToggle('gas')}
        onOilToggle={() => onLayerToggle('oil')}
      />
      <OffshoreLegend
        active={activeLayers.offshore !== false}
        onToggle={() => onLayerToggle('offshore')}
      />

      <AlertIngest onResult={onResult} />
    </aside>
  )
}

// ── MAP OVERLAYS ───────────────────────────────────────────────────────────
function LayerControls({ activeLayers, onToggle }) {
  const layers = [
    ['infrastructure','⚡','INFRA'],
    ['transmission','〰','TX'],
    ['cables','〜','CABLES'],
    ['gas','◌','GAS'],
    ['oil','●','OIL'],
    ['offshore','◆','OFFSHORE'],
  ]
  return (
    <div className="map-layer-controls">
      {layers.map(([key,icon,label]) => (
        <button key={key} className={`layer-toggle ${activeLayers[key] ? 'active' : ''}`} onClick={() => onToggle(key)}>
          {icon} {label}
        </button>
      ))}
    </div>
  )
}

function StatusLegend() {
  const items = [['OPERATIONAL','#00e676'],['VULNERABLE','#ff6d00'],['REROUTED','#00e5ff'],['DEGRADED','#ffd740'],['OFFLINE','#6b7280']]
  return (
    <div className="map-legend">
      <div className="legend-title">Asset Status</div>
      {items.map(([s,c]) => (
        <div key={s} className="legend-item">
          <div className="legend-dot" style={{ background:c }} />
          {s}
        </div>
      ))}
    </div>
  )
}

function AssetDetail({ asset, onClose }) {
  if (!asset) return null
  const sc = { OPERATIONAL:'var(--green)', VULNERABLE:'var(--orange)', REROUTED:'var(--cyan)', OFFLINE:'#6b7280', DEGRADED:'var(--yellow)' }
  return (
    <div className="asset-detail">
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:8 }}>
        <div className="asset-detail__type">{asset.technology || asset.asset_type?.replace(/_/g,' ')}</div>
        <button onClick={onClose} style={{ background:'none',border:'none',color:'var(--muted)',cursor:'pointer',fontSize:16 }}>✕</button>
      </div>
      <div className="asset-detail__name">{asset.name}</div>
      <div className="asset-detail__grid">
        {[
          ['STATUS', asset.status, sc[asset.status]],
          ['RISK', asset.risk_level || 'NONE', null],
          ['COUNTRY', asset.country, null],
          ['CAPACITY', asset.capacity_mw ? `${asset.capacity_mw >= 1000 ? (asset.capacity_mw/1000).toFixed(1)+'GW' : asset.capacity_mw+'MW'}` : '—', null],
        ].map(([l,v,c]) => (
          <div key={l} className="asset-detail__cell">
            <div className="asset-detail__cell-label">{l}</div>
            <div className="asset-detail__cell-val" style={c ? { color:c } : {}}>{v}</div>
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
        <div className="query-banner__label">◈ ODIN RESPONSE</div>
        <button className="query-banner__close" onClick={onClose}>✕</button>
      </div>
      <div className="query-banner__answer">{result.answer}</div>
      <div className="query-banner__meta">
        <span className="query-banner__conf">Confidence: <span>{Math.round((result.confidence||0)*100)}%</span></span>
        {result.data_sources?.map(s => (
          <span key={s} className="query-banner__source">{s}</span>
        ))}
      </div>
    </div>
  )
}

// ── RIGHT PANEL ────────────────────────────────────────────────────────────
function RightPanel({ currentTrace, beforeAfter, tickets, incidents, wsConnected, rightTab, setRightTab }) {
  return (
    <aside className="panel-right">
      <div className="tab-bar">
        {[['reasoning','◈ Reasoning'],['beforeafter','⚡ Before/After'],['feed','📡 Feed']].map(([tab,label]) => (
          <button key={tab} className={`tab-btn ${rightTab===tab?'active':''}`} onClick={() => setRightTab(tab)}>
            {label}
          </button>
        ))}
      </div>
      <div className="panel-content">
        {rightTab === 'reasoning' && <AgentReasoningPanel trace={currentTrace} />}
        {rightTab === 'beforeafter' && <BeforeAfterPanel beforeAfter={beforeAfter} tickets={tickets} />}
        {rightTab === 'feed' && <IncidentFeed incidents={incidents} wsConnected={wsConnected} />}
      </div>
    </aside>
  )
}

// ── ROOT ───────────────────────────────────────────────────────────────────
export default function App() {
  const [activeLayers, setActiveLayers]   = useState({ infrastructure:true, wind:false, minerals:false, transmission:true, cables:true, gas:true, oil:true, offshore:true })
  const [selectedAsset, setSelectedAsset] = useState(null)
  const [queryResult, setQueryResult]     = useState(null)
  const [currentTrace, setCurrentTrace]   = useState(null)
  const [beforeAfter, setBeforeAfter]     = useState([])
  const [tickets, setTickets]             = useState([])
  const [incidents, setIncidents]         = useState([])
  const [rightTab, setRightTab]           = useState('reasoning')
  const { isConnected, messages }         = useWebSocket('/ws/incidents')

  useEffect(() => {
    if (!messages.length) return
    const latest = messages[0]
    if (latest?.type === 'INCIDENT_PROCESSED') {
      setIncidents(prev => [{
        id: latest.run_id,
        title: `INC/${latest.incident_id}`,
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
      if (ba.length) { setBeforeAfter(prev => [...ba, ...prev]); setRightTab('beforeafter') }
      const disp = result.trace.dispatch_tickets || []
      if (disp.length) setTickets(prev => [...disp, ...prev])
      setIncidents(prev => [{
        id: result.runId,
        title: `INC/${result.incidentId}`,
        type: 'PIPELINE_COMPLETE',
        severity: result.trace.overall_confidence > 0.7 ? 'HIGH' : 'CRITICAL',
        time: new Date(),
        confidence: result.trace.overall_confidence,
      }, ...prev])
      setRightTab('reasoning')
    }
  }, [])

  return (
    <>
      <Toaster position="top-right" toastOptions={{
        style: {
          background: '#0d1117', color: 'rgba(255,255,255,.88)',
          border: '1px solid rgba(255,179,0,.2)',
          fontFamily: "'IBM Plex Mono',monospace", fontSize: 11,
          borderRadius: 0, borderLeft: '2px solid #ffb300',
        },
      }} />
      <div className="app-layout">
        <Header wsConnected={isConnected} agentCount={7} />

        <LeftPanel
          activeLayers={activeLayers}
          onLayerToggle={handleLayerToggle}
          onResult={handleQueryResult}
        />

        <main className="map-container">
          <NLQueryBar onResult={handleQueryResult} />
          <LayerControls activeLayers={activeLayers} onToggle={handleLayerToggle} />
          <MapView activeLayers={activeLayers} onAssetClick={setSelectedAsset} />
          <StatusLegend />
          {queryResult && <QueryResultBanner result={queryResult} onClose={() => setQueryResult(null)} />}
        </main>

        <RightPanel
          currentTrace={currentTrace}
          beforeAfter={beforeAfter}
          tickets={tickets}
          incidents={incidents}
          wsConnected={isConnected}
          rightTab={rightTab}
          setRightTab={setRightTab}
        />
      </div>

      {selectedAsset && (
        <AssetDetail asset={selectedAsset} onClose={() => setSelectedAsset(null)} />
      )}
    </>
  )
}
