import { Injectable } from '@nestjs/common'
import { PrismaService } from '../../prisma/prisma.service'

export interface LeaderboardEntry {
  userId: string
  username: string
  gamesPlayed: number
  wins: number
  losses: number
  winRate: number
}

@Injectable()
export class LeaderboardService {
  constructor(private readonly prisma: PrismaService) {}

  async getGlobalLeaderboard(limit = 50): Promise<LeaderboardEntry[]> {
    // Single query — no N+1. Mafia-team roles: 'mafia'. All others are VILLAGE.
    const rows = await this.prisma.$queryRaw<
      { userId: string; username: string; gamesPlayed: number; wins: number }[]
    >`
      SELECT
        u.id                                        AS "userId",
        u.username                                  AS "username",
        COUNT(DISTINCT ps."sessionId")::int         AS "gamesPlayed",
        COALESCE(SUM(
          CASE
            WHEN gs.winner = 'MAFIA'   AND ps.role = 'mafia'  THEN 1
            WHEN gs.winner = 'VILLAGE' AND ps.role <> 'mafia' THEN 1
            ELSE 0
          END
        )::int, 0)                                  AS "wins"
      FROM "User" u
      INNER JOIN "PlayerSession" ps ON ps."userId" = u.id
      INNER JOIN "GameSession"   gs ON ps."sessionId" = gs.id
      WHERE gs.winner IS NOT NULL
        AND ps.role IS NOT NULL
      GROUP BY u.id, u.username
      ORDER BY "wins" DESC, "gamesPlayed" DESC
      LIMIT ${limit}
    `

    return rows.map((r) => ({
      userId: r.userId,
      username: r.username,
      gamesPlayed: Number(r.gamesPlayed),
      wins: Number(r.wins),
      losses: Number(r.gamesPlayed) - Number(r.wins),
      winRate:
        Number(r.gamesPlayed) > 0
          ? Math.round((Number(r.wins) / Number(r.gamesPlayed)) * 100)
          : 0,
    }))
  }

  async getUserStats(userId: string): Promise<LeaderboardEntry | null> {
    const rows = await this.prisma.$queryRaw<
      { userId: string; username: string; gamesPlayed: number; wins: number }[]
    >`
      SELECT
        u.id                                        AS "userId",
        u.username                                  AS "username",
        COUNT(DISTINCT ps."sessionId")::int         AS "gamesPlayed",
        COALESCE(SUM(
          CASE
            WHEN gs.winner = 'MAFIA'   AND ps.role = 'mafia'  THEN 1
            WHEN gs.winner = 'VILLAGE' AND ps.role <> 'mafia' THEN 1
            ELSE 0
          END
        )::int, 0)                                  AS "wins"
      FROM "User" u
      INNER JOIN "PlayerSession" ps ON ps."userId" = u.id
      INNER JOIN "GameSession"   gs ON ps."sessionId" = gs.id
      WHERE u.id = ${userId}
        AND gs.winner IS NOT NULL
        AND ps.role IS NOT NULL
      GROUP BY u.id, u.username
    `

    const r = rows[0]
    if (!r) return null

    const gamesPlayed = Number(r.gamesPlayed)
    const wins = Number(r.wins)
    return {
      userId: r.userId,
      username: r.username,
      gamesPlayed,
      wins,
      losses: gamesPlayed - wins,
      winRate: gamesPlayed > 0 ? Math.round((wins / gamesPlayed) * 100) : 0,
    }
  }
}
