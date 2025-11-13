import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { SubscriptionStatus } from '@prisma/client';

export class SubscriptionDto {
  @ApiProperty()
  id: number;

  @ApiProperty()
  admin_id: number;

  @ApiProperty()
  start_date: Date;

  @ApiProperty()
  end_date: Date;

  @ApiProperty({ enum: SubscriptionStatus })
  status: SubscriptionStatus;

  @ApiProperty()
  price: number;

  @ApiProperty()
  proof_photo: string;

  @ApiProperty()
  created_at: Date;

  @ApiProperty()
  updated_at: Date;
}

export class CreateSubscriptionResponseDto {
  @ApiPropertyOptional()
  access_token?: string;

  @ApiPropertyOptional()
  refresh_token?: string;

  @ApiPropertyOptional()
  expires_in?: number;
}

export class GetSubscriptionsResponseDto {
  @ApiProperty({ type: [SubscriptionDto] })
  data: SubscriptionDto[];

  @ApiProperty()
  page: number;

  @ApiProperty()
  limit: number;

  @ApiProperty()
  total: number;
}
