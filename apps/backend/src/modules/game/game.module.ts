import { Module } from '@nestjs/common'
import { AuthModule } from '../auth/auth.module'
import { PrismaModule } from '../../prisma/prisma.module'
import { RedisModule } from '../../redis/redis.module'
import { GameGateway } from './game.gateway'
import { GameOrchestrator } from './game.orchestrator'
import { ChatService } from './chat.service'
import { TimerService } from './timer.service'
import { SpectatorGuard } from '../../common/guards/spectator.guard'

@Module({
  imports: [AuthModule, PrismaModule, RedisModule],
  providers: [GameGateway, GameOrchestrator, ChatService, TimerService, SpectatorGuard],
  exports: [GameOrchestrator, ChatService, TimerService, SpectatorGuard],
})
export class GameModule {}
