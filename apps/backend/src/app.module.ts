import { Module } from '@nestjs/common'
import { ConfigModule } from '@nestjs/config'
import { EventEmitterModule } from '@nestjs/event-emitter'
import { PrismaModule } from './prisma/prisma.module'
import { RedisModule } from './redis/redis.module'
import { AuthModule } from './modules/auth/auth.module'
import { RoomsModule } from './modules/rooms/rooms.module'
import { GameModule } from './modules/game/game.module'
import { ModeratorModule } from './modules/moderator/moderator.module'
import { LeaderboardModule } from './modules/leaderboard/leaderboard.module'
import { HealthModule } from './modules/health/health.module'
import { UsersModule } from './modules/users/users.module'
import configuration, { validate } from './config/configuration'

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      load: [configuration],
      validate,
      ignoreEnvFile: process.env['NODE_ENV'] === 'production',
    }),
    EventEmitterModule.forRoot(),
    PrismaModule,
    RedisModule,
    AuthModule,
    RoomsModule,
    GameModule,
    ModeratorModule,
    LeaderboardModule,
    HealthModule,
    UsersModule,
  ],
})
export class AppModule {}
