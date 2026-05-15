import React, { useState, useEffect } from 'react'
import { View, Text, ScrollView, StyleSheet, RefreshControl } from 'react-native'
import axios from 'axios'

const API_URL = process.env.EXPO_PUBLIC_API_URL || 'http://192.168.1.100:8000'
const API = axios.create({ baseURL: API_URL, timeout: 10000 })
const THEME = { bg: '#080a0e', surface: '#0d1117', elevated: '#121922', primary: '#ffb300', text: 'rgba(255,255,255,0.88)', muted: 'rgba(255,255,255,0.35)', border: 'rgba(255,255,255,0.12)' }
const SEV_COLORS = { CRITICAL: '#ef4444', HIGH: '#f97316', MEDIUM: '#f59e0b', LOW: '#84cc16', NONE: '#10b981' }

export default function IncidentScreen() {
  const [incidents, setIncidents] = useState([])
  const [refreshing, setRefreshing] = useState(false)

  const load = async () => {
    try {
      const { data } = await API.get('/api/agents/traces')
      const traces = (data.traces || []).map(t => ({
        id: t.run_id,
        title: `RUN ${t.run_id?.slice(0, 8) || 'UNKNOWN'}`,
        trigger: t.trigger,
        severity: t.confidence > 0.8 ? 'HIGH' : t.confidence > 0.5 ? 'MEDIUM' : 'CRITICAL',
        confidence: t.confidence,
        success: t.success,
        time: t.timestamp,
      }))
      setIncidents(traces.length ? traces : [{ id: 'DEMO', title: 'NO INCIDENTS YET', trigger: 'SYSTEM', severity: 'NONE', confidence: 1.0, success: true, time: new Date().toISOString() }])
    } catch {
      setIncidents([{ id: 'DEMO', title: 'BACKEND OFFLINE', trigger: 'SYSTEM', severity: 'LOW', confidence: 0, success: false, time: new Date().toISOString() }])
    } finally {
      setRefreshing(false)
    }
  }

  useEffect(() => { load() }, [])

  return (
    <ScrollView style={s.container} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load() }} tintColor={THEME.primary} />}>
      <View style={{ padding: 16, paddingBottom: 8 }}>
        <Text style={{ fontSize: 16, fontWeight: '800', color: THEME.primary, fontFamily: 'monospace' }}>▶ INCIDENT LOG</Text>
        <Text style={{ fontSize: 10, color: THEME.muted, marginTop: 4, fontFamily: 'monospace', letterSpacing: 1 }}>{incidents.length} RECENT RUNS</Text>
      </View>
      {incidents.map(inc => (
        <View key={inc.id} style={[s.card, { borderLeftColor: SEV_COLORS[inc.severity] || THEME.border }]}>
          <View style={s.row}>
            <View style={[s.dot, { backgroundColor: SEV_COLORS[inc.severity] || '#6b7280' }]} />
            <View style={{ flex: 1 }}>
              <Text style={s.title}>{inc.title}</Text>
              <Text style={s.sub}>{inc.trigger.toUpperCase()} · {inc.time ? new Date(inc.time).toLocaleTimeString() : ''}</Text>
            </View>
            <View style={[s.badge, { backgroundColor: inc.success ? 'rgba(16,185,129,.15)' : 'rgba(239,68,68,.15)' }]}>
              <Text style={{ fontSize: 10, color: inc.success ? '#10b981' : '#ef4444', fontWeight: '800' }}>{inc.success ? '✓' : '✗'}</Text>
            </View>
          </View>
          {inc.confidence !== undefined && (
            <View style={{ marginTop: 8 }}>
              <View style={s.progressBg}>
                <View style={[s.progressFill, { width: `${Math.round(inc.confidence * 100)}%` }]} />
              </View>
              <Text style={s.confText}>CONFIDENCE: {Math.round(inc.confidence * 100)}%</Text>
            </View>
          )}
        </View>
      ))}
      <View style={{ height: 20 }} />
    </ScrollView>
  )
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: THEME.bg },
  card: { marginHorizontal: 12, marginBottom: 8, backgroundColor: THEME.surface, padding: 14, borderWidth: 1, borderColor: THEME.border, borderLeftWidth: 3 },
  row: { flexDirection: 'row', alignItems: 'flex-start', gap: 10 },
  dot: { width: 6, height: 6, marginTop: 4 },
  title: { fontSize: 13, fontWeight: '700', color: THEME.text, fontFamily: 'monospace' },
  sub: { fontSize: 9, color: THEME.muted, marginTop: 4, fontFamily: 'monospace', letterSpacing: .5 },
  badge: { width: 24, height: 24, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: 'rgba(255,255,255,.05)' },
  progressBg: { height: 2, backgroundColor: 'rgba(255,255,255,.08)', marginTop: 8 },
  progressFill: { height: 2, backgroundColor: THEME.primary },
  confText: { fontSize: 9, color: 'rgba(226,232,240,.4)', marginTop: 4, fontFamily: 'monospace', letterSpacing: 1 },
})
