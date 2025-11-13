import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsEmail, IsString, MinLength, IsOptional, ValidateIf } from 'class-validator';

export class SignInDto {
  @ApiPropertyOptional({ example: 'admin@example.com', description: 'Admin email' })
  @IsOptional()
  @IsEmail()
  @ValidateIf((o) => !o.login && !o.phone)
  gmail?: string;

  @ApiPropertyOptional({ example: 'assistant_login', description: 'Assistant login' })
  @IsOptional()
  @IsString()
  @ValidateIf((o) => !o.gmail && !o.phone)
  login?: string;

  @ApiPropertyOptional({ example: '+992000000000', description: 'Super admin phone' })
  @IsOptional()
  @IsString()
  @ValidateIf((o) => !o.gmail && !o.login)
  phone?: string;

  @ApiProperty({ example: 'password123', description: 'Password' })
  @IsString()
  @MinLength(6)
  password: string;
}
