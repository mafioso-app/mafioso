import { IsOptional, IsString } from 'class-validator'

export class JoinRoomDto {
  @IsString()
  @IsOptional()
  inviteToken?: string
}
