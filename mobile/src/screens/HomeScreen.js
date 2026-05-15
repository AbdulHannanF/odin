import React, { useState, useEffect } from 'react'
import { View, Text, ScrollView, StyleSheet, ActivityIndicator, RefreshControl } from 'react-native'
import axios from 'axios'

// Replace localhost with your computer's local IP address (e.g. 192.168.x.x) for physical device testing
const API_URL = process.env.EXPO_PUBLIC_API_URL || 'http://192.168.1.100:8000'
const API = axios.create({ baseURL: API_URL, timeout: 15000 })

const THEME = { bg: '#080a0e', surface: '#0d1117', elevated: '#121922', primary: '#ffb300', text: 'rgba(255,255,255,0.88)', muted: 'rgba(255,255,255,0.35)', border: 'rgba(255,255,255,0.12)', borderAmber: 'rgba(255,179,0,0.15)' }

const STATUS_COLORS = { OPERATIONAL: '#10b981', VULNERABLE: '#f97316', REROUTED: '#00d4ff', OFFLINE: '#6b7280', DEGRADED: '#fbbf24' }
const RISK_COLORS = { CRITICAL: '#ef4444', HIGH: '#f97316', MEDIUM: '#f59e0b', LOW: '#84cc16', NONE: '#10b981' }

export default function HomeScreen() {
  const [assets, setAssets] = useState([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [stats, setStats] = useState({ operational: 0, vulnerable: 0, rerouted: 0, offline: 0 })

  const load = async () => {
    try {
      const { data } = await API.get('/api/grid/state')
      const features = data.geojson?.features || []
      const assetList = features.map(f => ({ ...f.properties, lat: f.geometry.coordinates[1], lon: f.geometry.coordinates[0] }))
      setAssets(assetList)
      const s = { operational: 0, vulnerable: 0, rerouted: 0, offline: 0 }
      assetList.forEach(a => {
        if (a.status === 'OPERATIONAL') s.operational++
        else if (a.status === 'VULNERABLE') s.vulnerable++
        else if (a.status === 'REROUTED') s.rerouted++
        else s.offline++
      })
      setStats(s)
    } catch {
      setAssets([{ asset_id: 'DEMO', name: `API Offline — Demo Mode (${API_URL})`, asset_type: 'SUBSTATION', status: 'DEGRADED', country: '—', risk_level: 'LOW' }])
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }

  useEffect(() => { load() }, [])

  return (
    <ScrollView style={s.container} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load() }} tintColor={THEME.primary} />}>
      <View style={s.hero}>
        <Text style={s.heroTitle}>▶ INFRASTRUCTURE OVERVIEW</Text>
        <Text style={s.heroSub}>REAL-TIME STATUS · {assets.length} ASSETS MONITORED</Text>
      </View>

      {/* Stats grid */}
      <View style={s.statsGrid}>
        {[
          { label: 'OPERATIONAL', value: stats.operational, color: '#10b981' },
          { label: 'VULNERABLE',  value: stats.vulnerable,  color: '#f97316' },
          { label: 'REROUTED',    value: stats.rerouted,    color: '#00d4ff' },
          { label: 'OFFLINE',     value: stats.offline,     color: '#6b7280' },
        ].map(({ label, value, color }) => (
          <View key={label} style={[s.statCard, { borderLeftColor: color }]}>
            <Text style={[s.statValue, { color }]}>{value}</Text>
            <Text style={s.statLabel}>{label}</Text>
          </View>
        ))}
      </View>

      {loading ? <ActivityIndicator color={THEME.primary} style={{ marginTop: 40 }} size="large" /> :
        assets.map(asset => (
          <View key={asset.asset_id} style={s.assetCard}>
            <View style={s.assetHeader}>
              <View>
                <Text style={s.assetType}>{asset.asset_type.replace(/_/g, ' ')}</Text>
                <Text style={s.assetName}>{asset.name}</Text>
              </View>
              <View style={[s.statusBadge, { backgroundColor: `${STATUS_COLORS[asset.status] || '#6b7280'}18`, borderColor: `${STATUS_COLORS[asset.status] || '#6b7280'}40` }]}>
                <Text style={[s.statusText, { color: STATUS_COLORS[asset.status] || '#6b7280' }]}>{asset.status}</Text>
              </View>
            </View>
            <View style={s.assetMeta}>
              <Text style={s.metaText}>{asset.country}</Text>
              {asset.risk_level && asset.risk_level !== 'NONE' && (
                <View style={[s.riskBadge, { backgroundColor: `${RISK_COLORS[asset.risk_level]}15` }]}>
                  <Text style={[s.riskText, { color: RISK_COLORS[asset.risk_level] }]}>RISK: {asset.risk_level}</Text>
                </View>
              )}
              {asset.capacity_mw && <Text style={s.metaText}>{asset.capacity_mw} MW</Text>}
            </View>
          </View>
        ))
      }
      <View style={{ height: 20 }} />
    </ScrollView>
  )
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: THEME.bg },
  hero: { padding: 20, paddingTop: 24 },
  heroTitle: { fontSize: 16, fontWeight: '800', color: THEME.primary, letterSpacing: 1, fontFamily: 'monospace' },
  heroSub: { fontSize: 10, color: THEME.muted, marginTop: 4, fontFamily: 'monospace', letterSpacing: 1 },
  statsGrid: { flexDirection: 'row', flexWrap: 'wrap', paddingHorizontal: 12, gap: 8, marginBottom: 12 },
  statCard: { flex: 1, minWidth: 100, backgroundColor: THEME.surface, padding: 12, borderWidth: 1, borderColor: THEME.border, borderLeftWidth: 3 },
  statValue: { fontSize: 24, fontWeight: '800', fontFamily: 'monospace' },
  statLabel: { fontSize: 9, color: THEME.muted, marginTop: 2, textTransform: 'uppercase', letterSpacing: .8, fontFamily: 'monospace' },
  assetCard: { marginHorizontal: 12, marginBottom: 8, backgroundColor: THEME.surface, padding: 14, borderWidth: 1, borderColor: THEME.border },
  assetHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  assetType: { fontSize: 9, fontWeight: '700', color: THEME.primary, textTransform: 'uppercase', letterSpacing: .8, marginBottom: 4, fontFamily: 'monospace' },
  assetName: { fontSize: 14, fontWeight: '700', color: THEME.text, maxWidth: 200, fontFamily: 'monospace' },
  assetMeta: { flexDirection: 'row', gap: 8, marginTop: 8, alignItems: 'center', flexWrap: 'wrap' },
  metaText: { fontSize: 10, color: THEME.muted, fontFamily: 'monospace' },
  statusBadge: { paddingHorizontal: 8, paddingVertical: 3, borderWidth: 1 },
  statusText: { fontSize: 9, fontWeight: '700', letterSpacing: .5, fontFamily: 'monospace' },
  riskBadge: { paddingHorizontal: 7, paddingVertical: 2 },
  riskText: { fontSize: 9, fontWeight: '700', fontFamily: 'monospace' },
})
