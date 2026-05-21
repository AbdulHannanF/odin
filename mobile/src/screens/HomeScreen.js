import React, { useEffect, useState, useCallback } from 'react'
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity,
  TextInput, ActivityIndicator, Platform, RefreshControl,
} from 'react-native'
import axios from 'axios'
import { apiFetch } from '../services/mockApi'
import { createLogger } from '../utils/logger'

const log = createLogger('Assets')

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

const ASSET_TYPES = [
  { key: 'plants', label: 'Power Plants', icon: '⚡', color: T.yellow,  endpoint: '/api/v1/layers/power_plants_styled' },
  { key: 'dcs',    label: 'Data Centers', icon: '◆',  color: '#818cf8', endpoint: '/api/v1/layers/datacenters_styled'  },
  { key: 'subs',   label: 'Substations',  icon: '⬡',  color: T.cyan,    endpoint: '/api/v1/layers/substations_styled'  },
]

function AssetCard({ item, color }) {
  const p = item.properties || {}
  return (
    <View style={[S.card, { borderLeftColor: color }]}>
      <Text style={[S.cardTitle, { color }]}>{p.name || p.NAME || 'UNNAMED'}</Text>
      <Text style={S.cardMeta}>
        {p.technology || p.fuel1 || p.type || ''}
        {p.capacity_mw ? `  ·  ${p.capacity_mw >= 1000 ? (p.capacity_mw / 1000).toFixed(1) + ' GW' : Math.round(p.capacity_mw) + ' MW'}` : ''}
        {p.country ? `  ·  ${p.country}` : ''}
        {(p.v || p.voltage) ? `  ·  ${p.v || p.voltage} kV` : ''}
      </Text>
    </View>
  )
}

export default function HomeScreen() {
  const [activeType, setActiveType] = useState('plants')
  const [features, setFeatures]     = useState([])
  const [loading, setLoading]       = useState(false)
  const [search, setSearch]         = useState('')
  const [page, setPage]             = useState(0)
  const PAGE_SIZE = 50

  const current = ASSET_TYPES.find(t => t.key === activeType)

  const load = useCallback(async (type) => {
    const endpoint = ASSET_TYPES.find(t => t.key === type).endpoint
    log.info('load start', { type, endpoint })
    setLoading(true); setFeatures([]); setPage(0)
    try {
      const { data } = await apiFetch(API, 'get', endpoint)
      const count = data.features?.length ?? 0
      log.info('load ok', { type, count })
      setFeatures(data.features || [])
    } catch (err) {
      log.error('load failed', { type, error: err?.message })
      setFeatures([])
    }
    finally { setLoading(false) }
  }, [])

  useEffect(() => {
    log.info('mounted')
    return () => log.info('unmounted')
  }, [])

  useEffect(() => { load(activeType) }, [activeType])

  const filtered = features.filter(f => {
    if (!search.trim()) return true
    const p = f.properties || {}
    const q = search.toLowerCase()
    return (p.name || p.NAME || '').toLowerCase().includes(q)
      || (p.country || '').toLowerCase().includes(q)
      || (p.technology || '').toLowerCase().includes(q)
  })

  const pageData = filtered.slice(0, (page + 1) * PAGE_SIZE)

  return (
    <View style={S.root}>
      <View style={S.tabBar}>
        {ASSET_TYPES.map(t => (
          <TouchableOpacity
            key={t.key}
            style={[S.tab, activeType === t.key && { borderBottomColor: t.color }]}
            onPress={() => { log.info('tab switch', { to: t.key }); setActiveType(t.key) }}
          >
            <Text style={[S.tabIcon, { color: activeType === t.key ? t.color : T.muted }]}>{t.icon}</Text>
            <Text style={[S.tabLabel, { color: activeType === t.key ? t.color : T.muted }]}>{t.label}</Text>
          </TouchableOpacity>
        ))}
      </View>

      <View style={S.searchRow}>
        <TextInput
          style={S.search}
          value={search}
          onChangeText={setSearch}
          placeholder="Search name, country, type…"
          placeholderTextColor={T.muted}
        />
        <Text style={S.count}>{filtered.length.toLocaleString()}</Text>
      </View>

      {loading ? (
        <View style={S.center}>
          <ActivityIndicator color={current.color} size="large" />
          <Text style={S.loadingText}>LOADING {current.label.toUpperCase()}…</Text>
        </View>
      ) : (
        <FlatList
          data={pageData}
          keyExtractor={(_, i) => String(i)}
          renderItem={({ item }) => <AssetCard item={item} color={current.color} />}
          refreshControl={
            <RefreshControl refreshing={loading} onRefresh={() => load(activeType)} tintColor={current.color} />
          }
          onEndReached={() => {
            if (pageData.length < filtered.length) {
              log.debug('load more', { page: page + 1, shown: pageData.length, total: filtered.length })
              setPage(p => p + 1)
            }
          }}
          onEndReachedThreshold={0.3}
          ListFooterComponent={
            pageData.length < filtered.length
              ? <Text style={S.loadMore}>LOAD MORE ▾</Text>
              : null
          }
          contentContainerStyle={{ padding: 10, paddingBottom: 30 }}
        />
      )}
    </View>
  )
}

const S = StyleSheet.create({
  root: { flex: 1, backgroundColor: T.bg },
  tabBar: { flexDirection: 'row', backgroundColor: T.bg1, borderBottomWidth: 1, borderBottomColor: T.border },
  tab: {
    flex: 1, alignItems: 'center', paddingVertical: 10,
    borderBottomWidth: 2, borderBottomColor: 'transparent', gap: 2,
  },
  tabIcon: { fontSize: 16 },
  tabLabel: { fontFamily: 'monospace', fontSize: 8, fontWeight: '700', letterSpacing: 1 },
  searchRow: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    paddingHorizontal: 10, paddingVertical: 8,
    backgroundColor: T.bg1, borderBottomWidth: 1, borderBottomColor: T.border,
  },
  search: {
    flex: 1, color: T.text, fontFamily: 'monospace', fontSize: 11,
    paddingHorizontal: 10, paddingVertical: 7,
    backgroundColor: T.bg, borderWidth: 1, borderColor: T.border,
  },
  count: { color: T.muted, fontFamily: 'monospace', fontSize: 10, minWidth: 45, textAlign: 'right' },
  card: {
    backgroundColor: T.surface, borderWidth: 1, borderColor: T.border,
    borderLeftWidth: 3, padding: 10, marginBottom: 4,
  },
  cardTitle: { fontFamily: 'monospace', fontSize: 11, fontWeight: '700', marginBottom: 3 },
  cardMeta: { color: T.muted, fontFamily: 'monospace', fontSize: 9, lineHeight: 14 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', gap: 12 },
  loadingText: { color: T.muted, fontFamily: 'monospace', fontSize: 10, letterSpacing: 2 },
  loadMore: { color: T.primary, fontFamily: 'monospace', fontSize: 9, textAlign: 'center', padding: 14 },
})
