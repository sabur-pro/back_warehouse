import { Injectable } from '@nestjs/common';
import { PrismaService } from '@/common/prisma/prisma.service';
import { Expo, ExpoPushMessage } from 'expo-server-sdk';

@Injectable()
export class NotificationsService {
  private expo: Expo;

  constructor(private prisma: PrismaService) {
    this.expo = new Expo();
  }

  /**
   * Регистрация push token
   */
  async registerPushToken(
    userId: number,
    userType: string,
    token: string,
    deviceInfo?: any,
  ) {
    return this.prisma.pushToken.upsert({
      where: { token },
      create: {
        userId,
        userType,
        token,
        deviceInfo: deviceInfo ? JSON.stringify(deviceInfo) : null,
      },
      update: {
        isActive: true,
        lastUsedAt: new Date(),
      },
    });
  }

  /**
   * Отправить уведомление о pending action админу
   */
  async sendPendingActionNotification(adminId: number, pendingAction: any) {
    const tokens = await this.prisma.pushToken.findMany({
      where: { userId: adminId, userType: 'ADMIN', isActive: true },
    });

    if (tokens.length === 0) {
      console.log('No push tokens found for admin:', adminId);
      return;
    }

    const messages: ExpoPushMessage[] = tokens
      .filter(t => Expo.isExpoPushToken(t.token))
      .map(t => ({
        to: t.token,
        sound: 'default',
        title: '🔔 Требуется подтверждение',
        body: `Запрос на ${this.getActionTypeText(pendingAction.actionType)}`,
        data: { type: 'pending_action', id: pendingAction.id },
      }));

    if (messages.length === 0) {
      console.log('No valid Expo push tokens');
      return;
    }

    try {
      const chunks = this.expo.chunkPushNotifications(messages);
      for (const chunk of chunks) {
        await this.expo.sendPushNotificationsAsync(chunk);
      }

      await this.prisma.pendingAction.update({
        where: { id: pendingAction.id },
        data: { notificationSent: true, notificationSentAt: new Date() },
      });
    } catch (error) {
      console.error('Failed to send push notification:', error);
    }
  }

  /**
   * Отправить уведомление об одобрении действия ассистенту
   */
  async sendActionApprovedNotification(assistantId: number, action: any) {
    const tokens = await this.prisma.pushToken.findMany({
      where: { userId: assistantId, userType: 'ASSISTANT', isActive: true },
    });

    if (tokens.length === 0) return;

    const messages: ExpoPushMessage[] = tokens
      .filter(t => Expo.isExpoPushToken(t.token))
      .map(t => ({
        to: t.token,
        sound: 'default',
        title: '✅ Действие одобрено',
        body: `Ваш запрос на ${this.getActionTypeText(action.actionType)} был одобрен`,
        data: { type: 'action_approved', id: action.id },
      }));

    if (messages.length === 0) return;

    try {
      const chunks = this.expo.chunkPushNotifications(messages);
      for (const chunk of chunks) {
        await this.expo.sendPushNotificationsAsync(chunk);
      }
    } catch (error) {
      console.error('Failed to send push notification:', error);
    }
  }

  /**
   * Отправить уведомление об отклонении действия ассистенту
   */
  async sendActionRejectedNotification(assistantId: number, action: any) {
    const tokens = await this.prisma.pushToken.findMany({
      where: { userId: assistantId, userType: 'ASSISTANT', isActive: true },
    });

    if (tokens.length === 0) return;

    const messages: ExpoPushMessage[] = tokens
      .filter(t => Expo.isExpoPushToken(t.token))
      .map(t => ({
        to: t.token,
        sound: 'default',
        title: '❌ Действие отклонено',
        body: `Ваш запрос на ${this.getActionTypeText(action.actionType)} был отклонен`,
        data: { type: 'action_rejected', id: action.id },
      }));

    if (messages.length === 0) return;

    try {
      const chunks = this.expo.chunkPushNotifications(messages);
      for (const chunk of chunks) {
        await this.expo.sendPushNotificationsAsync(chunk);
      }
    } catch (error) {
      console.error('Failed to send push notification:', error);
    }
  }

  /**
   * Деактивировать токен
   */
  async deactivateToken(token: string) {
    return this.prisma.pushToken.updateMany({
      where: { token },
      data: { isActive: false },
    });
  }

  private getActionTypeText(actionType: string): string {
    const map = {
      UPDATE_ITEM: 'изменение товара',
      DELETE_ITEM: 'удаление товара',
      DELETE_TRANSACTION: 'удаление транзакции',
    };
    return map[actionType] || 'действие';
  }
}
