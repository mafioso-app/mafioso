import { IsString, IsEmail, IsOptional, MinLength, MaxLength } from 'class-validator'

export class RegisterDto {
  @IsString()
  @MinLength(3)
  @MaxLength(32)
  username!: string

  @IsEmail()
  @IsOptional()
  email?: string

  @IsString()
  @MinLength(6)
  password!: string
}
