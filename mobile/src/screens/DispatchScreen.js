import React, { useState, useEffect } from 'react'
import { View, Text, ScrollView, StyleSheet, RefreshControl, TouchableOpacity } from 'react-native'
import axios from 'axios'

const API_URL = process.env.EXPO_PUBLIC_API_URL || 'http://192.168.1.100:8000'
const API = axios.create({ baseURL: API_URL, timeout: 10000 })
const THEME = { bg: '#080a0e', surface: '#0d1117', elevated: '#121922', primary: '#ffb300', text: 'rgba(255,255,255,0.88)', muted: 'rgba(255,255,255,0.35)', border: 'rgba(255,255,255,0.12)' }
const PRIO_COLORS = { CRITICAL: '#ef4444', HIGH: '#f97316', MEDIUM: '#f59e0b', LOW: '#84cc16' }

export default function DispatchScreen() {
  const [tickets, setTickets] = useState([])
  const [gridStates, setGridStates] = useState([])
  const [refreshing, setRefreshing] = useState(false)
  const [tab, setTab] = useState('tickets')

  const load = async () => {
    try {
      const [t, g] = await Promise.all([
        API.get('/mock/dispatch').then(r => r.data.tickets || []),
        API.get('/mock/grid/states').then(r => r.data.states || []),
      ])
      setTickets(t)
      setGridStates(g)
    } catch {
      setTickets([])
      setGridStates([])
    } finally {
      setRefreshing(false)
    }
  }

  useEffect(() => { load() }, [])

  return (
    <ScrollView style={s.container} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load() }} tintColor={THEME.primary} />}>
      <View style={{ padding: 16, paddingBottom: 8 }}>
        <Text style={{ fontSize: 16, fontWeight: '800', color: THEME.primary, fontFamily: 'monospace' }}>▶ DISPATCH CENTER</Text>
      </View>

      {/* Tabs */}
      <View style={s.tabs}>
        {[['tickets', `TICKETS (${tickets.length})`], ['grid', `STATE CHANGES (${gridStates.length})`]].map(([t_key, label]) => (
          <TouchableOpacity key={t_key} style={[s.tab, tab === t_key && s.tabActive]} onPress={() => setTab(t_key)}>
            <Text style={[s.tabText, tab === t_key && { color: THEME.primary }]}>{label}</Text>
          </TouchableOpacity>
        ))}
      </View>

      {tab === 'tickets' && (
        tickets.length === 0
          ? <Text style={s.empty}>NO DISPATCH TICKETS. RUN PIPELINE.</Text>
          : tickets.map(t => (
            <View key={t.ticket_id} style={[s.card, { borderLeftColor: PRIO_COLORS[t.priority] || THEME.border }]}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 }}>
                <Text style={{ fontFamily: 'monospace', fontSize: 11, color: THEME.primary, fontWeight: '700' }}>{t.ticket_id}</Text>
                <View style={[s.badge, { backgroundColor: t.status === 'DISPATCHED' ? 'rgba(255,179,0,.15)' : 'rgba(249,115,22,.15)' }]}>
                  <Text style={{ fontSize: 9, color: t.status === 'DISPATCHED' ? THEME.primary : '#f97316', fontWeight: '700', fontFamily: 'monospace' }}>{t.status}</Text>
                </View>
              </View>
              <Text style={s.cardTitle}>{t.action_type.toUpperCase()} · {t.asset_name || t.asset_id}</Text>
              <Text style={{ fontSize: 9, color: THEME.muted, marginTop: 6, fontFamily: 'monospace', letterSpacing: .5 }}>
                TEAM: {t.assigned_team} · PRIORITY: <Text style={{ color: PRIO_COLORS[t.priority] || THEME.text }}>{t.priority}</Text>
              </Text>
              {t.instructions && <Text style={{ fontSize: 11, color: 'rgba(255,255,255,.6)', marginTop: 8, lineHeight: 18, fontFamily: 'monospace' }}>{t.instructions}</Text>}
            </View>
          ))
      )}

      {tab === 'grid' && (
        gridStates.length === 0
          ? <Text style={s.empty}>NO STATE CHANGES. RUN PIPELINE.</Text>
          : gridStates.map((g, i) => (
            <View key={i} style={[s.card, { borderLeftColor: '#00e5ff' }]}>
              <Text style={{ fontSize: 11, color: THEME.primary, fontWeight: '700', marginBottom: 8, fontFamily: 'monospace' }}>{g.asset_id}</Text>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                <Text style={{ fontSize: 13, fontWeight: '700', color: '#f97316', fontFamily: 'monospace' }}>{g.previous_status || '—'}</Text>
                <Text style={{ color: THEME.primary, fontSize: 16 }}>→</Text>
                <Text style={{ fontSize: 13, fontWeight: '700', color: '#00e5ff', fontFamily: 'monospace' }}>{g.status}</Text>
              </View>
              <Text style={{ fontSize: 10, color: THEME.muted, marginTop: 8, fontFamily: 'monospace' }}>{g.reason}</Text>
              <Text style={{ fontSize: 9, color: 'rgba(255,255,255,.2)', marginTop: 4, fontFamily: 'monospace' }}>{g.last_updated}</Text>
            </View>
          ))
      )}
      <View style={{ height: 20 }} />
    </ScrollView>
  )
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: THEME.bg },
  tabs: { flexDirection: 'row', marginHorizontal: 12, marginBottom: 12, backgroundColor: THEME.surface, padding: 4, borderWidth: 1, borderColor: THEME.border },
  tab: { flex: 1, paddingVertical: 8, alignItems: 'center' },
  tabActive: { backgroundColor: 'rgba(255,179,0,.1)' },
  tabText: { fontSize: 10, fontWeight: '700', color: THEME.muted, fontFamily: 'monospace', letterSpacing: 1 },
  card: { marginHorizontal: 12, marginBottom: 8, backgroundColor: THEME.surface, padding: 14, borderWidth: 1, borderColor: THEME.border, borderLeftWidth: 3 },
  cardTitle: { fontSize: 13, fontWeight: '700', color: THEME.text, fontFamily: 'monospace' },
  badge: { paddingHorizontal: 8, paddingVertical: 2, borderWidth: 1, borderColor: 'rgba(255,255,255,.05)' },
  empty: { textAlign: 'center', color: THEME.muted, marginTop: 40, fontSize: 11, paddingHorizontal: 24, fontFamily: 'monospace', letterSpacing: 1 },
})
