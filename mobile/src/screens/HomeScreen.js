import React, { useState, useEffect } from 'react'
import { View, Text, ScrollView, StyleSheet, TouchableOpacity, ActivityIndicator, RefreshControl } from 'react-native'
import axios from 'axios'

const API = axios.create({ baseURL: 'http://localhost:8000', timeout: 15000 })
const THEME = { bg: '#060b18', surface: '#0d1526', elevated: '#121e35', primary: '#00d4ff', text: '#e2e8f0', muted: 'rgba(226,232,240,.4)', border: 'rgba(0,212,255,.12)' }

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
      setAssets([{ asset_id: 'DEMO', name: 'API Offline — Demo Mode', asset_type: 'SUBSTATION', status: 'DEGRADED', country: '—', risk_level: 'LOW' }])
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }

  useEffect(() => { load() }, [])

  return (
    <ScrollView style={s.container} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load() }} tintColor={THEME.primary} />}>
      <View style={s.hero}>
        <Text style={s.heroTitle}>Infrastructure Overview</Text>
        <Text style={s.heroSub}>Real-time status · {assets.length} assets monitored</Text>
      </View>

      {/* Stats grid */}
      <View style={s.statsGrid}>
        {[
          { label: 'Operational', value: stats.operational, color: '#10b981' },
          { label: 'Vulnerable',  value: stats.vulnerable,  color: '#f97316' },
          { label: 'Rerouted',    value: stats.rerouted,    color: '#00d4ff' },
          { label: 'Offline',     value: stats.offline,     color: '#6b7280' },
        ].map(({ label, value, color }) => (
          <View key={label} style={[s.statCard, { borderColor: `${color}30` }]}>
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
                <Text style={s.assetType}>{asset.asset_type}</Text>
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
                  <Text style={[s.riskText, { color: RISK_COLORS[asset.risk_level] }]}>Risk: {asset.risk_level}</Text>
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
  heroTitle: { fontSize: 20, fontWeight: '800', color: THEME.primary, letterSpacing: 1 },
  heroSub: { fontSize: 12, color: THEME.muted, marginTop: 4 },
  statsGrid: { flexDirection: 'row', flexWrap: 'wrap', paddingHorizontal: 12, gap: 8, marginBottom: 12 },
  statCard: { flex: 1, minWidth: 100, backgroundColor: THEME.surface, borderRadius: 10, padding: 12, borderWidth: 1, alignItems: 'center' },
  statValue: { fontSize: 24, fontWeight: '800' },
  statLabel: { fontSize: 10, color: THEME.muted, marginTop: 2, textTransform: 'uppercase', letterSpacing: .8 },
  assetCard: { marginHorizontal: 12, marginBottom: 8, backgroundColor: THEME.surface, borderRadius: 10, padding: 14, borderWidth: 1, borderColor: THEME.border },
  assetHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  assetType: { fontSize: 9, fontWeight: '700', color: THEME.primary, textTransform: 'uppercase', letterSpacing: .8, marginBottom: 2 },
  assetName: { fontSize: 14, fontWeight: '600', color: THEME.text, maxWidth: 200 },
  assetMeta: { flexDirection: 'row', gap: 8, marginTop: 8, alignItems: 'center', flexWrap: 'wrap' },
  metaText: { fontSize: 11, color: THEME.muted },
  statusBadge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 999, borderWidth: 1 },
  statusText: { fontSize: 9, fontWeight: '700', letterSpacing: .5 },
  riskBadge: { paddingHorizontal: 7, paddingVertical: 2, borderRadius: 999 },
  riskText: { fontSize: 10, fontWeight: '700' },
})
