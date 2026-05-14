import React, { useState, useEffect } from 'react'
import { View, Text, ScrollView, StyleSheet, RefreshControl, TouchableOpacity } from 'react-native'
import axios from 'axios'

const API = axios.create({ baseURL: 'http://localhost:8000', timeout: 10000 })
const THEME = { bg: '#060b18', surface: '#0d1526', primary: '#00d4ff', text: '#e2e8f0', muted: 'rgba(226,232,240,.4)', border: 'rgba(0,212,255,.12)' }
const SEV_COLORS = { CRITICAL: '#ef4444', HIGH: '#f97316', MEDIUM: '#f59e0b', LOW: '#84cc16', NONE: '#10b981' }

export default function IncidentScreen() {
  const [incidents, setIncidents] = useState([])
  const [refreshing, setRefreshing] = useState(false)

  const load = async () => {
    try {
      const { data } = await API.get('/api/agents/traces')
      const traces = (data.traces || []).map(t => ({
        id: t.run_id,
        title: `Run ${t.run_id?.slice(0, 8) || 'Unknown'}`,
        trigger: t.trigger,
        severity: t.confidence > 0.8 ? 'HIGH' : t.confidence > 0.5 ? 'MEDIUM' : 'CRITICAL',
        confidence: t.confidence,
        success: t.success,
        time: t.timestamp,
      }))
      setIncidents(traces.length ? traces : [{ id: 'DEMO', title: 'No incidents yet', trigger: 'system', severity: 'NONE', confidence: 1.0, success: true, time: new Date().toISOString() }])
    } catch {
      setIncidents([{ id: 'DEMO', title: 'Backend offline — Demo mode', trigger: 'system', severity: 'LOW', confidence: 0, success: false, time: new Date().toISOString() }])
    } finally {
      setRefreshing(false)
    }
  }

  useEffect(() => { load() }, [])

  return (
    <ScrollView style={s.container} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load() }} tintColor={THEME.primary} />}>
      <View style={{ padding: 16, paddingBottom: 8 }}>
        <Text style={{ fontSize: 18, fontWeight: '800', color: THEME.primary }}>Incident Log</Text>
        <Text style={{ fontSize: 11, color: THEME.muted, marginTop: 2 }}>{incidents.length} recent runs</Text>
      </View>
      {incidents.map(inc => (
        <View key={inc.id} style={s.card}>
          <View style={s.row}>
            <View style={[s.dot, { backgroundColor: SEV_COLORS[inc.severity] || '#6b7280' }]} />
            <View style={{ flex: 1 }}>
              <Text style={s.title}>{inc.title}</Text>
              <Text style={s.sub}>{inc.trigger} · {inc.time ? new Date(inc.time).toLocaleTimeString() : ''}</Text>
            </View>
            <View style={[s.badge, { backgroundColor: inc.success ? 'rgba(16,185,129,.15)' : 'rgba(239,68,68,.15)' }]}>
              <Text style={{ fontSize: 10, color: inc.success ? '#10b981' : '#ef4444', fontWeight: '700' }}>{inc.success ? '✓' : '✗'}</Text>
            </View>
          </View>
          {inc.confidence !== undefined && (
            <View style={{ marginTop: 6 }}>
              <View style={s.progressBg}>
                <View style={[s.progressFill, { width: `${Math.round(inc.confidence * 100)}%` }]} />
              </View>
              <Text style={s.confText}>Confidence: {Math.round(inc.confidence * 100)}%</Text>
            </View>
          )}
        </View>
      ))}
      <View style={{ height: 20 }} />
    </ScrollView>
  )
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#060b18' },
  card: { marginHorizontal: 12, marginBottom: 8, backgroundColor: '#0d1526', borderRadius: 10, padding: 14, borderWidth: 1, borderColor: 'rgba(0,212,255,.12)' },
  row: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  dot: { width: 8, height: 8, borderRadius: 4 },
  title: { fontSize: 13, fontWeight: '600', color: '#e2e8f0' },
  sub: { fontSize: 10, color: 'rgba(226,232,240,.4)', marginTop: 2 },
  badge: { width: 24, height: 24, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  progressBg: { height: 3, backgroundColor: 'rgba(255,255,255,.08)', borderRadius: 2, marginTop: 8 },
  progressFill: { height: 3, backgroundColor: '#00d4ff', borderRadius: 2 },
  confText: { fontSize: 9, color: 'rgba(226,232,240,.35)', marginTop: 3 },
})
