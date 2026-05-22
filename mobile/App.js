import React, { useEffect } from 'react'
import { NavigationContainer } from '@react-navigation/native'
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs'
import { StatusBar } from 'expo-status-bar'
import { Text } from 'react-native'
import { createLogger, sessionId } from './src/utils/logger'

import GlobeScreen from './src/screens/GlobeScreen'
import HomeScreen from './src/screens/HomeScreen'
import IncidentScreen from './src/screens/IncidentScreen'
import DispatchScreen from './src/screens/DispatchScreen'

const Tab = createBottomTabNavigator()
const log = createLogger('App')

const THEME = {
  bg: '#080a0e',
  primary: '#3b82f6',
  surface: '#0d1117',
  border: 'rgba(59,130,246,0.15)',
  text: 'rgba(255,255,255,0.88)',
  muted: 'rgba(255,255,255,0.35)',
}

// Chat is now docked at the bottom of the Globe screen (matches web NLQueryBar),
// so we drop the standalone Chat tab. Four tabs: Globe | Assets | Incidents | Dispatch.
const ICONS = { Globe: '◉', Assets: '⊕', Incidents: '⚠', Dispatch: '⚑' }

export default function App() {
  useEffect(() => {
    log.info(`session ${sessionId} boot`)
    return () => log.info('app unmounted')
  }, [])

  return (
    <NavigationContainer
      onStateChange={(state) => {
        if (!state) return
        const route = state.routes[state.index]
        log.info(`nav → ${route?.name}`, { index: state.index })
      }}
      theme={{
        dark: true,
        colors: {
          primary: THEME.primary,
          background: THEME.bg,
          card: THEME.surface,
          text: THEME.text,
          border: THEME.border,
          notification: THEME.primary,
        }
      }}>
      <StatusBar style="light" backgroundColor={THEME.bg} />
      <Tab.Navigator
        initialRouteName="Globe"
        screenOptions={({ route }) => ({
          tabBarIcon: ({ focused }) => (
            <Text style={{
              fontSize: 18,
              opacity: focused ? 1 : 0.45,
              color: focused ? THEME.primary : THEME.muted,
            }}>
              {ICONS[route.name] || '·'}
            </Text>
          ),
          tabBarActiveTintColor: THEME.primary,
          tabBarInactiveTintColor: THEME.muted,
          tabBarStyle: {
            backgroundColor: THEME.surface,
            borderTopColor: THEME.border,
            borderTopWidth: 1,
            height: 58,
            paddingBottom: 6,
          },
          tabBarLabelStyle: { fontSize: 9, fontWeight: '700', letterSpacing: 1.5, fontFamily: 'monospace' },
          headerStyle: { backgroundColor: THEME.surface, borderBottomColor: THEME.border, borderBottomWidth: 1 },
          headerTitleStyle: { color: THEME.primary, fontWeight: '800', fontSize: 14, letterSpacing: 2, fontFamily: 'monospace' },
        })}
      >
        <Tab.Screen name="Globe"     component={GlobeScreen}    options={{ headerShown: false, title: 'GLOBE' }} />
        <Tab.Screen name="Assets"    component={HomeScreen}     options={{ headerTitle: 'ASSETS ⊕' }} />
        <Tab.Screen name="Incidents" component={IncidentScreen} options={{ headerTitle: 'INCIDENTS ⚠' }} />
        <Tab.Screen name="Dispatch"  component={DispatchScreen} options={{ headerTitle: 'DISPATCH ⚑' }} />
      </Tab.Navigator>
    </NavigationContainer>
  )
}
