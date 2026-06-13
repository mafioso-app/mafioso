import { IsString, IsOptional, MaxLength } from 'class-validator'

export class GuestDto {
  @IsString()
  @IsOptional()
  @MaxLength(32)
  username?: string
}
