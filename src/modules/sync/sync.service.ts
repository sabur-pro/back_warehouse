import { Injectable } from '@nestjs/common';
import { PrismaService } from '@/common/prisma/prisma.service';
import { PushChangesDto, PushItemDto, PushTransactionDto } from './dto/push-changes.dto';
import { PullChangesDto } from './dto/pull-changes.dto';

@Injectable()
export class SyncService {
  constructor(private prisma: PrismaService) {}

  /**
   * Обработка push от ассистента
   */
  async processPushFromAssistant(
    adminId: number,
    assistantId: number,
    dto: PushChangesDto,
  ) {
    const result = { items: [], transactions: [] };

    // Обработка items
    for (const itemDto of dto.items) {
      const item = await this.prisma.item.create({
        data: {
          adminId,
          name: itemDto.name,
          code: itemDto.code,
          warehouse: itemDto.warehouse,
          numberOfBoxes: itemDto.numberOfBoxes,
          boxSizeQuantities: itemDto.boxSizeQuantities,
          sizeType: itemDto.sizeType,
          itemType: itemDto.itemType,
          row: itemDto.row,
          position: itemDto.position,
          side: itemDto.side,
          imageUrl: itemDto.imageUrl,
          totalQuantity: itemDto.totalQuantity,
          totalValue: itemDto.totalValue,
          qrCodeType: itemDto.qrCodeType,
          qrCodes: itemDto.qrCodes,
        },
      });

      result.items.push({
        localId: itemDto.localId,
        serverId: item.id,
      });
    }

    // Обработка transactions
    for (const txDto of dto.transactions) {
      const tx = await this.prisma.transaction.create({
        data: {
          adminId,
          itemId: txDto.itemId,
          action: txDto.action,
          itemName: txDto.itemName,
          timestamp: BigInt(txDto.timestamp),
          details: txDto.details,
        },
      });

      result.transactions.push({
        localId: txDto.localId,
        serverId: tx.id,
      });
    }

    return result;
  }

  /**
   * Pull для админа
   */
  async pullForAdmin(adminId: number, query: PullChangesDto) {
    const lastSyncAt = query.lastSyncAt ? new Date(query.lastSyncAt) : new Date(0);

    const items = await this.prisma.item.findMany({
      where: {
        adminId,
        isDeleted: false,
        updatedAt: { gt: lastSyncAt },
      },
      orderBy: { updatedAt: 'asc' },
    });

    const transactions = await this.prisma.transaction.findMany({
      where: {
        adminId,
        isDeleted: false,
        createdAt: { gt: lastSyncAt },
      },
      orderBy: { createdAt: 'asc' },
    });

    // Преобразуем BigInt в number для JSON
    const transactionsFormatted = transactions.map(tx => ({
      ...tx,
      timestamp: Number(tx.timestamp),
    }));

    return {
      items,
      transactions: transactionsFormatted,
      lastSyncAt: new Date().toISOString(),
    };
  }

  /**
   * Pull для ассистента
   */
  async pullForAssistant(assistantId: number, query: PullChangesDto) {
    // Получить adminId ассистента
    const assistant = await this.prisma.assistant.findUnique({
      where: { id: assistantId },
    });

    if (!assistant) {
      throw new Error('Assistant not found');
    }

    // Pull данных как для админа
    const data = await this.pullForAdmin(assistant.adminId, query);

    // Добавить одобренные pending actions
    const lastSyncAt = query.lastSyncAt ? new Date(query.lastSyncAt) : new Date(0);
    const approvedActions = await this.prisma.pendingAction.findMany({
      where: {
        assistantId,
        status: 'APPROVED',
        respondedAt: { gt: lastSyncAt },
      },
    });

    return {
      ...data,
      approvedActions,
    };
  }
}
