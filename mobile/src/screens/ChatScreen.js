import React, { useState, useRef, useCallback } from 'react'
import { View, Text, TextInput, ScrollView, TouchableOpacity, StyleSheet, ActivityIndicator, KeyboardAvoidingView, Platform } from 'react-native'
import axios from 'axios'

const API_URL = process.env.EXPO_PUBLIC_API_URL || 'http://192.168.1.100:8000'
const API = axios.create({ baseURL: API_URL, timeout: 20000 })
const THEME = { bg: '#080a0e', surface: '#0d1117', elevated: '#121922', primary: '#ffb300', text: 'rgba(255,255,255,0.88)', muted: 'rgba(255,255,255,0.35)', border: 'rgba(255,255,255,0.12)' }

const SUGGESTIONS = [
  'Which regions are best for offshore wind expansion?',
  'What infrastructure is vulnerable to flooding?',
  'Which countries control the lithium supply for EVs?',
  'What is the cascading impact if the Gulf substation fails?',
]

export default function ChatScreen() {
  const [messages, setMessages] = useState([
    { role: 'assistant', content: 'ODIN TERMINAL ONLINE. Ask me anything about infrastructure risk, climate vulnerabilities, mineral supply chains, or wind resources.', id: 'intro' }
  ])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const scrollRef = useRef(null)

  const sendMessage = useCallback(async (text) => {
    const q = text || input
    if (!q.trim() || loading) return
    setInput('')
    setMessages(prev => [...prev, { role: 'user', content: q, id: Date.now().toString() }])
    setLoading(true)
    try {
      const { data } = await API.post('/api/query/nl', { query: q })
      setMessages(prev => [...prev, {
        role: 'assistant',
        content: data.answer,
        confidence: data.confidence,
        sources: data.data_sources,
        id: Date.now().toString() + '_a',
      }])
    } catch (err) {
      setMessages(prev => [...prev, { role: 'assistant', content: `CONNECTION ERROR: ${err.message}. Ensure backend is running.`, id: 'err' }])
    } finally {
      setLoading(false)
      setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 100)
    }
  }, [input, loading])

  return (
    <KeyboardAvoidingView style={s.container} behavior={Platform.OS === 'ios' ? 'padding' : undefined} keyboardVerticalOffset={90}>
      <ScrollView ref={scrollRef} style={s.messages} contentContainerStyle={{ padding: 12 }}>
        {messages.map(m => (
          <View key={m.id} style={[s.bubble, m.role === 'user' ? s.userBubble : s.aiBubble]}>
            {m.role === 'assistant' && <Text style={s.roleLabel}>◈ ODIN</Text>}
            <Text style={[s.bubbleText, m.role === 'user' ? s.userText : s.aiText]}>{m.content}</Text>
            {m.confidence !== undefined && (
              <Text style={s.confText}>CONFIDENCE: {Math.round(m.confidence * 100)}%</Text>
            )}
            {m.sources?.length > 0 && (
              <Text style={s.srcText}>{m.sources.join(' · ').toUpperCase()}</Text>
            )}
          </View>
        ))}
        {loading && (
          <View style={s.aiBubble}>
            <Text style={s.roleLabel}>◈ ODIN</Text>
            <ActivityIndicator color={THEME.primary} size="small" />
          </View>
        )}
      </ScrollView>

      {/* Suggestions */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={s.suggestions} contentContainerStyle={{ paddingHorizontal: 12, gap: 8 }}>
        {SUGGESTIONS.map((s_txt, i) => (
          <TouchableOpacity key={i} style={s.suggestionPill} onPress={() => sendMessage(s_txt)}>
            <Text style={s.suggestionText}>{s_txt.length > 40 ? s_txt.slice(0, 40) + '…' : s_txt}</Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      <View style={s.inputRow}>
        <TextInput
          style={s.input}
          value={input}
          onChangeText={setInput}
          placeholder="QUERY ODIN…"
          placeholderTextColor={THEME.muted}
          multiline
          maxLength={500}
          onSubmitEditing={() => sendMessage()}
        />
        <TouchableOpacity style={[s.sendBtn, (!input.trim() || loading) && s.sendBtnDisabled]} onPress={() => sendMessage()} disabled={!input.trim() || loading}>
          <Text style={s.sendText}>RUN</Text>
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  )
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: THEME.bg },
  messages: { flex: 1 },
  bubble: { marginBottom: 10, padding: 12, maxWidth: '90%', borderWidth: 1 },
  userBubble: { alignSelf: 'flex-end', backgroundColor: 'rgba(255,179,0,.08)', borderColor: 'rgba(255,179,0,.15)', borderRightWidth: 3, borderRightColor: THEME.primary },
  aiBubble: { alignSelf: 'flex-start', backgroundColor: THEME.surface, borderColor: THEME.border, maxWidth: '95%', borderLeftWidth: 3, borderLeftColor: THEME.primary },
  roleLabel: { fontSize: 9, fontWeight: '700', color: THEME.primary, textTransform: 'uppercase', letterSpacing: 1.5, marginBottom: 6, fontFamily: 'monospace' },
  bubbleText: { fontSize: 13, lineHeight: 20, fontFamily: 'monospace' },
  userText: { color: THEME.text },
  aiText: { color: 'rgba(255,255,255,.75)' },
  confText: { fontSize: 9, color: '#10b981', marginTop: 8, fontFamily: 'monospace', letterSpacing: .5 },
  srcText: { fontSize: 8, color: 'rgba(255,255,255,.3)', marginTop: 4, fontFamily: 'monospace' },
  suggestions: { maxHeight: 44, borderTopWidth: 1, borderTopColor: THEME.border },
  suggestionPill: { paddingHorizontal: 12, paddingVertical: 6, borderWidth: 1, borderColor: THEME.border, backgroundColor: THEME.surface, marginVertical: 8 },
  suggestionText: { fontSize: 9, color: 'rgba(255,255,255,.5)', fontFamily: 'monospace' },
  inputRow: { flexDirection: 'row', gap: 8, padding: 12, backgroundColor: THEME.surface, borderTopWidth: 1, borderTopColor: THEME.border },
  input: { flex: 1, backgroundColor: THEME.bg, padding: 10, color: THEME.text, fontSize: 13, borderWidth: 1, borderColor: THEME.border, maxHeight: 100, fontFamily: 'monospace' },
  sendBtn: { backgroundColor: THEME.primary, paddingHorizontal: 16, justifyContent: 'center' },
  sendBtnDisabled: { opacity: 0.4 },
  sendText: { color: '#000', fontWeight: '800', fontSize: 11, fontFamily: 'monospace', letterSpacing: 1 },
})
