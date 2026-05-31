import React, { useCallback, useEffect, useRef, useState } from 'react'
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  TextInput,
  StyleSheet,
  ActivityIndicator,
  Alert,
  ScrollView,
} from 'react-native'
import type { NativeStackScreenProps } from '@react-navigation/native-stack'
import { SocketProvider } from '../components/providers/SocketProvider'
import { useGameStore } from '../stores/gameStore'
import { useUiStore } from '../stores/uiStore'
import { api } from '../lib/api'
import { getSocket } from '../lib/socket'
import type { RootStackParamList } from '../navigation/types'
import type { ClientPlayerState } from '@mafioso/types'

type Props = NativeStackScreenProps<RootStackParamList, 'Moderator'>

export default function ModeratorScreen({ route }: Props) {
  const { code } = route.params
  return (
    <SocketProvider roomCode={code}>
      <ModeratorContent code={code} />
    </SocketProvider>
  )
}

// ---------------------------------------------------------------------------
// Inner content
// ---------------------------------------------------------------------------

type TabId = 'players' | 'controls' | 'log'

interface GameEvent {
  id: string
  type: string
  actorId: string | null
  targetId: string | null
  createdAt: string
  sequence: number
}

function ModeratorContent({ code }: { code: string }) {
  const [tab, setTab] = useState<TabId>('players')
  const [announcement, setAnnouncement] = useState('')
  const [events, setEvents] = useState<GameEvent[]>([])
  const [eventsLoading, setEventsLoading] = useState(false)
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null)

  const players = useGameStore((s) => s.players)
  const phase = useGameStore((s) => s.phase)
  const timer = useGameStore((s) => s.timer)
  const uiAnnouncement = useUiStore((s) => s.announcement)

  const fetchEvents = useCallback(async () => {
    setEventsLoading(true)
    try {
      const res = await api.get<GameEvent[]>(`/rooms/${code}/events`)
      setEvents(res.data)
    } catch {
      // ignore
    } finally {
      setEventsLoading(false)
    }
  }, [code])

  // Poll events every 5s when on Log tab
  useEffect(() => {
    if (tab === 'log') {
      void fetchEvents()
      pollRef.current = setInterval(() => void fetchEvents(), 5000)
    } else {
      if (pollRef.current) {
        clearInterval(pollRef.current)
        pollRef.current = null
      }
    }
    return () => {
      if (pollRef.current) {
        clearInterval(pollRef.current)
        pollRef.current = null
      }
    }
  }, [tab, fetchEvents])

  function sendAnnouncement() {
    const msg = announcement.trim()
    if (!msg) return
    getSocket().emit('moderator_announce', { message: msg })
    setAnnouncement('')
  }

  async function handleStart() {
    try {
      await api.post(`/rooms/${code}/start`)
    } catch {
      Alert.alert('Error', 'Failed to start the game.')
    }
  }

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Moderator</Text>
        <Text style={styles.headerCode}>{code}</Text>
        {phase !== null && (
          <View style={styles.headerPhase}>
            <Text style={styles.headerPhaseText}>{phase}</Text>
            {timer > 0 && <Text style={styles.headerTimer}>{timer}s</Text>}
          </View>
        )}
      </View>

      {/* Announcement banner */}
      {uiAnnouncement !== null && (
        <View style={styles.announcementBanner}>
          <Text style={styles.announcementBannerText}>{uiAnnouncement}</Text>
        </View>
      )}

      {/* Tab bar */}
      <View style={styles.tabBar}>
        {(['players', 'controls', 'log'] as TabId[]).map((t) => (
          <TouchableOpacity
            key={t}
            style={[styles.tabItem, tab === t && styles.tabItemActive]}
            onPress={() => setTab(t)}
          >
            <Text style={[styles.tabItemText, tab === t && styles.tabItemTextActive]}>
              {t.charAt(0).toUpperCase() + t.slice(1)}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Tab content */}
      <View style={styles.tabContent}>
        {tab === 'players' && <PlayersTab players={players} />}
        {tab === 'controls' && (
          <ControlsTab
            phase={phase}
            timer={timer}
            onStart={() => {
              Alert.alert('Start Game?', 'This will assign roles and begin Night 1.', [
                { text: 'Cancel', style: 'cancel' },
                { text: 'Start', style: 'destructive', onPress: () => void handleStart() },
              ])
            }}
            onAdvance={() => {
              Alert.alert('Advance Phase?', 'Skip to the next phase immediately.', [
                { text: 'Cancel', style: 'cancel' },
                { text: 'Advance', onPress: () => {} },
              ])
            }}
            onForceEnd={() => {
              Alert.alert('Force End?', 'This will immediately end the game.', [
                { text: 'Cancel', style: 'cancel' },
                { text: 'End', style: 'destructive', onPress: () => {} },
              ])
            }}
          />
        )}
        {tab === 'log' && <LogTab events={events} loading={eventsLoading} onRefresh={() => void fetchEvents()} />}
      </View>

      {/* Announcement input — always visible */}
      <View style={styles.announcementBar}>
        <TextInput
          style={styles.announcementInput}
          value={announcement}
          onChangeText={setAnnouncement}
          placeholder="Announce to all players…"
          placeholderTextColor="#4b5563"
          returnKeyType="send"
          onSubmitEditing={sendAnnouncement}
        />
        <TouchableOpacity
          style={[styles.announcementSendBtn, !announcement.trim() && styles.buttonDisabled]}
          onPress={sendAnnouncement}
          disabled={!announcement.trim()}
        >
          <Text style={styles.announcementSendText}>Send</Text>
        </TouchableOpacity>
      </View>
    </View>
  )
}

// ---------------------------------------------------------------------------
// Tab: Players
// ---------------------------------------------------------------------------

function PlayersTab({ players }: { players: ClientPlayerState[] }) {
  return (
    <FlatList
      data={players}
      keyExtractor={(p) => p.id}
      contentContainerStyle={styles.playerList}
      renderItem={({ item: p }) => (
        <View style={[styles.playerRow, !p.isAlive && styles.playerRowDead]}>
          <View style={[styles.connectionDot, p.isAlive ? styles.dotAlive : styles.dotDead]} />
          <View style={styles.playerRowInfo}>
            <Text style={[styles.playerRowName, !p.isAlive && styles.playerRowNameDead]}>
              {p.username}
            </Text>
            {p.role !== null && (
              <Text style={styles.playerRowRole}>{p.role}</Text>
            )}
          </View>
          <Text style={[styles.playerRowStatus, !p.isAlive && styles.statusDead]}>
            {p.isAlive ? 'Alive' : 'Eliminated'}
          </Text>
        </View>
      )}
      ListEmptyComponent={
        <View style={styles.emptyState}>
          <Text style={styles.emptyStateText}>No players yet</Text>
        </View>
      }
    />
  )
}

// ---------------------------------------------------------------------------
// Tab: Controls
// ---------------------------------------------------------------------------

interface ControlsTabProps {
  phase: string | null
  timer: number
  onStart: () => void
  onAdvance: () => void
  onForceEnd: () => void
}

function ControlsTab({ phase, timer, onStart, onAdvance, onForceEnd }: ControlsTabProps) {
  return (
    <ScrollView contentContainerStyle={styles.controlsContent}>
      <View style={styles.controlsPhaseInfo}>
        <Text style={styles.controlsPhaseLabel}>Current phase</Text>
        <Text style={styles.controlsPhaseValue}>{phase ?? 'LOBBY'}</Text>
        {timer > 0 && (
          <Text style={styles.controlsTimer}>{timer}s remaining</Text>
        )}
      </View>

      <ControlButton label="Start Game" color="#15803d" onPress={onStart} />
      <ControlButton label="Advance Phase" color="#1d4ed8" onPress={onAdvance} />
      <ControlButton label="Force End Game" color="#b91c1c" onPress={onForceEnd} />
    </ScrollView>
  )
}

function ControlButton({ label, color, onPress }: { label: string; color: string; onPress: () => void }) {
  return (
    <TouchableOpacity
      style={[styles.controlBtn, { backgroundColor: color }]}
      onPress={onPress}
      activeOpacity={0.8}
    >
      <Text style={styles.controlBtnText}>{label}</Text>
    </TouchableOpacity>
  )
}

// ---------------------------------------------------------------------------
// Tab: Log
// ---------------------------------------------------------------------------

interface LogTabProps {
  events: GameEvent[]
  loading: boolean
  onRefresh: () => void
}

function LogTab({ events, loading, onRefresh }: LogTabProps) {
  if (loading && events.length === 0) {
    return (
      <View style={styles.logLoading}>
        <ActivityIndicator color="#60a5fa" />
      </View>
    )
  }

  return (
    <FlatList
      data={[...events].reverse()}
      keyExtractor={(e) => e.id}
      contentContainerStyle={styles.logList}
      onRefresh={onRefresh}
      refreshing={loading}
      renderItem={({ item: e }) => (
        <View style={styles.logRow}>
          <Text style={styles.logTime}>
            {new Date(e.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
          </Text>
          <Text style={styles.logType}>{e.type}</Text>
          {(e.actorId ?? e.targetId) && (
            <Text style={styles.logPlayers}>
              {e.actorId ? `actor: ${e.actorId.slice(0, 6)}` : ''}
              {e.targetId ? ` → ${e.targetId.slice(0, 6)}` : ''}
            </Text>
          )}
        </View>
      )}
      ListEmptyComponent={
        <View style={styles.emptyState}>
          <Text style={styles.emptyStateText}>No events yet</Text>
        </View>
      }
    />
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#030712' },
  header: {
    paddingTop: 52,
    paddingHorizontal: 16,
    paddingBottom: 12,
    backgroundColor: '#111827',
    borderBottomWidth: 1,
    borderBottomColor: '#1f2937',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  headerTitle: { color: '#f9fafb', fontSize: 18, fontWeight: '700' },
  headerCode: { color: '#9ca3af', fontSize: 16, fontFamily: 'monospace', fontWeight: '700', letterSpacing: 2 },
  headerPhase: { marginLeft: 'auto', flexDirection: 'row', alignItems: 'center', gap: 6 },
  headerPhaseText: { color: '#60a5fa', fontSize: 13, fontWeight: '600', textTransform: 'uppercase' },
  headerTimer: { color: '#fbbf24', fontSize: 13, fontWeight: '700' },
  announcementBanner: { backgroundColor: '#1d4ed8', paddingHorizontal: 16, paddingVertical: 8 },
  announcementBannerText: { color: '#bfdbfe', fontSize: 13, textAlign: 'center' },
  tabBar: { flexDirection: 'row', backgroundColor: '#111827', borderBottomWidth: 1, borderBottomColor: '#1f2937' },
  tabItem: { flex: 1, paddingVertical: 12, alignItems: 'center' },
  tabItemActive: { borderBottomWidth: 2, borderBottomColor: '#3b82f6' },
  tabItemText: { color: '#6b7280', fontSize: 14, fontWeight: '600' },
  tabItemTextActive: { color: '#60a5fa' },
  tabContent: { flex: 1 },
  // Players tab
  playerList: { padding: 12, gap: 8 },
  playerRow: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#111827', borderRadius: 10, padding: 14, gap: 10 },
  playerRowDead: { opacity: 0.5 },
  connectionDot: { width: 10, height: 10, borderRadius: 5 },
  dotAlive: { backgroundColor: '#22c55e' },
  dotDead: { backgroundColor: '#374151' },
  playerRowInfo: { flex: 1 },
  playerRowName: { color: '#e5e7eb', fontSize: 15, fontWeight: '600' },
  playerRowNameDead: { textDecorationLine: 'line-through', color: '#6b7280' },
  playerRowRole: { color: '#9ca3af', fontSize: 12, marginTop: 2 },
  playerRowStatus: { color: '#4ade80', fontSize: 12, fontWeight: '600' },
  statusDead: { color: '#6b7280' },
  // Controls tab
  controlsContent: { padding: 16, gap: 12 },
  controlsPhaseInfo: { backgroundColor: '#111827', borderRadius: 12, padding: 16, gap: 4, marginBottom: 4 },
  controlsPhaseLabel: { color: '#6b7280', fontSize: 12, fontWeight: '600', textTransform: 'uppercase' },
  controlsPhaseValue: { color: '#f9fafb', fontSize: 20, fontWeight: '700' },
  controlsTimer: { color: '#fbbf24', fontSize: 14 },
  controlBtn: { borderRadius: 12, paddingVertical: 16, alignItems: 'center' },
  controlBtnText: { color: '#fff', fontSize: 16, fontWeight: '700' },
  // Log tab
  logLoading: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  logList: { padding: 12, gap: 4 },
  logRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, padding: 10, backgroundColor: '#111827', borderRadius: 8 },
  logTime: { color: '#4b5563', fontSize: 12 },
  logType: { color: '#60a5fa', fontSize: 12, fontWeight: '600' },
  logPlayers: { color: '#9ca3af', fontSize: 11 },
  // Shared
  emptyState: { padding: 40, alignItems: 'center' },
  emptyStateText: { color: '#374151', fontSize: 14 },
  buttonDisabled: { opacity: 0.4 },
  // Announcement bar
  announcementBar: {
    flexDirection: 'row',
    padding: 12,
    gap: 8,
    backgroundColor: '#111827',
    borderTopWidth: 1,
    borderTopColor: '#1f2937',
  },
  announcementInput: {
    flex: 1,
    backgroundColor: '#1f2937',
    color: '#f9fafb',
    borderRadius: 8,
    paddingHorizontal: 14,
    paddingVertical: 10,
    fontSize: 14,
  },
  announcementSendBtn: {
    backgroundColor: '#2563eb',
    borderRadius: 8,
    paddingHorizontal: 16,
    justifyContent: 'center',
  },
  announcementSendText: { color: '#fff', fontSize: 14, fontWeight: '700' },
})
