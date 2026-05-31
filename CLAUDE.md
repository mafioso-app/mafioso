# Mafia Game — Project Bible for Claude Code

## Project Overview
Real-time multiplayer Mafia game. Playable online and on-site.
Moderator controls game flow. Supports multiple rooms, private roles,
chat, voting, and game stats.

---

## Tech Stack (strict — do not suggest alternatives)

### Backend
- Runtime: Node.js 20+
- Framework: NestJS (modules, guards, gateways, pipes)
- ORM: Prisma
- Database: PostgreSQL
- Cache / Pub-Sub: Redis
- Real-time: Socket.IO with @socket.io/redis-adapter
- Auth: JWT (access token 15min, refresh token 7d)
- State machine: XState v5
- Validation: class-validator + class-transformer

### Frontend
- Framework: Next.js 14 (App Router)
- State: Zustand with immer middleware
- Styling: TailwindCSS
- Real-time: Socket.IO client
- Forms: React Hook Form + zod
- HTTP: axios with interceptors

### Mobile
- React Native (Expo)
- Shared types from a /packages/types workspace

### Monorepo
- Structure: pnpm workspaces
- packages/types   — shared TS interfaces
- packages/engine  — pure game engine (no I/O)
- apps/backend     — NestJS
- apps/web         — Next.js
- apps/mobile      — Expo React Native

---

## Architecture Rules (enforce these in every file)

### Game Engine (packages/engine)
- PURE functions only — zero I/O, zero socket calls, zero DB calls
- Input: GameState + Action → Output: GameStateTransition + SideEffects[]
- Every role is a RoleDefinition in ROLE_REGISTRY — no hardcoded conditionals
- Phase transitions ONLY through XState machine — no manual phase.set()
- All night actions validated before processing (actor alive, target alive,
  correct role, correct phase, not already acted this phase)

### Backend
- Never send raw GameState to any client
- Always use filterStateForPlayer(state, playerId) before emitting
- All socket events validated with class-validator DTOs
- Rate limit: 1 vote per player per phase, enforced server-side
- One session per user per room — enforced in join guard
- GameEvent table is append-only — never delete or update rows

### Socket.IO
- Namespace: /game
- Moderator joins room: `mod:{roomId}` — separate from player room
- All events typed in packages/types/socket-events.ts
- Client never trusts its own timer — always sync from server timer_tick

### Frontend
- socket.on() ONLY in one top-level provider (SocketProvider)
- All socket events funnel through useGameStore.getState().handleSocketEvent()
- Never fetch GameState via REST during an active game — use socket state_sync
- Zustand store uses immer — mutate draft directly in set()

---

## Folder Structure

### apps/backend/src/
```
modules/
  auth/          — JWT strategy, guards, refresh
  rooms/         — REST: create, join, status, invite
  game/          — Socket.IO gateway + game orchestrator
  moderator/     — Moderator-only events and dashboard data
  leaderboard/   — Stats queries
  health/        — GET /health for load balancer
common/
  filters/       — Global exception filter
  interceptors/  — Logging, response transform
  guards/        — JWT, room-membership, moderator-only
  pipes/         — Validation pipe (global)
prisma/
  schema.prisma
  migrations/
```

### apps/web/src/
```
app/
  (auth)/login/
  (auth)/register/
  room/[code]/
    page.tsx          — game view (player or moderator)
    layout.tsx        — socket provider wrapper
components/
  game/
    RoleCard.tsx
    PhaseDisplay.tsx
    VotingPanel.tsx
    ChatPanel.tsx
    NightActionPanel.tsx
  moderator/
    ModeratorDashboard.tsx
    PlayerRoster.tsx
    PhaseControls.tsx
    GameLog.tsx
stores/
  gameStore.ts
  roomStore.ts
  uiStore.ts
lib/
  socket.ts          — singleton socket instance
  api.ts             — axios instance
types/               — re-export from packages/types
```

---

## Database Schema (Prisma — do not deviate)

```prisma
model User {
  id           String         @id @default(cuid())
  email        String?        @unique
  username     String         @unique
  passwordHash String?
  isGuest      Boolean        @default(false)
  avatarUrl    String?
  createdAt    DateTime       @default(now())
  sessions     PlayerSession[]
  refreshTokens RefreshToken[]
}

model Room {
  id          String       @id @default(cuid())
  code        String       @unique  // 6-char uppercase join code
  moderatorId String
  settings    Json         // RoomSettings type
  status      RoomStatus   @default(LOBBY)
  createdAt   DateTime     @default(now())
  sessions    GameSession[]
}

model GameSession {
  id        String          @id @default(cuid())
  roomId    String
  room      Room            @relation(fields: [roomId], references: [id])
  phase     GamePhase       @default(LOBBY)
  winner    Team?
  startedAt DateTime        @default(now())
  endedAt   DateTime?
  players   PlayerSession[]
  events    GameEvent[]
}

model PlayerSession {
  id           String      @id @default(cuid())
  sessionId    String
  session      GameSession @relation(fields: [sessionId], references: [id])
  userId       String
  user         User        @relation(fields: [userId], references: [id])
  role         String?
  isAlive      Boolean     @default(true)
  seat         Int
  connectedAt  DateTime    @default(now())
}

model GameEvent {
  id        String      @id @default(cuid())
  sessionId String
  session   GameSession @relation(fields: [sessionId], references: [id])
  sequence  Int
  type      String
  actorId   String?
  targetId  String?
  payload   Json
  createdAt DateTime    @default(now())
  @@index([sessionId, sequence])
  @@unique([sessionId, sequence])
}

model RefreshToken {
  id        String   @id @default(cuid())
  userId    String
  user      User     @relation(fields: [userId], references: [id])
  token     String   @unique
  expiresAt DateTime
  createdAt DateTime @default(now())
}

enum RoomStatus { LOBBY ACTIVE FINISHED }
enum GamePhase  { LOBBY NIGHT DAY_DISCUSSION DAY_VOTING GAME_OVER }
enum Team       { VILLAGE MAFIA }
```

---

## Shared Types (packages/types)

Every socket event must be typed here. Example pattern:
```ts
// All client→server events
export interface ClientToServerEvents {
  join_room:       (payload: JoinRoomDto)       => void;
  night_action:    (payload: NightActionDto)    => void;
  vote_cast:       (payload: VoteCastDto)       => void;
  reconnect_state: (payload: ReconnectDto)      => void;
}

// All server→client events
export interface ServerToClientEvents {
  state_sync:         (state: ClientGameState)  => void;
  phase_change:       (payload: PhaseChangePayload) => void;
  timer_tick:         (payload: TimerPayload)   => void;
  role_assigned:      (payload: RolePayload)    => void;
  player_updated:     (payload: PlayerPayload)  => void;
  elimination_update: (payload: EliminationPayload) => void; // mod only in onSiteMode
  vote_update:        (payload: VotePayload)    => void;
  game_over:          (payload: GameOverPayload)=> void;
  action_ack:         (payload: AckPayload)     => void;
  error:              (payload: ErrorPayload)   => void;
}
```

---

## Game Rules (enforce in engine)

- Mafia win: mafiaAlive >= villageAlive
- Village win: mafiaAlive === 0
- Doctor can save themselves (configurable per room)
- Detective result: 'mafia' | 'not mafia' (never reveals exact role)
- Each player acts once per night phase
- Tie vote in day phase: configurable (no elimination | random | revote)
- onSiteMode: elimination_update emitted to moderator socket only

## Role Registry (all roles in packages/engine/roles/)
- mafia     — kills one player per night, sees other mafia
- villager  — no night action
- detective — investigates one player per night
- doctor    — saves one player per night
- [custom roles added as RoleDefinition — never hardcode]

---

## Code Style
- TypeScript strict mode, no `any`
- All async functions have try/catch or use a global exception filter
- DTOs validated with class-validator decorators
- No `console.log` — use NestJS Logger
- Tests: Jest, filename pattern `*.spec.ts`
- Commit style: conventional commits (feat: fix: chore: refactor:)

---

## On-Site Mode
- Room setting: `onSiteMode: boolean`
- When true:
  - `elimination_update` only emitted to moderator socket
  - Players see phase change only, no elimination announcement
  - Moderator dashboard shows full elimination list
  - Physical moderator announces eliminations verbally

---

## Current Phase
**Phase 0 — Game Engine (pure logic, no I/O)**
Next: Phase 1 — Backend scaffolding