import { IsString, IsNotEmpty, IsOptional, IsObject } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class RegisterTokenDto {
  @ApiProperty({ description: 'Expo Push Token' })
  @IsString()
  @IsNotEmpty()
  token: string;

  @ApiProperty({ description: 'Device information', required: false })
  @IsOptional()
  @IsObject()
  deviceInfo?: any;
}
