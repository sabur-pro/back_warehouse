import { Injectable } from '@nestjs/common';
import { PrismaService } from '@/common/prisma/prisma.service';
import { NotificationsService } from '../notifications/notifications.service';
import { RequestApprovalDto } from './dto/request-approval.dto';
import { PendingAction } from '@prisma/client';

@Injectable()
export class PendingActionService {
  constructor(
    private prisma: PrismaService,
    private notificationService: NotificationsService,
  ) {}

  /**
   * Создать pending action
   */
  async createPendingAction(
    adminId: number,
    assistantId: number,
    dto: RequestApprovalDto,
  ) {
    const pendingAction = await this.prisma.pendingAction.create({
      data: {
        adminId,
        assistantId,
        actionType: dto.actionType,
        status: 'PENDING',
        itemId: dto.actionType.includes('ITEM') ? dto.entityId : null,
        transactionId: dto.actionType === 'DELETE_TRANSACTION' ? dto.entityId : null,
        oldData: JSON.stringify(dto.oldData),
        newData: JSON.stringify(dto.newData),
        reason: dto.reason,
        expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000), // +24h
      },
    });

    // Отправить push-уведомление админу
    await this.notificationService.sendPendingActionNotification(adminId, pendingAction);

    return { pendingActionId: pendingAction.id };
  }

  /**
   * Одобрить pending action
   */
  async approvePendingAction(adminId: number, pendingActionId: number, comment?: string) {
    const action = await this.prisma.pendingAction.findFirst({
      where: { id: pendingActionId, adminId },
    });

    if (!action) {
      throw new Error('Pending action not found');
    }

    if (action.status !== 'PENDING') {
      throw new Error('Action is not in pending state');
    }

    const updatedAction = await this.prisma.pendingAction.update({
      where: { id: pendingActionId },
      data: {
        status: 'APPROVED',
        adminComment: comment,
        respondedAt: new Date(),
      },
    });

    // Применить действие
    await this.applyAction(updatedAction);

    // Уведомить ассистента
    await this.notificationService.sendActionApprovedNotification(
      action.assistantId,
      updatedAction,
    );

    return { success: true };
  }

  /**
   * Отклонить pending action
   */
  async rejectPendingAction(adminId: number, pendingActionId: number, comment?: string) {
    const action = await this.prisma.pendingAction.findFirst({
      where: { id: pendingActionId, adminId },
    });

    if (!action) {
      throw new Error('Pending action not found');
    }

    if (action.status !== 'PENDING') {
      throw new Error('Action is not in pending state');
    }

    const updatedAction = await this.prisma.pendingAction.update({
      where: { id: pendingActionId },
      data: {
        status: 'REJECTED',
        adminComment: comment,
        respondedAt: new Date(),
      },
    });

    // Уведомить ассистента
    await this.notificationService.sendActionRejectedNotification(
      action.assistantId,
      updatedAction,
    );

    return { success: true };
  }

  /**
   * Получить pending actions для админа
   */
  async getAdminPendingActions(adminId: number) {
    return this.prisma.pendingAction.findMany({
      where: {
        adminId,
        status: 'PENDING',
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  /**
   * Получить pending actions для ассистента
   */
  async getAssistantPendingActions(assistantId: number) {
    return this.prisma.pendingAction.findMany({
      where: {
        assistantId,
        status: { in: ['PENDING', 'APPROVED', 'REJECTED'] },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  /**
   * Применить одобренное действие
   */
  private async applyAction(action: PendingAction) {
    const newData = JSON.parse(action.newData);

    switch (action.actionType) {
      case 'UPDATE_ITEM':
        await this.prisma.item.update({
          where: { id: action.itemId },
          data: {
            ...newData,
            version: { increment: 1 },
          },
        });
        break;

      case 'DELETE_ITEM':
        await this.prisma.item.update({
          where: { id: action.itemId },
          data: { isDeleted: true },
        });
        break;

      case 'DELETE_TRANSACTION':
        await this.prisma.transaction.update({
          where: { id: action.transactionId },
          data: { isDeleted: true },
        });
        break;
    }
  }
}
