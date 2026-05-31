import { IsString, MaxLength, MinLength } from 'class-validator'

export class ModeratorAnnounceSocketDto {
  @IsString()
  @MinLength(1)
  @MaxLength(300)
  message!: string
}
