import { IsString, MinLength, MaxLength } from 'class-validator'

export class GuestDto {
  @IsString()
  @MinLength(2)
  @MaxLength(32)
  username!: string
}
