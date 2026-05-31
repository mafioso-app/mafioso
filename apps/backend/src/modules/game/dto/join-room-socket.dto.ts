import { IsString } from 'class-validator'

export class JoinRoomSocketDto {
  @IsString()
  roomCode!: string
}
