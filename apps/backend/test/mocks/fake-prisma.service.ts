import { Injectable } from '@nestjs/common'

function genId(): string {
  return Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15)
}

interface DbUser {
  id: string
  email: string | null
  username: string
  passwordHash: string | null
  isGuest: boolean
  avatarUrl: string | null
  createdAt: Date
}

interface DbRefreshToken {
  id: string
  userId: string
  token: string
  expiresAt: Date
  createdAt: Date
}

interface DbRoom {
  id: string
  code: string
  moderatorId: string
  settings: object
  status: string
  createdAt: Date
}

interface DbGameSession {
  id: string
  roomId: string
  phase: string
  winner: string | null
  startedAt: Date
  endedAt: Date | null
}

interface DbPlayerSession {
  id: string
  sessionId: string
  userId: string
  role: string | null
  isAlive: boolean
  seat: number
  connectedAt: Date
}

function matchesWhere(item: Record<string, unknown>, where: Record<string, unknown>): boolean {
  for (const key of Object.keys(where)) {
    const condition = where[key]
    if (key === 'OR') {
      const matches = (condition as Record<string, unknown>[]).some((c) =>
        matchesWhere(item, c),
      )
      if (!matches) return false
    } else if (key === 'AND') {
      const matches = (condition as Record<string, unknown>[]).every((c) =>
        matchesWhere(item, c),
      )
      if (!matches) return false
    } else if (
      condition !== null &&
      typeof condition === 'object' &&
      !(condition instanceof Date)
    ) {
      const op = condition as Record<string, unknown>
      if ('startsWith' in op) {
        if (!(item[key] as string)?.startsWith(op['startsWith'] as string)) return false
      } else if ('in' in op) {
        if (!(op['in'] as unknown[]).includes(item[key])) return false
      } else if ('not' in op) {
        if (item[key] === op['not']) return false
      } else if ('lt' in op) {
        if (!((item[key] as number) < (op['lt'] as number))) return false
      } else if ('gt' in op) {
        if (!((item[key] as number) > (op['gt'] as number))) return false
      } else {
        if (item[key] !== condition) return false
      }
    } else if (condition === null) {
      if (item[key] !== null && item[key] !== undefined) return false
    } else {
      if (item[key] !== condition) return false
    }
  }
  return true
}

function applySelect<T extends Record<string, unknown>>(item: T, select: Record<string, boolean>): Partial<T> {
  const out: Partial<T> = {}
  for (const key of Object.keys(select)) {
    if (select[key]) (out as Record<string, unknown>)[key] = item[key]
  }
  return out
}

@Injectable()
export class FakePrismaService {
  private readonly _users = new Map<string, DbUser>()
  private readonly _refreshTokens = new Map<string, DbRefreshToken>()
  private readonly _rooms = new Map<string, DbRoom>()
  private readonly _sessions = new Map<string, DbGameSession>()
  private readonly _players = new Map<string, DbPlayerSession>()

  async $connect() {}
  async $disconnect() {}
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  async $queryRaw(): Promise<unknown[]> { return [{ result: 1 }] }

  readonly user = {
    findFirst: async (args: { where: Record<string, unknown> }) => {
      for (const u of this._users.values()) {
        if (matchesWhere(u as unknown as Record<string, unknown>, args.where)) return u
      }
      return null
    },
    findUnique: async (args: { where: Record<string, unknown> }) => {
      const w = args.where
      if (w['id']) return this._users.get(w['id'] as string) ?? null
      for (const u of this._users.values()) {
        if (matchesWhere(u as unknown as Record<string, unknown>, w)) return u
      }
      return null
    },
    findUniqueOrThrow: async (args: { where: Record<string, unknown> }) => {
      const w = args.where
      if (w['id']) {
        const u = this._users.get(w['id'] as string)
        if (!u) throw new Error('Record not found')
        return u
      }
      for (const u of this._users.values()) {
        if (matchesWhere(u as unknown as Record<string, unknown>, w)) return u
      }
      throw new Error('Record not found')
    },
    create: async (args: { data: Partial<DbUser> }) => {
      const u: DbUser = {
        id: genId(),
        email: args.data.email ?? null,
        username: args.data.username ?? '',
        passwordHash: args.data.passwordHash ?? null,
        isGuest: args.data.isGuest ?? false,
        avatarUrl: args.data.avatarUrl ?? null,
        createdAt: new Date(),
      }
      this._users.set(u.id, u)
      return u
    },
    findMany: async (args: { where?: Record<string, unknown>; select?: Record<string, boolean> }) => {
      const out = []
      for (const u of this._users.values()) {
        if (!args.where || matchesWhere(u as unknown as Record<string, unknown>, args.where)) {
          out.push(args.select ? applySelect(u as unknown as Record<string, unknown>, args.select) : u)
        }
      }
      return out
    },
    deleteMany: async (args: { where: Record<string, unknown> }) => {
      const del: string[] = []
      for (const [id, u] of this._users.entries()) {
        if (matchesWhere(u as unknown as Record<string, unknown>, args.where)) del.push(id)
      }
      del.forEach((id) => this._users.delete(id))
      return { count: del.length }
    },
  }

  readonly refreshToken = {
    create: async (args: { data: Omit<DbRefreshToken, 'id' | 'createdAt'> }) => {
      const t: DbRefreshToken = { id: genId(), ...args.data, createdAt: new Date() }
      this._refreshTokens.set(t.id, t)
      return t
    },
    findUnique: async (args: { where: Record<string, unknown> }) => {
      if (args.where['id']) return this._refreshTokens.get(args.where['id'] as string) ?? null
      for (const t of this._refreshTokens.values()) {
        if (matchesWhere(t as unknown as Record<string, unknown>, args.where)) return t
      }
      return null
    },
    delete: async (args: { where: { id: string } }) => {
      const t = this._refreshTokens.get(args.where.id) ?? null
      this._refreshTokens.delete(args.where.id)
      return t
    },
    deleteMany: async (args: { where: Record<string, unknown> }) => {
      const del: string[] = []
      for (const [id, t] of this._refreshTokens.entries()) {
        if (matchesWhere(t as unknown as Record<string, unknown>, args.where)) del.push(id)
      }
      del.forEach((id) => this._refreshTokens.delete(id))
      return { count: del.length }
    },
  }

  readonly room = {
    create: async (args: { data: Omit<DbRoom, 'id' | 'createdAt'> }) => {
      const r: DbRoom = { id: genId(), ...args.data, createdAt: new Date() }
      this._rooms.set(r.id, r)
      return r
    },
    findUnique: async (args: { where: Record<string, unknown>; include?: Record<string, unknown> }) => {
      let r: DbRoom | undefined
      if (args.where['id']) r = this._rooms.get(args.where['id'] as string)
      else {
        for (const room of this._rooms.values()) {
          if (matchesWhere(room as unknown as Record<string, unknown>, args.where)) { r = room; break }
        }
      }
      if (!r) return null
      return args.include ? this._expandRoom(r, args.include) : r
    },
    update: async (args: { where: Record<string, unknown>; data: Partial<DbRoom> }) => {
      let r: DbRoom | undefined
      if (args.where['id']) r = this._rooms.get(args.where['id'] as string)
      else {
        for (const room of this._rooms.values()) {
          if (matchesWhere(room as unknown as Record<string, unknown>, args.where)) { r = room; break }
        }
      }
      if (!r) throw new Error('Room not found')
      Object.assign(r, args.data)
      return r
    },
    findMany: async (args: { where?: Record<string, unknown>; select?: Record<string, boolean> }) => {
      const out = []
      for (const r of this._rooms.values()) {
        if (!args.where || matchesWhere(r as unknown as Record<string, unknown>, args.where)) {
          out.push(args.select ? applySelect(r as unknown as Record<string, unknown>, args.select) : r)
        }
      }
      return out
    },
    deleteMany: async (args: { where: Record<string, unknown> }) => {
      const del: string[] = []
      for (const [id, r] of this._rooms.entries()) {
        if (matchesWhere(r as unknown as Record<string, unknown>, args.where)) del.push(id)
      }
      del.forEach((id) => this._rooms.delete(id))
      return { count: del.length }
    },
  }

  readonly gameSession = {
    create: async (args: { data: Pick<DbGameSession, 'roomId' | 'phase'> }) => {
      const s: DbGameSession = {
        id: genId(),
        roomId: args.data.roomId,
        phase: args.data.phase ?? 'LOBBY',
        winner: null,
        startedAt: new Date(),
        endedAt: null,
      }
      this._sessions.set(s.id, s)
      return s
    },
    findFirst: async (args: { where?: Record<string, unknown>; include?: Record<string, unknown> }) => {
      for (const s of this._sessions.values()) {
        if (!args.where || matchesWhere(s as unknown as Record<string, unknown>, args.where)) {
          return args.include ? this._expandSession(s, args.include) : s
        }
      }
      return null
    },
    findMany: async (args: { where?: Record<string, unknown>; select?: Record<string, boolean> }) => {
      const out = []
      for (const s of this._sessions.values()) {
        if (!args.where || matchesWhere(s as unknown as Record<string, unknown>, args.where)) {
          out.push(args.select ? applySelect(s as unknown as Record<string, unknown>, args.select) : s)
        }
      }
      return out
    },
    deleteMany: async (args: { where: Record<string, unknown> }) => {
      const del: string[] = []
      for (const [id, s] of this._sessions.entries()) {
        if (matchesWhere(s as unknown as Record<string, unknown>, args.where)) del.push(id)
      }
      del.forEach((id) => this._sessions.delete(id))
      return { count: del.length }
    },
  }

  readonly playerSession = {
    create: async (args: { data: Omit<DbPlayerSession, 'id' | 'connectedAt'> }) => {
      const p: DbPlayerSession = { id: genId(), ...args.data, connectedAt: new Date() }
      this._players.set(p.id, p)
      return p
    },
    findMany: async (args: { where?: Record<string, unknown>; select?: Record<string, boolean> }) => {
      const out = []
      for (const p of this._players.values()) {
        if (!args.where || matchesWhere(p as unknown as Record<string, unknown>, args.where)) {
          out.push(args.select ? applySelect(p as unknown as Record<string, unknown>, args.select) : p)
        }
      }
      return out
    },
    deleteMany: async (args: { where: Record<string, unknown> }) => {
      const del: string[] = []
      for (const [id, p] of this._players.entries()) {
        if (matchesWhere(p as unknown as Record<string, unknown>, args.where)) del.push(id)
      }
      del.forEach((id) => this._players.delete(id))
      return { count: del.length }
    },
  }

  readonly gameEvent = {
    deleteMany: async (_args: unknown) => ({ count: 0 }),
  }

  private _expandRoom(room: DbRoom, include: Record<string, unknown>): unknown {
    const result: Record<string, unknown> = { ...room }
    if (include['sessions']) {
      const inc = include['sessions'] as Record<string, unknown>
      let sessions = [...this._sessions.values()].filter((s) => s.roomId === room.id)
      if (inc['where']) {
        sessions = sessions.filter((s) =>
          matchesWhere(s as unknown as Record<string, unknown>, inc['where'] as Record<string, unknown>),
        )
      }
      if (inc['take']) sessions = sessions.slice(0, inc['take'] as number)
      const sessionsWithInclude = inc['include']
        ? sessions.map((s) => this._expandSession(s, inc['include'] as Record<string, unknown>))
        : sessions
      result['sessions'] = sessionsWithInclude
    }
    return result
  }

  private _expandSession(session: DbGameSession, include: Record<string, unknown>): unknown {
    const result: Record<string, unknown> = { ...session }
    if (include['players']) {
      const inc = include['players'] as Record<string, unknown>
      let players = [...this._players.values()].filter((p) => p.sessionId === session.id)
      if (inc['include']) {
        const playerInc = inc['include'] as Record<string, unknown>
        if (playerInc['user']) {
          const userInc = playerInc['user'] as Record<string, unknown>
          players = players.map((p) => {
            const user = this._users.get(p.userId)
            let userResult: unknown = null
            if (user && userInc['select']) {
              userResult = applySelect(user as unknown as Record<string, unknown>, userInc['select'] as Record<string, boolean>)
            } else {
              userResult = user ?? null
            }
            return { ...p, user: userResult } as DbPlayerSession
          })
        }
      }
      result['players'] = players
    }
    return result
  }
}
