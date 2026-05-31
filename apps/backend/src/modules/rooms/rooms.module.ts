import { Module } from '@nestjs/common'
import { JwtModule } from '@nestjs/jwt'
import { RoomsController } from './rooms.controller'
import { RoomsService } from './rooms.service'
import { ModeratorGuard } from '../../common/guards/moderator.guard'

@Module({
  imports: [
    JwtModule.register({
      secret: process.env['INVITE_SECRET'] ?? 'change-me-invite-secret',
      signOptions: { expiresIn: '24h' },
    }),
  ],
  controllers: [RoomsController],
  providers: [RoomsService, ModeratorGuard],
})
export class RoomsModule {}
