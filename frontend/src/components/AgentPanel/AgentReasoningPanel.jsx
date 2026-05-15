import React from 'react'

const AGENT_COLORS = {
  ClimateAgent:    '#00e5ff',
  WindAgent:       '#84cc16',
  ResourceAgent:   '#f59e0b',
  CascadeAgent:    '#ef4444',
  DecisionAgent:   '#c084fc',
  DispatchAgent:   '#fb923c',
  ReflectionAgent: '#10b981',
  Orchestrator:    '#6366f1',
}

function ConfidenceBar({ value }) {
  const pct = Math.round((value || 0) * 100)
  const color = pct >= 80 ? '#00e676' : pct >= 60 ? '#ffd740' : '#ff1744'
  return (
    <div style={{ display:'flex', alignItems:'center', gap:5, minWidth:72 }}>
      <div className="progress-bar" style={{ flex:1 }}>
        <div className="progress-fill" style={{ width:`${pct}%`, background:color }} />
      </div>
      <span style={{ fontFamily:'var(--mono)', fontSize:'0.6rem', color, minWidth:26 }}>{pct}%</span>
    </div>
  )
}

function WorkplanBlock({ workplan }) {
  if (!workplan) return null
  return (
    <div style={{ marginBottom:10 }}>
      <div style={{ fontSize:'0.65rem', color:'var(--amber)', fontWeight:700, marginBottom:4, textTransform:'uppercase', letterSpacing:'.1em' }}>
        Workplan
      </div>
      <div style={{ fontSize:'0.7rem', color:'rgba(255,255,255,.65)', marginBottom:5, lineHeight:1.5 }}>{workplan.goal}</div>
      <ol style={{ paddingLeft:14, margin:0 }}>
        {workplan.steps?.map((s, i) => (
          <li key={i} style={{ fontSize:'0.65rem', color:'rgba(255,255,255,.4)', marginBottom:2 }}>{s}</li>
        ))}
      </ol>
    </div>
  )
}

function ReasoningStepRow({ step }) {
  const color = AGENT_COLORS[step.agent] || '#e2e8f0'
  return (
    <div className="trace-step active" style={{ borderLeftColor:color }}>
      <div style={{ flex:1 }}>
        <div className="trace-agent" style={{ color }}>{step.agent}</div>
        <div className="trace-desc">{step.description}</div>
        {step.duration_ms && (
          <div style={{ fontSize:'0.58rem', color:'rgba(255,255,255,.25)', marginTop:2 }}>{step.duration_ms}ms</div>
        )}
      </div>
      <ConfidenceBar value={step.confidence} />
    </div>
  )
}

function ErrorRecoveryBlock({ errorRecovery }) {
  if (!errorRecovery?.triggered) return null
  return (
    <div style={{
      padding:'9px 11px', marginBottom:7,
      background:'rgba(255,23,68,.06)',
      border:'1px solid rgba(255,23,68,.2)',
    }}>
      <div style={{ fontSize:'0.65rem', fontWeight:700, color:'#ff1744', marginBottom:3 }}>
        ⚠ Fallback Triggered
      </div>
      <div style={{ fontSize:'0.68rem', color:'rgba(255,255,255,.6)' }}>{errorRecovery.reason}</div>
      <div style={{ fontSize:'0.62rem', color:'rgba(255,255,255,.4)', marginTop:3 }}>
        Strategy: {errorRecovery.fallback_strategy}
      </div>
      {errorRecovery.degraded_mode && (
        <div style={{ fontSize:'0.6rem', color:'#ffd740', marginTop:3 }}>⚡ DEGRADED mode active</div>
      )}
    </div>
  )
}

function DecisionBlock({ decision }) {
  if (!decision) return null
  return (
    <div style={{ marginBottom:8 }}>
      <div style={{ fontSize:'0.65rem', color:'var(--amber)', fontWeight:700, marginBottom:5, textTransform:'uppercase', letterSpacing:'.1em' }}>
        Decision
      </div>
      <div style={{ padding:'8px 10px', background:'rgba(192,132,252,.08)', border:'1px solid rgba(192,132,252,.2)', marginBottom:5 }}>
        <div style={{ fontSize:'0.68rem', color:'#c084fc', fontWeight:700 }}>{decision.chosen_option_id}</div>
        <div style={{ fontSize:'0.68rem', color:'rgba(255,255,255,.6)', marginTop:2, lineHeight:1.5 }}>
          {decision.rationale?.slice(0, 150)}{decision.rationale?.length > 150 ? '…' : ''}
        </div>
        <div style={{ fontSize:'0.6rem', color:'rgba(255,255,255,.35)', marginTop:3 }}>
          Confidence: {Math.round((decision.confidence || 0) * 100)}%
        </div>
      </div>
    </div>
  )
}

export default function AgentReasoningPanel({ trace }) {
  if (!trace) {
    return (
      <div>
        <div className="section-header">
          <span className="section-title">Agent Reasoning</span>
        </div>
        <div style={{ padding:'28px 0', textAlign:'center', color:'rgba(255,255,255,.25)', fontSize:'0.72rem' }}>
          Submit an alert or query to see live agent reasoning
        </div>
      </div>
    )
  }

  const steps        = trace.reasoning_steps || []
  const workplan     = trace.workplan
  const errorRecovery = trace.error_recovery
  const decision     = trace.decision_flow

  return (
    <div>
      <div className="section-header">
        <span className="section-title">Agent Reasoning Trace</span>
        <span style={{ fontFamily:'var(--mono)', fontSize:'0.58rem', color:'rgba(255,255,255,.25)' }}>
          {trace.run_id?.slice(0, 8)}
        </span>
      </div>

      {/* Metrics row */}
      <div className="card" style={{ marginBottom:10 }}>
        <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:8 }}>
          <div>
            <div className="metric-label">Status</div>
            <div style={{ fontSize:'0.75rem', fontWeight:700, color:trace.outcome_success ? '#00e676' : '#ff1744' }}>
              {trace.outcome_success ? '✓ Success' : '✗ Failed'}
            </div>
          </div>
          <div>
            <div className="metric-label">Duration</div>
            <div className="metric-value">{trace.total_duration_ms ? `${trace.total_duration_ms}ms` : '—'}</div>
          </div>
          <div>
            <div className="metric-label">Confidence</div>
            <ConfidenceBar value={trace.overall_confidence} />
          </div>
          <div>
            <div className="metric-label">Tool Calls</div>
            <div className="metric-value">{trace.tool_calls?.length || 0}</div>
          </div>
        </div>
      </div>

      <WorkplanBlock workplan={workplan} />
      <ErrorRecoveryBlock errorRecovery={errorRecovery} />
      <DecisionBlock decision={decision} />

      <div style={{ fontSize:'0.65rem', color:'var(--amber)', fontWeight:700, marginBottom:6, textTransform:'uppercase', letterSpacing:'.1em' }}>
        Reasoning Steps ({steps.length})
      </div>
      <div style={{ maxHeight:280, overflowY:'auto' }}>
        {steps.map((s, i) => <ReasoningStepRow key={i} step={s} />)}
      </div>

      {/* Tool calls */}
      {trace.tool_calls?.length > 0 && (
        <div style={{ marginTop:10 }}>
          <div style={{ fontSize:'0.65rem', color:'var(--amber)', fontWeight:700, marginBottom:5, textTransform:'uppercase', letterSpacing:'.1em' }}>
            Tool Calls ({trace.tool_calls.length})
          </div>
          {trace.tool_calls.map((tc, i) => (
            <div key={i} style={{
              display:'flex', justifyContent:'space-between', alignItems:'center',
              padding:'5px 9px', marginBottom:3,
              background:'var(--bg0)', border:'1px solid var(--border)',
            }}>
              <span style={{ fontFamily:'var(--mono)', fontSize:'0.6rem', color:'rgba(255,255,255,.5)' }}>
                {tc.method} {tc.endpoint}
              </span>
              <span style={{
                fontSize:'0.58rem', padding:'1px 6px',
                background:tc.success ? 'rgba(0,230,118,.1)' : 'rgba(255,23,68,.1)',
                color:tc.success ? '#00e676' : '#ff1744',
                border:`1px solid ${tc.success ? 'rgba(0,230,118,.2)' : 'rgba(255,23,68,.2)'}`,
              }}>
                {tc.status_code || (tc.success ? '200' : 'ERR')}
              </span>
            </div>
          ))}
        </div>
      )}

      {/* Outcome */}
      {trace.outcome_summary && (
        <div style={{
          marginTop:10, padding:'9px 11px',
          background:'rgba(0,229,255,.04)',
          border:'1px solid rgba(0,229,255,.12)',
          fontSize:'0.68rem', color:'rgba(255,255,255,.55)', lineHeight:1.55,
        }}>
          <span style={{ color:'var(--cyan)', fontWeight:700 }}>Outcome: </span>
          {trace.outcome_summary}
        </div>
      )}
    </div>
  )
}
