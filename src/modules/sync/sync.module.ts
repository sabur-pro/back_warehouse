import { Module } from '@nestjs/common';
import { PrismaModule } from '@/common/prisma/prisma.module';
import { NotificationsModule } from '../notifications/notifications.module';
import { AssistantSyncController } from './assistant-sync.controller';
import { AdminSyncController } from './admin-sync.controller';
import { SyncService } from './sync.service';
import { PendingActionService } from './pending-action.service';

@Module({
  imports: [PrismaModule, NotificationsModule],
  controllers: [AssistantSyncController, AdminSyncController],
  providers: [SyncService, PendingActionService],
  exports: [SyncService, PendingActionService],
})
export class SyncModule {}
