import React, { useEffect, useState, useCallback } from 'react'
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity,
  RefreshControl, Platform,
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

const ACTION_COLORS = {
  REROUTE: '#00d4ff', LOAD_SHED: '#ff6d00', ISOLATE: '#ff5252',
  MONITOR: '#3b82f6', NOTIFY: '#ffd740', EVACUATE: '#e879f9', NO_ACTION: 'rgba(255,255,255,0.4)',
}

const STATUS_COLORS = {
  PENDING: '#ffd740', ACTIVE: '#00e676', SENT: '#3b82f6', RESOLVED: 'rgba(255,255,255,0.4)', CANCELLED: '#ff5252',
}


function StatsBar({ tickets }) {
  const pending  = tickets.filter(t => t.status === 'PENDING').length
  const active   = tickets.filter(t => t.status === 'ACTIVE').length
  const resolved = tickets.filter(t => t.status === 'RESOLVED' || t.status === 'SENT').length
  return (
    <View style={S.statsBar}>
      {[[pending, 'PENDING', STATUS_COLORS.PENDING], [active, 'ACTIVE', STATUS_COLORS.ACTIVE], [resolved, 'RESOLVED', STATUS_COLORS.RESOLVED]].map(([n, label, color]) => (
        <View key={label} style={S.stat}>
          <Text style={[S.statNum, { color }]}>{n}</Text>
          <Text style={S.statLabel}>{label}</Text>
        </View>
      ))}
    </View>
  )
}

function TicketCard({ item, onApprove, onDismiss }) {
  const actionColor = ACTION_COLORS[item.action] || T.muted
  const statusColor = STATUS_COLORS[item.status] || T.muted
  const dt = item.created instanceof Date ? item.created : new Date(item.created)
  const ago = Math.round((Date.now() - dt) / 60000)
  const agoStr = ago < 60 ? `${ago}m ago` : `${Math.round(ago / 60)}h ago`

  return (
    <View style={[S.card, { borderLeftColor: actionColor }]}>
      <View style={S.cardTop}>
        <Text style={[S.action, { color: actionColor }]}>{item.action}</Text>
        <View style={[S.statusBadge, { borderColor: statusColor }]}>
          <Text style={[S.statusText, { color: statusColor }]}>{item.status}</Text>
        </View>
        <Text style={S.time}>{agoStr}</Text>
      </View>
      <Text style={S.ticketId}>{item.id}</Text>
      <Text style={S.asset}>→ {item.asset}</Text>
      <Text style={S.reason}>{item.reason}</Text>
      <View style={S.confRow}>
        <View style={S.confBar}>
          <View style={[S.confFill, { width: `${Math.round(item.confidence * 100)}%`, backgroundColor: actionColor }]} />
        </View>
        <Text style={[S.confPct, { color: actionColor }]}>{Math.round(item.confidence * 100)}%</Text>
      </View>
      {item.status === 'PENDING' && (
        <View style={S.actions}>
          <TouchableOpacity style={[S.btn, { borderColor: T.green }]} onPress={() => onApprove(item.id)}>
            <Text style={[S.btnText, { color: T.green }]}>✓ APPROVE</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[S.btn, { borderColor: T.red }]} onPress={() => onDismiss(item.id)}>
            <Text style={[S.btnText, { color: T.red }]}>✕ DISMISS</Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  )
}

export default function DispatchScreen() {
  const [tickets, setTickets] = useState([])
  const [loading, setLoading] = useState(false)
  const [filter, setFilter]   = useState('ALL')

  const refresh = useCallback(async () => {
    setLoading(true)
    try {
      const { data } = await apiFetch(API, 'get', '/api/v1/realtime/snapshot/agents').catch(() => ({ data: null }))
      if (data?.data?.items?.length) {
        setTickets(data.data.items.map(t => ({ ...t, status: t.status || 'PENDING' })))
      }
    } finally { setLoading(false) }
  }, [])

  useEffect(() => { refresh() }, [])

  const approve = useCallback((id) => setTickets(prev => prev.map(t => t.id === id ? { ...t, status: 'ACTIVE' } : t)), [])
  const dismiss = useCallback((id) => setTickets(prev => prev.map(t => t.id === id ? { ...t, status: 'CANCELLED' } : t)), [])

  const FILTERS = ['ALL', 'PENDING', 'ACTIVE', 'RESOLVED']
  const displayed = filter === 'ALL' ? tickets
    : tickets.filter(t => t.status === filter || (filter === 'RESOLVED' && (t.status === 'SENT' || t.status === 'RESOLVED')))

  return (
    <View style={S.root}>
      <StatsBar tickets={tickets} />
      <View style={S.filterRow}>
        {FILTERS.map(f => (
          <TouchableOpacity
            key={f}
            style={[S.filterPill, filter === f && { backgroundColor: T.primary, borderColor: T.primary }]}
            onPress={() => setFilter(f)}
          >
            <Text style={[S.filterText, filter === f && { color: '#fff' }]}>{f}</Text>
          </TouchableOpacity>
        ))}
      </View>
      <FlatList
        data={displayed}
        keyExtractor={item => item.id}
        renderItem={({ item }) => <TicketCard item={item} onApprove={approve} onDismiss={dismiss} />}
        refreshControl={<RefreshControl refreshing={loading} onRefresh={refresh} tintColor={T.primary} />}
        contentContainerStyle={{ padding: 10, paddingBottom: 30 }}
        ListEmptyComponent={
          <View style={S.empty}>
            <Text style={S.emptyText}>◈ NO DISPATCH TICKETS</Text>
            <Text style={S.emptyHint}>Run a pipeline from Incidents to generate tickets.</Text>
          </View>
        }
      />
    </View>
  )
}

const S = StyleSheet.create({
  root: { flex: 1, backgroundColor: T.bg },
  statsBar: {
    flexDirection: 'row', backgroundColor: T.bg1,
    borderBottomWidth: 1, borderBottomColor: T.border, padding: 10,
  },
  stat: { flex: 1, alignItems: 'center' },
  statNum: { fontFamily: 'monospace', fontSize: 20, fontWeight: '800' },
  statLabel: { color: T.muted, fontFamily: 'monospace', fontSize: 7, letterSpacing: 1.5, marginTop: 2 },
  filterRow: {
    flexDirection: 'row', gap: 6, paddingHorizontal: 10, paddingVertical: 8,
    backgroundColor: T.bg1, borderBottomWidth: 1, borderBottomColor: T.border,
  },
  filterPill: { paddingHorizontal: 10, paddingVertical: 4, borderWidth: 1, borderColor: T.border },
  filterText: { color: T.muted, fontFamily: 'monospace', fontSize: 9, fontWeight: '700', letterSpacing: 1 },
  card: {
    backgroundColor: T.surface, borderWidth: 1, borderColor: T.border,
    borderLeftWidth: 3, padding: 12, marginBottom: 6,
  },
  cardTop: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 4 },
  action: { fontFamily: 'monospace', fontSize: 9, fontWeight: '800', letterSpacing: 1.4 },
  statusBadge: { borderWidth: 1, paddingHorizontal: 6, paddingVertical: 1 },
  statusText: { fontFamily: 'monospace', fontSize: 7, fontWeight: '700', letterSpacing: 1 },
  time: { color: T.muted, fontFamily: 'monospace', fontSize: 8, marginLeft: 'auto' },
  ticketId: { color: T.muted, fontFamily: 'monospace', fontSize: 9, marginBottom: 2 },
  asset: { color: T.text, fontFamily: 'monospace', fontSize: 11, fontWeight: '700', marginBottom: 4 },
  reason: { color: 'rgba(255,255,255,0.55)', fontFamily: 'monospace', fontSize: 9, lineHeight: 14, marginBottom: 8 },
  confRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8 },
  confBar: { flex: 1, height: 2, backgroundColor: 'rgba(255,255,255,0.08)', overflow: 'hidden' },
  confFill: { height: '100%' },
  confPct: { fontFamily: 'monospace', fontSize: 9, fontWeight: '700', minWidth: 32 },
  actions: { flexDirection: 'row', gap: 8 },
  btn: { flex: 1, borderWidth: 1, alignItems: 'center', paddingVertical: 7 },
  btnText: { fontFamily: 'monospace', fontSize: 9, fontWeight: '800', letterSpacing: 1 },
  empty: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingTop: 60, gap: 10 },
  emptyText: { color: T.primary, fontFamily: 'monospace', fontSize: 10, letterSpacing: 2 },
  emptyHint: { color: T.muted, fontFamily: 'monospace', fontSize: 9, textAlign: 'center', maxWidth: 260 },
})
