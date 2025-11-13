import { ApiProperty } from '@nestjs/swagger';
import { IsString } from 'class-validator';

export class RefreshTokenDto {
  @ApiProperty({ example: 'refresh_token_string' })
  @IsString()
  refresh_token: string;
}
