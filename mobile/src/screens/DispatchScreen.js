import React, { useState, useEffect } from 'react'
import { View, Text, ScrollView, StyleSheet, RefreshControl, TouchableOpacity } from 'react-native'
import axios from 'axios'

const API = axios.create({ baseURL: 'http://localhost:8000', timeout: 10000 })
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
    <ScrollView style={s.container} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load() }} tintColor="#00d4ff" />}>
      <View style={{ padding: 16, paddingBottom: 8 }}>
        <Text style={{ fontSize: 18, fontWeight: '800', color: '#00d4ff' }}>Dispatch Center</Text>
      </View>

      {/* Tabs */}
      <View style={s.tabs}>
        {[['tickets', `Tickets (${tickets.length})`], ['grid', `Grid States (${gridStates.length})`]].map(([t_key, label]) => (
          <TouchableOpacity key={t_key} style={[s.tab, tab === t_key && s.tabActive]} onPress={() => setTab(t_key)}>
            <Text style={[s.tabText, tab === t_key && { color: '#00d4ff' }]}>{label}</Text>
          </TouchableOpacity>
        ))}
      </View>

      {tab === 'tickets' && (
        tickets.length === 0
          ? <Text style={s.empty}>No dispatch tickets yet. Run the ODIN pipeline to generate actions.</Text>
          : tickets.map(t => (
            <View key={t.ticket_id} style={s.card}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 }}>
                <Text style={{ fontFamily: 'monospace', fontSize: 11, color: '#00d4ff', fontWeight: '700' }}>{t.ticket_id}</Text>
                <View style={[s.badge, { backgroundColor: t.status === 'DISPATCHED' ? 'rgba(0,212,255,.15)' : 'rgba(249,115,22,.15)' }]}>
                  <Text style={{ fontSize: 9, color: t.status === 'DISPATCHED' ? '#00d4ff' : '#f97316', fontWeight: '700' }}>{t.status}</Text>
                </View>
              </View>
              <Text style={s.cardTitle}>{t.action_type} · {t.asset_name || t.asset_id}</Text>
              <Text style={{ fontSize: 10, color: 'rgba(226,232,240,.4)', marginTop: 4 }}>
                Team: {t.assigned_team} · Priority: <Text style={{ color: PRIO_COLORS[t.priority] || '#e2e8f0' }}>{t.priority}</Text>
              </Text>
              {t.instructions && <Text style={{ fontSize: 11, color: 'rgba(226,232,240,.6)', marginTop: 6, lineHeight: 16 }}>{t.instructions}</Text>}
            </View>
          ))
      )}

      {tab === 'grid' && (
        gridStates.length === 0
          ? <Text style={s.empty}>No grid state changes recorded. Trigger a pipeline run first.</Text>
          : gridStates.map((g, i) => (
            <View key={i} style={s.card}>
              <Text style={{ fontSize: 11, color: '#00d4ff', fontWeight: '700', marginBottom: 6 }}>{g.asset_id}</Text>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                <Text style={{ fontSize: 13, fontWeight: '600', color: '#f97316' }}>{g.previous_status || '—'}</Text>
                <Text style={{ color: '#00d4ff', fontSize: 16 }}>→</Text>
                <Text style={{ fontSize: 13, fontWeight: '600', color: '#00d4ff' }}>{g.status}</Text>
              </View>
              <Text style={{ fontSize: 10, color: 'rgba(226,232,240,.4)', marginTop: 6 }}>{g.reason}</Text>
              <Text style={{ fontSize: 9, color: 'rgba(226,232,240,.3)', marginTop: 3 }}>{g.last_updated}</Text>
            </View>
          ))
      )}
      <View style={{ height: 20 }} />
    </ScrollView>
  )
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#060b18' },
  tabs: { flexDirection: 'row', marginHorizontal: 12, marginBottom: 12, backgroundColor: '#0d1526', borderRadius: 10, padding: 4, borderWidth: 1, borderColor: 'rgba(0,212,255,.1)' },
  tab: { flex: 1, paddingVertical: 8, alignItems: 'center', borderRadius: 8 },
  tabActive: { backgroundColor: 'rgba(0,212,255,.12)' },
  tabText: { fontSize: 11, fontWeight: '600', color: 'rgba(226,232,240,.4)' },
  card: { marginHorizontal: 12, marginBottom: 8, backgroundColor: '#0d1526', borderRadius: 10, padding: 14, borderWidth: 1, borderColor: 'rgba(0,212,255,.12)' },
  cardTitle: { fontSize: 13, fontWeight: '600', color: '#e2e8f0' },
  badge: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 999 },
  empty: { textAlign: 'center', color: 'rgba(226,232,240,.3)', marginTop: 40, fontSize: 13, paddingHorizontal: 24 },
})
