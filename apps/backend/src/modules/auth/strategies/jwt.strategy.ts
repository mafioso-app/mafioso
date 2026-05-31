import { Injectable } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { PassportStrategy } from '@nestjs/passport'
import { ExtractJwt, Strategy } from 'passport-jwt'
import type { JwtConfig } from '../../../config/configuration'

interface JwtPayload {
  sub: string
  username: string
  isGuest: boolean
}

export interface JwtUser {
  userId: string
  username: string
  isGuest: boolean
}

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(config: ConfigService) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: config.get<JwtConfig>('jwt')!.accessSecret,
    })
  }

  validate(payload: JwtPayload): JwtUser {
    return { userId: payload.sub, username: payload.username, isGuest: payload.isGuest }
  }
}
