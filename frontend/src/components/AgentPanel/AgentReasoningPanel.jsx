import React from 'react'

const AGENT_COLORS = {
  ClimateAgent:    '#00d4ff',
  WindAgent:       '#84cc16',
  ResourceAgent:   '#f59e0b',
  CascadeAgent:    '#ef4444',
  DecisionAgent:   '#7c3aed',
  DispatchAgent:   '#f97316',
  ReflectionAgent: '#10b981',
  Orchestrator:    '#6366f1',
}

function ConfidenceBar({ value }) {
  const pct = Math.round((value || 0) * 100)
  const color = pct >= 80 ? '#10b981' : pct >= 60 ? '#f59e0b' : '#ef4444'
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 6, minWidth: 80 }}>
      <div className="progress-bar" style={{ flex: 1 }}>
        <div className="progress-fill" style={{ width: `${pct}%`, background: color }} />
      </div>
      <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.65rem', color }}>{pct}%</span>
    </div>
  )
}

function WorkplanBlock({ workplan }) {
  if (!workplan) return null
  return (
    <div style={{ marginBottom: 12 }}>
      <div style={{ fontSize: '0.68rem', color: 'var(--color-primary)', fontWeight: 700, marginBottom: 4, textTransform: 'uppercase', letterSpacing: '.1em' }}>
        📋 Workplan
      </div>
      <div style={{ fontSize: '0.75rem', color: 'rgba(226,232,240,.7)', marginBottom: 6 }}>{workplan.goal}</div>
      <ol style={{ paddingLeft: 16, margin: 0 }}>
        {workplan.steps?.map((s, i) => (
          <li key={i} style={{ fontSize: '0.7rem', color: 'rgba(226,232,240,.5)', marginBottom: 2 }}>{s}</li>
        ))}
      </ol>
    </div>
  )
}

function ReasoningStepRow({ step }) {
  const color = AGENT_COLORS[step.agent] || '#e2e8f0'
  return (
    <div className="trace-step active" style={{ borderLeftColor: color }}>
      <div>
        <div className="trace-agent" style={{ color }}>{step.agent}</div>
        <div className="trace-desc">{step.description}</div>
        {step.duration_ms && (
          <div style={{ fontSize: '0.62rem', color: 'rgba(226,232,240,.3)', marginTop: 2 }}>{step.duration_ms}ms</div>
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
      padding: '10px 12px',
      borderRadius: 8,
      background: 'rgba(239,68,68,.08)',
      border: '1px solid rgba(239,68,68,.25)',
      marginBottom: 8,
    }}>
      <div style={{ fontSize: '0.68rem', fontWeight: 700, color: '#ef4444', marginBottom: 4 }}>
        ⚠️ Fallback Triggered
      </div>
      <div style={{ fontSize: '0.72rem', color: 'rgba(226,232,240,.7)' }}>{errorRecovery.reason}</div>
      <div style={{ fontSize: '0.68rem', color: 'rgba(226,232,240,.5)', marginTop: 4 }}>
        Strategy: {errorRecovery.fallback_strategy}
      </div>
      {errorRecovery.degraded_mode && (
        <div style={{ fontSize: '0.65rem', color: '#fbbf24', marginTop: 4 }}>⚡ Running in DEGRADED mode</div>
      )}
    </div>
  )
}

function DecisionBlock({ decision }) {
  if (!decision) return null
  return (
    <div style={{ marginBottom: 8 }}>
      <div style={{ fontSize: '0.68rem', color: 'var(--color-primary)', fontWeight: 700, marginBottom: 6, textTransform: 'uppercase', letterSpacing: '.1em' }}>
        🎯 Decision
      </div>
      <div style={{ padding: '8px 10px', borderRadius: 8, background: 'rgba(124,58,237,.1)', border: '1px solid rgba(124,58,237,.25)', marginBottom: 6 }}>
        <div style={{ fontSize: '0.7rem', color: '#7c3aed', fontWeight: 700 }}>{decision.chosen_option_id}</div>
        <div style={{ fontSize: '0.72rem', color: 'rgba(226,232,240,.75)', marginTop: 2 }}>{decision.rationale?.slice(0, 140)}…</div>
        <div style={{ fontSize: '0.65rem', color: 'rgba(226,232,240,.4)', marginTop: 4 }}>
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
          <span className="section-title">🤖 Agent Reasoning</span>
        </div>
        <div style={{ padding: '24px 0', textAlign: 'center', color: 'rgba(226,232,240,.3)', fontSize: '0.78rem' }}>
          Submit an alert or query to see live agent reasoning
        </div>
      </div>
    )
  }

  const steps = trace.reasoning_steps || []
  const workplan = trace.workplan
  const errorRecovery = trace.error_recovery
  const decision = trace.decision_flow

  return (
    <div>
      <div className="section-header">
        <span className="section-title">🤖 Agent Reasoning Trace</span>
        <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.62rem', color: 'rgba(226,232,240,.35)' }}>
          {trace.run_id?.slice(0, 8)}
        </span>
      </div>

      {/* Overall metrics */}
      <div className="card" style={{ marginBottom: 12 }}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
          <div>
            <div className="metric-label">Status</div>
            <div style={{ fontSize: '.8rem', fontWeight: 700, color: trace.outcome_success ? '#10b981' : '#ef4444' }}>
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

      <div style={{ fontSize: '0.68rem', color: 'var(--color-primary)', fontWeight: 700, marginBottom: 8, textTransform: 'uppercase', letterSpacing: '.1em' }}>
        💭 Reasoning Steps ({steps.length})
      </div>
      <div style={{ maxHeight: 320, overflowY: 'auto' }}>
        {steps.map((s, i) => <ReasoningStepRow key={i} step={s} />)}
      </div>

      {/* Tool calls */}
      {trace.tool_calls?.length > 0 && (
        <div style={{ marginTop: 12 }}>
          <div style={{ fontSize: '0.68rem', color: 'var(--color-primary)', fontWeight: 700, marginBottom: 6, textTransform: 'uppercase', letterSpacing: '.1em' }}>
            🔧 Tool Calls ({trace.tool_calls.length})
          </div>
          {trace.tool_calls.map((tc, i) => (
            <div key={i} style={{
              display: 'flex', justifyContent: 'space-between', alignItems: 'center',
              padding: '6px 10px', borderRadius: 6, marginBottom: 4,
              background: 'rgba(13,21,38,.6)',
              border: '1px solid rgba(0,212,255,.1)',
            }}>
              <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.65rem', color: 'rgba(226,232,240,.6)' }}>
                {tc.method} {tc.endpoint}
              </span>
              <span style={{
                fontSize: '0.62rem', padding: '1px 6px', borderRadius: 999,
                background: tc.success ? 'rgba(16,185,129,.15)' : 'rgba(239,68,68,.15)',
                color: tc.success ? '#10b981' : '#ef4444',
              }}>
                {tc.status_code || (tc.success ? '200' : 'ERR')}
              </span>
            </div>
          ))}
        </div>
      )}

      {/* Outcome summary */}
      {trace.outcome_summary && (
        <div style={{
          marginTop: 12, padding: '10px 12px', borderRadius: 8,
          background: 'rgba(0,212,255,.05)', border: '1px solid rgba(0,212,255,.15)',
          fontSize: '0.72rem', color: 'rgba(226,232,240,.65)', lineHeight: 1.5,
        }}>
          <span style={{ color: 'var(--color-primary)', fontWeight: 700 }}>Outcome: </span>
          {trace.outcome_summary}
        </div>
      )}
    </div>
  )
}
