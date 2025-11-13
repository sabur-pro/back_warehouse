import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class AssistantDto {
  @ApiProperty()
  id: number;

  @ApiProperty()
  boss_id: number;

  @ApiProperty()
  login: string;

  @ApiProperty()
  phone: string;

  @ApiProperty()
  created_at: Date;

  @ApiProperty()
  updated_at: Date;
}

export class CreateAssistantResponseDto {
  @ApiPropertyOptional()
  access_token?: string;

  @ApiPropertyOptional()
  refresh_token?: string;

  @ApiPropertyOptional()
  expires_in?: number;
}

export class GetAssistantsResponseDto {
  @ApiProperty({ type: [AssistantDto] })
  data: AssistantDto[];

  @ApiProperty()
  page: number;

  @ApiProperty()
  limit: number;

  @ApiProperty()
  total: number;
}
