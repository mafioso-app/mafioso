import { IsString } from 'class-validator'

export class VoteCastSocketDto {
  @IsString()
  targetId!: string
}
