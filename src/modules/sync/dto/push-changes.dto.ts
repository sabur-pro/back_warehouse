import { IsString, IsNumber, IsOptional, IsArray, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty } from '@nestjs/swagger';

export class PushItemDto {
  @ApiProperty({ required: false })
  @IsOptional()
  @IsNumber()
  localId?: number;

  @ApiProperty()
  @IsString()
  name: string;

  @ApiProperty()
  @IsString()
  code: string;

  @ApiProperty()
  @IsString()
  warehouse: string;

  @ApiProperty()
  @IsNumber()
  numberOfBoxes: number;

  @ApiProperty()
  @IsString()
  boxSizeQuantities: string;

  @ApiProperty()
  @IsString()
  sizeType: string;

  @ApiProperty()
  @IsString()
  itemType: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  row?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  position?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  side?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  imageUrl?: string;

  @ApiProperty()
  @IsNumber()
  totalQuantity: number;

  @ApiProperty()
  @IsNumber()
  totalValue: number;

  @ApiProperty()
  @IsString()
  qrCodeType: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  qrCodes?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsNumber()
  createdAt?: number;
}

export class PushTransactionDto {
  @ApiProperty({ required: false })
  @IsOptional()
  @IsNumber()
  localId?: number;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsNumber()
  itemId?: number;

  @ApiProperty()
  @IsString()
  action: string;

  @ApiProperty()
  @IsString()
  itemName: string;

  @ApiProperty()
  @IsNumber()
  timestamp: number;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  details?: string;
}

export class PushChangesDto {
  @ApiProperty({ type: [PushItemDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => PushItemDto)
  items: PushItemDto[];

  @ApiProperty({ type: [PushTransactionDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => PushTransactionDto)
  transactions: PushTransactionDto[];
}
