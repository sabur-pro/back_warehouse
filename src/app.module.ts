import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ScheduleModule } from '@nestjs/schedule';
import { ServeStaticModule } from '@nestjs/serve-static';
import { join } from 'path';
import { PrismaModule } from './common/prisma/prisma.module';
import { AuthModule } from './modules/auth/auth.module';
import { AssistantModule } from './modules/assistant/assistant.module';
import { SubscriptionModule } from './modules/subscription/subscription.module';
import { StorageModule } from './modules/storage/storage.module';
import { SyncModule } from './modules/sync/sync.module';
import { NotificationsModule } from './modules/notifications/notifications.module';
import { ExpirePendingActionsTask } from './common/tasks/expire-pending-actions.task';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
    }),
    ScheduleModule.forRoot(),
    ServeStaticModule.forRoot({
      rootPath: join(__dirname, '..', 'uploads'),
      serveRoot: '/static',
      exclude: ['/api*'],
    }),
    PrismaModule,
    AuthModule,
    AssistantModule,
    SubscriptionModule,
    StorageModule,
    SyncModule,
    NotificationsModule,
  ],
  providers: [ExpirePendingActionsTask],
})
export class AppModule {}
