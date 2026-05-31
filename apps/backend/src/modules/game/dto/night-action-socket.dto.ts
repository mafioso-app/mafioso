import { IsString } from 'class-validator'

export class NightActionSocketDto {
  @IsString()
  targetId!: string

  @IsString()
  actionType!: string
}
