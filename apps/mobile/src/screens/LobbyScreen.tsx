import React, { useCallback, useEffect, useState } from 'react'
import {
  View,
  Text,
  TouchableOpacity,
  Modal,
  TextInput,
  FlatList,
  ScrollView,
  StyleSheet,
  ActivityIndicator,
  Alert,
} from 'react-native'
import type { NativeStackScreenProps } from '@react-navigation/native-stack'
import { api } from '../lib/api'
import { removeToken, getCachedToken } from '../lib/storage'
import type { RootStackParamList } from '../navigation/types'

type Props = NativeStackScreenProps<RootStackParamList, 'Lobby'>

interface RoomTemplate {
  id: string
  name: string
  minPlayers: number
  maxPlayers: number
  description: string
  roles: Record<string, number>
}

interface CreateRoomResponse {
  code: string
}

interface JoinRoomResponse {
  code?: string
}

function decodeJwtUserId(token: string): string | null {
  try {
    const segment = token.split('.')[1]
    if (!segment) return null
    const padded = segment
      .replace(/-/g, '+')
      .replace(/_/g, '/')
      .padEnd(segment.length + ((4 - (segment.length % 4)) % 4), '=')
    const json = JSON.parse(atob(padded)) as Record<string, unknown>
    return (json['username'] as string) ?? null
  } catch {
    return null
  }
}

export default function LobbyScreen({ navigation }: Props) {
  const [username, setUsername] = useState('')
  const [showCreate, setShowCreate] = useState(false)
  const [showJoin, setShowJoin] = useState(false)

  useEffect(() => {
    const token = getCachedToken()
    if (token) setUsername(decodeJwtUserId(token) ?? 'Player')
  }, [])

  async function handleLogout() {
    await removeToken()
    navigation.replace('Login')
  }

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>{username.charAt(0).toUpperCase()}</Text>
        </View>
        <Text style={styles.username}>{username}</Text>
        <TouchableOpacity onPress={handleLogout} style={styles.logoutBtn}>
          <Text style={styles.logoutText}>Logout</Text>
        </TouchableOpacity>
      </View>

      {/* Main buttons */}
      <View style={styles.body}>
        <Text style={styles.title}>Mafioso</Text>
        <Text style={styles.tagline}>The social deduction game</Text>

        <TouchableOpacity
          style={styles.primaryButton}
          onPress={() => setShowCreate(true)}
          activeOpacity={0.85}
        >
          <Text style={styles.primaryButtonText}>Create Room</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.secondaryButton}
          onPress={() => setShowJoin(true)}
          activeOpacity={0.85}
        >
          <Text style={styles.secondaryButtonText}>Join Room</Text>
        </TouchableOpacity>
      </View>

      <CreateRoomModal
        visible={showCreate}
        onClose={() => setShowCreate(false)}
        onCreated={(code) => {
          setShowCreate(false)
          navigation.navigate('Moderator', { code })
        }}
      />

      <JoinRoomModal
        visible={showJoin}
        onClose={() => setShowJoin(false)}
        onJoined={(code) => {
          setShowJoin(false)
          navigation.navigate('Room', { code })
        }}
      />
    </View>
  )
}

// ---------------------------------------------------------------------------
// CreateRoomModal
// ---------------------------------------------------------------------------

interface CreateRoomModalProps {
  visible: boolean
  onClose: () => void
  onCreated: (code: string) => void
}

function CreateRoomModal({ visible, onClose, onCreated }: CreateRoomModalProps) {
  const [templates, setTemplates] = useState<RoomTemplate[]>([])
  const [selectedId, setSelectedId] = useState('classic_7')
  const [onSiteMode, setOnSiteMode] = useState(false)
  const [loading, setLoading] = useState(false)
  const [fetching, setFetching] = useState(false)

  const fetchTemplates = useCallback(async () => {
    setFetching(true)
    try {
      const res = await api.get<RoomTemplate[]>('/rooms/templates')
      setTemplates(res.data)
    } catch {
      // keep empty
    } finally {
      setFetching(false)
    }
  }, [])

  useEffect(() => {
    if (visible) void fetchTemplates()
  }, [visible, fetchTemplates])

  async function handleCreate() {
    setLoading(true)
    try {
      const res = await api.post<CreateRoomResponse>('/rooms', {
        templateId: selectedId,
        onSiteMode,
      })
      onCreated(res.data.code)
    } catch {
      Alert.alert('Error', 'Failed to create room. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View style={styles.sheet}>
          <View style={styles.sheetHandle} />
          <Text style={styles.sheetTitle}>Create Room</Text>

          {fetching ? (
            <ActivityIndicator color="#60a5fa" style={{ marginVertical: 20 }} />
          ) : (
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.templateRow}
            >
              {templates.map((t) => (
                <TouchableOpacity
                  key={t.id}
                  style={[styles.templateCard, selectedId === t.id && styles.templateCardSelected]}
                  onPress={() => setSelectedId(t.id)}
                >
                  <Text style={[styles.templateName, selectedId === t.id && styles.templateNameSelected]}>
                    {t.name}
                  </Text>
                  <Text style={styles.templateDesc}>{t.description}</Text>
                  <View style={styles.roleRow}>
                    {Object.entries(t.roles).map(([role, count]) => (
                      <Text key={role} style={styles.roleBadge}>
                        {count} {role}
                      </Text>
                    ))}
                  </View>
                  <Text style={styles.templatePlayers}>
                    {t.minPlayers}–{t.maxPlayers} players
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          )}

          {/* On-site mode toggle */}
          <TouchableOpacity
            style={styles.toggleRow}
            onPress={() => setOnSiteMode((v) => !v)}
          >
            <View style={[styles.toggleBox, onSiteMode && styles.toggleBoxOn]}>
              {onSiteMode && <View style={styles.toggleDot} />}
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.toggleLabel}>On-site mode</Text>
              <Text style={styles.toggleHint}>
                Eliminations announced verbally by moderator
              </Text>
            </View>
          </TouchableOpacity>

          <View style={styles.sheetButtons}>
            <TouchableOpacity style={styles.cancelBtn} onPress={onClose}>
              <Text style={styles.cancelBtnText}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.confirmBtn, loading && styles.buttonDisabled]}
              onPress={handleCreate}
              disabled={loading}
            >
              {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.confirmBtnText}>Create</Text>}
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  )
}

// ---------------------------------------------------------------------------
// JoinRoomModal
// ---------------------------------------------------------------------------

interface JoinRoomModalProps {
  visible: boolean
  onClose: () => void
  onJoined: (code: string) => void
}

function JoinRoomModal({ visible, onClose, onJoined }: JoinRoomModalProps) {
  const [code, setCode] = useState('')
  const [inviteLink, setInviteLink] = useState('')
  const [loading, setLoading] = useState(false)
  const [tab, setTab] = useState<'code' | 'link'>('code')

  function handleCodeChange(text: string) {
    setCode(text.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 6))
  }

  async function handleJoinByCode() {
    if (code.length !== 6) return
    setLoading(true)
    try {
      await api.post(`/rooms/${code}/join`, {})
      onJoined(code)
    } catch {
      Alert.alert('Error', 'Could not join room. Check the code and try again.')
    } finally {
      setLoading(false)
    }
  }

  async function handleJoinByLink() {
    const token = parseInviteToken(inviteLink.trim())
    if (!token) {
      Alert.alert('Invalid link', 'Could not parse the invite link.')
      return
    }
    setLoading(true)
    try {
      const res = await api.post<JoinRoomResponse>('/rooms/join-by-token', { token })
      const roomCode = parseRoomCodeFromToken(token)
      onJoined(res.data.code ?? roomCode ?? '')
    } catch {
      Alert.alert('Error', 'Invite link is invalid or expired.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View style={styles.sheet}>
          <View style={styles.sheetHandle} />
          <Text style={styles.sheetTitle}>Join Room</Text>

          {/* Tab switcher */}
          <View style={styles.tabRow}>
            <TouchableOpacity
              style={[styles.tab, tab === 'code' && styles.tabActive]}
              onPress={() => setTab('code')}
            >
              <Text style={[styles.tabText, tab === 'code' && styles.tabTextActive]}>Room Code</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.tab, tab === 'link' && styles.tabActive]}
              onPress={() => setTab('link')}
            >
              <Text style={[styles.tabText, tab === 'link' && styles.tabTextActive]}>Invite Link</Text>
            </TouchableOpacity>
          </View>

          {tab === 'code' ? (
            <>
              <TextInput
                style={[styles.input, styles.codeInput]}
                placeholder="XXXXXX"
                placeholderTextColor="#4b5563"
                value={code}
                onChangeText={handleCodeChange}
                autoCapitalize="characters"
                autoCorrect={false}
                maxLength={6}
                autoFocus
              />
              <TouchableOpacity
                style={[styles.confirmBtn, (loading || code.length !== 6) && styles.buttonDisabled]}
                onPress={handleJoinByCode}
                disabled={loading || code.length !== 6}
              >
                {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.confirmBtnText}>Join</Text>}
              </TouchableOpacity>
            </>
          ) : (
            <>
              <TextInput
                style={styles.input}
                placeholder="Paste invite link here"
                placeholderTextColor="#4b5563"
                value={inviteLink}
                onChangeText={setInviteLink}
                autoCapitalize="none"
                autoCorrect={false}
                autoFocus
              />
              <TouchableOpacity
                style={[styles.confirmBtn, (loading || !inviteLink.trim()) && styles.buttonDisabled]}
                onPress={handleJoinByLink}
                disabled={loading || !inviteLink.trim()}
              >
                {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.confirmBtnText}>Join via Link</Text>}
              </TouchableOpacity>
            </>
          )}

          <TouchableOpacity style={styles.cancelBtn} onPress={onClose}>
            <Text style={styles.cancelBtnText}>Cancel</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  )
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function parseInviteToken(url: string): string | null {
  const joinIdx = url.lastIndexOf('/join/')
  if (joinIdx !== -1) return url.slice(joinIdx + 6)
  const parts = url.split('/')
  const last = parts[parts.length - 1]
  return last && last.includes('.') ? last : null
}

function parseRoomCodeFromToken(token: string): string | null {
  try {
    const segment = token.split('.')[1]
    if (!segment) return null
    const padded = segment
      .replace(/-/g, '+')
      .replace(/_/g, '/')
      .padEnd(segment.length + ((4 - (segment.length % 4)) % 4), '=')
    const payload = JSON.parse(atob(padded)) as Record<string, unknown>
    return (payload['roomCode'] as string) ?? null
  } catch {
    return null
  }
}

// Suppress unused import warning
const _FlatList = FlatList

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#030712' },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 56,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#1f2937',
    gap: 10,
  },
  avatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#2563eb',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: { color: '#fff', fontWeight: '700', fontSize: 16 },
  username: { flex: 1, color: '#e5e7eb', fontSize: 15, fontWeight: '600' },
  logoutBtn: { paddingHorizontal: 12, paddingVertical: 6, backgroundColor: '#1f2937', borderRadius: 6 },
  logoutText: { color: '#9ca3af', fontSize: 13 },
  body: { flex: 1, justifyContent: 'center', paddingHorizontal: 32, gap: 16 },
  title: { fontSize: 40, fontWeight: 'bold', color: '#f9fafb', textAlign: 'center' },
  tagline: { fontSize: 14, color: '#6b7280', textAlign: 'center', marginBottom: 16 },
  primaryButton: {
    backgroundColor: '#2563eb',
    borderRadius: 12,
    paddingVertical: 18,
    alignItems: 'center',
  },
  primaryButtonText: { color: '#fff', fontSize: 18, fontWeight: '700' },
  secondaryButton: {
    backgroundColor: '#1f2937',
    borderRadius: 12,
    paddingVertical: 18,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#374151',
  },
  secondaryButtonText: { color: '#e5e7eb', fontSize: 18, fontWeight: '600' },
  // Modal/sheet
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'flex-end' },
  sheet: {
    backgroundColor: '#111827',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 20,
    paddingBottom: 40,
    gap: 14,
  },
  sheetHandle: { width: 40, height: 4, backgroundColor: '#374151', borderRadius: 2, alignSelf: 'center' },
  sheetTitle: { fontSize: 20, fontWeight: '700', color: '#f9fafb', textAlign: 'center' },
  templateRow: { gap: 12, paddingVertical: 4 },
  templateCard: {
    width: 160,
    backgroundColor: '#1f2937',
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: '#374151',
    gap: 6,
  },
  templateCardSelected: { borderColor: '#3b82f6', backgroundColor: '#1e3a5f' },
  templateName: { fontSize: 15, fontWeight: '700', color: '#e5e7eb' },
  templateNameSelected: { color: '#93c5fd' },
  templateDesc: { fontSize: 12, color: '#6b7280', lineHeight: 16 },
  roleRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 4 },
  roleBadge: { fontSize: 10, color: '#9ca3af', backgroundColor: '#374151', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4 },
  templatePlayers: { fontSize: 11, color: '#4b5563', marginTop: 2 },
  toggleRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  toggleBox: {
    width: 44,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#374151',
    justifyContent: 'center',
    paddingHorizontal: 2,
  },
  toggleBoxOn: { backgroundColor: '#2563eb', alignItems: 'flex-end' },
  toggleDot: { width: 20, height: 20, borderRadius: 10, backgroundColor: '#fff' },
  toggleLabel: { color: '#e5e7eb', fontSize: 14, fontWeight: '600' },
  toggleHint: { color: '#6b7280', fontSize: 12 },
  sheetButtons: { flexDirection: 'row', gap: 12 },
  cancelBtn: {
    flex: 1,
    backgroundColor: '#1f2937',
    borderRadius: 8,
    paddingVertical: 14,
    alignItems: 'center',
  },
  cancelBtnText: { color: '#9ca3af', fontSize: 15, fontWeight: '600' },
  confirmBtn: {
    flex: 1,
    backgroundColor: '#2563eb',
    borderRadius: 8,
    paddingVertical: 14,
    alignItems: 'center',
  },
  confirmBtnText: { color: '#fff', fontSize: 15, fontWeight: '700' },
  buttonDisabled: { opacity: 0.5 },
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
  codeInput: { fontSize: 28, letterSpacing: 8, textAlign: 'center', fontWeight: '700' },
  tabRow: { flexDirection: 'row', backgroundColor: '#1f2937', borderRadius: 8, padding: 2 },
  tab: { flex: 1, paddingVertical: 8, alignItems: 'center', borderRadius: 6 },
  tabActive: { backgroundColor: '#2563eb' },
  tabText: { color: '#6b7280', fontSize: 14, fontWeight: '600' },
  tabTextActive: { color: '#fff' },
})
