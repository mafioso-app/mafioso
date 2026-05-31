import { Controller, Post, Body, Request, UseGuards } from '@nestjs/common'
import { IsString, IsNotEmpty } from 'class-validator'
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard'
import { PrismaService } from '../../prisma/prisma.service'
import type { JwtUser } from '../auth/strategies/jwt.strategy'

class SavePushTokenDto {
  @IsString()
  @IsNotEmpty()
  token!: string
}

interface AuthRequest extends Express.Request {
  user: JwtUser
}

@Controller('users')
@UseGuards(JwtAuthGuard)
export class UsersController {
  constructor(private readonly prisma: PrismaService) {}

  @Post('push-token')
  async savePushToken(@Request() req: AuthRequest, @Body() dto: SavePushTokenDto): Promise<void> {
    await this.prisma.user.update({
      where: { id: req.user.userId },
      data: { pushToken: dto.token },
    })
  }
}
