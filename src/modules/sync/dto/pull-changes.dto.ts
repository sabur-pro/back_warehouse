import { IsOptional, IsString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class PullChangesDto {
  @ApiProperty({ required: false, description: 'ISO timestamp последней синхронизации' })
  @IsOptional()
  @IsString()
  lastSyncAt?: string;
}
