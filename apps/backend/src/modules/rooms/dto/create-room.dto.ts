import { IsArray, IsBoolean, IsIn, IsNumber, IsOptional, IsString, Max, Min } from 'class-validator'

export class CreateRoomDto {
  @IsString()
  @IsOptional()
  templateId?: string

  @IsBoolean()
  @IsOptional()
  onSiteMode?: boolean

  @IsBoolean()
  @IsOptional()
  doctorCanSaveSelf?: boolean

  @IsIn(['no_elimination', 'random', 'revote'])
  @IsOptional()
  tieVoteRule?: 'no_elimination' | 'random' | 'revote'

  @IsNumber()
  @IsOptional()
  @Min(30)
  nightDurationSeconds?: number

  @IsNumber()
  @IsOptional()
  @Min(30)
  dayDiscussionDurationSeconds?: number

  @IsNumber()
  @IsOptional()
  @Min(30)
  dayVotingDurationSeconds?: number

  @IsNumber()
  @IsOptional()
  @Min(4)
  @Max(30)
  maxPlayers?: number

  @IsBoolean()
  @IsOptional()
  requireInvite?: boolean

  @IsArray()
  @IsOptional()
  enabledRoles?: string[]
}
