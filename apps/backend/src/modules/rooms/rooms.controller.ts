import { Body, Controller, Get, HttpCode, HttpStatus, Param, Post, Request, UseGuards } from '@nestjs/common'
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard'
import { ModeratorGuard } from '../../common/guards/moderator.guard'
import { RoomsService } from './rooms.service'
import { CreateRoomDto } from './dto/create-room.dto'
import { JoinRoomDto } from './dto/join-room.dto'
import type { JwtUser } from '../auth/strategies/jwt.strategy'

interface AuthRequest extends Express.Request {
  user: JwtUser
}

@Controller('rooms')
@UseGuards(JwtAuthGuard)
export class RoomsController {
  constructor(private readonly roomsService: RoomsService) {}

  @Get('templates')
  getTemplates() {
    return this.roomsService.getTemplates()
  }

  @Post()
  createRoom(@Request() req: AuthRequest, @Body() dto: CreateRoomDto) {
    return this.roomsService.createRoom(req.user.userId, dto)
  }

  @Post(':code/join')
  joinRoom(
    @Request() req: AuthRequest,
    @Param('code') code: string,
    @Body() dto: JoinRoomDto,
  ) {
    return this.roomsService.joinRoom(req.user.userId, code, dto.inviteToken)
  }

  @Get(':code/status')
  getRoomStatus(@Request() req: AuthRequest, @Param('code') code: string) {
    return this.roomsService.getRoomStatus(code, req.user.userId)
  }

  @Post(':code/invite')
  @UseGuards(ModeratorGuard)
  generateInviteLink(@Request() req: AuthRequest, @Param('code') code: string) {
    return this.roomsService.generateInviteLink(code, req.user.userId)
  }

  @Post(':code/start')
  @HttpCode(HttpStatus.OK)
  @UseGuards(ModeratorGuard)
  startGame(@Request() req: AuthRequest, @Param('code') code: string) {
    return this.roomsService.startGame(code, req.user.userId)
  }

  @Post('join-by-token')
  joinByToken(@Request() req: AuthRequest, @Body('token') token: string) {
    return this.roomsService.joinByToken(token, req.user.userId)
  }

  @Get(':code/events')
  @UseGuards(ModeratorGuard)
  getRoomEvents(@Request() req: AuthRequest, @Param('code') code: string) {
    return this.roomsService.getRoomEvents(code, req.user.userId)
  }
}
