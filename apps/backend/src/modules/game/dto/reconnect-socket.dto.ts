import { IsString } from 'class-validator'

export class ReconnectSocketDto {
  @IsString()
  roomCode!: string
}
