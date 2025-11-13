import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsString, Length } from 'class-validator';

export class VerifyDto {
  @ApiProperty({ example: 'admin@example.com' })
  @IsEmail()
  gmail: string;

  @ApiProperty({ example: '1234', description: '4-digit verification code' })
  @IsString()
  @Length(4, 4)
  code: string;
}
