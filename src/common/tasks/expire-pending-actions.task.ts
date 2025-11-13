import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PrismaService } from '@/common/prisma/prisma.service';

@Injectable()
export class ExpirePendingActionsTask {
  private readonly logger = new Logger(ExpirePendingActionsTask.name);

  constructor(private prisma: PrismaService) {}

  @Cron(CronExpression.EVERY_HOUR)
  async handleExpiredActions() {
    this.logger.log('Running expired pending actions cleanup...');
    
    try {
      const result = await this.prisma.pendingAction.updateMany({
        where: {
          status: 'PENDING',
          expiresAt: { lt: new Date() },
        },
        data: {
          status: 'EXPIRED',
          respondedAt: new Date(),
        },
      });

      this.logger.log(`Expired ${result.count} pending actions`);
    } catch (error) {
      this.logger.error('Failed to expire pending actions', error);
    }
  }
}
