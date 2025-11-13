import { IsEnum, IsNumber, IsObject, IsOptional, IsString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export enum PendingActionTypeEnum {
  UPDATE_ITEM = 'UPDATE_ITEM',
  DELETE_ITEM = 'DELETE_ITEM',
  DELETE_TRANSACTION = 'DELETE_TRANSACTION',
}

export class RequestApprovalDto {
  @ApiProperty({ enum: PendingActionTypeEnum })
  @IsEnum(PendingActionTypeEnum)
  actionType: PendingActionTypeEnum;

  @ApiProperty({ description: 'ID сущности (товара или транзакции)' })
  @IsNumber()
  entityId: number;

  @ApiProperty({ description: 'Старые данные' })
  @IsObject()
  oldData: any;

  @ApiProperty({ description: 'Новые данные' })
  @IsObject()
  newData: any;

  @ApiProperty({ required: false, description: 'Причина запроса' })
  @IsOptional()
  @IsString()
  reason?: string;
}

export class ApproveActionDto {
  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  comment?: string;
}

export class RejectActionDto {
  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  comment?: string;
}
