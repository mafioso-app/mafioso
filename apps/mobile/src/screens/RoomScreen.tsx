import React, { useEffect, useState } from 'react'
import {
  View,
  Text,
  ScrollView,
  FlatList,
  TouchableOpacity,
  TextInput,
  Modal,
  StyleSheet,
  ActivityIndicator,
} from 'react-native'
import type { NativeStackScreenProps } from '@react-navigation/native-stack'
import { GamePhase } from '@mafioso/types'
import type { ClientPlayerState, VotePayload, ChatMessagePayload } from '@mafioso/types'
import { SocketProvider } from '../components/providers/SocketProvider'
import { useGameStore } from '../stores/gameStore'
import { useUiStore } from '../stores/uiStore'
import type { RootStackParamList } from '../navigation/types'

type Props = NativeStackScreenProps<RootStackParamList, 'Room'>

// ---------------------------------------------------------------------------
// Root screen — wraps in SocketProvider
// ---------------------------------------------------------------------------

export default function RoomScreen({ route }: Props) {
  const { code } = route.params
  return (
    <SocketProvider roomCode={code}>
      <RoomContent code={code} />
    </SocketProvider>
  )
}

// ---------------------------------------------------------------------------
// Inner content — reads from gameStore
// ---------------------------------------------------------------------------

function RoomContent({ code: _code }: { code: string }) {
  const phase = useGameStore((s) => s.phase)
  const players = useGameStore((s) => s.players)
  const myRole = useGameStore((s) => s.myRole)
  const myId = useGameStore((s) => s.myId)
  const timer = useGameStore((s) => s.timer)
  const votes = useGameStore((s) => s.votes)
  const detectiveResults = useGameStore((s) => s.detectiveResults)
  const winner = useGameStore((s) => s.winner)
  const isSpectator = useGameStore((s) => s.isSpectator)
  const lastWords = useGameStore((s) => s.lastWords)
  const messages = useGameStore((s) => s.messages)
  const submitNightAction = useGameStore((s) => s.submitNightAction)
  const submitVote = useGameStore((s) => s.submitVote)
  const sendChatMessage = useGameStore((s) => s.sendChatMessage)

  const isReconnecting = useUiStore((s) => s.isReconnecting)
  const announcement = useUiStore((s) => s.announcement)

  const [roleModalVisible, setRoleModalVisible] = useState(false)
  const [chatOpen, setChatOpen] = useState(false)
  const [chatInput, setChatInput] = useState('')
  const [actionSubmitted, setActionSubmitted] = useState(false)
  const [voteSubmitted, setVoteSubmitted] = useState(false)

  const currentPhase = phase ?? GamePhase.LOBBY
  const isNight = currentPhase === GamePhase.NIGHT
  const isVoting = currentPhase === GamePhase.DAY_VOTING
  const me = players.find((p) => p.id === myId)
  const showNightPanel = isNight && !!myRole && !!me?.isAlive && !isSpectator
  const showVotePanel = isVoting && !!me?.isAlive && !isSpectator

  // Reset action state on phase change
  useEffect(() => {
    setActionSubmitted(false)
    setVoteSubmitted(false)
  }, [phase])

  // Show role modal when role assigned
  useEffect(() => {
    if (myRole) setRoleModalVisible(true)
  }, [myRole])

  function handleSendChat() {
    const trimmed = chatInput.trim()
    if (!trimmed) return
    sendChatMessage(trimmed)
    setChatInput('')
  }

  return (
    <View style={styles.container}>
      {/* Phase banner */}
      <PhaseBanner phase={currentPhase} timer={timer} winner={winner} />

      {/* Announcement */}
      {announcement !== null && (
        <View style={styles.announcementBar}>
          <Text style={styles.announcementText}>{announcement}</Text>
        </View>
      )}

      {/* Spectator banner */}
      {isSpectator && (
        <View style={styles.spectatorBanner}>
          <Text style={styles.spectatorText}>You are spectating</Text>
        </View>
      )}

      {/* Player list — horizontal scroll */}
      <View style={styles.playerListContainer}>
        <FlatList
          data={players}
          horizontal
          showsHorizontalScrollIndicator={false}
          keyExtractor={(p) => p.id}
          contentContainerStyle={styles.playerList}
          renderItem={({ item: p }) => <PlayerAvatar player={p} isMe={p.id === myId} />}
        />
      </View>

      {/* Main content area */}
      <ScrollView style={styles.mainScroll} contentContainerStyle={styles.mainContent}>
        {currentPhase === GamePhase.GAME_OVER && winner !== null && (
          <View style={styles.gameOverCard}>
            <Text style={styles.gameOverText}>
              {winner === 'MAFIA' ? '🔴 Mafia Wins!' : '🟢 Village Wins!'}
            </Text>
          </View>
        )}

        {currentPhase === GamePhase.LOBBY && (
          <View style={styles.waitingCard}>
            <Text style={styles.waitingText}>Waiting for the moderator to start…</Text>
          </View>
        )}

        {currentPhase === GamePhase.DAY_DISCUSSION && (
          <View style={styles.waitingCard}>
            <Text style={styles.waitingText}>Discuss with other players…</Text>
          </View>
        )}

        {showNightPanel && myId && !actionSubmitted && (
          <NightActionPanel
            role={myRole!}
            myId={myId}
            players={players}
            detectiveResults={detectiveResults.map((r, i) => ({
              targetId: r.targetId,
              targetName: players.find((p) => p.id === r.targetId)?.username ?? r.targetId,
              result: r.result,
              night: i + 1,
            }))}
            onAction={(targetId) => {
              submitNightAction(targetId, myRole ?? '')
              setActionSubmitted(true)
            }}
          />
        )}

        {showNightPanel && actionSubmitted && (
          <View style={styles.waitingCard}>
            <Text style={styles.waitingText}>Action submitted — waiting for night to end…</Text>
          </View>
        )}

        {showVotePanel && myId && !voteSubmitted && (
          <VotingPanel
            players={players}
            myId={myId}
            votes={votes}
            onVote={(targetId) => {
              submitVote(targetId)
              setVoteSubmitted(true)
            }}
          />
        )}

        {showVotePanel && voteSubmitted && (
          <View style={styles.waitingCard}>
            <Text style={styles.waitingText}>Vote submitted — waiting for others…</Text>
          </View>
        )}
      </ScrollView>

      {/* Chat toggle */}
      <TouchableOpacity
        style={styles.chatToggle}
        onPress={() => setChatOpen((v) => !v)}
      >
        <Text style={styles.chatToggleText}>
          {chatOpen ? 'Hide Chat' : `Chat (${messages.length})`}
        </Text>
      </TouchableOpacity>

      {chatOpen && (
        <View style={styles.chatPanel}>
          <FlatList
            data={messages}
            keyExtractor={(m) => m.id}
            style={styles.chatList}
            renderItem={({ item }) => <ChatBubble message={item} />}
          />
          <View style={styles.chatInputRow}>
            <TextInput
              style={styles.chatInput}
              value={chatInput}
              onChangeText={setChatInput}
              placeholder={isNight && !isSpectator ? 'Silent during night…' : 'Say something…'}
              placeholderTextColor="#4b5563"
              editable={isSpectator || !isNight}
              returnKeyType="send"
              onSubmitEditing={handleSendChat}
            />
            <TouchableOpacity
              style={[styles.chatSendBtn, (!chatInput.trim() || (isNight && !isSpectator)) && styles.buttonDisabled]}
              onPress={handleSendChat}
              disabled={!chatInput.trim() || (isNight && !isSpectator)}
            >
              <Text style={styles.chatSendText}>Send</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}

      {/* Role modal */}
      {myRole !== null && (
        <Modal visible={roleModalVisible} transparent animationType="fade">
          <TouchableOpacity
            style={styles.modalOverlay}
            activeOpacity={1}
            onPress={() => setRoleModalVisible(false)}
          >
            <View style={styles.roleCard}>
              <Text style={styles.roleCardTitle}>Your Role</Text>
              <Text style={styles.roleCardRole}>{myRole.toUpperCase()}</Text>
              <Text style={styles.roleCardHint}>Tap anywhere to dismiss</Text>
            </View>
          </TouchableOpacity>
        </Modal>
      )}

      {/* Last words overlay */}
      {lastWords !== null && (
        <Modal visible transparent animationType="fade">
          <View style={styles.lastWordsOverlay}>
            <View style={styles.lastWordsCard}>
              <Text style={styles.lastWordsTitle}>Last Words</Text>
              <Text style={styles.lastWordsName}>{lastWords.playerName}</Text>
              <Text style={styles.lastWordsBody}>
                {myId === lastWords.playerId
                  ? 'You have been eliminated. Speak your last words.'
                  : `${lastWords.playerName} has been eliminated.`}
              </Text>
              <CountdownRing seconds={lastWords.seconds} />
            </View>
          </View>
        </Modal>
      )}

      {/* Reconnecting overlay */}
      {isReconnecting && (
        <Modal visible transparent animationType="fade">
          <View style={styles.reconnectingOverlay}>
            <ActivityIndicator size="large" color="#60a5fa" />
            <Text style={styles.reconnectingText}>Reconnecting…</Text>
          </View>
        </Modal>
      )}
    </View>
  )
}

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

function PhaseBanner({ phase, timer, winner }: { phase: GamePhase; timer: number; winner: string | null }) {
  const PHASE_LABELS: Record<GamePhase, string> = {
    [GamePhase.LOBBY]: 'Lobby',
    [GamePhase.NIGHT]: 'Night',
    [GamePhase.DAY_DISCUSSION]: 'Discussion',
    [GamePhase.DAY_VOTING]: 'Voting',
    [GamePhase.GAME_OVER]: 'Game Over',
  }

  const PHASE_COLORS: Record<GamePhase, string> = {
    [GamePhase.LOBBY]: '#1f2937',
    [GamePhase.NIGHT]: '#1e1b4b',
    [GamePhase.DAY_DISCUSSION]: '#78350f',
    [GamePhase.DAY_VOTING]: '#450a0a',
    [GamePhase.GAME_OVER]: '#111827',
  }

  const showTimer = timer > 0 && phase !== GamePhase.LOBBY && phase !== GamePhase.GAME_OVER
  const m = Math.floor(timer / 60)
  const s = timer % 60
  const timeStr = `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
  const isUrgent = showTimer && timer <= 10

  const winnerLabel =
    phase === GamePhase.GAME_OVER && winner
      ? winner === 'MAFIA' ? 'Mafia wins!' : 'Village wins!'
      : null

  return (
    <View style={[styles.phaseBanner, { backgroundColor: PHASE_COLORS[phase] }]}>
      <Text style={styles.phaseLabel}>{PHASE_LABELS[phase]}</Text>
      <View style={styles.phaseRight}>
        {winnerLabel !== null && <Text style={styles.winnerLabel}>{winnerLabel}</Text>}
        {showTimer && (
          <Text style={[styles.timerText, isUrgent && styles.timerUrgent]}>{timeStr}</Text>
        )}
      </View>
    </View>
  )
}

function PlayerAvatar({ player, isMe }: { player: ClientPlayerState; isMe: boolean }) {
  return (
    <View style={styles.playerAvatarWrapper}>
      <View
        style={[
          styles.playerAvatar,
          player.isAlive ? styles.playerAvatarAlive : styles.playerAvatarDead,
          isMe && styles.playerAvatarMe,
        ]}
      >
        <Text style={[styles.playerAvatarLetter, !player.isAlive && styles.playerAvatarLetterDead]}>
          {player.username.charAt(0).toUpperCase()}
        </Text>
        {!player.isAlive && <Text style={styles.playerAvatarX}>✕</Text>}
      </View>
      <Text style={[styles.playerAvatarName, !player.isAlive && styles.playerAvatarNameDead]} numberOfLines={1}>
        {player.username}
      </Text>
    </View>
  )
}

const NIGHT_ACTION_ROLES = new Set(['mafia', 'detective', 'doctor', 'sheriff'])
const ROLE_LABELS: Record<string, string> = {
  mafia: 'Choose who to eliminate',
  detective: 'Choose who to investigate',
  doctor: 'Choose who to save',
  sheriff: 'Choose who to investigate',
}

interface NightActionPanelProps {
  role: string
  myId: string
  players: ClientPlayerState[]
  detectiveResults: { targetId: string; targetName: string; result: string; night: number }[]
  onAction: (targetId: string) => void
}

function NightActionPanel({ role, myId, players, onAction, detectiveResults }: NightActionPanelProps) {
  const [selected, setSelected] = useState<string | null>(null)

  if (!NIGHT_ACTION_ROLES.has(role)) return null

  const includeSelf = role === 'doctor'
  const candidates = players.filter((p) => p.isAlive && (includeSelf || p.id !== myId))

  return (
    <View style={styles.actionPanel}>
      <Text style={styles.actionPanelTitle}>{ROLE_LABELS[role] ?? 'Choose a target'}</Text>
      {candidates.map((p) => (
        <TouchableOpacity
          key={p.id}
          style={[styles.actionCandidate, selected === p.id && styles.actionCandidateSelected]}
          onPress={() => setSelected(p.id)}
        >
          <Text style={styles.actionCandidateName}>{p.username}</Text>
        </TouchableOpacity>
      ))}
      <TouchableOpacity
        style={[styles.confirmBtn, !selected && styles.buttonDisabled]}
        onPress={() => { if (selected) onAction(selected) }}
        disabled={!selected}
      >
        <Text style={styles.confirmBtnText}>Confirm Action</Text>
      </TouchableOpacity>

      {(role === 'detective' || role === 'sheriff') && detectiveResults.length > 0 && (
        <View style={styles.detectiveResults}>
          <Text style={styles.detectiveResultsTitle}>Past investigations</Text>
          {detectiveResults.map((r, i) => (
            <View key={i} style={styles.detectiveResultRow}>
              <Text style={styles.detectiveResultNight}>N{r.night}: {r.targetName}</Text>
              <Text style={r.result === 'mafia' ? styles.resultMafia : styles.resultClear}>
                {r.result}
              </Text>
            </View>
          ))}
        </View>
      )}
    </View>
  )
}

function aggregateVotes(votes: VotePayload[]): Record<string, number> {
  const counts: Record<string, number> = {}
  for (const payload of votes) {
    for (const targetId of Object.values(payload.votes)) {
      counts[targetId] = (counts[targetId] ?? 0) + 1
    }
  }
  return counts
}

interface VotingPanelProps {
  players: ClientPlayerState[]
  myId: string
  votes: VotePayload[]
  onVote: (targetId: string) => void
}

function VotingPanel({ players, myId, votes, onVote }: VotingPanelProps) {
  const [selected, setSelected] = useState<string | null>(null)
  const voteCounts = aggregateVotes(votes)
  const candidates = players.filter((p) => p.isAlive && p.id !== myId)

  return (
    <View style={styles.actionPanel}>
      <Text style={styles.actionPanelTitle}>Vote to eliminate</Text>
      {candidates.map((p) => (
        <TouchableOpacity
          key={p.id}
          style={[styles.actionCandidate, selected === p.id && styles.actionCandidateVote]}
          onPress={() => setSelected(p.id)}
        >
          <Text style={styles.actionCandidateName}>{p.username}</Text>
          {(voteCounts[p.id] ?? 0) > 0 && (
            <Text style={styles.voteCount}>{voteCounts[p.id]} votes</Text>
          )}
        </TouchableOpacity>
      ))}
      <TouchableOpacity
        style={[styles.voteConfirmBtn, !selected && styles.buttonDisabled]}
        onPress={() => { if (selected) onVote(selected) }}
        disabled={!selected}
      >
        <Text style={styles.confirmBtnText}>Confirm Vote</Text>
      </TouchableOpacity>
    </View>
  )
}

function ChatBubble({ message }: { message: ChatMessagePayload }) {
  const time = new Date(message.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
  return (
    <View style={styles.chatBubble}>
      <Text style={styles.chatTime}>{time}</Text>
      <Text style={styles.chatUsername}>{message.username}: </Text>
      <Text style={styles.chatContent}>{message.content}</Text>
    </View>
  )
}

function CountdownRing({ seconds }: { seconds: number }) {
  const [remaining, setRemaining] = useState(seconds)
  useEffect(() => {
    const interval = setInterval(() => {
      setRemaining((r) => Math.max(0, r - 1))
    }, 1000)
    return () => clearInterval(interval)
  }, [])
  return (
    <View style={styles.countdownRing}>
      <Text style={styles.countdownText}>{remaining}s</Text>
    </View>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#030712' },
  phaseBanner: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    paddingTop: 52,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  phaseLabel: { color: '#e5e7eb', fontSize: 16, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 1 },
  phaseRight: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  winnerLabel: { color: '#fde68a', fontSize: 14, fontWeight: '600' },
  timerText: { color: '#e5e7eb', fontSize: 16, fontWeight: '700', fontVariant: ['tabular-nums'] },
  timerUrgent: { color: '#f87171' },
  announcementBar: { backgroundColor: '#1d4ed8', paddingHorizontal: 16, paddingVertical: 8 },
  announcementText: { color: '#bfdbfe', fontSize: 13, textAlign: 'center' },
  spectatorBanner: { backgroundColor: '#7f1d1d', paddingHorizontal: 16, paddingVertical: 6 },
  spectatorText: { color: '#fca5a5', fontSize: 13, fontWeight: '600', textAlign: 'center' },
  playerListContainer: { borderBottomWidth: 1, borderBottomColor: '#1f2937' },
  playerList: { paddingHorizontal: 12, paddingVertical: 10, gap: 10 },
  playerAvatarWrapper: { alignItems: 'center', gap: 4, width: 52 },
  playerAvatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    position: 'relative',
  },
  playerAvatarAlive: { borderColor: '#22c55e', backgroundColor: '#14532d' },
  playerAvatarDead: { borderColor: '#374151', backgroundColor: '#111827' },
  playerAvatarMe: { borderWidth: 3, borderColor: '#60a5fa' },
  playerAvatarLetter: { color: '#e5e7eb', fontSize: 18, fontWeight: '700' },
  playerAvatarLetterDead: { color: '#4b5563' },
  playerAvatarX: { position: 'absolute', bottom: -2, right: -2, fontSize: 10, color: '#6b7280' },
  playerAvatarName: { color: '#9ca3af', fontSize: 10, textAlign: 'center' },
  playerAvatarNameDead: { color: '#374151' },
  mainScroll: { flex: 1 },
  mainContent: { padding: 16, gap: 12 },
  waitingCard: { backgroundColor: '#111827', borderRadius: 12, padding: 20, alignItems: 'center' },
  waitingText: { color: '#6b7280', fontSize: 14 },
  gameOverCard: { backgroundColor: '#111827', borderRadius: 12, padding: 32, alignItems: 'center' },
  gameOverText: { color: '#fde68a', fontSize: 26, fontWeight: '800' },
  actionPanel: { backgroundColor: '#111827', borderRadius: 12, padding: 16, gap: 10 },
  actionPanelTitle: { color: '#9ca3af', fontSize: 12, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.5 },
  actionCandidate: { backgroundColor: '#1f2937', borderRadius: 8, paddingHorizontal: 16, paddingVertical: 12, borderWidth: 1, borderColor: '#374151', flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  actionCandidateSelected: { borderColor: '#60a5fa', backgroundColor: '#1e3a5f' },
  actionCandidateVote: { borderColor: '#ef4444', backgroundColor: '#450a0a' },
  actionCandidateName: { color: '#e5e7eb', fontSize: 15 },
  voteCount: { color: '#9ca3af', fontSize: 12 },
  confirmBtn: { backgroundColor: '#374151', borderRadius: 8, paddingVertical: 14, alignItems: 'center', marginTop: 4 },
  voteConfirmBtn: { backgroundColor: '#991b1b', borderRadius: 8, paddingVertical: 14, alignItems: 'center', marginTop: 4 },
  confirmBtnText: { color: '#fff', fontSize: 15, fontWeight: '700' },
  buttonDisabled: { opacity: 0.4 },
  detectiveResults: { borderTopWidth: 1, borderTopColor: '#1f2937', paddingTop: 10, gap: 6 },
  detectiveResultsTitle: { color: '#4b5563', fontSize: 11, textTransform: 'uppercase', letterSpacing: 0.5 },
  detectiveResultRow: { flexDirection: 'row', justifyContent: 'space-between' },
  detectiveResultNight: { color: '#9ca3af', fontSize: 13 },
  resultMafia: { color: '#f87171', fontWeight: '700', fontSize: 13 },
  resultClear: { color: '#4ade80', fontWeight: '700', fontSize: 13 },
  chatToggle: { backgroundColor: '#111827', borderTopWidth: 1, borderTopColor: '#1f2937', paddingVertical: 10, alignItems: 'center' },
  chatToggleText: { color: '#60a5fa', fontSize: 14, fontWeight: '600' },
  chatPanel: { height: 200, backgroundColor: '#0f172a', borderTopWidth: 1, borderTopColor: '#1f2937' },
  chatList: { flex: 1, paddingHorizontal: 12, paddingVertical: 6 },
  chatBubble: { flexDirection: 'row', flexWrap: 'wrap', marginVertical: 2 },
  chatTime: { color: '#374151', fontSize: 11, marginRight: 4 },
  chatUsername: { color: '#60a5fa', fontSize: 12, fontWeight: '600' },
  chatContent: { color: '#d1d5db', fontSize: 12, flex: 1 },
  chatInputRow: { flexDirection: 'row', padding: 8, gap: 8, borderTopWidth: 1, borderTopColor: '#1f2937' },
  chatInput: { flex: 1, backgroundColor: '#1f2937', color: '#f9fafb', borderRadius: 8, paddingHorizontal: 12, paddingVertical: 8, fontSize: 14 },
  chatSendBtn: { backgroundColor: '#2563eb', borderRadius: 8, paddingHorizontal: 16, justifyContent: 'center' },
  chatSendText: { color: '#fff', fontSize: 14, fontWeight: '600' },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.75)', alignItems: 'center', justifyContent: 'center' },
  roleCard: { backgroundColor: '#111827', borderRadius: 20, padding: 32, alignItems: 'center', width: 260, gap: 12, borderWidth: 1, borderColor: '#374151' },
  roleCardTitle: { color: '#6b7280', fontSize: 14, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 1 },
  roleCardRole: { color: '#f9fafb', fontSize: 32, fontWeight: '800', letterSpacing: 2 },
  roleCardHint: { color: '#4b5563', fontSize: 12, marginTop: 8 },
  lastWordsOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.85)', alignItems: 'center', justifyContent: 'center' },
  lastWordsCard: { backgroundColor: '#1c1917', borderRadius: 20, padding: 32, alignItems: 'center', width: 300, gap: 12, borderWidth: 1, borderColor: '#57534e' },
  lastWordsTitle: { color: '#d6d3d1', fontSize: 13, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 1 },
  lastWordsName: { color: '#f5f5f4', fontSize: 22, fontWeight: '800' },
  lastWordsBody: { color: '#a8a29e', fontSize: 14, textAlign: 'center', lineHeight: 20 },
  countdownRing: { width: 72, height: 72, borderRadius: 36, borderWidth: 4, borderColor: '#f59e0b', alignItems: 'center', justifyContent: 'center', marginTop: 8 },
  countdownText: { color: '#fcd34d', fontSize: 24, fontWeight: '700' },
  reconnectingOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.85)', alignItems: 'center', justifyContent: 'center', gap: 16 },
  reconnectingText: { color: '#9ca3af', fontSize: 16 },
})
