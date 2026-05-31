import { CanActivate, ExecutionContext, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common'
import type { Request } from 'express'
import { PrismaService } from '../../prisma/prisma.service'
import type { JwtUser } from '../../modules/auth/strategies/jwt.strategy'

@Injectable()
export class ModeratorGuard implements CanActivate {
  constructor(private readonly prisma: PrismaService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const req = context.switchToHttp().getRequest<Request & { user: JwtUser }>()
    const code = req.params['code']

    if (!code) throw new ForbiddenException('Room code missing')

    const room = await this.prisma.room.findUnique({ where: { code } })
    if (!room) throw new NotFoundException('Room not found')

    if (room.moderatorId !== req.user.userId) {
      throw new ForbiddenException('Only the room moderator can perform this action')
    }

    return true
  }
}
