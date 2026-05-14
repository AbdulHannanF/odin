import React, { useState, useRef, useCallback } from 'react'
import { View, Text, TextInput, ScrollView, TouchableOpacity, StyleSheet, ActivityIndicator, KeyboardAvoidingView, Platform } from 'react-native'
import axios from 'axios'

const API = axios.create({ baseURL: 'http://localhost:8000', timeout: 20000 })
const THEME = { bg: '#060b18', surface: '#0d1526', elevated: '#121e35', primary: '#00d4ff', text: '#e2e8f0', muted: 'rgba(226,232,240,.4)', border: 'rgba(0,212,255,.12)' }

const SUGGESTIONS = [
  'Which regions are best for offshore wind expansion?',
  'What infrastructure is vulnerable to flooding?',
  'Which countries control the lithium supply for EVs?',
  'What is the cascading impact if the Gulf substation fails?',
]

export default function ChatScreen() {
  const [messages, setMessages] = useState([
    { role: 'assistant', content: 'Hello, I am ODIN. Ask me anything about infrastructure risk, climate vulnerabilities, mineral supply chains, or wind resources.', id: 'intro' }
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
      setMessages(prev => [...prev, { role: 'assistant', content: `Connection error: ${err.message}. Make sure the ODIN backend is running.`, id: 'err' }])
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
            {m.role === 'assistant' && <Text style={s.roleLabel}>🤖 ODIN</Text>}
            <Text style={[s.bubbleText, m.role === 'user' ? s.userText : s.aiText]}>{m.content}</Text>
            {m.confidence !== undefined && (
              <Text style={s.confText}>Confidence: {Math.round(m.confidence * 100)}%</Text>
            )}
            {m.sources?.length > 0 && (
              <Text style={s.srcText}>{m.sources.join(' · ')}</Text>
            )}
          </View>
        ))}
        {loading && (
          <View style={s.aiBubble}>
            <Text style={s.roleLabel}>🤖 ODIN</Text>
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
          placeholder="Ask ODIN anything…"
          placeholderTextColor={THEME.muted}
          multiline
          maxLength={500}
          onSubmitEditing={() => sendMessage()}
        />
        <TouchableOpacity style={[s.sendBtn, (!input.trim() || loading) && s.sendBtnDisabled]} onPress={() => sendMessage()} disabled={!input.trim() || loading}>
          <Text style={s.sendText}>Send</Text>
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  )
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#060b18' },
  messages: { flex: 1 },
  bubble: { marginBottom: 10, padding: 12, borderRadius: 12, maxWidth: '90%' },
  userBubble: { alignSelf: 'flex-end', backgroundColor: 'rgba(0,212,255,.12)', borderWidth: 1, borderColor: 'rgba(0,212,255,.2)' },
  aiBubble: { alignSelf: 'flex-start', backgroundColor: '#0d1526', borderWidth: 1, borderColor: 'rgba(0,212,255,.12)', maxWidth: '95%' },
  roleLabel: { fontSize: 9, fontWeight: '700', color: '#00d4ff', textTransform: 'uppercase', letterSpacing: .8, marginBottom: 4 },
  bubbleText: { fontSize: 13, lineHeight: 19 },
  userText: { color: '#e2e8f0' },
  aiText: { color: 'rgba(226,232,240,.85)' },
  confText: { fontSize: 10, color: '#10b981', marginTop: 6 },
  srcText: { fontSize: 9, color: 'rgba(226,232,240,.3)', marginTop: 2 },
  suggestions: { maxHeight: 44, borderTopWidth: 1, borderTopColor: 'rgba(0,212,255,.1)' },
  suggestionPill: { paddingHorizontal: 12, paddingVertical: 8, borderRadius: 999, borderWidth: 1, borderColor: 'rgba(255,255,255,.08)', backgroundColor: '#0d1526', marginVertical: 6 },
  suggestionText: { fontSize: 11, color: 'rgba(226,232,240,.5)' },
  inputRow: { flexDirection: 'row', gap: 8, padding: 12, backgroundColor: '#0d1526', borderTopWidth: 1, borderTopColor: 'rgba(0,212,255,.12)' },
  input: { flex: 1, backgroundColor: '#121e35', borderRadius: 10, padding: 10, color: '#e2e8f0', fontSize: 13, borderWidth: 1, borderColor: 'rgba(0,212,255,.15)', maxHeight: 100 },
  sendBtn: { backgroundColor: '#00d4ff', borderRadius: 10, paddingHorizontal: 16, justifyContent: 'center' },
  sendBtnDisabled: { opacity: 0.4 },
  sendText: { color: '#060b18', fontWeight: '700', fontSize: 13 },
})
