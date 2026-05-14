import React from 'react'
import { NavigationContainer } from '@react-navigation/native'
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs'
import { StatusBar } from 'expo-status-bar'
import { Text } from 'react-native'

import HomeScreen from './src/screens/HomeScreen'
import IncidentScreen from './src/screens/IncidentScreen'
import ChatScreen from './src/screens/ChatScreen'
import DispatchScreen from './src/screens/DispatchScreen'

const Tab = createBottomTabNavigator()

const THEME = {
  bg: '#060b18',
  primary: '#00d4ff',
  surface: '#0d1526',
  border: 'rgba(0,212,255,0.15)',
  text: '#e2e8f0',
  muted: 'rgba(226,232,240,0.4)',
}

export default function App() {
  return (
    <NavigationContainer theme={{
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
        screenOptions={({ route }) => ({
          tabBarIcon: ({ focused }) => {
            const icons = { Home: '⊕', Incidents: '⚠️', Chat: '🤖', Dispatch: '🎫' }
            return <Text style={{ fontSize: 18, opacity: focused ? 1 : 0.5 }}>{icons[route.name]}</Text>
          },
          tabBarActiveTintColor: THEME.primary,
          tabBarInactiveTintColor: THEME.muted,
          tabBarStyle: {
            backgroundColor: THEME.surface,
            borderTopColor: THEME.border,
            borderTopWidth: 1,
            height: 60,
            paddingBottom: 8,
          },
          tabBarLabelStyle: { fontSize: 10, fontWeight: '600' },
          headerStyle: { backgroundColor: THEME.surface, borderBottomColor: THEME.border, borderBottomWidth: 1 },
          headerTitleStyle: { color: THEME.primary, fontWeight: '800', fontSize: 16, letterSpacing: 2 },
        })}
      >
        <Tab.Screen name="Home" component={HomeScreen} options={{ title: 'ODIN', headerTitle: 'ODIN ⊕' }} />
        <Tab.Screen name="Incidents" component={IncidentScreen} />
        <Tab.Screen name="Chat" component={ChatScreen} options={{ title: 'AI Chat' }} />
        <Tab.Screen name="Dispatch" component={DispatchScreen} />
      </Tab.Navigator>
    </NavigationContainer>
  )
}
