import { ApiProperty } from '@nestjs/swagger';
import { IsNumber, IsDateString } from 'class-validator';

export class CreateSubscriptionDto {
  @ApiProperty({ example: 99 })
  @IsNumber()
  price: number;

  @ApiProperty({ example: '2024-12-31T00:00:00.000Z' })
  @IsDateString()
  end_date: string;

  @ApiProperty({ type: 'string', format: 'binary' })
  proof_photo: any;
}
