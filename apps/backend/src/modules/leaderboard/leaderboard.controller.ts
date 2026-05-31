import { Controller, Get, Param, UseGuards } from '@nestjs/common'
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard'
import { LeaderboardService } from './leaderboard.service'

@Controller('leaderboard')
export class LeaderboardController {
  constructor(private readonly leaderboard: LeaderboardService) {}

  @Get()
  @UseGuards(JwtAuthGuard)
  getGlobal() {
    return this.leaderboard.getGlobalLeaderboard()
  }

  @Get('users/:userId')
  @UseGuards(JwtAuthGuard)
  getUserStats(@Param('userId') userId: string) {
    return this.leaderboard.getUserStats(userId)
  }
}
