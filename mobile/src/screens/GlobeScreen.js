/**
 * GlobeScreen — primary ODIN mobile surface.
 *
 * Layout (top → bottom):
 *   ┌──────────────────────────────────┐
 *   │ Status header (logo + live cnt)  │   ← matches web header
 *   ├──────────────────────────────────┤
 *   │                                  │
 *   │   WebView showing the globe      │   ← shared bundle w/ web
 *   │                                  │
 *   ├──────────────────────────────────┤
 *   │ Chat history (collapsible)       │
 *   ├──────────────────────────────────┤
 *   │ ▸ "QUERY ODIN…" [RUN]            │   ← persistent chat dock
 *   └──────────────────────────────────┘
 */
import React, { useEffect, useRef, useState, useCallback } from 'react'
import {
  View, Text, StyleSheet, TextInput, TouchableOpacity, ActivityIndicator,
  ScrollView, Platform, KeyboardAvoidingView,
} from 'react-native'
import { WebView } from 'react-native-webview'
import axios from 'axios'

const FRONTEND_URL =
  process.env.EXPO_PUBLIC_FRONTEND_URL ||
  (Platform.OS === 'android' ? 'http://10.0.2.2:3000' : 'http://localhost:3000')
const API_URL =
  process.env.EXPO_PUBLIC_API_URL ||
  (Platform.OS === 'android' ? 'http://10.0.2.2:8000' : 'http://localhost:8000')

const API = axios.create({ baseURL: API_URL, timeout: 20000 })

const T = {
  bg: '#080a0e',
  bg1: '#0c1017',
  surface: '#0d1117',
  amber: '#3b82f6',
  cyan: '#00d4ff',
  lime: '#a3e635',
  red: '#ff5252',
  green: '#00e676',
  border: 'rgba(255,255,255,0.10)',
  borderAmber: 'rgba(59,130,246,0.18)',
  text: 'rgba(255,255,255,0.88)',
  muted: 'rgba(255,255,255,0.40)',
  glass: 'rgba(13,17,23,0.92)',
}

const SUGGESTIONS = [
  '⚡ Grid status — North America',
  '✈ Busiest air corridors right now',
  '☉ Where is the ISS currently?',
  '🌊 Major shipping lanes today',
  'Offshore wind expansion candidates',
  'Vulnerable infrastructure near Houston',
  'Lithium supply chain risk',
  'Cascade impact if Gulf substation fails',
]

function StatusHeader({ counts, rtConnected, now }) {
  return (
    <View style={S.header}>
      <View style={S.headerLeft}>
        <View style={S.logoMark}>
          <Text style={S.logoSymbol}>⊕</Text>
        </View>
        <View>
          <Text style={S.logoText}>ODIN</Text>
          <Text style={S.logoSub}>PLANETARY INFRA</Text>
        </View>
      </View>

      <View style={S.headerRight}>
        <View style={S.counter}><View style={[S.dot, { backgroundColor: T.amber }]} /><Text style={S.counterText}>✈ {counts.flights}</Text></View>
        <View style={S.counter}><View style={[S.dot, { backgroundColor: T.cyan  }]} /><Text style={S.counterText}>⚓ {counts.ships}</Text></View>
        <View style={S.counter}><View style={[S.dot, { backgroundColor: T.lime  }]} /><Text style={S.counterText}>☉ {counts.satellites}</Text></View>
        <View style={S.counter}><View style={[S.dot, { backgroundColor: T.red   }]} /><Text style={S.counterText}>▲ {counts.earthquakes}</Text></View>
        <View style={[S.streamBadge, { borderColor: rtConnected ? 'rgba(0,230,118,.45)' : T.border }]}>
          <View style={[S.dot, { backgroundColor: rtConnected ? T.green : T.muted }]} />
          <Text style={[S.streamText, { color: rtConnected ? T.green : T.muted }]}>
            {rtConnected ? 'STREAM' : 'OFFLINE'}
          </Text>
        </View>
      </View>
    </View>
  )
}

function MessageBubble({ m }) {
  const isUser = m.role === 'user'
  return (
    <View style={[S.bubble, isUser ? S.bubbleUser : S.bubbleOdin]}>
      <Text style={S.bubbleRole}>{isUser ? '▸ YOU' : '◈ ODIN'}</Text>
      <Text style={[S.bubbleBody, isUser ? S.bubbleBodyUser : S.bubbleBodyOdin]}>{m.content}</Text>
      {m.confidence !== undefined && (
        <Text style={S.bubbleMeta}>CONF {Math.round(m.confidence * 100)}% · {(m.sources || []).join(' · ').toUpperCase()}</Text>
      )}
    </View>
  )
}

export default function GlobeScreen() {
  const webRef = useRef(null)
  const scrollRef = useRef(null)
  const [webLoaded, setWebLoaded] = useState(false)
  const [webError, setWebError] = useState(null)

  // Live counters polled via REST (cheap, avoids WS in RN)
  const [counts, setCounts] = useState({ flights: 0, ships: 0, satellites: 0, earthquakes: 0 })
  const [rtConnected, setRtConnected] = useState(false)

  // Chat dock
  const [chatOpen, setChatOpen] = useState(false)
  const [input, setInput] = useState('')
  const [busy, setBusy] = useState(false)
  const [messages, setMessages] = useState([
    { id: 'intro', role: 'assistant', content: 'ODIN online. Ask about infrastructure risk, real-time aviation, satellites, supply chains, or cascading failures.' },
  ])

  // Poll realtime snapshots every 6s
  useEffect(() => {
    let alive = true
    const tick = async () => {
      try {
        const channels = ['flights', 'ships', 'satellites', 'earthquakes']
        const results = await Promise.all(channels.map(c =>
          API.get(`/api/v1/realtime/snapshot/${c}`).then(r => r.data).catch(() => null)
        ))
        if (!alive) return
        const next = { flights: 0, ships: 0, satellites: 0, earthquakes: 0 }
        let anyLive = false
        results.forEach((res, i) => {
          if (res?.data) {
            anyLive = true
            next[channels[i]] = res.data.count ?? res.data.items?.length ?? 0
          }
        })
        setCounts(next)
        setRtConnected(anyLive)
      } catch {
        setRtConnected(false)
      }
    }
    tick()
    const id = setInterval(tick, 6000)
    return () => { alive = false; clearInterval(id) }
  }, [])

  const send = useCallback(async (text) => {
    const q = (text ?? input).trim()
    if (!q || busy) return
    setInput('')
    setChatOpen(true)
    setMessages(p => [...p, { id: 'u' + Date.now(), role: 'user', content: q }])
    setBusy(true)
    try {
      const { data } = await API.post('/api/query/nl', { query: q })
      setMessages(p => [...p, {
        id: 'a' + Date.now(),
        role: 'assistant',
        content: data.answer || '(empty)',
        confidence: data.confidence,
        sources: data.data_sources,
      }])
    } catch (e) {
      setMessages(p => [...p, {
        id: 'e' + Date.now(),
        role: 'assistant',
        content: `Connection error: ${e?.message || e}. Backend ${API_URL} unreachable.`,
      }])
    } finally {
      setBusy(false)
      setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 50)
    }
  }, [input, busy])

  return (
    <KeyboardAvoidingView
      style={S.root}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 60 : 0}
    >
      <StatusHeader counts={counts} rtConnected={rtConnected} />

      {/* Globe area */}
      <View style={S.globeWrap}>
        {!webLoaded && !webError && (
          <View style={S.overlay}>
            <ActivityIndicator color={T.amber} />
            <Text style={S.overlayText}>SPINNING UP GLOBE…</Text>
            <Text style={S.overlayHint}>{FRONTEND_URL}</Text>
          </View>
        )}
        {webError && (
          <View style={S.errorBox}>
            <Text style={S.errorTitle}>GLOBE OFFLINE</Text>
            <Text style={S.errorBody}>
              Web frontend unreachable.{'\n\n'}
              Start it with{'\n'}
              <Text style={{ color: T.amber }}>cd frontend && npm run dev</Text>{'\n\n'}
              Then set in mobile env:{'\n'}
              <Text style={{ color: T.cyan }}>EXPO_PUBLIC_FRONTEND_URL=http://&lt;LAN-IP&gt;:3000</Text>{'\n'}
              <Text style={{ color: T.cyan }}>EXPO_PUBLIC_API_URL=http://&lt;LAN-IP&gt;:8000</Text>
            </Text>
            <TouchableOpacity style={S.retryBtn} onPress={() => { setWebError(null); webRef.current?.reload() }}>
              <Text style={S.retryText}>RETRY</Text>
            </TouchableOpacity>
          </View>
        )}
        <WebView
          ref={webRef}
          source={{ uri: FRONTEND_URL }}
          style={[S.web, !webLoaded && { opacity: 0 }]}
          originWhitelist={['*']}
          javaScriptEnabled
          domStorageEnabled
          cacheEnabled
          allowsInlineMediaPlayback
          mediaPlaybackRequiresUserAction={false}
          androidLayerType="hardware"
          mixedContentMode="always"
          userAgent="Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36 ODIN-Mobile"
          onLoadEnd={() => setWebLoaded(true)}
          onError={(e) => setWebError(String(e.nativeEvent?.description || 'load error'))}
          onHttpError={(e) => setWebError(`HTTP ${e.nativeEvent?.statusCode}`)}
        />
      </View>

      {/* Chat history — visible only when chatOpen */}
      {chatOpen && (
        <View style={S.chatPanel}>
          <View style={S.chatHeader}>
            <Text style={S.chatHeaderText}>◈ CONVERSATION</Text>
            <TouchableOpacity onPress={() => setChatOpen(false)}>
              <Text style={S.chatClose}>▼</Text>
            </TouchableOpacity>
          </View>
          <ScrollView
            ref={scrollRef}
            style={S.chatScroll}
            contentContainerStyle={{ padding: 10 }}
            onContentSizeChange={() => scrollRef.current?.scrollToEnd({ animated: false })}
          >
            {messages.map(m => <MessageBubble key={m.id} m={m} />)}
            {busy && (
              <View style={[S.bubble, S.bubbleOdin]}>
                <Text style={S.bubbleRole}>◈ ODIN</Text>
                <ActivityIndicator color={T.amber} size="small" />
              </View>
            )}
          </ScrollView>
        </View>
      )}

      {/* Suggestion pills — visible only when chat is closed */}
      {!chatOpen && (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={S.pillsRow}
          contentContainerStyle={{ paddingHorizontal: 10, gap: 6, paddingVertical: 6 }}
        >
          {SUGGESTIONS.map((s, i) => (
            <TouchableOpacity key={i} style={S.pill} onPress={() => send(s)}>
              <Text style={S.pillText}>{s}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      )}

      {/* Persistent chat dock */}
      <View style={S.dock}>
        {!chatOpen && (
          <TouchableOpacity style={S.expandBtn} onPress={() => setChatOpen(true)}>
            <Text style={S.expandText}>▲</Text>
          </TouchableOpacity>
        )}
        <TextInput
          style={S.input}
          value={input}
          onChangeText={setInput}
          placeholder="QUERY ODIN…"
          placeholderTextColor={T.muted}
          onSubmitEditing={() => send()}
          onFocus={() => setChatOpen(true)}
          returnKeyType="send"
          blurOnSubmit={false}
        />
        <TouchableOpacity
          style={[S.sendBtn, (!input.trim() || busy) && S.sendBtnOff]}
          onPress={() => send()}
          disabled={!input.trim() || busy}
        >
          <Text style={S.sendText}>RUN</Text>
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  )
}

const S = StyleSheet.create({
  root: { flex: 1, backgroundColor: T.bg },

  // ── Header ──────────────────────────────────────────
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 12, paddingVertical: 8,
    backgroundColor: T.bg1, borderBottomWidth: 1, borderBottomColor: T.borderAmber,
  },
  headerLeft: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  logoMark: {
    width: 26, height: 26, borderRadius: 13,
    borderWidth: 1, borderColor: T.amber,
    alignItems: 'center', justifyContent: 'center',
  },
  logoSymbol: { color: T.amber, fontSize: 14, fontWeight: '800' },
  logoText: { color: T.amber, fontFamily: 'monospace', fontWeight: '800', fontSize: 13, letterSpacing: 2 },
  logoSub:  { color: T.muted, fontFamily: 'monospace', fontSize: 7, letterSpacing: 1.4 },
  headerRight: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  counter: {
    flexDirection: 'row', alignItems: 'center', gap: 3,
    paddingHorizontal: 5, paddingVertical: 3,
    borderWidth: 1, borderColor: T.border,
  },
  counterText: { color: T.text, fontFamily: 'monospace', fontSize: 9, letterSpacing: 0.4 },
  dot: { width: 5, height: 5, borderRadius: 3 },
  streamBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 3,
    paddingHorizontal: 6, paddingVertical: 3,
    borderWidth: 1, marginLeft: 2,
  },
  streamText: { fontFamily: 'monospace', fontSize: 8, fontWeight: '700', letterSpacing: 0.8 },

  // ── Globe / WebView ────────────────────────────────
  globeWrap: { flex: 1, backgroundColor: T.bg, position: 'relative' },
  web: { flex: 1, backgroundColor: T.bg },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: T.bg, justifyContent: 'center', alignItems: 'center', zIndex: 2,
  },
  overlayText: { color: T.text, marginTop: 12, fontFamily: 'monospace', letterSpacing: 2 },
  overlayHint: { color: T.muted, marginTop: 4, fontFamily: 'monospace', fontSize: 10 },
  errorBox: {
    ...StyleSheet.absoluteFillObject,
    margin: 16, padding: 16,
    backgroundColor: T.surface, borderWidth: 1, borderColor: T.borderAmber,
    zIndex: 3, height: 'auto',
  },
  errorTitle: { color: T.red, fontFamily: 'monospace', fontWeight: '800', letterSpacing: 2, marginBottom: 10 },
  errorBody:  { color: T.text, fontFamily: 'monospace', fontSize: 11, lineHeight: 18 },
  retryBtn:   { alignSelf: 'flex-start', marginTop: 12, paddingHorizontal: 12, paddingVertical: 6, borderWidth: 1, borderColor: T.amber },
  retryText:  { color: T.amber, fontFamily: 'monospace', fontWeight: '800', letterSpacing: 2 },

  // ── Chat panel ─────────────────────────────────────
  chatPanel: {
    maxHeight: 260,
    backgroundColor: T.glass, borderTopWidth: 1, borderTopColor: T.borderAmber,
  },
  chatHeader: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: 12, paddingVertical: 6,
    borderBottomWidth: 1, borderBottomColor: T.border,
  },
  chatHeaderText: { color: T.amber, fontFamily: 'monospace', fontSize: 10, fontWeight: '800', letterSpacing: 2 },
  chatClose: { color: T.amber, fontSize: 14, paddingHorizontal: 8 },
  chatScroll: { maxHeight: 220 },

  bubble: { marginBottom: 6, padding: 8, borderWidth: 1, maxWidth: '95%' },
  bubbleUser: { alignSelf: 'flex-end', backgroundColor: 'rgba(255,179,0,0.06)', borderColor: T.borderAmber, borderRightWidth: 3, borderRightColor: T.amber },
  bubbleOdin: { alignSelf: 'flex-start', backgroundColor: T.surface, borderColor: T.border, borderLeftWidth: 3, borderLeftColor: T.amber },
  bubbleRole: { color: T.amber, fontFamily: 'monospace', fontSize: 8, letterSpacing: 1.4, fontWeight: '800', marginBottom: 4 },
  bubbleBody: { fontFamily: 'monospace', fontSize: 12, lineHeight: 17 },
  bubbleBodyUser: { color: T.text },
  bubbleBodyOdin: { color: 'rgba(255,255,255,0.78)' },
  bubbleMeta: { color: T.green, fontFamily: 'monospace', fontSize: 8, marginTop: 4, letterSpacing: 0.6 },

  // ── Suggestion pills ───────────────────────────────
  pillsRow: { maxHeight: 36, backgroundColor: T.bg1, borderTopWidth: 1, borderTopColor: T.border },
  pill: { paddingHorizontal: 8, paddingVertical: 5, borderWidth: 1, borderColor: T.border, backgroundColor: T.surface },
  pillText: { color: 'rgba(255,255,255,0.6)', fontFamily: 'monospace', fontSize: 9 },

  // ── Persistent chat dock ───────────────────────────
  dock: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    paddingHorizontal: 10, paddingVertical: 8,
    backgroundColor: T.surface, borderTopWidth: 1, borderTopColor: T.borderAmber,
  },
  expandBtn: { paddingHorizontal: 6, paddingVertical: 6, borderWidth: 1, borderColor: T.border },
  expandText: { color: T.amber, fontSize: 12 },
  input: {
    flex: 1, color: T.text, fontFamily: 'monospace', fontSize: 12,
    paddingHorizontal: 10, paddingVertical: Platform.OS === 'ios' ? 10 : 6,
    backgroundColor: T.bg, borderWidth: 1, borderColor: T.border,
  },
  sendBtn: { backgroundColor: T.amber, paddingHorizontal: 14, paddingVertical: 10 },
  sendBtnOff: { opacity: 0.4 },
  sendText: { color: '#000', fontFamily: 'monospace', fontWeight: '800', letterSpacing: 1, fontSize: 11 },
})
