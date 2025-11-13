import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class AuthResponseDto {
  @ApiPropertyOptional()
  access_token?: string;

  @ApiPropertyOptional()
  refresh_token?: string;

  @ApiPropertyOptional()
  expires_in?: number;

  @ApiPropertyOptional()
  message?: string;
}
