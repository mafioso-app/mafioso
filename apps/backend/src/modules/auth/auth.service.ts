import { Injectable, UnauthorizedException, ConflictException } from '@nestjs/common'
import { JwtService } from '@nestjs/jwt'
import * as bcrypt from 'bcrypt'
import * as crypto from 'crypto'
import { PrismaService } from '../../prisma/prisma.service'
import { EmailService } from './email.service'

const SALT_ROUNDS = 12
const REFRESH_EXPIRES_MS = 7 * 24 * 60 * 60 * 1000

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwt: JwtService,
    private readonly email: EmailService,
  ) {}

  async register(username: string, password: string, email?: string) {
    const existing = await this.prisma.user.findFirst({
      where: { OR: [{ username }, ...(email ? [{ email }] : [])] },
    })
    if (existing) throw new ConflictException('Username or email already taken')

    const passwordHash = await bcrypt.hash(password, SALT_ROUNDS)
    const user = await this.prisma.user.create({
      data: { username, email, passwordHash, isGuest: false },
    })

    const { accessToken, refreshToken } = await this.generateTokens(
      user.id,
      user.username,
      false,
    )

    if (email) {
      void this.email.sendWelcomeEmail(email, username)
    }

    return { accessToken, refreshToken, user: { id: user.id, username: user.username, isGuest: false } }
  }

  async login(username: string, password: string) {
    const user = await this.prisma.user.findUnique({ where: { username } })
    if (!user || !user.passwordHash) throw new UnauthorizedException('Invalid credentials')

    const valid = await bcrypt.compare(password, user.passwordHash)
    if (!valid) throw new UnauthorizedException('Invalid credentials')

    const { accessToken, refreshToken } = await this.generateTokens(
      user.id,
      user.username,
      false,
    )
    return { accessToken, refreshToken, user: { id: user.id, username: user.username, isGuest: false } }
  }

  async guest(username: string) {
    const existing = await this.prisma.user.findUnique({ where: { username } })
    if (existing) throw new ConflictException('Username already taken')

    const user = await this.prisma.user.create({
      data: { username, isGuest: true },
    })

    const accessToken = this.signAccess(user.id, user.username, true)
    return { accessToken, user: { id: user.id, username: user.username, isGuest: true } }
  }

  async refresh(rawToken: string) {
    const delimIdx = rawToken.indexOf(':')
    if (delimIdx === -1) throw new UnauthorizedException('Invalid refresh token')

    const id = rawToken.slice(0, delimIdx)
    const verifier = rawToken.slice(delimIdx + 1)

    const record = await this.prisma.refreshToken.findUnique({ where: { id } })
    if (!record) throw new UnauthorizedException('Refresh token not found')

    if (record.expiresAt < new Date()) {
      await this.prisma.refreshToken.delete({ where: { id } })
      throw new UnauthorizedException('Refresh token expired')
    }

    const valid = await bcrypt.compare(verifier, record.token)
    if (!valid) throw new UnauthorizedException('Invalid refresh token')

    const user = await this.prisma.user.findUniqueOrThrow({ where: { id: record.userId } })
    return { accessToken: this.signAccess(user.id, user.username, user.isGuest) }
  }

  async logout(rawToken: string): Promise<void> {
    const delimIdx = rawToken.indexOf(':')
    if (delimIdx === -1) return
    const id = rawToken.slice(0, delimIdx)
    await this.prisma.refreshToken.deleteMany({ where: { id } })
  }

  async generateTokens(userId: string, username: string, isGuest: boolean) {
    const verifier = crypto.randomUUID()
    const tokenHash = await bcrypt.hash(verifier, SALT_ROUNDS)
    const expiresAt = new Date(Date.now() + REFRESH_EXPIRES_MS)

    const record = await this.prisma.refreshToken.create({
      data: { userId, token: tokenHash, expiresAt },
    })

    return {
      accessToken: this.signAccess(userId, username, isGuest),
      refreshToken: `${record.id}:${verifier}`,
    }
  }

  private signAccess(userId: string, username: string, isGuest: boolean): string {
    return this.jwt.sign({ sub: userId, username, isGuest })
  }
}
