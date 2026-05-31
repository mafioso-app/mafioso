import { Module } from '@nestjs/common'
import { PrismaModule } from '../../prisma/prisma.module'
import { AuthModule } from '../auth/auth.module'
import { LeaderboardService } from './leaderboard.service'
import { LeaderboardController } from './leaderboard.controller'

@Module({
  imports: [PrismaModule, AuthModule],
  providers: [LeaderboardService],
  controllers: [LeaderboardController],
})
export class LeaderboardModule {}
