import React, { useEffect, useState, useCallback } from 'react'
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity,
  TextInput, RefreshControl, ActivityIndicator, Platform,
} from 'react-native'
import axios from 'axios'
import { apiFetch } from '../services/mockApi'

const API_URL =
  process.env.EXPO_PUBLIC_API_URL || 'http://62.84.187.126:4005'

const API = axios.create({ baseURL: API_URL, timeout: 8000 })

const T = {
  bg: '#080a0e', bg1: '#0c1017', surface: '#0d1117',
  primary: '#3b82f6', cyan: '#00d4ff', green: '#00e676',
  red: '#ff5252', orange: '#ff6d00', yellow: '#ffd740',
  border: 'rgba(255,255,255,0.10)', text: 'rgba(255,255,255,0.88)',
  muted: 'rgba(255,255,255,0.40)',
}

const SEV_COLOR = {
  CRITICAL: '#ff5252', HIGH: '#ff6d00', MEDIUM: '#ffd740', LOW: '#00e676',
}

const DEMO_ALERTS = [
  { id: 'DEMO-001', title: 'Cat-4 Hurricane — Gulf Coast', severity: 'CRITICAL',
    summary: 'TX-44 and TX-12 in direct storm path. Datacenter cascade risk high.',
    type: 'WEATHER', time: new Date(Date.now() - 3600000) },
  { id: 'DEMO-002', title: 'DRC Cobalt Export Moratorium', severity: 'HIGH',
    summary: 'Affects 65% global cobalt supply. EV and datacenter battery backups at risk.',
    type: 'SUPPLY', time: new Date(Date.now() - 7200000) },
  { id: 'DEMO-003', title: 'Grid Hub Alpha — Voltage Fluctuation', severity: 'HIGH',
    summary: '±15% beyond nominal. Three hospitals and one major datacenter on same feeder.',
    type: 'SENSOR', time: new Date(Date.now() - 14400000) },
]

function IncidentCard({ item, onPress }) {
  const color = SEV_COLOR[item.severity] || T.muted
  const dt = item.time instanceof Date ? item.time : new Date(item.time)
  const ago = Math.round((Date.now() - dt) / 60000)
  const agoStr = ago < 60 ? `${ago}m ago` : `${Math.round(ago / 60)}h ago`

  return (
    <TouchableOpacity style={[S.card, { borderLeftColor: color }]} onPress={() => onPress(item)} activeOpacity={0.7}>
      <View style={S.cardHeader}>
        <View style={[S.dot, { backgroundColor: color }]} />
        <Text style={[S.severity, { color }]}>{item.severity}</Text>
        <Text style={S.type}>{item.type}</Text>
        <Text style={S.time}>{agoStr}</Text>
      </View>
      <Text style={S.title}>{item.title}</Text>
      {item.summary ? <Text style={S.summary} numberOfLines={2}>{item.summary}</Text> : null}
      {item.confidence !== undefined && (
        <Text style={S.conf}>CONF {Math.round(item.confidence * 100)}%</Text>
      )}
    </TouchableOpacity>
  )
}

function DetailModal({ item, onClose }) {
  if (!item) return null
  const color = SEV_COLOR[item.severity] || T.muted
  return (
    <View style={S.modal}>
      <View style={S.modalHeader}>
        <Text style={[S.modalId, { color }]}>{item.id}</Text>
        <TouchableOpacity onPress={onClose} style={S.closeBtn}>
          <Text style={S.closeText}>✕</Text>
        </TouchableOpacity>
      </View>
      <Text style={S.modalTitle}>{item.title}</Text>
      <View style={S.metaRow}>
        <Text style={[S.sevBadge, { borderColor: color, color }]}>{item.severity}</Text>
        <Text style={S.modalType}>{item.type}</Text>
      </View>
      <Text style={S.modalSummary}>{item.summary || 'No summary available.'}</Text>
      {item.confidence !== undefined && (
        <Text style={S.conf}>ODIN CONFIDENCE: {Math.round(item.confidence * 100)}%</Text>
      )}
      <TouchableOpacity style={[S.actionBtn, { borderColor: color }]} onPress={onClose}>
        <Text style={[S.actionBtnText, { color }]}>◈ CLOSE</Text>
      </TouchableOpacity>
    </View>
  )
}

export default function IncidentScreen() {
  const [incidents, setIncidents] = useState(DEMO_ALERTS)
  const [selected, setSelected]   = useState(null)
  const [loading, setLoading]     = useState(false)
  const [input, setInput]         = useState('')
  const [running, setRunning]     = useState(false)

  const refresh = useCallback(async () => {
    setLoading(true)
    try {
      const { data } = await apiFetch(API, 'get', '/api/v1/realtime/snapshot/incidents').catch(() => ({ data: null }))
      if (data?.data?.items?.length) setIncidents(prev => [...data.data.items, ...DEMO_ALERTS])
    } finally { setLoading(false) }
  }, [])

  useEffect(() => { refresh() }, [])

  const runPipeline = async () => {
    if (!input.trim() || running) return
    setRunning(true)
    try {
      const { data } = await apiFetch(API, 'post', '/api/ingest', { data: { text: input } })
      setIncidents(prev => [{
        id: `INC-${(data.incident_id || Date.now().toString(36)).toUpperCase()}`,
        title: input.slice(0, 60),
        severity: 'HIGH',
        summary: data.summary || 'Pipeline processed.',
        type: 'PIPELINE',
        time: new Date(),
        confidence: data.confidence,
      }, ...prev])
      setInput('')
    } catch {
      setIncidents(prev => [{
        id: 'ERR-' + Date.now(),
        title: 'Pipeline error',
        severity: 'MEDIUM',
        summary: 'Backend unreachable — running in demo mode.',
        type: 'ERROR',
        time: new Date(),
      }, ...prev])
    } finally { setRunning(false) }
  }

  return (
    <View style={S.root}>
      {selected && <DetailModal item={selected} onClose={() => setSelected(null)} />}

      <View style={S.ingestRow}>
        <TextInput
          style={S.ingestInput}
          value={input}
          onChangeText={setInput}
          placeholder="Paste alert, news, or disruption report…"
          placeholderTextColor={T.muted}
          multiline
          numberOfLines={2}
        />
        <TouchableOpacity
          style={[S.runBtn, (!input.trim() || running) && { opacity: 0.35 }]}
          onPress={runPipeline}
          disabled={!input.trim() || running}
        >
          {running
            ? <ActivityIndicator color="#fff" size="small" />
            : <Text style={S.runText}>RUN</Text>
          }
        </TouchableOpacity>
      </View>

      <FlatList
        data={incidents}
        keyExtractor={(item, i) => item.id || String(i)}
        renderItem={({ item }) => <IncidentCard item={item} onPress={setSelected} />}
        refreshControl={<RefreshControl refreshing={loading} onRefresh={refresh} tintColor={T.primary} />}
        contentContainerStyle={{ padding: 10, paddingBottom: 30 }}
        ListHeaderComponent={
          <Text style={S.listHeader}>{incidents.length} INCIDENTS · LIVE FEED</Text>
        }
      />
    </View>
  )
}

const S = StyleSheet.create({
  root: { flex: 1, backgroundColor: T.bg },
  ingestRow: {
    flexDirection: 'row', gap: 8, padding: 10,
    backgroundColor: T.bg1, borderBottomWidth: 1, borderBottomColor: T.border,
  },
  ingestInput: {
    flex: 1, color: T.text, fontFamily: 'monospace', fontSize: 10,
    paddingHorizontal: 10, paddingVertical: 7,
    backgroundColor: T.bg, borderWidth: 1, borderColor: T.border, maxHeight: 60,
  },
  runBtn: { backgroundColor: T.primary, paddingHorizontal: 16, justifyContent: 'center' },
  runText: { color: '#fff', fontFamily: 'monospace', fontWeight: '800', letterSpacing: 1, fontSize: 11 },
  listHeader: { color: T.muted, fontFamily: 'monospace', fontSize: 8, letterSpacing: 2, marginBottom: 8 },
  card: {
    backgroundColor: T.surface, borderWidth: 1, borderColor: T.border,
    borderLeftWidth: 3, padding: 10, marginBottom: 5,
  },
  cardHeader: { flexDirection: 'row', alignItems: 'center', gap: 5, marginBottom: 4 },
  dot: { width: 5, height: 5, borderRadius: 3 },
  severity: { fontFamily: 'monospace', fontSize: 8, fontWeight: '800', letterSpacing: 1.4 },
  type: { color: T.muted, fontFamily: 'monospace', fontSize: 8, flex: 1, marginLeft: 4 },
  time: { color: T.muted, fontFamily: 'monospace', fontSize: 8 },
  title: { color: T.text, fontFamily: 'monospace', fontSize: 11, fontWeight: '700', marginBottom: 3 },
  summary: { color: 'rgba(255,255,255,0.5)', fontFamily: 'monospace', fontSize: 9, lineHeight: 14 },
  conf: { color: T.primary, fontFamily: 'monospace', fontSize: 8, marginTop: 4, letterSpacing: 0.6 },
  modal: {
    position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
    backgroundColor: 'rgba(7,10,15,0.98)', zIndex: 99, padding: 20,
  },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  modalId: { fontFamily: 'monospace', fontSize: 10, fontWeight: '800', letterSpacing: 2 },
  closeBtn: { padding: 8 },
  closeText: { color: T.muted, fontSize: 16 },
  modalTitle: { color: T.text, fontFamily: 'monospace', fontSize: 14, fontWeight: '700', marginBottom: 10, lineHeight: 20 },
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 14 },
  sevBadge: { fontFamily: 'monospace', fontSize: 8, fontWeight: '800', letterSpacing: 1.4, borderWidth: 1, paddingHorizontal: 8, paddingVertical: 2 },
  modalType: { color: T.muted, fontFamily: 'monospace', fontSize: 9 },
  modalSummary: { color: 'rgba(255,255,255,0.7)', fontFamily: 'monospace', fontSize: 11, lineHeight: 18, marginBottom: 16 },
  actionBtn: { alignSelf: 'flex-start', borderWidth: 1, paddingHorizontal: 14, paddingVertical: 8 },
  actionBtnText: { fontFamily: 'monospace', fontWeight: '800', fontSize: 10, letterSpacing: 1.5 },
})
