import React, { useRef, useState } from 'react'
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
  ActivityIndicator,
} from 'react-native'
import type { NativeStackScreenProps } from '@react-navigation/native-stack'
import { api } from '../lib/api'
import { setToken } from '../lib/storage'
import type { RootStackParamList } from '../navigation/types'

type Props = NativeStackScreenProps<RootStackParamList, 'Guest'>

interface AuthResponse {
  accessToken: string
}

export default function GuestScreen({ navigation }: Props) {
  const [username, setUsername] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const inputRef = useRef<TextInput>(null)

  async function handleGuest() {
    if (username.trim().length < 2) {
      setError('Username must be at least 2 characters')
      return
    }
    setLoading(true)
    setError(null)
    try {
      const res = await api.post<AuthResponse>('/auth/guest', { username: username.trim() })
      await setToken(res.data.accessToken)
      navigation.replace('Lobby')
    } catch {
      setError('Username already taken, try another.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <View style={styles.card}>
        <Text style={styles.title}>Play as Guest</Text>

        <View style={styles.banner}>
          <Text style={styles.bannerText}>
            Guest accounts cannot access the leaderboard or save progress.
          </Text>
        </View>

        <TextInput
          ref={inputRef}
          style={styles.input}
          placeholder="Choose a username"
          placeholderTextColor="#6b7280"
          value={username}
          onChangeText={setUsername}
          autoCapitalize="none"
          autoCorrect={false}
          autoFocus
          returnKeyType="done"
          onSubmitEditing={handleGuest}
        />

        {error !== null && <Text style={styles.error}>{error}</Text>}

        <TouchableOpacity
          style={[styles.button, loading && styles.buttonDisabled]}
          onPress={handleGuest}
          disabled={loading}
          activeOpacity={0.8}
        >
          {loading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.buttonText}>Play as Guest</Text>
          )}
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.linkButton}
          onPress={() => navigation.goBack()}
        >
          <Text style={styles.linkText}>Back to Login</Text>
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#030712', justifyContent: 'center', padding: 24 },
  card: { backgroundColor: '#111827', borderRadius: 16, padding: 24, gap: 12 },
  title: { fontSize: 28, fontWeight: 'bold', color: '#f9fafb', textAlign: 'center' },
  banner: {
    backgroundColor: '#1c1917',
    borderWidth: 1,
    borderColor: '#44403c',
    borderRadius: 8,
    padding: 12,
  },
  bannerText: { color: '#a8a29e', fontSize: 13, lineHeight: 18 },
  input: {
    backgroundColor: '#1f2937',
    color: '#f9fafb',
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 16,
    borderWidth: 1,
    borderColor: '#374151',
  },
  error: { color: '#f87171', fontSize: 13, textAlign: 'center' },
  button: {
    backgroundColor: '#374151',
    borderRadius: 8,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 4,
  },
  buttonDisabled: { opacity: 0.6 },
  buttonText: { color: '#e5e7eb', fontSize: 16, fontWeight: '600' },
  linkButton: { paddingVertical: 8, alignItems: 'center' },
  linkText: { color: '#60a5fa', fontSize: 14 },
})
