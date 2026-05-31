import React, { useEffect, useState } from 'react'
import { View, ActivityIndicator, StyleSheet } from 'react-native'
import { NavigationContainer } from '@react-navigation/native'
import { createNativeStackNavigator } from '@react-navigation/native-stack'
import { navigationRef } from './NavigationRef'
import { getToken } from '../lib/storage'
import type { RootStackParamList } from './types'

import LoginScreen from '../screens/LoginScreen'
import RegisterScreen from '../screens/RegisterScreen'
import GuestScreen from '../screens/GuestScreen'
import LobbyScreen from '../screens/LobbyScreen'
import RoomScreen from '../screens/RoomScreen'
import ModeratorScreen from '../screens/ModeratorScreen'

const Stack = createNativeStackNavigator<RootStackParamList>()

export function AppNavigator() {
  const [isReady, setIsReady] = useState(false)
  const [hasToken, setHasToken] = useState(false)

  useEffect(() => {
    getToken()
      .then((token) => {
        setHasToken(!!token)
      })
      .catch(() => {
        setHasToken(false)
      })
      .finally(() => {
        setIsReady(true)
      })
  }, [])

  if (!isReady) {
    return (
      <View style={styles.loading}>
        <ActivityIndicator size="large" color="#60a5fa" />
      </View>
    )
  }

  return (
    <NavigationContainer ref={navigationRef}>
      <Stack.Navigator
        initialRouteName={hasToken ? 'Lobby' : 'Login'}
        screenOptions={{ headerShown: false }}
      >
        <Stack.Screen name="Login" component={LoginScreen} />
        <Stack.Screen name="Register" component={RegisterScreen} />
        <Stack.Screen name="Guest" component={GuestScreen} />
        <Stack.Screen name="Lobby" component={LobbyScreen} />
        <Stack.Screen name="Room" component={RoomScreen} />
        <Stack.Screen name="Moderator" component={ModeratorScreen} />
      </Stack.Navigator>
    </NavigationContainer>
  )
}

const styles = StyleSheet.create({
  loading: {
    flex: 1,
    backgroundColor: '#030712',
    alignItems: 'center',
    justifyContent: 'center',
  },
})
