import { ApiProperty } from '@nestjs/swagger';
import { IsString, MinLength } from 'class-validator';

export class CreateAssistantDto {
  @ApiProperty({ example: 'assistant_login' })
  @IsString()
  @MinLength(3)
  login: string;

  @ApiProperty({ example: 'password123' })
  @IsString()
  @MinLength(6)
  password: string;

  @ApiProperty({ example: '+992900000000' })
  @IsString()
  phone: string;
}
